"use client";

import { useTimer } from "@/hooks/use-timer";
import { TimerRing } from "@/components/timer/timer-ring";
import { TimerDisplay } from "@/components/timer/timer-display";
import { TimerControls } from "@/components/timer/timer-controls";
import { SessionSetup } from "@/components/timer/session-setup";
import type { Project } from "@/lib/db/schema";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export interface TimerViewProps {
  readonly projects: ReadonlyArray<Project>;
}

export function TimerView({ projects }: TimerViewProps) {
  const {
    activeTimer,
    remainingSeconds,
    phase,
    progress,
    justCompletedFocus,
    startTimer,
    pauseTimer,
    resumeTimer,
    abandonTimer,
  } = useTimer();

  return (
    <div className="relative flex flex-col items-center justify-center gap-8 transition-opacity duration-300">
      <div className="relative flex min-h-[320px] flex-col items-center justify-center">
        {phase === "idle" && (
          <>
            <TimerRing
              progress={0}
              size={320}
              strokeWidth={4}
              className="absolute opacity-40 transition-opacity duration-300"
            />
            <div className="relative z-10 w-full max-w-sm">
              <SessionSetup projects={projects} onStart={startTimer} />
            </div>
          </>
        )}

        {phase !== "idle" && (
          <TimerRing
            progress={progress}
            isCompleted={justCompletedFocus}
            size={320}
            strokeWidth={4}
            className="relative z-10 opacity-100 transition-opacity duration-300"
          >
            {phase === "focus" && activeTimer && (
              <div className="flex flex-col items-center gap-6">
                <TimerDisplay
                  remainingSeconds={remainingSeconds}
                  focusMode={activeTimer.focusMode}
                  task={activeTimer.task}
                  projectName={activeTimer.projectName}
                  projectColor={activeTimer.projectColor}
                />
              </div>
            )}

            {phase === "break" && (
              <div className="flex flex-col items-center gap-2 text-center">
                <span
                  className="text-6xl font-mono tabular-nums tracking-tight text-[var(--text-primary)] sm:text-7xl"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {formatTime(remainingSeconds)}
                </span>
                <p className="text-sm font-medium text-[var(--text-secondary)]">
                  Break
                </p>
              </div>
            )}
          </TimerRing>
        )}
      </div>

      {phase === "focus" && activeTimer && (
        <TimerControls
          isPaused={activeTimer.isPaused}
          onPause={pauseTimer}
          onResume={resumeTimer}
          onAbandon={abandonTimer}
        />
      )}

      {phase === "break" && (
        <p className="text-sm text-[var(--text-secondary)]">
          Take a break. You&apos;ll return to setup when done.
        </p>
      )}
    </div>
  );
}
