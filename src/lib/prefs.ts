// 기기별 취향값. DB 에 컬럼이 없고 기기마다 다른 게 자연스러워 localStorage 에 둔다.
// 사파리 프라이빗 모드처럼 읽기·쓰기가 통째로 막히는 환경이 있으므로 전부 try/catch 로 감싼다.

export type Theme = 'auto' | 'light' | 'dark';

export interface Prefs {
  theme: Theme;
  /** 무게 스테퍼 한 칸 (kg). 횟수는 항상 1회 */
  weightStep: number;
}

const KEY_THEME = 'gp.theme';
const KEY_STEP = 'gp.weightStep';

export const THEMES: { key: Theme; label: string }[] = [
  { key: 'auto', label: '시스템' },
  { key: 'light', label: '라이트' },
  { key: 'dark', label: '다크' },
];

// 디자인 프롭에는 1.25 도 있지만 workout_sets.weight_kg 가 numeric(5,1) 이라
// 1.25 씩 더하면 21.25 → 21.3 으로 뭉개진다. 소수 첫째 자리에 딱 떨어지는 값만 둔다.
export const WEIGHT_STEPS = [2.5, 5];

export const DEFAULT_PREFS: Prefs = { theme: 'auto', weightStep: 2.5 };

export function themeLabel(theme: Theme): string {
  return THEMES.find((t) => t.key === theme)?.label ?? '시스템';
}

/** '2.5kg / 1회' */
export function stepLabel(step: number): string {
  return `${step}kg / 1회`;
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 저장만 못 할 뿐 이번 세션 동작에는 지장이 없다
  }
}

export function loadPrefs(): Prefs {
  const theme = read(KEY_THEME);
  const step = Number(read(KEY_STEP));
  return {
    theme: THEMES.some((t) => t.key === theme) ? (theme as Theme) : DEFAULT_PREFS.theme,
    weightStep: WEIGHT_STEPS.includes(step) ? step : DEFAULT_PREFS.weightStep,
  };
}

export function savePrefs(p: Prefs): void {
  write(KEY_THEME, p.theme);
  write(KEY_STEP, String(p.weightStep));
}

/** 토큰은 styles/tokens.css 가 data-theme 로 갈라 놓았다 */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}
