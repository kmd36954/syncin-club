interface SyncInLogoProps {
  height?: number;
  className?: string;
}

export default function SyncInLogo({ height = 40, className }: SyncInLogoProps) {
  const id = `gold-${height}`;
  return (
    <svg
      viewBox="0 0 40 40"
      height={height}
      width={height}
      fill="none"
      className={className}
      aria-label="SyncIn Club logo"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#AA801E" />
        </linearGradient>
      </defs>
      {/* S-curve: journey route from top-right flowing to bottom-left */}
      <path
        d="M28 8 C36 8 36 19 20 20 C4 21 4 32 12 32"
        stroke={`url(#${id})`}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      {/* Crossing diagonal: the X / synergy / two paths meeting */}
      <path
        d="M8 9 L32 31"
        stroke={`url(#${id})`}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
