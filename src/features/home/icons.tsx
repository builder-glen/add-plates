// 아이콘은 전부 인라인 SVG (24×24 viewBox, stroke 1.7~2, round cap)

interface IconProps {
  size?: number;
}

/** dots=false 는 작게 쓸 때(일정 폼 필드 15px). 점이 뭉개진다 */
export function CalendarIcon({ size = 24, dots = true }: IconProps & { dots?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={dots ? '1.7' : '1.8'}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <rect x="3.4" y="5.2" width="17.2" height="15.4" rx="3.4" />
      <path d="M8.2 3.3v3.6M15.8 3.3v3.6M3.4 10.4h17.2" />
      {dots ? (
        <>
          <circle cx="8.7" cy="14.4" r="1.15" fill="currentColor" stroke="none" />
          <circle cx="12" cy="14.4" r="1.15" fill="currentColor" stroke="none" />
        </>
      ) : null}
    </svg>
  );
}

export function ClockIcon({ size = 15 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 7.6V12l3.1 1.9" />
    </svg>
  );
}

/** 햄버거 — 헤더 1행 우측(설정) */
export function MenuIcon({ size = 22 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 7.5h16M4 12h16M4 16.5h16" />
    </svg>
  );
}

export function ChevronIcon({ size = 11 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5.5 9.2 12 15.4l6.5-6.2" />
    </svg>
  );
}

export function TrashIcon({ size = 19 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4.6 7h14.8M9.6 7V4.9h4.8V7M6.7 7l1 12.3h8.6L17.3 7M10.6 10.6v5.9M13.4 10.6v5.9" />
    </svg>
  );
}

export function PencilIcon({ size = 19 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 19h3.2L19 8.2a2.26 2.26 0 0 0-3.2-3.2L5 15.8V19Z" />
      <path d="M14.6 6.6l2.8 2.8" />
    </svg>
  );
}

export function XIcon({ size = 14 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6.4 6.4l11.2 11.2M17.6 6.4L6.4 17.6" />
    </svg>
  );
}

/** 자 — 키 입력 행 */
export function RulerIcon({ size = 17 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3.4v17.2M8.6 5.6 12 3.4l3.4 2.2M8.6 18.4 12 20.6l3.4-2.2M6 9h12M6 12h12M6 15h12" />
    </svg>
  );
}
