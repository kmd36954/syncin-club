/**
 * PuzzleLogo — two upward-pointing interlocking puzzle piece rectangles
 * Left piece:  Bronze Gold  #B8860B
 * Right piece: Champagne Gold #D4AF37
 * The pieces interlock via a side tab (left's tab fits right's notch).
 * Each piece also has a rounded knob pointing UP at the top.
 */
interface PuzzleLogoProps {
  size?: number;
}

export function PuzzleLogo({ size = 32 }: PuzzleLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      {/* ── Left piece (Bronze Gold #B8860B) ──────────────────────
          Body: x 1–18, y 10–35
          Top knob (upward): Q-bezier at top, peaking at y=2
          Right side tab (protrudes right into right piece): Q-bezier at y≈17→26
      ────────────────────────────────────────────────────────── */}
      <path
        d="
          M 1,35
          L 1,10
          L 5,10
          Q 9.5,2 14,10
          L 18,10
          L 18,16
          Q 23,21 18,26
          L 18,35
          Z
        "
        fill="#B8860B"
      />

      {/* Shine overlay on left piece */}
      <path
        d="M 1,35 L 1,10 L 5,10 Q 9.5,2 14,10 L 18,10 L 18,16 Q 23,21 18,26 L 18,35 Z"
        fill="url(#shineL)"
        opacity="0.22"
      />

      {/* ── Right piece (Champagne Gold #D4AF37) ──────────────────
          Body: x 22–39, y 10–35
          Top knob (upward): Q-bezier at top, peaking at y=2
          Left notch (concave, accepts left piece's tab): Q-bezier at y≈16→26
      ────────────────────────────────────────────────────────── */}
      <path
        d="
          M 22,35
          L 22,26
          Q 17,21 22,16
          L 22,10
          L 26,10
          Q 30.5,2 35,10
          L 39,10
          L 39,35
          Z
        "
        fill="#D4AF37"
      />

      {/* Shine overlay on right piece */}
      <path
        d="M 22,35 L 22,26 Q 17,21 22,16 L 22,10 L 26,10 Q 30.5,2 35,10 L 39,10 L 39,35 Z"
        fill="url(#shineR)"
        opacity="0.18"
      />

      <defs>
        <linearGradient id="shineL" x1="1" y1="2" x2="18" y2="35" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="white" stopOpacity="0.7" />
          <stop offset="60%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="shineR" x1="22" y1="2" x2="39" y2="35" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="white" stopOpacity="0.6" />
          <stop offset="60%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
