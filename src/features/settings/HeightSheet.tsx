import { useState } from 'react';
import { useSheetDrag } from '../../lib/useSheetDrag';
import '../../styles/picker.css';
import '../../styles/settings.css';

interface Props {
  /** 이미 저장된 키. 없으면 빈 입력으로 연다 */
  initial: number | null;
  onSave: (cm: number) => void;
  onClose: () => void;
}

export function HeightSheet({ initial, onSave, onClose }: Props) {
  const sheet = useSheetDrag(onClose);
  const [value, setValue] = useState(initial != null ? String(initial) : '');

  const cm = parseFloat(value);
  const canSave = Number.isFinite(cm) && cm > 0;

  return (
    <>
      <div className="gp-overlay gp-overlay--dialog" onClick={onClose} />
      <div className="gp-sheet gp-sheet--meas" ref={sheet.sheetRef} role="dialog" aria-label="키 입력">
        <div className="gp-grab" {...sheet.handle} />
        <span className="gp-custom__title">키 입력</span>

        <div className="gp-field">
          <span className="gp-field__label">신장 (cm)</span>
          <input
            className="gp-input gp-input--big gp-num"
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="178"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label="신장"
          />
        </div>

        <span className="gp-field__hint">
          한 번만 넣어두면 BMI를 같이 계산해요. 나중에 언제든 바꿀 수 있어요.
        </span>

        <div className="gp-meas__actions">
          <button type="button" className="gp-meas__cancel" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="gp-custom__save"
            disabled={!canSave}
            onClick={() => canSave && onSave(cm)}
          >
            저장
          </button>
        </div>
      </div>
    </>
  );
}
