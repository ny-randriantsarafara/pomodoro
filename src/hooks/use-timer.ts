'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { loadTimer, saveTimer, clearTimer } from './use-timer-persistence';
import { abandonSession, completeSession } from '@/actions/session-actions';
import { playAlarm, stopAlarm } from '@/lib/alarm';
import { requestNotificationPermission, sendTimerCompleteNotification } from '@/lib/notifications';
import { FOCUS_MODES } from '@/lib/constants';
import type { ActiveTimer, StartTimerParams } from '@/types';

type TimerPhase = 'idle' | 'focus' | 'break';

export interface UseTimerReturn {
    readonly activeTimer: ActiveTimer | null;
    readonly remainingSeconds: number;
    readonly phase: TimerPhase;
    readonly progress: number;
    readonly justCompletedFocus: boolean;
    readonly startTimer: (params: StartTimerParams) => void;
    readonly pauseTimer: () => void;
    readonly resumeTimer: () => void;
    readonly abandonTimer: () => Promise<void>;
}

const TICK_MS = 1000;

function createActiveTimer(params: StartTimerParams): ActiveTimer {
    return {
        sessionId: params.sessionId,
        projects: params.projects,
        task: params.task,
        focusMode: params.focusMode,
        startedAt: Date.now(),
        durationSeconds: params.durationSeconds,
        isPaused: false,
        pausedAt: null,
        totalPausedSeconds: 0,
    };
}

const COMPLETION_PULSE_MS = 800;

interface RestoredTimerState {
    readonly activeTimer: ActiveTimer | null;
    readonly remainingSeconds: number;
    readonly phase: TimerPhase;
    readonly breakDurationSeconds: number;
    readonly pendingCompletionSessionId: string | null;
}

function restoreTimerState(): RestoredTimerState {
    const stored = loadTimer();

    if (!stored) {
        return {
            activeTimer: null,
            remainingSeconds: 0,
            phase: 'idle',
            breakDurationSeconds: 0,
            pendingCompletionSessionId: null,
        };
    }

    const elapsedSec = stored.isPaused
        ? (stored.pausedAt! - stored.startedAt) / 1000 -
          stored.totalPausedSeconds
        : (Date.now() - stored.startedAt) / 1000 - stored.totalPausedSeconds;

    const remaining = Math.max(
        0,
        Math.ceil(stored.durationSeconds - elapsedSec)
    );

    if (remaining <= 0) {
        clearTimer();
        const breakSecs = FOCUS_MODES[stored.focusMode].breakMinutes * 60;

        return {
            activeTimer: null,
            remainingSeconds: breakSecs,
            phase: 'break',
            breakDurationSeconds: breakSecs,
            pendingCompletionSessionId: stored.sessionId,
        };
    }

    return {
        activeTimer: stored,
        remainingSeconds: remaining,
        phase: 'focus',
        breakDurationSeconds: 0,
        pendingCompletionSessionId: null,
    };
}

export function useTimer(): UseTimerReturn {
    const [restored] = useState<RestoredTimerState>(() => restoreTimerState());

    const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(
        () => restored.activeTimer
    );
    const [remainingSeconds, setRemainingSeconds] = useState(
        () => restored.remainingSeconds
    );
    const [phase, setPhase] = useState<TimerPhase>(() => restored.phase);
    const [breakDurationSeconds, setBreakDurationSeconds] = useState(
        () => restored.breakDurationSeconds
    );
    const [justCompletedFocus, setJustCompletedFocus] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pendingCompletionSessionIdRef = useRef<string | null>(
        restored.pendingCompletionSessionId
    );

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
            setJustCompletedFocus(true);
            playAlarm();
            sendTimerCompleteNotification(timer.task);
            completeSession(timer.sessionId).then(() => {
                const breakSecs =
                    FOCUS_MODES[timer.focusMode].breakMinutes * 60;
                setActiveTimer(null);
                setPhase('break');
                setRemainingSeconds(breakSecs);
                setBreakDurationSeconds(breakSecs);
            });
        },
        [clearIntervalSafe]
    );

    useEffect(() => {
        if (!justCompletedFocus) return;
        const id = setTimeout(
            () => setJustCompletedFocus(false),
            COMPLETION_PULSE_MS
        );
        return () => clearTimeout(id);
    }, [justCompletedFocus]);

    useEffect(() => {
        void requestNotificationPermission();
    }, []);

    useEffect(() => {
        const pendingSessionId = pendingCompletionSessionIdRef.current;
        if (!pendingSessionId) return;

        pendingCompletionSessionIdRef.current = null;
        playAlarm();
        void completeSession(pendingSessionId);
    }, []);

    useEffect(() => {
        if (phase !== 'focus' || !activeTimer || activeTimer.isPaused) return;

        clearIntervalSafe();
        intervalRef.current = setInterval(() => {
            setRemainingSeconds((prev) => {
                if (prev <= 1) {
                    clearIntervalSafe();
                    completeFocusAndStartBreak(activeTimer);
                    return 0;
                }
                return prev - 1;
            });
        }, TICK_MS);

        return clearIntervalSafe;
    }, [phase, activeTimer, clearIntervalSafe, completeFocusAndStartBreak]);

    useEffect(() => {
        if (phase !== 'focus') return;

        function handleBeforeUnload(e: BeforeUnloadEvent) {
            e.preventDefault();
        }

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () =>
            window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [phase]);

    useEffect(() => {
        if (phase !== 'break') return;

        clearIntervalSafe();
        intervalRef.current = setInterval(() => {
            setRemainingSeconds((prev) => {
                if (prev <= 1) {
                    clearIntervalSafe();
                    stopAlarm();
                    setPhase('idle');
                    setBreakDurationSeconds(0);
                    return 0;
                }

                return prev - 1;
            });
        }, TICK_MS);

        return clearIntervalSafe;
    }, [phase, clearIntervalSafe]);

    const startTimer = useCallback(
        (params: StartTimerParams) => {
            clearIntervalSafe();
            const timer = createActiveTimer(params);
            setActiveTimer(timer);
            setPhase('focus');
            setRemainingSeconds(params.durationSeconds);
            setBreakDurationSeconds(0);
            saveTimer(timer);
        },
        [clearIntervalSafe]
    );

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
    }, [activeTimer]);

    const abandonTimer = useCallback(async () => {
        if (!activeTimer) return;
        clearIntervalSafe();
        stopAlarm();
        const elapsedSec = Math.max(
            0,
            activeTimer.durationSeconds - remainingSeconds
        );
        await abandonSession(activeTimer.sessionId, elapsedSec);
        clearTimer();
        setActiveTimer(null);
        setPhase('idle');
        setRemainingSeconds(0);
    }, [activeTimer, remainingSeconds, clearIntervalSafe]);

    const progress =
        phase === 'focus' && activeTimer
            ? (activeTimer.durationSeconds - remainingSeconds) /
              activeTimer.durationSeconds
            : phase === 'break' && breakDurationSeconds > 0
              ? (breakDurationSeconds - remainingSeconds) / breakDurationSeconds
              : 0;

    return {
        activeTimer,
        remainingSeconds,
        phase,
        progress,
        justCompletedFocus,
        startTimer,
        pauseTimer,
        resumeTimer,
        abandonTimer,
    };
}
