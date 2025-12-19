import * as React from "react";

type LogoMarkProps = React.SVGProps<SVGSVGElement> & {
  title?: string;
};

/**
 * Pure SVG mark so it always matches theme colors and stays truly transparent.
 */
export function LogoMark({ title = "SageMitra", className, ...props }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-label={title}
      role="img"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="sm-petal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.95" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.65" />
        </linearGradient>
        <linearGradient id="sm-core" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--accent))" />
          <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="sm-outline" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.85" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.65" />
        </linearGradient>
      </defs>

      {/* petals */}
      <path
        d="M32 10c-6.2 5.8-10.4 13.8-10.4 22.1C21.6 41 26.8 48 32 52c5.2-4 10.4-11 10.4-19.9C42.4 23.8 38.2 15.8 32 10z"
        fill="url(#sm-petal)"
        stroke="url(#sm-outline)"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path
        d="M18 22c-6 4.2-9.7 10.4-9.7 16.9 0 8.2 6.1 14.3 13.6 17.2 1.1.4 2.3-.3 2.5-1.5 1.1-7.1 3.8-14.1 7.6-18.9C27.5 30.7 22.8 25.6 18 22z"
        fill="url(#sm-petal)"
        opacity="0.95"
      />
      <path
        d="M46 22c6 4.2 9.7 10.4 9.7 16.9 0 8.2-6.1 14.3-13.6 17.2-1.1.4-2.3-.3-2.5-1.5-1.1-7.1-3.8-14.1-7.6-18.9C36.5 30.7 41.2 25.6 46 22z"
        fill="url(#sm-petal)"
        opacity="0.95"
      />

      {/* base leaves */}
      <path
        d="M13.5 41.5c5.2-1.4 10.4-.8 15.2 1.3 1 .4 1.4 1.6.8 2.5-2.5 3.9-6.6 7.1-11.6 8.5-5.1 1.4-9.8.7-13.2-1.2 2.1-5.1 5.3-8.9 8.8-11.1z"
        fill="hsl(var(--primary) / 0.8)"
      />
      <path
        d="M50.5 41.5c-5.2-1.4-10.4-.8-15.2 1.3-1 .4-1.4 1.6-.8 2.5 2.5 3.9 6.6 7.1 11.6 8.5 5.1 1.4 9.8.7 13.2-1.2-2.1-5.1-5.3-8.9-8.8-11.1z"
        fill="hsl(var(--primary) / 0.8)"
      />

      {/* core glow */}
      <circle cx="32" cy="44" r="5.5" fill="url(#sm-core)" opacity="0.95" />
    </svg>
  );
}
