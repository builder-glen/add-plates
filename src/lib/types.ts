// DB 스키마와 1:1로 맞춘 타입. supabase/migrations/20260903000001_schema.sql 기준

export type MuscleGroup = 'chest' | 'back' | 'shoulder' | 'leg' | 'biceps' | 'triceps' | 'core';

export type SubRegion =
  | 'general'
  | 'upper_chest'
  | 'lats'
  | 'traps'
  | 'erectors'
  | 'front_delt'
  | 'side_delt'
  | 'rear_delt'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'adductors'
  | 'long_head'
  | 'rectus_abdominis'
  | 'obliques';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'kettlebell'
  | 'band'
  | 'other';

export type TrackingType = 'weight_reps' | 'bodyweight_reps';

export interface Exercise {
  id: string;
  name: string;
  chosung: string;
  aliases: string[];
  alias_chosung: string[];
  muscle_group: MuscleGroup;
  sub_region: SubRegion | null;
  equipment: Equipment;
  tracking_type: TrackingType;
  asset_slug: string | null;
  owner_id: string | null;
  is_hidden: boolean;
}

export interface WorkoutPlan {
  id: string;
  user_id: string;
  planned_on: string; // YYYY-MM-DD
  planned_at: string | null; // timestamptz
  title: string;
  memo: string | null;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  performed_on: string;
  title: string;
  started_at: string;
  plan_id: string | null;
  memo: string | null;
}

export interface WorkoutEntry {
  id: string;
  session_id: string;
  exercise_id: string;
  order_index: number;
}

export interface WorkoutSet {
  id: string;
  entry_id: string;
  set_no: number;
  weight_kg: number | null;
  reps: number;
}

// ── 화면용 파생 모델 ─────────────────────────────────────

/** 낙관적 업데이트 상태. 'ok' = 서버 확정, 'pending' = 전송 중, 'fail' = 실패(재시도 대상) */
export type SyncState = 'ok' | 'pending' | 'fail';

export interface DaySet extends WorkoutSet {
  sync: SyncState;
}

/** 지난 기록 한 줄 */
export interface LastRecord {
  date: string; // 'M/D'
  daysAgo: number;
  summary: string; // '70×8 · 70×8 · 65×6'
}

export interface DayEntry {
  id: string;
  sessionId: string;
  orderIndex: number;
  exercise: Exercise;
  sets: DaySet[];
  last: LastRecord | null;
}

export interface DaySession {
  id: string;
  title: string;
  startedAt: string;
  entries: DayEntry[];
}
