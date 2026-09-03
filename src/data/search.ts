import type { Equipment, Exercise, MuscleGroup, SubRegion } from '../lib/types';

export interface PickerFilter {
  group: MuscleGroup | null;
  sub: SubRegion | null;
  equip: Equipment | null;
}

/** 검색 결과 상한. 아래로 더 내려봐야 못 찾는다 */
export const MAX_RESULTS = 60;
/** 질의가 없을 때 보여줄 최근 사용 종목 수 */
export const MAX_RECENT = 10;

const nospace = (s: string) => s.replace(/\s+/g, '');

export function filterPool(all: Exercise[], f: PickerFilter): Exercise[] {
  return all.filter(
    (e) =>
      !e.is_hidden &&
      (!f.group || e.muscle_group === f.group) &&
      (!f.sub || e.sub_region === f.sub) &&
      (!f.equip || e.equipment === f.equip),
  );
}

/**
 * 랭킹: 이름 완전일치 1 → 이름 전방일치 2 → 초성 전방일치 3 →
 *       별칭 전방일치 4 → 이름 부분일치 5 → 초성 부분일치 6
 *
 * 질의와 대상 모두 공백을 지우고 비교한다. 그래서 'ㄹㅅㅇㅌㅇㅅㅌ' 로 '러시안 트위스트'가 잡힌다.
 * 초성(chosung / alias_chosung)은 DB에 이미 계산돼 있으므로 다시 만들지 않는다.
 * (직접 추가한 종목만 저장할 때 클라이언트에서 계산해 넣는다 — lib/chosung.ts)
 */
function score(e: Exercise, q: string, qs: string): number {
  const n = e.name.toLowerCase();
  const ns = nospace(n);
  const c = e.chosung;
  const cs = nospace(c);

  if (n === q || ns === qs) return 1;
  if (n.startsWith(q) || ns.startsWith(qs)) return 2;
  if (c.startsWith(q) || cs.startsWith(qs)) return 3;

  const aliasHit =
    e.aliases.some((a) => {
      const al = a.toLowerCase();
      return al.startsWith(q) || nospace(al).startsWith(qs);
    }) || e.alias_chosung.some((ac) => nospace(ac).startsWith(qs));
  if (aliasHit) return 4;

  if (n.includes(q) || ns.includes(qs)) return 5;
  if (c.includes(q) || cs.includes(qs)) return 6;
  return 0;
}

/** 메모리 안에서만 도는 검색. 타이핑마다 서버에 묻지 않는다 */
export function searchExercises(all: Exercise[], query: string, f: PickerFilter): Exercise[] {
  const q = query.trim().toLowerCase();
  const qs = nospace(q);
  if (!qs) return [];

  const scored: { e: Exercise; sc: number }[] = [];
  for (const e of filterPool(all, f)) {
    const sc = score(e, q, qs);
    if (sc > 0) scored.push({ e, sc });
  }
  // 같은 점수끼리는 원래 순서(이름순)를 지킨다 — Array.sort 는 안정 정렬
  scored.sort((a, b) => a.sc - b.sc);
  return scored.slice(0, MAX_RESULTS).map((x) => x.e);
}
