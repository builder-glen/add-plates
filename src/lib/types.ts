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

export type TrackingType = 'weight_reps' | 'bodyweight_reps' | 'assist_reps';

/**
 * 무게 칸을 보여줄지. 어시스트 머신도 숫자를 받는다 — 단위가 '보조 kg' 일 뿐이다.
 *
 * 볼륨 포함 여부(countsVolume)와 반드시 분리해서 써야 한다.
 * 어시스트는 무게는 받지만 볼륨에는 안 들어간다. 예전 isBody 불리언 하나로는 이게 표현이 안 됐다.
 */
export const hasWeight = (t: TrackingType) => t !== 'bodyweight_reps';

/**
 * 일일 총 볼륨(kg)에 더할지.
 * 어시스트 머신의 무게추는 몸을 "덜어주는" 힘이라 더하면 부호가 거꾸로 된다.
 */
export const countsVolume = (t: TrackingType) => t === 'weight_reps';

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
  /** 1세트 값. 새 세트 스테퍼의 초기값으로 쓴다 (맨몸이면 weightKg 가 null) */
  first: { weightKg: number | null; reps: number };
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

/** 신체 측정 한 건. 체중·골격근량·체지방률은 전부 선택 입력이다 */
export interface BodyMeasurement {
  id: string;
  user_id: string;
  measured_at: string; // timestamptz — 같은 날 두 번 재면 시간으로 구분한다
  weight_kg: number | null;
  skeletal_muscle_kg: number | null;
  body_fat_pct: number | null; // 체지방'률' %. kg 이 아니다
}
