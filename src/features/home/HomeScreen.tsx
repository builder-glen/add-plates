import { useEffect, useMemo, useRef, useState } from 'react';
import { Snackbar, useSnack } from '../../components/Snackbar';
import { useAuth } from '../../auth/AuthProvider';
import { fetchDay, insertExercise, type NewExercise } from '../../data/queries';
import { useExercises } from '../../data/exercises';
import { useDayData } from '../../data/useDayData';
import {
  diffDays,
  fmtDateRel,
  fmtDateTitle,
  fmtTime,
  toIso,
  todayKey as getTodayKey,
} from '../../lib/date';
import { googleCalendarUrl } from '../../lib/gcal';
import { MUSCLE_LABEL } from '../../lib/labels';
import { buildShareJson, encodeShare, shareUrl } from '../../lib/shareLink';
import type { DayEntry, Exercise, WorkoutPlan } from '../../lib/types';
import { CustomExerciseSheet } from '../picker/CustomExerciseSheet';
import { PickerSheet } from '../picker/PickerSheet';
import { CalendarSheet } from '../plan/CalendarSheet';
import { NEW_DRAFT, ScheduleSheet, type PlanDraft } from '../plan/ScheduleSheet';
import { TimeSheet } from '../plan/TimeSheet';
import { BrandMark } from './BrandMark';
import { DateStrip } from './DateStrip';
import { EntryCard } from './EntryCard';
import { SetEditorSheet, type EditorTarget } from './SetEditorSheet';
import { ChevronIcon, MenuIcon, PencilIcon, ShareIcon, TrashIcon } from './icons';
import '../../styles/home.css';

/**
 * 열려 있는 시트.
 * 'custom' 은 검색어를, 'calendar' 는 날짜를 고른 뒤 돌아갈 곳을 들고 간다.
 */
type Sheet =
  | { kind: 'picker' }
  | { kind: 'custom'; name: string }
  | { kind: 'calendar'; returnTo: 'schedule' | null }
  | { kind: 'schedule' }
  | { kind: 'time' };

interface Props {
  /** 세트 스테퍼 한 칸. 설정에서 바꾼다 */
  weightStep: number;
  onOpenSettings: () => void;
}

export function HomeScreen({ weightStep, onOpenSettings }: Props) {
  const today = useMemo(() => getTodayKey(), []);
  const [dateKey, setDateKey] = useState(today);
  const { byId, addLocal } = useExercises();
  const { userId } = useAuth();
  const day = useDayData(dateKey, today);
  const { snack, show, dismiss } = useSnack();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // 날짜 스트립 접힘. 본문 스크롤 방향이 정한다
  const [stripOff, setStripOff] = useState(false);
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  // 일정 폼의 입력값. 캘린더 시트를 다녀와도 남아야 해서 시트 밖에 둔다
  const [planDraft, setPlanDraft] = useState<PlanDraft>(NEW_DRAFT);

  const isFuture = diffDays(dateKey, today) > 0;
  const isPast = diffDays(dateKey, today) < 0;
  const plan = day.plansByDate.get(dateKey) ?? null;
  const planDays = useMemo(() => new Set(day.plansByDate.keys()), [day.plansByDate]);

  // 날짜를 바꾸면 마지막 종목만 펼친 상태로 시작한다 (지금 하고 있을 종목)
  useEffect(() => {
    if (day.status !== 'ready') return;
    const last = day.entries[day.entries.length - 1];
    setExpanded(last ? new Set([last.id]) : new Set());
    // 날짜를 바꾸면 목록이 통째로 갈린다 — 접힌 채로 남으면 다시 펼 방법이 없다
    setStripOff(false);
    setSwipedId(null);
    setEditor(null);
    // 캘린더에서 날짜를 골라 일정 폼으로 돌아온 경우엔 그 시트를 닫지 않는다
    setSheet((s) => (s?.kind === 'schedule' || s?.kind === 'time' ? s : null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey, day.status]);

  // 빈 상태의 '지난 운동' 한 줄 — 하드코딩하지 않고 실제 기록에서 계산한다
  const [lastWorkout, setLastWorkout] = useState<string | null>(null);
  const lastReq = useRef(0);
  useEffect(() => {
    setLastWorkout(null);
    if (day.status !== 'ready' || day.entries.length > 0) return;
    const prev = [...day.loggedDays].filter((k) => k < dateKey).sort().pop();
    if (!prev) return;

    const req = ++lastReq.current;
    void fetchDay(prev, byId)
      .then((sessions) => {
        if (req !== lastReq.current) return;
        const groups = [
          ...new Set(
            sessions.flatMap((s) => s.entries.map((e) => MUSCLE_LABEL[e.exercise.muscle_group])),
          ),
        ];
        const d = prev.split('-').map(Number);
        setLastWorkout(
          `지난 운동 · ${d[1]}월 ${d[2]}일 (${Math.abs(diffDays(prev, dateKey))}일 전)${
            groups.length ? ` ${groups.join('·')}` : ''
          }`,
        );
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey, day.status, day.entries.length, day.loggedDays]);

  /**
   * 헤더 우측 당일 요약. 하드코딩하지 않고 그날 기록에서 센다.
   * 세트가 하나도 없는 종목은 세지 않고, 맨몸 종목은 무게가 없으니 볼륨에서 빠진다.
   */
  const dayStat = useMemo(() => {
    let ex = 0;
    let sets = 0;
    let kg = 0;
    for (const e of day.entries) {
      if (!e.sets.length) continue;
      ex += 1;
      sets += e.sets.length;
      if (e.exercise.tracking_type !== 'bodyweight_reps')
        kg += e.sets.reduce((a, s) => a + (s.weight_kg ?? 0) * s.reps, 0);
    }
    return { ex, sets, kg };
  }, [day.entries]);

  /**
   * 공유 링크는 누르기 전에 미리 만들어 둔다.
   *
   * navigator.share 는 탭 직후에만 열린다. 압축을 await 하고 나서 부르면
   * 사파리는 그 자격이 풀린 것으로 보고 시트를 열지 않는다.
   * 만드는 데 서버가 필요 없어 비행기 모드에서도 준비된다.
   */
  const canShare = !isFuture && dayStat.sets > 0;
  // 기록 배열은 렌더마다 새 배열이라 참조로는 비교가 안 된다 — 내용을 값으로 굳혀 비교한다
  const shareJson = canShare ? buildShareJson(dateKey, day.entries) : null;
  const shareLink = useRef<string | null>(null);
  useEffect(() => {
    shareLink.current = null;
    if (!shareJson) return;
    let alive = true;
    void encodeShare(shareJson).then((code) => {
      if (alive) shareLink.current = shareUrl(code);
    });
    return () => {
      alive = false;
    };
  }, [shareJson]);

  const shareDay = () => {
    const url = shareLink.current;
    if (!url) return; // 아직 만들어지는 중 — 한 틱이면 끝난다
    const text = `${fmtDateTitle(dateKey)} · ${dayStat.ex}종목 ${dayStat.sets}세트, 총 ${dayStat.kg.toLocaleString()}kg`;
    // 보낸 링크가 어떻게 보이는지 스낵바에서 바로 열어 볼 수 있게 한다
    const preview = () => window.open(url, '_blank', 'noopener');

    if (typeof navigator.share === 'function') {
      navigator
        .share({ title: 'ADD-PLATES', text, url })
        .then(() => show('공유 링크를 보냈어요', preview, '미리보기'))
        // 시트를 그냥 닫은 것이다. 아무 일도 없었으니 알리지 않는다
        .catch(() => undefined);
      return;
    }
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(`${text}\n${url}`).then(
        () => show('링크를 복사했어요', preview, '미리보기'),
        () => show('링크를 복사하지 못했어요', preview, '미리보기'),
      );
      return;
    }
    show('링크를 복사하지 못했어요', preview, '미리보기');
  };

  /**
   * 본문을 내리면 날짜 스트립을 접고, 조금이라도 올리면 되돌린다.
   * 맨 위(8px 이내)에서는 항상 펼쳐 둔다 — 목록이 짧을 때 접힌 채로 남지 않게.
   *
   * 전환 직후 420ms 는 판단을 멈춘다. 스트립이 접히면 목록이 위로 밀려
   * scrollTop 이 저절로 역방향으로 튀는데, 그 반동을 방향 전환으로 읽으면
   * 접힘↔펼침이 무한히 깜빡인다 (디자인 프로토타입에서 실제로 났던 버그).
   */
  const lastY = useRef(0);
  const lockUntil = useRef(0);
  const onBodyScroll = (ev: React.UIEvent<HTMLDivElement>) => {
    const y = ev.currentTarget.scrollTop;
    const prev = lastY.current;
    lastY.current = y;
    if (Date.now() < lockUntil.current) return;
    const d = y - prev;
    const lock = () => {
      lockUntil.current = Date.now() + 420;
    };
    if (y < 8) {
      if (stripOff) {
        lock();
        setStripOff(false);
      }
      return;
    }
    if (!stripOff && y > 64 && d > 10) {
      lock();
      setStripOff(true);
    } else if (stripOff && d < -10) {
      lock();
      setStripOff(false);
    }
  };

  /** 일정 폼 열기. 그 날짜에 일정이 있으면 그 값을 채워 수정으로 연다 */
  const openSchedule = () => {
    dismiss();
    const at = plan?.planned_at ? new Date(plan.planned_at) : null;
    setPlanDraft(
      plan
        ? {
            id: plan.id,
            fromDate: plan.planned_on,
            title: plan.title,
            memo: plan.memo ?? '',
            allDay: !at,
            hour: at ? at.getHours() : NEW_DRAFT.hour,
            min: at ? at.getMinutes() : NEW_DRAFT.min,
          }
        : NEW_DRAFT,
    );
    setSheet({ kind: 'schedule' });
  };

  /** 저장은 낙관적이다 — 구글 캘린더 창은 기다리지 않고 바로 연다 */
  const savePlan = (openGoogle: boolean) => {
    const title = planDraft.title.trim();
    if (!userId || !title) return;

    // 폼 안에서 날짜를 옮겼는데 그 날짜에 이미 일정이 있으면 그 일정을 고친다
    const id = planDraft.id ?? plan?.id ?? crypto.randomUUID();
    const row: WorkoutPlan = {
      id,
      user_id: userId,
      planned_on: dateKey,
      planned_at: planDraft.allDay ? null : toIso(dateKey, planDraft.hour, planDraft.min),
      title,
      memo: planDraft.memo.trim() || null,
    };

    day.savePlan(row, planDraft.fromDate);
    setSheet(null);
    if (openGoogle) window.open(googleCalendarUrl(row), '_blank', 'noopener');
    show(row.planned_at ? '일정을 저장했어요' : '종일 일정으로 저장했어요');
  };

  /** 캘린더에서 날짜를 고르면 일정 폼으로 돌아가거나 그냥 닫는다 */
  const pickDate = (key: string, returnTo: 'schedule' | null) => {
    setDateKey(key);
    setSheet(returnTo === 'schedule' ? { kind: 'schedule' } : null);
  };

  const openPicker = () => {
    if (isFuture) return; // 미래 날짜엔 기록을 넣을 수 없다
    dismiss(); // 스낵바가 시트 아래에 깔린다
    setSheet({ kind: 'picker' });
  };

  /** 종목을 고르면 시트를 닫고 그 카드만 펼쳐 둔다 — 바로 세트를 넣을 수 있게 */
  const addExercise = (ex: Exercise) => {
    const entryId = day.addEntry(ex);
    setSheet(null);
    if (entryId) setExpanded(new Set([entryId]));
  };

  const saveCustomExercise = async (draft: Omit<NewExercise, 'owner_id'>) => {
    if (!userId) throw new Error('로그인 정보가 없습니다.');
    const ex = await insertExercise({ ...draft, owner_id: userId });
    addLocal(ex); // 다시 불러오지 않고 메모리 목록에 끼워 넣는다
    addExercise(ex);
  };

  /**
   * 새 세트 스테퍼의 초기값.
   * 오늘 이미 넣은 세트 > 지난 기록의 1세트 > 기본값(20kg / 8회) 순으로 고른다.
   * 지난 기록이 화면에 떠 있는데 ± 를 여러 번 눌러야 하면 안 된다 (PRD F-06).
   */
  const openNewSet = (entry: DayEntry) => {
    dismiss(); // 스낵바가 시트 위를 덮어 스테퍼를 가린다
    const last = entry.sets[entry.sets.length - 1];
    const prev = entry.last?.first;
    setEditor({
      entryId: entry.id,
      setNo: null,
      setId: null,
      isBody: entry.exercise.tracking_type === 'bodyweight_reps',
      weight: last?.weight_kg ?? prev?.weightKg ?? 20,
      reps: last?.reps ?? prev?.reps ?? 8,
    });
  };

  const openEditSet = (entry: DayEntry, setNo: number) => {
    dismiss();
    const s = entry.sets.find((x) => x.set_no === setNo);
    if (!s) return;
    setEditor({
      entryId: entry.id,
      setNo,
      setId: s.id,
      isBody: entry.exercise.tracking_type === 'bodyweight_reps',
      weight: s.weight_kg ?? 0,
      reps: s.reps,
    });
  };

  const saveEditor = (weight: number, reps: number) => {
    if (!editor) return;
    const w = editor.isBody ? null : weight; // 맨몸 종목은 0 이 아니라 null
    if (editor.setNo === null) day.addSet(editor.entryId, w, reps);
    else if (editor.setId) day.editSet(editor.entryId, editor.setId, w, reps);
    setEditor(null);
  };

  const deleteEditorSet = () => {
    if (!editor?.setId || editor.setNo === null) return;
    const setNo = editor.setNo;
    const res = day.removeSet(editor.entryId, editor.setId);
    const entryId = editor.entryId;
    setEditor(null);
    if (res) show(`${setNo}세트 삭제됨`, () => day.restoreSets(entryId, res.snapshot, res.removed));
  };

  const deleteEntry = (entry: DayEntry) => {
    setSwipedId(null);
    const removed = day.removeEntry(entry.id);
    if (removed) show(`${entry.exercise.name} 삭제됨`, () => day.restoreEntry(removed));
  };

  const bodyContent = () => {
    if (day.status === 'loading') {
      return <div className="gp-note">불러오는 중…</div>;
    }
    if (day.status === 'error') {
      return (
        <div className="gp-note gp-note--warn">
          기록을 불러오지 못했어요.{' '}
          <button type="button" className="gp-retry" onClick={() => void day.reload()}>
            다시 시도
          </button>
        </div>
      );
    }
    if (!isFuture && day.entries.length === 0) {
      return (
        <div className="gp-empty">
          <div className="gp-empty__lines">
            {isPast ? '이 날은 기록이 없어요.' : '아직 아무것도 없어요.'}
            <br />
            {isPast ? '지금 채워 넣어도 돼요.' : '종목만 고르면 지난 기록이 같이 떠요.'}
          </div>
          {lastWorkout ? <div className="gp-empty__meta">{lastWorkout}</div> : null}
        </div>
      );
    }
    return (
      <>
        {isFuture ? <div className="gp-note">일정을 구글 캘린더에도 등록할 수 있어요.</div> : null}
        {day.entries.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            readOnly={isFuture}
            expanded={expanded.has(entry.id)}
            swiped={swipedId === entry.id}
            onToggle={() =>
              setExpanded((prev) => {
                const next = new Set(prev);
                if (next.has(entry.id)) next.delete(entry.id);
                else next.add(entry.id);
                return next;
              })
            }
            onSwipe={(open) => setSwipedId(open ? entry.id : null)}
            onDelete={() => deleteEntry(entry)}
            onRepeat={() => {
              const last = entry.sets[entry.sets.length - 1];
              if (!last) return openNewSet(entry);
              day.addSet(entry.id, last.weight_kg, last.reps);
            }}
            onOpenEditor={(setNo) =>
              setNo === null ? openNewSet(entry) : openEditSet(entry, setNo)
            }
            onRetrySet={day.retrySet}
            onDeleteSet={(setId, setNo) => {
              const res = day.removeSet(entry.id, setId);
              if (res)
                show(`${setNo}세트 삭제됨`, () =>
                  day.restoreSets(entry.id, res.snapshot, res.removed),
                );
            }}
          />
        ))}
        <div style={{ height: 4, flex: 'none' }} />
      </>
    );
  };

  return (
    <>
      <div className="gp-head">
        <BrandMark />
        <button
          type="button"
          className="gp-head__menu"
          aria-label="설정"
          onClick={() => {
            dismiss();
            onOpenSettings();
          }}
        >
          <MenuIcon />
        </button>
      </div>

      <div className="gp-head__rule" />

      <div className="gp-head__row">
        {/* 날짜 블록 전체가 캘린더 버튼이다 */}
        <button
          type="button"
          className="gp-head__date"
          onClick={() => {
            dismiss();
            setSheet({ kind: 'calendar', returnTo: null });
          }}
        >
          <span className="gp-micro">{fmtDateRel(dateKey, today)}</span>
          <span className="gp-head__title">
            {fmtDateTitle(dateKey)}
            <span className="gp-head__chev">
              <ChevronIcon size={15} />
            </span>
          </span>
        </button>
        {dayStat.sets > 0 ? (
          <div className="gp-head__stat">
            <b className="gp-num">{dayStat.ex}</b>종목 <b className="gp-num">{dayStat.sets}</b>세트,
            <br />총 <b className="gp-num">{dayStat.kg.toLocaleString()}</b>kg를 이겨냈어요!
          </div>
        ) : null}
      </div>

      <div className={`gp-strip__wrap${stripOff ? ' gp-strip__wrap--off' : ''}`}>
        <DateStrip
          dateKey={dateKey}
          todayKey={today}
          loggedDays={day.loggedDays}
          planDays={planDays}
          onSelect={setDateKey}
        />
      </div>

      <div className="gp-body gp-scroll" onScroll={onBodyScroll}>
        {plan ? (
          <div className="gp-plan">
            <div className="gp-plan__body">
              <div className="gp-plan__row">
                <span className="gp-plan__time gp-num">
                  {plan.planned_at ? fmtTime(plan.planned_at) : '하루 전체'}
                </span>
                <span className="gp-plan__title">{plan.title}</span>
              </div>
              {/* 메모가 없으면 그 줄을 아예 렌더하지 않는다 (카드 높이가 준다) */}
              {plan.memo ? <span className="gp-plan__memo">{plan.memo}</span> : null}
            </div>
            <button
              type="button"
              className="gp-plan__act"
              aria-label="일정 수정"
              onClick={openSchedule}
            >
              <PencilIcon />
            </button>
            <button
              type="button"
              className="gp-plan__act"
              aria-label="일정 삭제"
              onClick={() => {
                day.removePlan(plan);
                show('일정 삭제됨', () => day.restorePlan(plan));
              }}
            >
              <TrashIcon />
            </button>
          </div>
        ) : (
          <button type="button" className="gp-plan__add" onClick={openSchedule}>
            ＋ 일정(시간) 등록하기
          </button>
        )}

        {bodyContent()}
      </div>

      <div className="gp-foot">
        <button
          type="button"
          className="gp-foot__btn"
          onClick={() => (isFuture ? openSchedule() : openPicker())}
        >
          {isFuture ? '＋ 일정 추가' : '＋ 운동 추가'}
        </button>
        {/* 보여줄 세트가 있는 오늘·과거에만 뜬다. 미래 날짜엔 아직 기록이 없다 */}
        {canShare ? (
          <button
            type="button"
            className="gp-foot__share"
            aria-label="이 날 기록 공유하기"
            onClick={shareDay}
          >
            <ShareIcon />
          </button>
        ) : null}
      </div>

      {sheet?.kind === 'picker' ? (
        <PickerSheet
          onPick={addExercise}
          onCustom={(name) => setSheet({ kind: 'custom', name })}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {sheet?.kind === 'custom' ? (
        <CustomExerciseSheet
          initialName={sheet.name}
          onSave={saveCustomExercise}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {sheet?.kind === 'calendar' ? (
        <CalendarSheet
          dateKey={dateKey}
          loggedDays={day.loggedDays}
          planDays={planDays}
          onSelect={(key) => pickDate(key, sheet.returnTo)}
          onClose={() => setSheet(sheet.returnTo === 'schedule' ? { kind: 'schedule' } : null)}
        />
      ) : null}

      {sheet?.kind === 'schedule' ? (
        <ScheduleSheet
          dateKey={dateKey}
          draft={planDraft}
          onChange={setPlanDraft}
          onPickDate={() => setSheet({ kind: 'calendar', returnTo: 'schedule' })}
          onPickTime={() => setSheet({ kind: 'time' })}
          onSave={savePlan}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {sheet?.kind === 'time' ? (
        <TimeSheet
          value={planDraft}
          onChange={(v) => setPlanDraft({ ...planDraft, ...v })}
          onDone={() => setSheet({ kind: 'schedule' })}
        />
      ) : null}

      {editor ? (
        <SetEditorSheet
          target={editor}
          weightStep={weightStep}
          onSave={saveEditor}
          onDelete={deleteEditorSet}
          onClose={() => setEditor(null)}
        />
      ) : null}

      {snack ? <Snackbar snack={snack} onDismiss={dismiss} /> : null}

      {day.error ? (
        <div className="gp-snack" role="status">
          <span className="gp-snack__msg">{day.error}</span>
          <button type="button" className="gp-snack__undo" onClick={day.clearError}>
            닫기
          </button>
        </div>
      ) : null}
    </>
  );
}
