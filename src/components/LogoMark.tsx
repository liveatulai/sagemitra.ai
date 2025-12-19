import * as React from "react";

type LogoMarkProps = React.SVGProps<SVGSVGElement> & {
  title?: string;
};

/**
 * Distinctive lotus + chat-bubble hybrid mark.
 * - True transparency (pure SVG)
 * - Uses theme tokens (--primary, --accent)
 * - Reads clearly at small sizes (favicon/header)
 */
export function LogoMark({ title = "SageMitra", className, ...props }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 96 96"
      aria-label={title}
      role="img"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="smL_p" x1="18" y1="18" x2="78" y2="78" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity="1" />
          <stop offset="1" stopColor="hsl(280 60% 45%)" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="smL_a" x1="26" y1="68" x2="70" y2="68" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="hsl(var(--accent))" stopOpacity="1" />
          <stop offset="1" stopColor="hsl(35 90% 55%)" stopOpacity="1" />
        </linearGradient>
        <radialGradient id="smL_glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(48 58) rotate(90) scale(18 22)">
          <stop offset="0" stopColor="hsl(var(--accent))" stopOpacity="0.55" />
          <stop offset="1" stopColor="hsl(var(--accent))" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* soft inner glow */}
      <circle cx="48" cy="58" r="18" fill="url(#smL_glow)" />

      {/* Lotus petals (symmetrical, crisp silhouette) */}
      {/* center petal */}
      <path
        d="M48 16 C38 26 33 39 33 50 C33 62 40 71 48 76 C56 71 63 62 63 50 C63 39 58 26 48 16 Z"
        fill="url(#smL_p)"
      />
      {/* left petal */}
      <path
        d="M30 30 C20 37 15 47 16 57 C17 67 24 74 34 78 C36 67 40 56 45 48 C39 42 34 36 30 30 Z"
        fill="url(#smL_p)"
        opacity="0.98"
      />
      {/* right petal */}
      <path
        d="M66 30 C76 37 81 47 80 57 C79 67 72 74 62 78 C60 67 56 56 51 48 C57 42 62 36 66 30 Z"
        fill="url(#smL_p)"
        opacity="0.98"
      />
      {/* back petals */}
      <path
        d="M22 44 C12 50 10 62 16 72 C20 79 28 83 38 84 C36 75 37 66 40 58 C35 53 29 48 22 44 Z"
        fill="hsl(var(--primary) / 0.55)"
      />
      <path
        d="M74 44 C84 50 86 62 80 72 C76 79 68 83 58 84 C60 75 59 66 56 58 C61 53 67 48 74 44 Z"
        fill="hsl(var(--primary) / 0.55)"
      />

      {/* Golden “wisdom” base, shaped like a chat bubble smile */}
      <path
        d="M26 66 C34 62 42 61 48 62 C54 61 62 62 70 66 C66 76 58 82 48 82 C38 82 30 76 26 66 Z"
        fill="url(#smL_a)"
      />

      {/* Small chat-bubble notch (negative space) */}
      <path
        d="M44 78 L37 88 L49 82 Z"
        fill="hsl(var(--background))"
        opacity="1"
      />

      {/* Inner cut to make it feel like a lotus, not a blob */}
      <path
        d="M48 26 C43 33 41 41 41 48 C41 57 44 63 48 66 C52 63 55 57 55 48 C55 41 53 33 48 26 Z"
        fill="hsl(var(--background))"
        opacity="0.18"
      />
    </svg>
  );
}
