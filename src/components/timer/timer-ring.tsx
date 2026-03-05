"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TimerRingProps {
  readonly progress: number;
  readonly isCompleted?: boolean;
  readonly size?: number;
  readonly strokeWidth?: number;
  readonly children?: ReactNode;
  readonly className?: string;
}

export function TimerRing({
  progress,
  isCompleted = false,
  size = 320,
  strokeWidth = 4,
  children,
  className,
}: TimerRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(1, Math.max(0, progress)));

  return (
    <div
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {isCompleted && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden
        >
          <div
            className="h-full w-full rounded-full bg-[var(--accent)] animate-[timerPulse_0.6s_ease-out_forwards]"
            style={{ maxWidth: size, maxHeight: size }}
          />
        </div>
      )}
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        aria-hidden
      >
        <defs>
          <filter id="timer-ring-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation="3"
              floodColor="var(--accent)"
              floodOpacity="0.4"
            />
          </filter>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
          className="opacity-60"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-500 ease-out"
          style={{ filter: "url(#timer-ring-glow)" }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
