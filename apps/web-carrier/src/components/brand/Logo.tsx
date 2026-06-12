/**
 * EPL Move brand mark, recreated as scalable SVG.
 * - variant="mark": just the globe + wave emblem (square; sidebar collapsed, favicon).
 * - variant="full": emblem + "EPL MOVE / WORLD CONNECTED" wordmark (login, brand spots).
 * Colors follow the artwork: navy #0b1a2e and gold #c8a24a.
 */

const NAVY = "#0b1a2e";
const GOLD = "#c8a24a";

function Emblem({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="EPL Move"
    >
      {/* Globe meridians / parallels (gold) */}
      <g stroke={GOLD} strokeWidth="1.5" fill="none" opacity="0.9">
        <circle cx="56" cy="50" r="33" />
        <ellipse cx="56" cy="50" rx="13" ry="33" />
        <ellipse cx="56" cy="50" rx="26" ry="33" />
        <line x1="23" y1="50" x2="89" y2="50" />
        <path d="M27 37 q29 -9 58 0" />
        <path d="M27 63 q29 9 58 0" />
      </g>

      {/* Wave swoosh — navy band + gold underline (carries the fleet) */}
      <path
        d="M10 58 C 36 47, 50 69, 74 57 S 100 51, 112 55"
        stroke={NAVY}
        strokeWidth="6.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M12 67 C 38 57, 54 78, 80 66 S 102 62, 110 64"
        stroke={GOLD}
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Plane (top-left, climbing) */}
      <path
        d="M24 34 l13 4 l5 -7 l3 1 l-2 8 l8 2 l3 -3 l2 1 l-4 6 l-6 1 l-8 -1 l-3 4 l-3 -1 l1 -5 l-10 -3 z"
        fill={NAVY}
      />

      {/* Truck (center, on the wave) */}
      <g fill={NAVY}>
        <rect x="50" y="38" width="15" height="10" rx="1.5" />
        <path d="M65 41 h5.5 l4 4 v3 h-9.5 z" />
        <circle cx="55.5" cy="49.5" r="2.4" fill={GOLD} />
        <circle cx="69" cy="49.5" r="2.4" fill={GOLD} />
      </g>

      {/* Ship (right, riding the swoosh) */}
      <g fill={NAVY}>
        <rect x="86" y="64" width="14" height="6" rx="1" />
        <path d="M84 70 h19 l-3 6 h-13 z" />
        <rect x="89" y="58" width="2.4" height="6" />
        <rect x="93.5" y="58" width="2.4" height="6" />
      </g>
    </svg>
  );
}

export function Logo({
  variant = "full",
  size = 40,
  className,
}: {
  variant?: "mark" | "full";
  /** Emblem height in px. */
  size?: number;
  className?: string;
}) {
  if (variant === "mark") {
    return (
      <span className={className}>
        <Emblem size={size} />
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <Emblem size={size} />
      <span className="leading-none">
        <span
          className="block font-extrabold tracking-tight text-slate-900"
          style={{ fontSize: size * 0.5, letterSpacing: "0.02em" }}
        >
          EPL{" "}
          <span style={{ position: "relative" }}>
            M
            <span aria-hidden style={{ color: GOLD }}>
              O
            </span>
            VE
          </span>
        </span>
        <span
          className="block font-medium uppercase text-slate-400"
          style={{ fontSize: size * 0.16, letterSpacing: "0.28em" }}
        >
          World Connected
        </span>
      </span>
    </span>
  );
}
