import { useCallback, useEffect, useRef, useState } from 'react';

export interface Snack {
  msg: string;
  action?: () => void;
  /** 액션 라벨. 대부분 되돌리기라 기본값이 '실행취소' 다 (공유 뒤에는 '미리보기') */
  label: string;
}

/** 5초 후 자동 소멸하는 스낵바 */
export function useSnack() {
  const [snack, setSnack] = useState<Snack | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const show = useCallback((msg: string, action?: () => void, label = '실행취소') => {
    clearTimeout(timer.current);
    setSnack({ msg, action, label });
    timer.current = setTimeout(() => setSnack(null), 5000);
  }, []);

  const dismiss = useCallback(() => {
    clearTimeout(timer.current);
    setSnack(null);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { snack, show, dismiss };
}

export function Snackbar({ snack, onDismiss }: { snack: Snack; onDismiss: () => void }) {
  return (
    <div className="gp-snack" role="status">
      <span className="gp-snack__msg">{snack.msg}</span>
      {snack.action ? (
        <button
          type="button"
          className="gp-snack__undo"
          onClick={() => {
            snack.action?.();
            onDismiss();
          }}
        >
          {snack.label}
        </button>
      ) : null}
    </div>
  );
}
