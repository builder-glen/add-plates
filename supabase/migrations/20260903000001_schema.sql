-- gym-points 스키마
-- PRD.md 기능 1~10 / DESIGN.md 4절 기준
-- 하루 복수 세션 허용, 일정과 기록은 별개(nullable 연결)

-- ── 타입 ────────────────────────────────────────────────
create type muscle_group as enum (
  'chest','back','shoulder','leg','biceps','triceps','core'
);

-- 세부 부위. muscle-subregions.md 에서 근거가 확인된 값만 둔다.
-- 근거 부족으로 뺀 값: 아랫가슴·중간가슴, 이두 장두/단두, 삼두 외측두·내측두, 상/하복부
create type sub_region as enum (
  'general',                                        -- 특정 부위로 좁혀지지 않음
  'upper_chest',                                    -- 가슴
  'lats','traps','erectors',                        -- 등
  'front_delt','side_delt','rear_delt',             -- 어깨
  'quads','hamstrings','glutes','calves','adductors', -- 하체
  'long_head',                                      -- 삼두
  'rectus_abdominis','obliques'                     -- 코어
);

create type equipment as enum (
  'barbell','dumbbell','machine','cable','bodyweight','kettlebell','band','other'
);

-- 기록 방식. 유산소·시간 기반은 범위 밖이므로 지금은 2종.
-- 나중에 'duration' 을 추가하면 플랭크 계열 20종목이 일러스트째 들어온다 (exercises.md 참조)
create type tracking_type as enum ('weight_reps','bodyweight_reps');

-- ── 프로필 (신장 등 잘 안 바뀌는 값) ──────────────────────
create table profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  height_cm  numeric(4,1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 종목 마스터 ──────────────────────────────────────────
create table exercises (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  chosung       text not null,                    -- 'ㅂㅊㅍㄹㅅ' — 저장 시 계산해 둔다
  aliases       text[] not null default '{}',
  alias_chosung text[] not null default '{}',     -- 별칭도 초성으로 찾을 수 있어야 한다
  muscle_group  muscle_group not null,
  sub_region    sub_region,                       -- null = 미분류. 'general' 과 다르다
  equipment     equipment not null,
  tracking_type tracking_type not null,
  asset_slug    text,                             -- workout-guide 일러스트 키. null = 그림 없음
  owner_id      uuid references auth.users(id) on delete cascade,  -- null = 공용 기본 종목
  is_hidden     boolean not null default false,   -- 기록에 쓰인 커스텀 종목은 삭제 대신 숨김
  created_at    timestamptz not null default now()
);
-- 공용 종목끼리, 그리고 한 사용자의 커스텀 종목끼리 이름이 겹치지 않게
create unique index exercises_unique_name
  on exercises (coalesce(owner_id::text,'global'), name);
create index exercises_owner_idx on exercises (owner_id);

-- ── 운동 일정 (계획) ─────────────────────────────────────
-- 기록과 별개로 존재한다. 일정만 잡고 안 갈 수도, 일정 없이 운동할 수도 있다.
create table workout_plans (
  user_id    uuid not null references auth.users(id) on delete cascade,
  id         uuid primary key default gen_random_uuid(),
  planned_on date not null,
  planned_at timestamptz,                         -- 시간까지 정했으면
  title      text not null,
  memo       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workout_plans_user_date_idx on workout_plans (user_id, planned_on);

-- ── 운동 세션 (하루 여러 번 가능) ────────────────────────
create table workout_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  performed_on date not null,
  title        text not null,                     -- '오전 운동' — 시각 보고 자동 부여
  started_at   timestamptz not null default now(),-- 같은 날 세션 정렬 기준
  plan_id      uuid references workout_plans(id) on delete set null,  -- 일정에서 시작했으면
  memo         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index workout_sessions_user_date_idx
  on workout_sessions (user_id, performed_on, started_at);
-- 일정 하나에 세션 하나만 연결한다
create unique index workout_sessions_plan_uniq
  on workout_sessions (plan_id) where plan_id is not null;

-- ── 세션 안의 종목 ───────────────────────────────────────
create table workout_entries (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references workout_sessions(id) on delete cascade,
  exercise_id uuid not null references exercises(id),
  order_index int not null,
  created_at  timestamptz not null default now()
);
create index workout_entries_session_idx  on workout_entries (session_id);
create index workout_entries_exercise_idx on workout_entries (exercise_id);  -- 직전 기록 조회용

-- ── 세트 (최소 기록 단위) ────────────────────────────────
create table workout_sets (
  id        uuid primary key default gen_random_uuid(),
  entry_id  uuid not null references workout_entries(id) on delete cascade,
  set_no    int not null,
  weight_kg numeric(5,1),                         -- 맨몸 종목은 null (0 아님)
  reps      int not null check (reps > 0),
  unique (entry_id, set_no)
);

-- ── 신체 측정 이력 ───────────────────────────────────────
-- 전부 선택 입력. 아무것도 안 넣어도 앱이 동작해야 한다.
create table body_measurements (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  measured_at        timestamptz not null default now(),  -- 같은 날 두 번 재도 둘 다 남는다
  weight_kg          numeric(4,1),
  skeletal_muscle_kg numeric(4,1),
  body_fat_pct       numeric(4,1),   -- 체지방률 %. 0~100
  created_at         timestamptz not null default now()
);
create index body_measurements_user_idx on body_measurements (user_id, measured_at desc);

-- ── updated_at 자동 갱신 ────────────────────────────────
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_touch         before update on profiles
  for each row execute function touch_updated_at();
create trigger workout_plans_touch    before update on workout_plans
  for each row execute function touch_updated_at();
create trigger workout_sessions_touch before update on workout_sessions
  for each row execute function touch_updated_at();
