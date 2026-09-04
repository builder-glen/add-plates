import { useState } from 'react';
import '../../styles/picker.css';
import '../../styles/settings.css';

/** 빈 칸은 0 이 아니라 null 이다 — '안 쟀다'와 '0kg'은 다르다 */
function num(s: string): number | null {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

interface Props {
  /** 체중만 필수. 나머지는 아는 것만 */
  onSave: (weightKg: number, muscleKg: number | null, fatPct: number | null) => void;
  onClose: () => void;
}

export function MeasureSheet({ onSave, onClose }: Props) {
  const [weight, setWeight] = useState('');
  const [muscle, setMuscle] = useState('');
  const [fat, setFat] = useState('');

  const w = num(weight);
  const sm = num(muscle);
  const bf = num(fat);
  // 체지방률은 %다. 범위를 벗어난 값은 DB 가 거절하므로 여기서 먼저 막는다
  const fatBad = bf != null && (bf < 0 || bf > 100);
  const canSave = w != null && w > 0 && !fatBad;

  return (
    <>
      <div className="gp-overlay gp-overlay--dialog" onClick={onClose} />
      <div className="gp-sheet gp-sheet--meas" role="dialog" aria-label="측정 기록">
        <div className="gp-grab" />
        <span className="gp-custom__title">측정 기록</span>

        <div className="gp-field">
          <span className="gp-field__label">체중 (kg)</span>
          <input
            className="gp-input gp-input--big gp-num"
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="74.2"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            aria-label="체중"
          />
        </div>

        <div className="gp-meas__row">
          <div className="gp-field">
            <span className="gp-field__label">골격근량 (kg)</span>
            <input
              className="gp-input gp-num"
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="선택"
              value={muscle}
              onChange={(e) => setMuscle(e.target.value)}
              aria-label="골격근량"
            />
          </div>
          <div className="gp-field">
            <span className="gp-field__label">체지방률 (%)</span>
            <input
              className="gp-input gp-num"
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="선택"
              value={fat}
              onChange={(e) => setFat(e.target.value)}
              aria-label="체지방률"
            />
          </div>
        </div>

        <span className={`gp-field__hint${fatBad ? ' gp-field__hint--warn' : ''}`}>
          {fatBad
            ? '체지방률은 0~100 사이의 %예요.'
            : '체중만 넣어도 저장돼요. 증감은 직전 측정과 비교해서 알아서 계산해요.'}
        </span>

        <div className="gp-meas__actions">
          <button type="button" className="gp-meas__cancel" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="gp-custom__save"
            disabled={!canSave}
            onClick={() => canSave && w != null && onSave(w, sm, bf)}
          >
            저장
          </button>
        </div>
      </div>
    </>
  );
}
