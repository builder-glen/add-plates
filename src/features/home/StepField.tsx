import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  unit: string;
  /** 소수 첫째 자리까지 받을지 (무게는 62.5 가 있고 횟수는 없다) */
  decimal: boolean;
  min: number;
  max: number;
  label: string;
  onChange: (v: number) => void;
  onStep: (dir: -1 | 1) => void;
}

/** 표시용 — 소수점 이하가 0이면 정수로 (62.0 → 62) */
const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

/**
 * ± 스테퍼 + 직접 입력.
 *
 * 가운데 숫자를 누르면 키패드가 올라온다. 100kg 을 2.5씩 올리려면 40번을 눌러야 해서
 * 스테퍼만으로는 큰 값을 다룰 수 없다.
 *
 * 입력 중에는 문자열을 그대로 들고 있다가 확정될 때 숫자로 바꾼다.
 * 매 타이핑마다 숫자로 바꾸면 "6" 을 지우고 "62" 를 치는 중간에 값이 튄다.
 */
export function StepField({ value, unit, decimal, min, max, label, onChange, onStep }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const open = () => {
    setDraft(fmt(value));
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    const n = Number(draft);
    // 빈 칸이거나 숫자가 아니면 원래 값으로 되돌린다 — 0 으로 떨어뜨리지 않는다
    if (draft.trim() === '' || Number.isNaN(n)) return;
    const clamped = Math.min(max, Math.max(min, n));
    onChange(decimal ? Math.round(clamped * 10) / 10 : Math.round(clamped));
  };

  return (
    <div className="gp-step">
      <button type="button" className="gp-step__btn" aria-label={`${label} 줄이기`} onClick={() => onStep(-1)}>
        −
      </button>

      {editing ? (
        <div className="gp-step__val">
          <input
            ref={inputRef}
            className="gp-step__input gp-num"
            // inputMode 로 숫자 키패드를 올린다. type=number 는 iOS 에서
            // 스피너가 붙고 소수점 입력이 기기마다 달라 쓰지 않는다
            inputMode={decimal ? 'decimal' : 'numeric'}
            autoFocus
            value={draft}
            aria-label={label}
            onChange={(e) => {
              // 숫자와 점만. 소수를 안 받는 칸에서는 점도 막는다
              const cleaned = e.target.value.replace(decimal ? /[^0-9.]/g : /[^0-9]/g, '');
              setDraft(cleaned.slice(0, decimal ? 5 : 3));
            }}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                inputRef.current?.blur();
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                setEditing(false); // 되돌린다
              }
            }}
          />
          <span className="gp-step__unit">{unit}</span>
        </div>
      ) : (
        <button type="button" className="gp-step__val gp-step__val--tap" onClick={open} aria-label={`${label} 직접 입력`}>
          <span className="gp-step__num gp-num">{fmt(value)}</span>
          <span className="gp-step__unit">{unit}</span>
        </button>
      )}

      <button type="button" className="gp-step__btn" aria-label={`${label} 늘리기`} onClick={() => onStep(1)}>
        ＋
      </button>
    </div>
  );
}
