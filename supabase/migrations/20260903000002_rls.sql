-- RLS 정책
-- 이 앱에는 API 서버가 없다. 브라우저가 DB에 직접 붙으므로
-- 여기가 유일한 신뢰 경계다. 정책 없는 테이블 = 아무도 못 읽는 테이블.
--
-- auth.uid() 를 (select auth.uid()) 로 감싸는 이유:
-- 행마다 재평가되지 않고 한 번만 계산되어 쿼리가 빨라진다.

alter table profiles          enable row level security;
alter table exercises         enable row level security;
alter table workout_plans     enable row level security;
alter table workout_sessions  enable row level security;
alter table workout_entries   enable row level security;
alter table workout_sets      enable row level security;
alter table body_measurements enable row level security;

-- ── 프로필 ───────────────────────────────────────────────
create policy "내 프로필만" on profiles
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ── 종목 ────────────────────────────────────────────────
-- 공용 종목(owner_id null)은 모두가 읽고, 커스텀 종목은 주인만 본다.
create policy "공용 종목과 내 종목 읽기" on exercises
  for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));

-- 공용 종목은 누구도 앱에서 만들 수 없다. 시드로만 들어간다.
create policy "내 종목만 추가" on exercises
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "내 종목만 수정" on exercises
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "내 종목만 삭제" on exercises
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ── 일정 ────────────────────────────────────────────────
create policy "내 일정만" on workout_plans
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ── 세션 ────────────────────────────────────────────────
create policy "내 세션만" on workout_sessions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ── 종목 항목 ────────────────────────────────────────────
-- 자기 소유 컬럼이 없다. 상위 세션의 주인을 따라간다.
create policy "내 세션의 항목만" on workout_entries
  for all to authenticated
  using (exists (
    select 1 from workout_sessions s
    where s.id = workout_entries.session_id
      and s.user_id = (select auth.uid())))
  with check (exists (
    select 1 from workout_sessions s
    where s.id = workout_entries.session_id
      and s.user_id = (select auth.uid())));

-- ── 세트 ────────────────────────────────────────────────
create policy "내 세션의 세트만" on workout_sets
  for all to authenticated
  using (exists (
    select 1 from workout_entries e
    join workout_sessions s on s.id = e.session_id
    where e.id = workout_sets.entry_id
      and s.user_id = (select auth.uid())))
  with check (exists (
    select 1 from workout_entries e
    join workout_sessions s on s.id = e.session_id
    where e.id = workout_sets.entry_id
      and s.user_id = (select auth.uid())));

-- ── 신체 측정 ────────────────────────────────────────────
create policy "내 측정값만" on body_measurements
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
