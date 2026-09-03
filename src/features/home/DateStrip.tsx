import { useEffect, useMemo, useRef } from 'react';
import { DOW, addDays, diffDays, fromKey } from '../../lib/date';
import { useDragScroll } from '../../lib/useDragScroll';
import { STRIP_RADIUS } from '../../data/useDayData';

const CHIP = 44;
const GAP = 5;
const PAD_LEFT = 18;

interface Props {
  dateKey: string;
  todayKey: string;
  loggedDays: Set<string>;
  planDays: Set<string>;
  onSelect: (key: string) => void;
}

export function DateStrip({ dateKey, todayKey, loggedDays, planDays, onSelect }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const centered = useRef<string | null>(null);
  const dragScroll = useDragScroll();

  // 범위는 항상 오늘 기준으로 고정한다 (선택일 기준이면 칩이 따라 움직인다)
  const days = useMemo(() => {
    const out: { key: string; dow: string; day: number }[] = [];
    for (let i = -STRIP_RADIUS; i <= STRIP_RADIUS; i++) {
      const key = addDays(todayKey, i);
      const d = fromKey(key);
      out.push({ key, dow: DOW[d.getDay()], day: d.getDate() });
    }
    return out;
  }, [todayKey]);

  // 선택한 칩을 가운데로
  useEffect(() => {
    const el = ref.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    if (centered.current === dateKey) return;
    const first = centered.current === null;
    centered.current = dateKey;

    const idx = STRIP_RADIUS + diffDays(dateKey, todayKey);
    const left = Math.max(0, PAD_LEFT + idx * (CHIP + GAP) + CHIP / 2 - el.clientWidth / 2);
    if (first || !el.scrollTo) el.scrollLeft = left;
    else el.scrollTo({ left, behavior: 'smooth' });
  }, [dateKey, todayKey]);

  return (
    <div className="gp-strip gp-scroll" ref={ref} {...dragScroll}>
      {days.map((d) => {
        const on = d.key === dateKey;
        const done = loggedDays.has(d.key);
        const plan = planDays.has(d.key);
        return (
          <button
            key={d.key}
            type="button"
            className={`gp-strip__day${on ? ' gp-strip__day--on' : ''}`}
            aria-current={on ? 'date' : undefined}
            onClick={() => onSelect(d.key)}
          >
            <span className="gp-strip__dow">{d.dow}</span>
            <span className="gp-strip__num gp-num">{d.day}</span>
            <span
              className={`gp-strip__dot${done ? ' gp-strip__dot--done' : plan ? ' gp-strip__dot--plan' : ''}`}
            />
          </button>
        );
      })}
    </div>
  );
}
