import '../../styles/picker.css';
import '../../styles/settings.css';

/**
 * 값 하나를 고르는 작은 시트. 테마와 무게 조절 단위가 같은 모양을 쓴다.
 * 디자인에는 설정 행(`값 ›`)만 있고 고르는 화면이 없어, 앱의 다른 선택 UI(직접 추가 폼의 옵션 칩)를 그대로 따랐다.
 */
interface Props<T extends string | number> {
  title: string;
  options: { key: T; label: string }[];
  value: T;
  onPick: (v: T) => void;
  onClose: () => void;
}

export function OptionSheet<T extends string | number>({
  title,
  options,
  value,
  onPick,
  onClose,
}: Props<T>) {
  return (
    <>
      <div className="gp-overlay gp-overlay--dialog" onClick={onClose} />
      <div className="gp-sheet gp-sheet--meas" role="dialog" aria-label={title}>
        <div className="gp-grab" />
        <span className="gp-custom__title">{title}</span>
        <div className="gp-opts--wide">
          {options.map((o) => (
            <button
              key={String(o.key)}
              type="button"
              className={`gp-opt gp-opt--wide${o.key === value ? ' gp-opt--on' : ''}`}
              onClick={() => {
                onPick(o.key);
                onClose();
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
