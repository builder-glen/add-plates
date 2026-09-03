import type { Equipment, MuscleGroup, SubRegion } from './types';

export const MUSCLE_LABEL: Record<MuscleGroup, string> = {
  chest: '가슴',
  back: '등',
  shoulder: '어깨',
  leg: '하체',
  biceps: '이두',
  triceps: '삼두',
  core: '코어',
};

/** 'general' 은 특정 부위로 좁혀지지 않는다 → 칩을 그리지 않는다 */
export const SUB_LABEL: Record<SubRegion, string | null> = {
  general: null,
  upper_chest: '윗가슴',
  lats: '광배',
  traps: '승모',
  erectors: '기립근',
  front_delt: '전면',
  side_delt: '측면',
  rear_delt: '후면',
  quads: '대퇴사두',
  hamstrings: '햄스트링',
  glutes: '엉덩이',
  calves: '종아리',
  adductors: '내전근',
  long_head: '삼두 장두',
  rectus_abdominis: '복근',
  obliques: '옆구리',
};

export const EQUIP_LABEL: Record<Equipment, string> = {
  barbell: '바벨',
  dumbbell: '덤벨',
  machine: '머신',
  cable: '케이블',
  bodyweight: '맨몸',
  kettlebell: '케틀벨',
  band: '밴드',
  other: '기타',
};

/** 부위별 hue. 칩 색은 CSS 에서 oklch(L C var(--chip-h)) 로 계산한다 */
export const MUSCLE_HUE: Record<MuscleGroup, number> = {
  chest: 28,
  back: 152,
  shoulder: 248,
  leg: 312,
  biceps: 78,
  triceps: 196,
  core: 100,
};
