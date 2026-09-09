-- 어시스트(보조 중량) 머신용 기록 방식 추가
--
-- 어시스트 풀업/친업/딥스 머신은 무게추가 사용자 체중을 "덜어준다".
-- 보조 60kg → 35kg 이 성장이므로 무게 축의 방향이 weight_reps 와 반대다.
-- weight_reps 로 받으면 일일 총 볼륨(HomeScreen dayStat)이 거꾸로 오염된다.
--
-- ALTER TYPE ... ADD VALUE 로 추가한 값은 같은 트랜잭션 안에서 쓸 수 없다.
-- 그래서 값 추가와 데이터 반영을 두 파일로 나눈다.
alter type tracking_type add value if not exists 'assist_reps';
