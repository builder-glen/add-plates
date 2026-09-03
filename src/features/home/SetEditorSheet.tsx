import { useState } from 'react';
import { fmtWeight } from '../../data/queries';

export interface EditorTarget {
  entryId: string;
  /** null 이면 새 세트 */
  setNo: number | null;
  setId: string | null;
  isBody: boolean;
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
  const [w, setW] = useState(target.weight);
  const [r, setR] = useState(target.reps);

  const editing = target.setNo !== null;

  return (
    <>
      <div className="gp-overlay" onClick={onClose} />
      <div className="gp-sheet" role="dialog" aria-label={editing ? '세트 고치기' : '새 세트'}>
        <div className="gp-grab" />
        <div className="gp-editor__head">
          <span className="gp-editor__title">{editing ? `${target.setNo}세트 고치기` : '새 세트'}</span>
          <span className="gp-editor__hint">
            {editing ? '값을 바꾸면 바로 저장돼요' : '담기를 누르면 다음 세트가 이 값으로 준비돼요'}
          </span>
        </div>

        {!target.isBody ? (
          <div className="gp-step">
            <button
              type="button"
              className="gp-step__btn"
              aria-label="무게 줄이기"
              onClick={() => setW((v) => Math.max(0, Math.round((v - weightStep) * 10) / 10))}
            >
              −
            </button>
            <div className="gp-step__val">
              <span className="gp-step__num gp-num">{fmtWeight(w)}</span>
              <span className="gp-step__unit">kg</span>
            </div>
            <button
              type="button"
              className="gp-step__btn"
              aria-label="무게 늘리기"
              onClick={() => setW((v) => Math.round((v + weightStep) * 10) / 10)}
            >
              ＋
            </button>
          </div>
        ) : null}

        <div className="gp-step">
          <button
            type="button"
            className="gp-step__btn"
            aria-label="횟수 줄이기"
            onClick={() => setR((v) => Math.max(1, v - 1))}
          >
            −
          </button>
          <div className="gp-step__val">
            <span className="gp-step__num gp-num">{r}</span>
            <span className="gp-step__unit">회</span>
          </div>
          <button
            type="button"
            className="gp-step__btn"
            aria-label="횟수 늘리기"
            onClick={() => setR((v) => v + 1)}
          >
            ＋
          </button>
        </div>

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
