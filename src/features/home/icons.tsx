// 아이콘은 전부 인라인 SVG (24×24 viewBox, stroke 1.7~2, round cap)

interface IconProps {
  size?: number;
}

export function CalendarIcon({ size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <rect x="3.4" y="5.2" width="17.2" height="15.4" rx="3.4" />
      <path d="M8.2 3.3v3.6M15.8 3.3v3.6M3.4 10.4h17.2" />
      <circle cx="8.7" cy="14.4" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="12" cy="14.4" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function GearIcon({ size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3.3" />
      <circle cx="12" cy="12" r="7.7" strokeDasharray="2.5 3.2" />
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
