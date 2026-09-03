-- 체지방을 kg → % 로 정정
-- 인바디 결과지도, 디자인의 '내 정보' 화면도 체지방"률"(%)을 쓴다.
-- 최초 스키마에서 kg로 잘못 잡았다. 데이터가 아직 없어 지금이 가장 싸다.
alter table body_measurements rename column body_fat_kg to body_fat_pct;
alter table body_measurements add constraint body_fat_pct_range
  check (body_fat_pct is null or (body_fat_pct >= 0 and body_fat_pct <= 100));
