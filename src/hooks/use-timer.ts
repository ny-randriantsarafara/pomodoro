"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { loadTimer, saveTimer, clearTimer } from "./use-timer-persistence";
import { abandonSession, completeSession } from "@/actions/session-actions";
import { FOCUS_MODES } from "@/lib/constants";
import type { ActiveTimer, StartTimerParams } from "@/types";

type TimerPhase = "idle" | "focus" | "break";

export interface UseTimerReturn {
  readonly activeTimer: ActiveTimer | null;
  readonly remainingSeconds: number;
  readonly phase: TimerPhase;
  readonly progress: number;
  readonly startTimer: (params: StartTimerParams) => void;
  readonly pauseTimer: () => void;
  readonly resumeTimer: () => void;
  readonly abandonTimer: () => Promise<void>;
}

const TICK_MS = 1000;

function createActiveTimer(params: StartTimerParams): ActiveTimer {
  return {
    sessionId: params.sessionId,
    projectId: params.projectId,
    projectName: params.projectName,
    projectColor: params.projectColor,
    task: params.task,
    focusMode: params.focusMode,
    startedAt: Date.now(),
    durationSeconds: params.durationSeconds,
    isPaused: false,
    pausedAt: null,
    totalPausedSeconds: 0,
  };
}

export function useTimer(): UseTimerReturn {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [phase, setPhase] = useState<TimerPhase>("idle");
  const [breakDurationSeconds, setBreakDurationSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearIntervalSafe = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const completeFocusAndStartBreak = useCallback(
    (timer: ActiveTimer) => {
      clearIntervalSafe();
      clearTimer();
      completeSession(timer.sessionId).then(() => {
        const breakSecs = FOCUS_MODES[timer.focusMode].breakMinutes * 60;
        setActiveTimer(null);
        setPhase("break");
        setRemainingSeconds(breakSecs);
        setBreakDurationSeconds(breakSecs);
      });
    },
    [clearIntervalSafe]
  );

  useEffect(() => {
    const stored = loadTimer();
    if (!stored) return;

    const elapsedSec = stored.isPaused
      ? (stored.pausedAt! - stored.startedAt) / 1000 - stored.totalPausedSeconds
      : (Date.now() - stored.startedAt) / 1000 - stored.totalPausedSeconds;

    const remaining = Math.max(0, Math.ceil(stored.durationSeconds - elapsedSec));

    if (remaining <= 0) {
      clearTimer();
      completeSession(stored.sessionId).then(() => {
        const breakSecs = FOCUS_MODES[stored.focusMode].breakMinutes * 60;
        setPhase("break");
        setRemainingSeconds(breakSecs);
        setBreakDurationSeconds(breakSecs);
      });
      return;
    }

    setActiveTimer(stored);
    setPhase("focus");
    setRemainingSeconds(remaining);

    if (!stored.isPaused) {
      intervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearIntervalSafe();
            completeFocusAndStartBreak(stored);
            return 0;
          }
          return prev - 1;
        });
      }, TICK_MS);
    }

    return clearIntervalSafe;
  }, [clearIntervalSafe, completeFocusAndStartBreak]);

  useEffect(() => {
    if (phase !== "break" || remainingSeconds > 0) return;

    setPhase("idle");
    setRemainingSeconds(0);
    setBreakDurationSeconds(0);
  }, [phase, remainingSeconds]);

  useEffect(() => {
    if (phase !== "break") return;

    intervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => Math.max(0, prev - 1));
    }, TICK_MS);

    return clearIntervalSafe;
  }, [phase, clearIntervalSafe]);

  const startTimer = useCallback((params: StartTimerParams) => {
    clearIntervalSafe();
    const timer = createActiveTimer(params);
    setActiveTimer(timer);
    setPhase("focus");
    setRemainingSeconds(params.durationSeconds);
    saveTimer(timer);
    intervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearIntervalSafe();
          completeFocusAndStartBreak(timer);
          return 0;
        }
        return prev - 1;
      });
    }, TICK_MS);
  }, [clearIntervalSafe, completeFocusAndStartBreak]);

  const pauseTimer = useCallback(() => {
    if (!activeTimer || activeTimer.isPaused) return;
    clearIntervalSafe();
    const updated: ActiveTimer = {
      ...activeTimer,
      isPaused: true,
      pausedAt: Date.now(),
    };
    setActiveTimer(updated);
    saveTimer(updated);
  }, [activeTimer, clearIntervalSafe]);

  const resumeTimer = useCallback(() => {
    if (!activeTimer || !activeTimer.isPaused) return;
    const now = Date.now();
    const pauseDuration = (now - activeTimer.pausedAt!) / 1000;
    const updated: ActiveTimer = {
      ...activeTimer,
      isPaused: false,
      pausedAt: null,
      totalPausedSeconds: activeTimer.totalPausedSeconds + pauseDuration,
    };
    setActiveTimer(updated);
    saveTimer(updated);
    intervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearIntervalSafe();
          completeFocusAndStartBreak(updated);
          return 0;
        }
        return prev - 1;
      });
    }, TICK_MS);
  }, [activeTimer, clearIntervalSafe, completeFocusAndStartBreak]);

  const abandonTimer = useCallback(async () => {
    if (!activeTimer) return;
    clearIntervalSafe();
    const elapsedSec = Math.max(
      0,
      activeTimer.durationSeconds - remainingSeconds
    );
    await abandonSession(activeTimer.sessionId, elapsedSec);
    clearTimer();
    setActiveTimer(null);
    setPhase("idle");
    setRemainingSeconds(0);
  }, [activeTimer, remainingSeconds, clearIntervalSafe]);

  const progress =
    phase === "focus" && activeTimer
      ? (activeTimer.durationSeconds - remainingSeconds) /
        activeTimer.durationSeconds
      : phase === "break" && breakDurationSeconds > 0
        ? (breakDurationSeconds - remainingSeconds) / breakDurationSeconds
        : 0;

  return {
    activeTimer,
    remainingSeconds,
    phase,
    progress,
    startTimer,
    pauseTimer,
    resumeTimer,
    abandonTimer,
  };
}
