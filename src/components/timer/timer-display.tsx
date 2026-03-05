"use client";

import { FOCUS_MODES } from "@/lib/constants";
import type { FocusMode } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export interface TimerDisplayProps {
  readonly remainingSeconds: number;
  readonly focusMode?: FocusMode;
  readonly task?: string;
  readonly projectName?: string;
  readonly projectColor?: string;
  readonly className?: string;
}

export function TimerDisplay({
  remainingSeconds,
  focusMode,
  task,
  projectName,
  projectColor,
  className,
}: TimerDisplayProps) {
  return (
    <div className={cn("flex flex-col items-center gap-2 text-center", className)}>
      <span
        className="text-6xl font-mono tabular-nums tracking-tight text-[var(--text-primary)] sm:text-7xl"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {formatTime(remainingSeconds)}
      </span>
      {focusMode !== undefined && (
        <p className="text-sm font-medium text-[var(--text-secondary)]">
          {FOCUS_MODES[focusMode].label}
        </p>
      )}
      {task !== undefined && task.trim() !== "" && (
        <p className="max-w-xs truncate text-sm text-[var(--text-secondary)]">
          {task}
        </p>
      )}
      {projectName !== undefined && (
        <div className="flex items-center gap-2">
          {projectColor !== undefined && (
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: projectColor }}
              aria-hidden
            />
          )}
          <span className="truncate text-sm text-[var(--text-secondary)]">
            {projectName}
          </span>
        </div>
      )}
    </div>
  );
}
