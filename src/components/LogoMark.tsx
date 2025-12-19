import * as React from "react";

type LogoMarkProps = React.SVGProps<SVGSVGElement> & {
  title?: string;
};

/**
 * Pure SVG lotus mark that matches theme colors and stays truly transparent.
 */
export function LogoMark({ title = "SageMitra", className, ...props }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-label={title}
      role="img"
      className={className}
      fill="none"
      {...props}
    >
      <defs>
        <linearGradient id="lotus-petal-main" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(280 60% 45%)" />
        </linearGradient>
        <linearGradient id="lotus-petal-side" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
          <stop offset="100%" stopColor="hsl(280 50% 50%)" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id="lotus-accent" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(var(--accent))" />
          <stop offset="100%" stopColor="hsl(35 90% 55%)" />
        </linearGradient>
      </defs>

      {/* Left outer petal */}
      <path
        d="M15 65 Q5 50 20 35 Q30 45 35 60 Q25 65 15 65Z"
        fill="url(#lotus-petal-side)"
      />
      
      {/* Right outer petal */}
      <path
        d="M85 65 Q95 50 80 35 Q70 45 65 60 Q75 65 85 65Z"
        fill="url(#lotus-petal-side)"
      />

      {/* Left middle petal */}
      <path
        d="M25 60 Q18 40 35 25 Q42 40 45 55 Q35 62 25 60Z"
        fill="url(#lotus-petal-main)"
      />
      
      {/* Right middle petal */}
      <path
        d="M75 60 Q82 40 65 25 Q58 40 55 55 Q65 62 75 60Z"
        fill="url(#lotus-petal-main)"
      />

      {/* Center petal (tallest) */}
      <path
        d="M50 15 Q35 35 40 55 Q45 60 50 62 Q55 60 60 55 Q65 35 50 15Z"
        fill="url(#lotus-petal-main)"
      />

      {/* Golden base/accent leaves */}
      <path
        d="M30 68 Q40 60 50 62 Q45 70 35 75 Q28 73 30 68Z"
        fill="url(#lotus-accent)"
      />
      <path
        d="M70 68 Q60 60 50 62 Q55 70 65 75 Q72 73 70 68Z"
        fill="url(#lotus-accent)"
      />

      {/* Center glow dot */}
      <circle cx="50" cy="58" r="4" fill="url(#lotus-accent)" opacity="0.9" />
    </svg>
  );
}
