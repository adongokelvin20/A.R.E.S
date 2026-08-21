"use client";

import { cn } from "@/lib/utils";

/**
 * A.R.E.S. logo -- impressive layered geometric mark.
 *
 * Concept: three interlocking diamond shards converging upward,
 * representing routing/execution/convergence. Each layer has a
 * slightly different gradient stop for depth. The mark reads as
 * both an abstract "A" and an ascending arrow.
 */
export function AresLogo({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "mono-light" | "mono-dark";
}) {
  const id = `ares-${Math.random().toString(36).slice(2, 9)}`;
  const isLight = variant === "mono-light";
  const isDark = variant === "mono-dark";

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-g1`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={isLight ? "rgba(255,255,255,0.95)" : isDark ? "#0A1626" : "#0284A6"} />
            <stop offset="100%" stopColor={isLight ? "rgba(255,255,255,0.7)" : isDark ? "#024E6E" : "#024E6E"} />
          </linearGradient>
          <linearGradient id={`${id}-g2`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={isLight ? "rgba(255,255,255,0.6)" : isDark ? "#0284A6" : "#0284A6"} />
            <stop offset="100%" stopColor={isLight ? "rgba(255,255,255,0.3)" : isDark ? "#024E6E" : "#0A1626"} />
          </linearGradient>
          <radialGradient id={`${id}-glow`} cx="50%" cy="30%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>

        {/* Outer rounded square frame with subtle gradient */}
        <rect x="3" y="3" width="42" height="42" rx="12" fill={`url(#${id}-g1)`} />
        <rect x="3" y="3" width="42" height="42" rx="12" fill={`url(#${id}-glow)`} />
        <rect x="3" y="3" width="42" height="42" rx="12" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />

        {/* Left shard -- ascending */}
        <path
          d="M14 36 L24 12 L24 30 Z"
          fill={`url(#${id}-g2)`}
          opacity="0.95"
        />
        {/* Right shard -- ascending */}
        <path
          d="M34 36 L24 12 L24 30 Z"
          fill={isLight ? "rgba(255,255,255,0.85)" : isDark ? "rgba(2,132,166,0.8)" : "rgba(255,255,255,0.92)"}
        />
        {/* Center peak accent */}
        <circle cx="24" cy="12" r="2.2" fill={isLight ? "rgba(255,255,255,0.95)" : isDark ? "#0284A6" : "#FFFFFF"} />
        {/* Crossbar */}
        <rect x="17" y="28" width="14" height="2.2" rx="1.1" fill={isLight ? "rgba(255,255,255,0.9)" : isDark ? "rgba(2,132,166,0.9)" : "rgba(255,255,255,0.9)"} />
        {/* Base accent dots */}
        <circle cx="14" cy="36" r="1.3" fill={isLight ? "rgba(255,255,255,0.5)" : isDark ? "rgba(2,132,166,0.5)" : "rgba(255,255,255,0.5)"} />
        <circle cx="34" cy="36" r="1.3" fill={isLight ? "rgba(255,255,255,0.5)" : isDark ? "rgba(2,132,166,0.5)" : "rgba(255,255,255,0.5)"} />
      </svg>
    </div>
  );
}
