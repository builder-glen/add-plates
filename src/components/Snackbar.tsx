import { useCallback, useEffect, useRef, useState } from 'react';

export interface Snack {
  msg: string;
  undo?: () => void;
}

/** 5초 후 자동 소멸하는 스낵바 */
export function useSnack() {
  const [snack, setSnack] = useState<Snack | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const show = useCallback((msg: string, undo?: () => void) => {
    clearTimeout(timer.current);
    setSnack({ msg, undo });
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
      {snack.undo ? (
        <button
          type="button"
          className="gp-snack__undo"
          onClick={() => {
            snack.undo?.();
            onDismiss();
          }}
        >
          실행취소
        </button>
      ) : null}
    </div>
  );
}
