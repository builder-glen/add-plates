export const DOW = ['일', '월', '화', '수', '목', '금', '토'];

/** Date -> 'YYYY-MM-DD' (로컬 기준. toISOString 은 UTC 라 하루가 밀린다) */
export function toKey(d: Date): string {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): string {
  return toKey(new Date());
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

/** 기준일(today) 대비 며칠 차이인지. 음수면 과거 */
export function diffDays(key: string, base: string): number {
  return Math.round((fromKey(key).getTime() - fromKey(base).getTime()) / 86400000);
}

/** '9월 3일 목요일' */
export function fmtDateTitle(key: string): string {
  const d = fromKey(key);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${DOW[d.getDay()]}요일`;
}

/** '오늘' / '3일 전' / '2일 뒤' */
export function fmtDateRel(key: string, base: string): string {
  const n = diffDays(key, base);
  if (n === 0) return '오늘';
  return n > 0 ? `${n}일 뒤` : `${Math.abs(n)}일 전`;
}

/** '9/1' */
export function fmtShort(key: string): string {
  const d = fromKey(key);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** timestamptz -> 'HH:MM' */
export function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
