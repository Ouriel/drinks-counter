type LogoProps = { size?: number; className?: string; label?: string };

// Inline SVG logo. Rendered as markup (not an <img src="/icon.svg">) so it paints with the
// HTML/hydration instead of triggering a separate, late, low-priority network request — and so
// its box is always sized (no layout shift). The public/icon.svg pint without its dark tile, so it
// sits on the page background in both themes; the amber foam outline keeps the foam visible in light.
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
      <g transform="rotate(-14 96 104)">
        <path d="M60 54L132 54L123 154Q122 162 114 162L78 162Q70 162 69 154Z" fill="#fe9a00" />
        <path
          d="M56 58Q58 38 78 42Q90 30 106 38Q122 30 134 44Q142 48 138 58Z"
          fill="#fff7e6"
          stroke="#fe9a00"
          strokeWidth="4"
        />
        <circle cx="86" cy="112" r="6" fill="#fff7e6" opacity="0.85" />
        <circle cx="104" cy="92" r="4.5" fill="#fff7e6" opacity="0.85" />
        <circle cx="100" cy="134" r="3.5" fill="#fff7e6" opacity="0.85" />
      </g>
      <path
        d="M146 66Q156 76 150 90"
        fill="none"
        stroke="#fe9a00"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M158 56Q172 74 162 96"
        fill="none"
        stroke="#fe9a00"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}
