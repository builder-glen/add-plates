import { useMemo } from 'react';
import { DOW, addDays, fmtMonthTitle, fromKey, monthGridStart } from '../../lib/date';
import { useSheetDrag } from '../../lib/useSheetDrag';
import '../../styles/plan.css';

/** 5주 = 35칸 고정 */
const CELLS = 35;

interface Props {
  dateKey: string;
  loggedDays: Set<string>;
  planDays: Set<string>;
  onSelect: (key: string) => void;
  onClose: () => void;
}

export function CalendarSheet({ dateKey, loggedDays, planDays, onSelect, onClose }: Props) {
  const monthKey = dateKey.slice(0, 7);
  const sheet = useSheetDrag(onClose);

  const cells = useMemo(() => {
    const start = monthGridStart(monthKey);
    return Array.from({ length: CELLS }, (_, i) => {
      const key = addDays(start, i);
      return { key, day: fromKey(key).getDate(), inMonth: key.slice(0, 7) === monthKey };
    });
  }, [monthKey]);

  // 화면에 하드코딩된 통계를 두지 않는다 — 실제 기록에서 센다
  const doneCount = useMemo(
    () => [...loggedDays].filter((k) => k.startsWith(monthKey)).length,
    [loggedDays, monthKey],
  );

  return (
    <>
      <div className="gp-overlay" onClick={onClose} />
      <div className="gp-sheet" ref={sheet.sheetRef} role="dialog" aria-label="캘린더">
        <div className="gp-grab" {...sheet.handle} />

        <div className="gp-cal__head">
          <span className="gp-cal__title">{fmtMonthTitle(monthKey)}</span>
          <span className="gp-cal__count">
            {doneCount ? `이번 달 ${doneCount}번 운동했어요` : '이번 달은 아직 기록이 없어요'}
          </span>
        </div>

        <div className="gp-cal__dow">
          {DOW.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        <div className="gp-cal__grid">
          {cells.map((c) => {
            const on = c.key === dateKey;
            const done = loggedDays.has(c.key);
            const plan = planDays.has(c.key);
            return (
              <button
                key={c.key}
                type="button"
                className={`gp-cal__cell${on ? ' gp-cal__cell--on' : ''}${
                  c.inMonth ? '' : ' gp-cal__cell--out'
                }`}
                aria-current={on ? 'date' : undefined}
                onClick={() => onSelect(c.key)}
              >
                <span className="gp-cal__day gp-num">{c.day}</span>
                <span
                  className={`gp-cal__dot${done ? ' gp-cal__dot--done' : plan ? ' gp-cal__dot--plan' : ''}`}
                />
              </button>
            );
          })}
        </div>

        <div className="gp-cal__legend">
          <span>
            <i className="gp-cal__dot gp-cal__dot--done" />
            운동한 날
          </span>
          <span>
            <i className="gp-cal__dot gp-cal__dot--plan" />
            예정
          </span>
        </div>
      </div>
    </>
  );
}
