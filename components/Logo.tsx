type LogoProps = { size?: number; className?: string; label?: string };

// Inline SVG logo. Rendered as markup (not an <img src="/icon.svg">) so it paints with the
// HTML/hydration instead of triggering a separate, late, low-priority network request — and so
// its box is always sized (no layout shift). Mirrors public/icon.svg.
export function Logo({ size = 160, className, label }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 192 192"
      width={size}
      height={size}
      className={className}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <rect width="192" height="192" rx="42" fill="#030712" />
      <path
        d="M 60 48 Q 96 44 132 48 L 124 150 C 123 154 119 157 114 157 L 78 157 C 73 157 69 154 68 150 Z"
        fill="none"
        stroke="#f59e0b"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path d="M 60 48 Q 72 38 85 43 Q 100 38 115 45 Q 125 40 132 48 Z" fill="#f59e0b" />
      <path
        d="M 65 60 L 127 60 L 120 148 C 119.5 151 117 152 114 152 L 78 152 C 75 152 72.5 151 72 148 Z"
        fill="#f59e0b"
      />
      <text
        x="96"
        y="130"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="64"
        fontWeight="900"
        fill="#030712"
      >
        ?
      </text>
    </svg>
  );
}
