import type { WorkoutPlan } from './types';

/** Date -> '20260903T193000' (구글 캘린더는 Z 가 없으면 사용자 캘린더 시간대로 읽는다) */
function stamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `T${p(d.getHours())}${p(d.getMinutes())}00`
  );
}

/** 시간을 정한 일정의 길이. 디자인에 종료 시각이 없어 1시간으로 둔다 */
const DEFAULT_MINUTES = 60;

/**
 * 구글 캘린더 일정 만들기 링크.
 * 종일은 'YYYYMMDD/YYYYMMDD', 시간 지정은 'YYYYMMDDTHHMMSS/…' 형식이다.
 */
export function googleCalendarUrl(plan: WorkoutPlan): string {
  let dates: string;
  if (plan.planned_at) {
    const start = new Date(plan.planned_at);
    const end = new Date(start.getTime() + DEFAULT_MINUTES * 60000);
    dates = `${stamp(start)}/${stamp(end)}`;
  } else {
    const day = plan.planned_on.replace(/-/g, '');
    dates = `${day}/${day}`;
  }

  const params = new URLSearchParams({ action: 'TEMPLATE', text: plan.title, dates });
  if (plan.memo) params.set('details', plan.memo);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
