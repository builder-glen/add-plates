import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { addDays, monthGridStart } from '../lib/date';
import type { DayEntry, DaySession, DaySet, Exercise, WorkoutPlan } from '../lib/types';
import { useExercises } from './exercises';
import * as q from './queries';

/** 세션 이름은 시각을 보고 자동으로 붙인다. 사용자가 정하지 않는다 */
function autoSessionTitle(now: Date): string {
  const h = now.getHours();
  if (h < 12) return '오전 운동';
  if (h < 18) return '오후 운동';
  return '저녁 운동';
}

const min = (a: string, b: string) => (a < b ? a : b);
const max = (a: string, b: string) => (a > b ? a : b);

export type LoadStatus = 'loading' | 'ready' | 'error';

/** 스트립 범위: 오늘 기준 ±35일 */
export const STRIP_RADIUS = 35;

interface RangeData {
  loggedDays: Set<string>;
  plansByDate: Map<string, WorkoutPlan>;
}

const EMPTY_RANGE: RangeData = { loggedDays: new Set(), plansByDate: new Map() };

export function useDayData(dateKey: string, todayKey: string) {
  const { byId, loading: exLoading } = useExercises();
  const { userId } = useAuth();

  const [sessions, setSessions] = useState<DaySession[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [range, setRange] = useState<RangeData>(EMPTY_RANGE);
  const [error, setError] = useState<string | null>(null);

  /**
   * 낙관적 업데이트는 다음 값을 그 자리에서 계산해야 한다.
   * setState 업데이터 안에서 값을 꺼내면 아직 실행되지 않은 시점이라 읽을 수 없다.
   */
  /** 종목 목록이 늘어도(직접 추가) 하루치를 다시 읽지 않도록 참조로만 들고 있는다 */
  const byIdRef = useRef(byId);
  byIdRef.current = byId;

  const ref = useRef<DaySession[]>([]);
  const commit = useCallback((next: DaySession[]) => {
    ref.current = next;
    setSessions(next);
  }, []);

  /** 실패한 세트의 재시도 동작 */
  const retryOps = useRef(new Map<string, () => Promise<void>>());

  /**
   * 만들어지는 중인 세션. 빈 날에 종목을 연달아 넣으면 두 번째 항목이
   * 아직 없는 세션을 참조해 외래키에서 튕긴다 — 세션이 들어갈 때까지 기다린다.
   */
  const pendingSession = useRef(new Map<string, Promise<void>>());

  // ── 읽기 ────────────────────────────────────────────
  const loadDay = useCallback(async () => {
    setStatus('loading');
    try {
      const day = await q.fetchDay(dateKey, byIdRef.current);
      const ids = [...new Set(day.flatMap((s) => s.entries.map((e) => e.exercise.id)))];
      const lasts = await q.fetchLastRecords(ids, dateKey);
      commit(
        day.map((s) => ({
          ...s,
          entries: s.entries.map((e) => ({ ...e, last: lasts.get(e.exercise.id) ?? null })),
        })),
      );
      setStatus('ready');
      setError(null);
    } catch {
      setStatus('error');
      setError('기록을 불러오지 못했어요.');
    }
  }, [dateKey, commit]);

  /** 캘린더 시트가 보는 달. 같은 달 안에서 날짜만 바꾸면 범위를 다시 읽지 않는다 */
  const monthKey = dateKey.slice(0, 7);

  const loadRange = useCallback(async () => {
    // 스트립(오늘 ±35일)과 캘린더 35칸을 모두 덮는 범위. 키가 'YYYY-MM-DD' 라 문자열 비교로 충분하다
    const gridFrom = monthGridStart(monthKey);
    const from = min(addDays(todayKey, -STRIP_RADIUS), gridFrom);
    const to = max(addDays(todayKey, STRIP_RADIUS), addDays(gridFrom, 34));
    try {
      const [logged, plans] = await Promise.all([
        q.fetchLoggedDays(from, to),
        q.fetchPlans(from, to),
      ]);
      setRange({ loggedDays: logged, plansByDate: new Map(plans.map((p) => [p.planned_on, p])) });
    } catch {
      // 도트/일정은 보조 정보라 화면 전체를 실패로 만들지 않는다
      setRange(EMPTY_RANGE);
    }
  }, [todayKey, monthKey]);

  useEffect(() => {
    if (exLoading) return;
    void loadDay();
  }, [exLoading, loadDay]);

  useEffect(() => {
    if (exLoading) return;
    void loadRange();
  }, [exLoading, loadRange]);

  // ── 상태 조작 헬퍼 ──────────────────────────────────
  const mapEntry = useCallback(
    (entryId: string, fn: (e: DayEntry) => DayEntry) => {
      commit(
        ref.current.map((s) => ({
          ...s,
          entries: s.entries.map((e) => (e.id === entryId ? fn(e) : e)),
        })),
      );
    },
    [commit],
  );

  const markSet = useCallback(
    (entryId: string, setId: string, sync: DaySet['sync']) => {
      mapEntry(entryId, (e) => ({
        ...e,
        sets: e.sets.map((s) => (s.id === setId ? { ...s, sync } : s)),
      }));
    },
    [mapEntry],
  );

  const findEntry = (entryId: string): DayEntry | undefined =>
    ref.current.flatMap((s) => s.entries).find((e) => e.id === entryId);

  // ── 쓰기 (낙관적) ───────────────────────────────────

  /** 세트 추가. UI 를 먼저 갱신하고 서버 응답을 기다리지 않는다 */
  const addSet = useCallback(
    (entryId: string, weightKg: number | null, reps: number) => {
      const entry = findEntry(entryId);
      if (!entry) return;

      const id = crypto.randomUUID();
      const setNo = entry.sets.length + 1;
      mapEntry(entryId, (e) => ({
        ...e,
        sets: [
          ...e.sets,
          { id, entry_id: entryId, set_no: setNo, weight_kg: weightKg, reps, sync: 'pending' },
        ],
      }));

      const op = async () => {
        markSet(entryId, id, 'pending');
        try {
          await q.insertSet({ id, entry_id: entryId, set_no: setNo, weight_kg: weightKg, reps });
          markSet(entryId, id, 'ok');
          retryOps.current.delete(id);
          void loadRange(); // 그날 첫 세트면 도트가 생긴다
        } catch {
          markSet(entryId, id, 'fail');
        }
      };
      retryOps.current.set(id, op);
      void op();
    },
    [mapEntry, markSet, loadRange],
  );

  const editSet = useCallback(
    (entryId: string, setId: string, weightKg: number | null, reps: number) => {
      mapEntry(entryId, (e) => ({
        ...e,
        sets: e.sets.map((s) =>
          s.id === setId ? { ...s, weight_kg: weightKg, reps, sync: 'pending' } : s,
        ),
      }));

      const op = async () => {
        markSet(entryId, setId, 'pending');
        try {
          await q.updateSet(setId, { weight_kg: weightKg, reps });
          markSet(entryId, setId, 'ok');
          retryOps.current.delete(setId);
        } catch {
          markSet(entryId, setId, 'fail');
        }
      };
      retryOps.current.set(setId, op);
      void op();
    },
    [mapEntry, markSet],
  );

  const retrySet = useCallback((setId: string) => {
    const op = retryOps.current.get(setId);
    if (op) void op();
  }, []);

  /** 세트 삭제 + 번호 당기기. 되돌리기용 스냅샷을 돌려준다 */
  const removeSet = useCallback(
    (entryId: string, setId: string): { snapshot: DaySet[]; removed: DaySet } | null => {
      const entry = findEntry(entryId);
      const removed = entry?.sets.find((s) => s.id === setId);
      if (!entry || !removed) return null;

      const snapshot = entry.sets;
      const kept = snapshot.filter((s) => s.id !== setId);
      const renumbered = kept.map((s, i) => ({ ...s, set_no: i + 1 }));
      const followers = renumbered
        .filter((s, i) => s.set_no !== kept[i].set_no)
        .map((s) => ({ id: s.id, set_no: s.set_no }));

      mapEntry(entryId, (e) => ({ ...e, sets: renumbered }));

      void (async () => {
        try {
          await q.deleteSetAndRenumber(setId, followers);
          void loadRange();
        } catch {
          setError('세트를 지우지 못했어요.');
          void loadDay();
        }
      })();

      return { snapshot, removed };
    },
    [mapEntry, loadDay, loadRange],
  );

  /** 세트 삭제 되돌리기 — 번호는 큰 것부터 올려야 unique(entry_id,set_no) 충돌이 없다 */
  const restoreSets = useCallback(
    (entryId: string, snapshot: DaySet[], removed: DaySet) => {
      mapEntry(entryId, (e) => ({ ...e, sets: snapshot }));

      void (async () => {
        try {
          const followers = snapshot
            .filter((s) => s.set_no > removed.set_no)
            .sort((a, b) => b.set_no - a.set_no);
          for (const f of followers) await q.updateSetNo(f.id, f.set_no);
          await q.insertSet({
            id: removed.id,
            entry_id: entryId,
            set_no: removed.set_no,
            weight_kg: removed.weight_kg,
            reps: removed.reps,
          });
          void loadRange();
        } catch {
          setError('되돌리지 못했어요.');
          void loadDay();
        }
      })();
    },
    [mapEntry, loadDay, loadRange],
  );

  /** 종목 삭제. 되돌리기용으로 지운 항목을 돌려준다 */
  const removeEntry = useCallback(
    (entryId: string): DayEntry | null => {
      const removed = findEntry(entryId);
      if (!removed) return null;

      commit(
        ref.current.map((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== entryId) })),
      );

      void (async () => {
        try {
          await q.deleteEntry(entryId);
          void loadRange();
        } catch {
          setError('종목을 지우지 못했어요.');
          void loadDay();
        }
      })();

      return removed;
    },
    [commit, loadDay, loadRange],
  );

  const restoreEntry = useCallback(
    (entry: DayEntry) => {
      commit(
        ref.current.map((s) =>
          s.id === entry.sessionId
            ? { ...s, entries: [...s.entries, entry].sort((a, b) => a.orderIndex - b.orderIndex) }
            : s,
        ),
      );

      void (async () => {
        try {
          await q.restoreEntry(entry);
          void loadRange();
        } catch {
          setError('되돌리지 못했어요.');
          void loadDay();
        }
      })();
    },
    [commit, loadDay, loadRange],
  );

  /**
   * 종목 추가. 그날 세션이 없으면 만들고, 있으면 마지막 세션(started_at 최신)에 붙인다.
   * 추가한 항목의 id 를 돌려준다 — 홈이 그 카드를 펼쳐 둔다.
   */
  const addEntry = useCallback(
    (exercise: Exercise): string | null => {
      if (!userId) return null;

      const before = ref.current;
      const target = before[before.length - 1] ?? null; // fetchDay 가 started_at 오름차순으로 준다
      const isNewSession = !target;
      const sessionId = target?.id ?? crypto.randomUUID();
      const entryId = crypto.randomUUID();
      const orderIndex = target
        ? Math.max(-1, ...target.entries.map((e) => e.orderIndex)) + 1
        : 0;
      const now = new Date();
      const title = autoSessionTitle(now);

      const entry: DayEntry = { id: entryId, sessionId, orderIndex, exercise, sets: [], last: null };

      commit(
        isNewSession
          ? [...before, { id: sessionId, title, startedAt: now.toISOString(), entries: [entry] }]
          : before.map((s) =>
              s.id === sessionId ? { ...s, entries: [...s.entries, entry] } : s,
            ),
      );

      void (async () => {
        // 직전 기록은 저장과 동시에 물어본다 (카드가 비어 있는 시간을 줄인다)
        const lastP = q
          .fetchLastRecords([exercise.id], dateKey)
          .catch(() => null);
        try {
          if (isNewSession) {
            const creating = q.insertSession({
              id: sessionId,
              user_id: userId,
              performed_on: dateKey,
              title,
            });
            pendingSession.current.set(sessionId, creating);
            await creating;
          } else {
            await pendingSession.current.get(sessionId);
          }
          await q.insertEntry({
            id: entryId,
            session_id: sessionId,
            exercise_id: exercise.id,
            order_index: orderIndex,
          });
        } catch {
          // 낙관적으로 그린 것만 걷어낸다. 그 사이 더 넣은 항목은 건드리지 않는다
          commit(
            ref.current
              .map((s) =>
                s.id === sessionId
                  ? { ...s, entries: s.entries.filter((e) => e.id !== entryId) }
                  : s,
              )
              .filter((s) => !(isNewSession && s.id === sessionId && s.entries.length === 0)),
          );
          setError('종목을 추가하지 못했어요.');
          return;
        }
        const last = (await lastP)?.get(exercise.id) ?? null;
        if (last) mapEntry(entryId, (e) => ({ ...e, last }));
      })();

      return entryId;
    },
    [userId, dateKey, commit, mapEntry],
  );

  /**
   * 일정 저장(등록·수정 공통). prevDate 는 수정 중 날짜를 옮겼을 때의 원래 날짜.
   * 하루에 일정 하나 — 지도에서 옛 날짜를 지우고 새 날짜에 넣는다.
   */
  const savePlan = useCallback(
    (plan: WorkoutPlan, prevDate: string | null) => {
      setRange((r) => {
        const next = new Map(r.plansByDate);
        if (prevDate && prevDate !== plan.planned_on) next.delete(prevDate);
        next.set(plan.planned_on, plan);
        return { ...r, plansByDate: next };
      });
      void (async () => {
        try {
          await q.upsertPlan(plan);
        } catch {
          setError('일정을 저장하지 못했어요.');
          void loadRange();
        }
      })();
    },
    [loadRange],
  );

  const removePlan = useCallback(
    (plan: WorkoutPlan) => {
      setRange((r) => {
        const next = new Map(r.plansByDate);
        next.delete(plan.planned_on);
        return { ...r, plansByDate: next };
      });
      void (async () => {
        try {
          await q.deletePlan(plan.id);
        } catch {
          setError('일정을 지우지 못했어요.');
          void loadRange();
        }
      })();
    },
    [loadRange],
  );

  const restorePlan = useCallback(
    (plan: WorkoutPlan) => {
      setRange((r) => {
        const next = new Map(r.plansByDate);
        next.set(plan.planned_on, plan);
        return { ...r, plansByDate: next };
      });
      void (async () => {
        try {
          await q.restorePlan(plan);
        } catch {
          setError('되돌리지 못했어요.');
          void loadRange();
        }
      })();
    },
    [loadRange],
  );

  const entries = sessions.flatMap((s) => s.entries);

  return {
    sessions,
    entries,
    status,
    error,
    clearError: () => setError(null),
    loggedDays: range.loggedDays,
    plansByDate: range.plansByDate,
    reload: loadDay,
    addSet,
    editSet,
    retrySet,
    removeSet,
    restoreSets,
    addEntry,
    removeEntry,
    restoreEntry,
    savePlan,
    removePlan,
    restorePlan,
  };
}
