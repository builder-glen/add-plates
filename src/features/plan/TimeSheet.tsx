import { useEffect, useRef } from 'react';
import { useSheetDrag } from '../../lib/useSheetDrag';
import '../../styles/plan.css';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
/** 헬스장에서 쓰는 단위만. 1분 단위는 필요 없다 */
const MINUTES = [0, 10, 15, 20, 30, 40, 45, 50];

export interface TimeValue {
  allDay: boolean;
  hour: number;
  min: number;
}

interface Props {
  value: TimeValue;
  onChange: (next: TimeValue) => void;
  /** '확인' — 일정 폼으로 돌아간다 */
  onDone: () => void;
}

/** 선택한 항목이 보이도록 휠을 미리 굴려 둔다 (19시가 스크롤 밖에 있으면 못 고른다) */
function useScrollToSelected(index: number) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    const item = el?.children[index] as HTMLElement | undefined;
    if (!el || !item) return;
    el.scrollTop = Math.max(0, item.offsetTop - el.clientHeight / 2 + item.offsetHeight / 2);
    // 열 때 한 번만. 이후 선택은 이미 화면 안에 있다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ref;
}

export function TimeSheet({ value, onChange, onDone }: Props) {
  const sheet = useSheetDrag(onDone);
  const hourRef = useScrollToSelected(HOURS.indexOf(value.hour));
  const minRef = useScrollToSelected(Math.max(0, MINUTES.indexOf(value.min)));

  const label = value.allDay
    ? '종일'
    : `${String(value.hour).padStart(2, '0')}:${String(value.min).padStart(2, '0')}`;

  return (
    <>
      <div className="gp-overlay" onClick={onDone} />
      <div
        className="gp-sheet gp-sheet--time"
        ref={sheet.sheetRef}
        role="dialog"
        aria-label="시간 선택"
      >
        <div className="gp-grab" {...sheet.handle} />

        <div className="gp-time__head">
          <span className="gp-time__title">시간 선택</span>
          <button
            type="button"
            className={`gp-time__allday${value.allDay ? ' gp-time__allday--on' : ''}`}
            aria-pressed={value.allDay}
            onClick={() => onChange({ ...value, allDay: !value.allDay })}
          >
            종일
          </button>
        </div>

        <div className={`gp-time__wheels${value.allDay ? ' gp-time__wheels--off' : ''}`}>
          <div className="gp-time__wheel gp-scroll" ref={hourRef}>
            {HOURS.map((h) => (
              <button
                key={h}
                type="button"
                className={`gp-time__opt${value.hour === h ? ' gp-time__opt--on' : ''}`}
                // 휠에서 시간을 고르면 종일은 자동으로 풀린다
                onClick={() => onChange({ allDay: false, hour: h, min: value.min })}
              >
                {String(h).padStart(2, '0')}
              </button>
            ))}
          </div>
          <div className="gp-time__wheel gp-scroll" ref={minRef}>
            {MINUTES.map((m) => (
              <button
                key={m}
                type="button"
                className={`gp-time__opt${value.min === m ? ' gp-time__opt--on' : ''}`}
                onClick={() => onChange({ allDay: false, hour: value.hour, min: m })}
              >
                {String(m).padStart(2, '0')}
              </button>
            ))}
          </div>
        </div>

        <div className="gp-time__label gp-num">{label}</div>

        <button type="button" className="gp-plan__save" onClick={onDone}>
          확인
        </button>
      </div>
    </>
  );
}
