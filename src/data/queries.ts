import { requireSupabase } from '../lib/supabase';
import { diffDays, fmtShort } from '../lib/date';
import type {
  DayEntry,
  DaySession,
  Equipment,
  Exercise,
  LastRecord,
  MuscleGroup,
  SubRegion,
  TrackingType,
  WorkoutPlan,
  WorkoutSet,
} from '../lib/types';

/** 직접 추가 폼이 만드는 행 */
export interface NewExercise {
  name: string;
  chosung: string;
  muscle_group: MuscleGroup;
  sub_region: SubRegion;
  equipment: Equipment;
  tracking_type: TrackingType;
  owner_id: string;
}

/** 세트 요약 한 줄: '70×8 · 70×8 · 65×6' (맨몸이면 '12회') */
export function summarizeSets(sets: Pick<WorkoutSet, 'weight_kg' | 'reps'>[]): string {
  return sets.map((s) => (s.weight_kg != null ? `${fmtWeight(s.weight_kg)}×${s.reps}` : `${s.reps}회`)).join(' · ');
}

/** 70.0 -> '70', 62.5 -> '62.5' */
export function fmtWeight(w: number): string {
  return Number.isInteger(w) ? String(w) : String(Number(w.toFixed(1)));
}

interface RawSet {
  id: string;
  entry_id: string;
  set_no: number;
  weight_kg: number | null;
  reps: number;
}

interface RawEntry {
  id: string;
  session_id: string;
  exercise_id: string;
  order_index: number;
  workout_sets: RawSet[];
}

interface RawSession {
  id: string;
  title: string;
  started_at: string;
  workout_entries: RawEntry[];
}

/** 하루치 = 세션 배열. 세션이 여러 개여도 전부 읽는다 */
export async function fetchDay(
  dateKey: string,
  exercisesById: Map<string, Exercise>,
): Promise<DaySession[]> {
  const { data, error } = await requireSupabase()
    .from('workout_sessions')
    .select(
      'id, title, started_at, workout_entries(id, session_id, exercise_id, order_index, workout_sets(id, entry_id, set_no, weight_kg, reps))',
    )
    .eq('performed_on', dateKey)
    .order('started_at', { ascending: true });

  if (error) throw error;

  return ((data ?? []) as RawSession[]).map((s) => ({
    id: s.id,
    title: s.title,
    startedAt: s.started_at,
    entries: [...(s.workout_entries ?? [])]
      .sort((a, b) => a.order_index - b.order_index)
      .flatMap<DayEntry>((e) => {
        const exercise = exercisesById.get(e.exercise_id);
        if (!exercise) return []; // 종목 마스터에 없는 항목은 그리지 않는다
        return [
          {
            id: e.id,
            sessionId: s.id,
            orderIndex: e.order_index,
            exercise,
            sets: [...(e.workout_sets ?? [])]
              .sort((a, b) => a.set_no - b.set_no)
              .map((x) => ({ ...x, sync: 'ok' as const })),
            last: null,
          },
        ];
      }),
  }));
}

interface RawRecentEntry {
  exercise_id: string;
  order_index: number;
}

interface RawLastSession {
  performed_on: string;
  workout_entries: { exercise_id: string; workout_sets: RawSet[] }[];
}

/**
 * 종목별 '지난 기록' 한 줄.
 * 선택일 이전 세션을 최신순으로 훑어 종목마다 첫 히트를 쓴다.
 * (같은 날 안의 다른 세션이 아니라 이전 날짜의 기록을 본다 — PRD F-04)
 */
export async function fetchLastRecords(
  exerciseIds: string[],
  beforeDate: string,
): Promise<Map<string, LastRecord>> {
  const out = new Map<string, LastRecord>();
  if (!exerciseIds.length) return out;

  const { data, error } = await requireSupabase()
    .from('workout_sessions')
    .select('performed_on, workout_entries!inner(exercise_id, workout_sets(id, entry_id, set_no, weight_kg, reps))')
    .lt('performed_on', beforeDate)
    .in('workout_entries.exercise_id', exerciseIds)
    .order('performed_on', { ascending: false })
    .limit(60);

  if (error) throw error;

  for (const s of (data ?? []) as RawLastSession[]) {
    for (const e of s.workout_entries ?? []) {
      if (out.has(e.exercise_id)) continue;
      const sets = [...(e.workout_sets ?? [])].sort((a, b) => a.set_no - b.set_no);
      if (!sets.length) continue;
      out.set(e.exercise_id, {
        date: fmtShort(s.performed_on),
        daysAgo: Math.abs(diffDays(s.performed_on, beforeDate)),
        summary: summarizeSets(sets),
      });
    }
  }
  return out;
}

/** 스트립/캘린더 도트: 세트가 1개 이상 기록된 날 */
export async function fetchLoggedDays(from: string, to: string): Promise<Set<string>> {
  const { data, error } = await requireSupabase()
    .from('workout_sessions')
    .select('performed_on, workout_entries!inner(id, workout_sets!inner(id))')
    .gte('performed_on', from)
    .lte('performed_on', to);

  if (error) throw error;
  return new Set(((data ?? []) as { performed_on: string }[]).map((r) => r.performed_on));
}

export async function fetchPlans(from: string, to: string): Promise<WorkoutPlan[]> {
  const { data, error } = await requireSupabase()
    .from('workout_plans')
    .select('id, user_id, planned_on, planned_at, title, memo')
    .gte('planned_on', from)
    .lte('planned_on', to)
    .order('planned_on');

  if (error) throw error;
  return (data ?? []) as WorkoutPlan[];
}

// ── 쓰기 ────────────────────────────────────────────────

export async function insertSet(row: WorkoutSet): Promise<void> {
  const { error } = await requireSupabase().from('workout_sets').insert(row);
  if (error) throw error;
}

export async function updateSet(
  id: string,
  patch: { weight_kg: number | null; reps: number },
): Promise<void> {
  const { error } = await requireSupabase().from('workout_sets').update(patch).eq('id', id);
  if (error) throw error;
}

/** 세트를 지우고 뒷 번호를 당긴다. unique(entry_id,set_no) 때문에 삭제가 먼저다 */
export async function deleteSetAndRenumber(
  setId: string,
  followers: { id: string; set_no: number }[],
): Promise<void> {
  const sb = requireSupabase();
  const del = await sb.from('workout_sets').delete().eq('id', setId);
  if (del.error) throw del.error;

  for (const f of followers) {
    const { error } = await sb.from('workout_sets').update({ set_no: f.set_no }).eq('id', f.id);
    if (error) throw error;
  }
}

export async function updateSetNo(id: string, setNo: number): Promise<void> {
  const { error } = await requireSupabase()
    .from('workout_sets')
    .update({ set_no: setNo })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteEntry(entryId: string): Promise<void> {
  const { error } = await requireSupabase().from('workout_entries').delete().eq('id', entryId);
  if (error) throw error;
}

/** 실행취소 — 지웠던 종목과 세트를 같은 id 로 되돌린다 */
export async function restoreEntry(entry: DayEntry): Promise<void> {
  const sb = requireSupabase();
  const ins = await sb.from('workout_entries').insert({
    id: entry.id,
    session_id: entry.sessionId,
    exercise_id: entry.exercise.id,
    order_index: entry.orderIndex,
  });
  if (ins.error) throw ins.error;

  if (entry.sets.length) {
    const { error } = await sb.from('workout_sets').insert(
      entry.sets.map((s) => ({
        id: s.id,
        entry_id: entry.id,
        set_no: s.set_no,
        weight_kg: s.weight_kg,
        reps: s.reps,
      })),
    );
    if (error) throw error;
  }
}

export async function deletePlan(planId: string): Promise<void> {
  const { error } = await requireSupabase().from('workout_plans').delete().eq('id', planId);
  if (error) throw error;
}

export async function restorePlan(plan: WorkoutPlan): Promise<void> {
  const { error } = await requireSupabase().from('workout_plans').insert(plan);
  if (error) throw error;
}

/** 시트를 열 때 한 번 부른다. 최근에 쓴 종목 id 를 최신순으로 */
export async function fetchRecentExerciseIds(limit: number): Promise<string[]> {
  const { data, error } = await requireSupabase()
    .from('workout_sessions')
    .select('workout_entries(exercise_id, order_index)')
    .order('performed_on', { ascending: false })
    .order('started_at', { ascending: false })
    .limit(20);

  if (error) throw error;

  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of (data ?? []) as { workout_entries: RawRecentEntry[] }[]) {
    // 같은 세션 안에서는 나중에 넣은 종목이 더 최근이다
    for (const e of [...(s.workout_entries ?? [])].sort((a, b) => b.order_index - a.order_index)) {
      if (seen.has(e.exercise_id)) continue;
      seen.add(e.exercise_id);
      out.push(e.exercise_id);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

export async function insertSession(row: {
  id: string;
  user_id: string;
  performed_on: string;
  title: string;
}): Promise<void> {
  const { error } = await requireSupabase().from('workout_sessions').insert(row);
  if (error) throw error;
}

export async function insertEntry(row: {
  id: string;
  session_id: string;
  exercise_id: string;
  order_index: number;
}): Promise<void> {
  const { error } = await requireSupabase().from('workout_entries').insert(row);
  if (error) throw error;
}

/** 직접 추가한 종목. owner_id 는 RLS 가 강제하므로 반드시 넣는다 */
export async function insertExercise(row: NewExercise): Promise<Exercise> {
  const { data, error } = await requireSupabase()
    .from('exercises')
    .insert(row)
    .select(
      'id, name, chosung, aliases, alias_chosung, muscle_group, sub_region, equipment, tracking_type, asset_slug, owner_id, is_hidden',
    )
    .single();

  if (error) throw error;
  return data as Exercise;
}
