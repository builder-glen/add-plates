/** 되돌릴 수 없는 삭제 앞에 세우는 중앙 모달. 취소(중립) / 삭제(--warn) */
export interface Confirm {
  title: string;
  body: string;
  /** 위험한 동작이 아니면 버튼 글자를 바꿔 쓴다 (기본 '삭제') */
  okLabel?: string;
  onOk: () => void;
}

export function ConfirmDialog({ confirm, onCancel }: { confirm: Confirm; onCancel: () => void }) {
  return (
    <>
      <div className="gp-overlay gp-overlay--dialog" onClick={onCancel} />
      <div className="gp-confirm" role="dialog" aria-label={confirm.title}>
        <span className="gp-confirm__title">{confirm.title}</span>
        <span className="gp-confirm__body">{confirm.body}</span>
        <div className="gp-confirm__actions">
          <button type="button" className="gp-confirm__cancel" onClick={onCancel}>
            취소
          </button>
          <button
            type="button"
            className="gp-confirm__ok"
            onClick={() => {
              confirm.onOk();
              onCancel();
            }}
          >
            {confirm.okLabel ?? '삭제'}
          </button>
        </div>
      </div>
    </>
  );
}
