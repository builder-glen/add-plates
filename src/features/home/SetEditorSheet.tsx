import { useState } from 'react';
import { hasWeight, type TrackingType } from '../../lib/types';
import { WEIGHT_LABEL } from '../../lib/labels';
import { useSheetDrag } from '../../lib/useSheetDrag';
import { StepField } from './StepField';

/** 스테퍼와 직접 입력이 같은 범위를 쓰게 한 곳에 둔다 */
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export interface EditorTarget {
  entryId: string;
  /** null 이면 새 세트 */
  setNo: number | null;
  setId: string | null;
  /** 무게 칸을 그릴지, 그 칸을 뭐라 부를지 둘 다 여기서 결정된다 */
  track: TrackingType;
  weight: number;
  reps: number;
}

interface Props {
  target: EditorTarget;
  weightStep: number;
  onSave: (weight: number, reps: number) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function SetEditorSheet({ target, weightStep, onSave, onDelete, onClose }: Props) {
  const sheet = useSheetDrag(onClose);
  const [w, setW] = useState(target.weight);
  const [r, setR] = useState(target.reps);

  const editing = target.setNo !== null;

  return (
    <>
      <div className="gp-overlay" onClick={onClose} />
      <div
        className="gp-sheet"
        ref={sheet.sheetRef}
        role="dialog"
        aria-label={editing ? '세트 고치기' : '새 세트'}
      >
        <div className="gp-grab" {...sheet.handle} />
        <div className="gp-editor__head">
          <span className="gp-editor__title">{editing ? `${target.setNo}세트 고치기` : '새 세트'}</span>
          <span className="gp-editor__hint">
            {editing ? '값을 바꾸면 바로 저장돼요' : '담기를 누르면 다음 세트가 이 값으로 준비돼요'}
          </span>
        </div>

        {/* StepField 의 label 은 aria 전용이라 눈에 보이지 않는다.
            어시스트는 같은 'kg' 칸에 성격이 다른 값을 받으므로 화면에도 적어 준다. */}
        {target.track === 'assist_reps' ? (
          <div className="gp-editor__assist">
            보조 중량 <span>— 줄어들수록 성장이에요</span>
          </div>
        ) : null}

        {hasWeight(target.track) ? (
          <StepField
            value={w}
            unit="kg"
            decimal
            min={0}
            max={999}
            label={WEIGHT_LABEL[target.track]}
            onChange={setW}
            onStep={(d) =>
              setW((v) => clamp(Math.round((v + d * weightStep) * 10) / 10, 0, 999))
            }
          />
        ) : null}

        <StepField
          value={r}
          unit="회"
          decimal={false}
          min={1}
          max={999}
          label="횟수"
          onChange={setR}
          onStep={(d) => setR((v) => clamp(v + d, 1, 999))}
        />

        <div className="gp-editor__actions">
          <button type="button" className="gp-editor__save" onClick={() => onSave(w, r)}>
            {editing ? '저장' : '이 세트 담기'}
          </button>
          {editing ? (
            <button type="button" className="gp-editor__del" onClick={onDelete}>
              삭제
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}
