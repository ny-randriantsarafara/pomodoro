'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { abandonSession, completeSession } from '@/actions/session-actions';
import { clearTimer, loadTimer, saveTimer } from './use-timer-persistence';
import {
    buildActiveTimerFromSession,
    getSyncedRemainingSeconds,
    useActiveSessionSync,
} from './use-active-session-sync';
import { shouldResetToIdleOnMissingSyncedSession } from './use-timer-sync-guards';
import { playAlarm, stopAlarm } from '@/lib/alarm';
import {
    requestNotificationPermission,
    sendTimerCompleteNotification,
} from '@/lib/notifications';
import type { ActiveTimer, StartTimerParams } from '@/types';

type TimerPhase = 'idle' | 'focus' | 'break';

interface PhaseTiming {
    readonly startedAt: number;
    readonly durationSeconds: number;
    readonly pausedAt: number | null;
    readonly totalPausedSeconds: number;
}

export interface UseTimerReturn {
    readonly activeTimer: ActiveTimer | null;
    readonly remainingSeconds: number;
    readonly phase: TimerPhase;
    readonly progress: number;
    readonly isPaused: boolean;
    readonly showRemoteUpdate: boolean;
    readonly justCompletedFocus: boolean;
    readonly startTimer: (params: StartTimerParams) => void;
    readonly pauseTimer: () => Promise<void>;
    readonly resumeTimer: () => Promise<void>;
    readonly stopTimer: () => Promise<void>;
}

const TICK_MS = 1000;
const COMPLETION_PULSE_MS = 800;
const REMOTE_UPDATE_PULSE_MS = 2400;

function createActiveTimer(params: StartTimerParams): ActiveTimer {
    return {
        sessionId: params.sessionId,
        taskId: params.taskId,
        projects: params.projects,
        task: params.task,
        focusMode: params.focusMode,
        startedAt: Date.now(),
        durationSeconds: params.durationSeconds,
        isPaused: false,
        pausedAt: null,
        totalPausedSeconds: 0,
        activeSessionVersion: params.activeSessionVersion,
    };
}

function computeRemainingSeconds(
    timing: PhaseTiming,
    isPaused: boolean,
    nowMs: number = Date.now()
): number {
    const anchorMs =
        isPaused && timing.pausedAt !== null ? timing.pausedAt : nowMs;
    const elapsedSeconds =
        (anchorMs - timing.startedAt) / 1000 - timing.totalPausedSeconds;

    return Math.max(0, Math.ceil(timing.durationSeconds - elapsedSeconds));
}

function buildPhaseTimingFromTimer(timer: ActiveTimer): PhaseTiming {
    return {
        startedAt: timer.startedAt,
        durationSeconds: timer.durationSeconds,
        pausedAt: timer.pausedAt,
        totalPausedSeconds: timer.totalPausedSeconds,
    };
}

interface RestoredTimerState {
    readonly activeTimer: ActiveTimer | null;
    readonly phase: TimerPhase;
    readonly remainingSeconds: number;
    readonly breakDurationSeconds: number;
    readonly isPaused: boolean;
    readonly phaseTiming: PhaseTiming | null;
}

function restoreTimerState(): RestoredTimerState {
    const stored = loadTimer();

    if (!stored) {
        return {
            activeTimer: null,
            phase: 'idle',
            remainingSeconds: 0,
            breakDurationSeconds: 0,
            isPaused: false,
            phaseTiming: null,
        };
    }

    const phaseTiming = buildPhaseTimingFromTimer(stored);
    const remainingSeconds = computeRemainingSeconds(
        phaseTiming,
        stored.isPaused
    );

    if (remainingSeconds <= 0) {
        clearTimer();
        return {
            activeTimer: null,
            phase: 'idle',
            remainingSeconds: 0,
            breakDurationSeconds: 0,
            isPaused: false,
            phaseTiming: null,
        };
    }

    return {
        activeTimer: stored,
        phase: 'focus',
        remainingSeconds,
        breakDurationSeconds: 0,
        isPaused: stored.isPaused,
        phaseTiming,
    };
}

export function useTimer(): UseTimerReturn {
    const [restored] = useState(() => restoreTimerState());
    const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(
        restored.activeTimer
    );
    const [phase, setPhase] = useState<TimerPhase>(restored.phase);
    const [remainingSeconds, setRemainingSeconds] = useState(
        restored.remainingSeconds
    );
    const [breakDurationSeconds, setBreakDurationSeconds] = useState(
        restored.breakDurationSeconds
    );
    const [phaseTiming, setPhaseTiming] = useState<PhaseTiming | null>(
        restored.phaseTiming
    );
    const [isPaused, setIsPaused] = useState(restored.isPaused);
    const [justCompletedFocus, setJustCompletedFocus] = useState(false);
    const transitionInFlightRef = useRef(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const {
        session: syncedSession,
        isLoading: isSyncLoading,
        showRemoteUpdate,
        dismissRemoteUpdate,
        runAction,
    } = useActiveSessionSync();

    const clearIntervalSafe = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    const resetToIdle = useCallback(() => {
        clearIntervalSafe();
        stopAlarm();
        clearTimer();
        setActiveTimer(null);
        setPhase('idle');
        setRemainingSeconds(0);
        setBreakDurationSeconds(0);
        setPhaseTiming(null);
        setIsPaused(false);
    }, [clearIntervalSafe]);

    const applySyncedSession = useCallback(
        (session: NonNullable<typeof syncedSession>) => {
            transitionInFlightRef.current = false;

            if (session.phase === 'focus' && session.sessionId) {
                const nextTimer = buildActiveTimerFromSession(session);
                setActiveTimer(nextTimer);
                setPhase('focus');
                setRemainingSeconds(getSyncedRemainingSeconds(session));
                setBreakDurationSeconds(0);
                setPhaseTiming(buildPhaseTimingFromTimer(nextTimer));
                setIsPaused(session.isPaused);
                saveTimer(nextTimer);
                return;
            }

            clearTimer();
            setActiveTimer(null);
            setPhase('break');
            setRemainingSeconds(getSyncedRemainingSeconds(session));
            setBreakDurationSeconds(session.phaseDurationSeconds);
            setPhaseTiming({
                startedAt: session.phaseStartedAt.getTime(),
                durationSeconds: session.phaseDurationSeconds,
                pausedAt: session.pausedAt?.getTime() ?? null,
                totalPausedSeconds: session.totalPausedSeconds,
            });
            setIsPaused(session.isPaused);
        },
        []
    );

    useEffect(() => {
        void requestNotificationPermission();
    }, []);

    useEffect(() => {
        if (!showRemoteUpdate) return;

        const timeoutId = window.setTimeout(() => {
            dismissRemoteUpdate();
        }, REMOTE_UPDATE_PULSE_MS);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [dismissRemoteUpdate, showRemoteUpdate]);

    useEffect(() => {
        if (syncedSession) {
            applySyncedSession(syncedSession);
            return;
        }

        if (
            shouldResetToIdleOnMissingSyncedSession({
                syncedSession,
                isSyncLoading,
                activeSessionVersion: activeTimer?.activeSessionVersion,
                phase,
            })
        ) {
            resetToIdle();
        }
    }, [
        activeTimer?.activeSessionVersion,
        applySyncedSession,
        isSyncLoading,
        phase,
        resetToIdle,
        syncedSession,
    ]);

    useEffect(() => {
        if (!justCompletedFocus) return;

        const timeoutId = window.setTimeout(() => {
            setJustCompletedFocus(false);
        }, COMPLETION_PULSE_MS);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [justCompletedFocus]);

    useEffect(() => {
        if (phase === 'idle' || !phaseTiming || isPaused) return;

        clearIntervalSafe();
        intervalRef.current = setInterval(() => {
            setRemainingSeconds(
                computeRemainingSeconds(phaseTiming, false)
            );
        }, TICK_MS);

        return clearIntervalSafe;
    }, [clearIntervalSafe, isPaused, phase, phaseTiming]);

    useEffect(() => {
        if (phase === 'idle') return;

        function handleBeforeUnload(event: BeforeUnloadEvent) {
            event.preventDefault();
        }

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [phase]);

    useEffect(() => {
        if (
            !syncedSession ||
            isPaused ||
            remainingSeconds > 0 ||
            transitionInFlightRef.current
        ) {
            return;
        }

        transitionInFlightRef.current = true;

        const handlePhaseCompletion = async () => {
            if (syncedSession.phase === 'focus') {
                setJustCompletedFocus(true);
                playAlarm();
                sendTimerCompleteNotification(
                    syncedSession.taskLabel ?? 'Focus session'
                );

                if (syncedSession.sessionId) {
                    await completeSession(syncedSession.sessionId);
                }

                const result = await runAction('skip', syncedSession.version);
                if (!result.success || !result.data) {
                    transitionInFlightRef.current = false;
                }
                return;
            }

            await runAction('stop', syncedSession.version);
            resetToIdle();
        };

        void handlePhaseCompletion();
    }, [
        isPaused,
        remainingSeconds,
        resetToIdle,
        runAction,
        syncedSession,
    ]);

    const startTimer = useCallback((params: StartTimerParams) => {
        const timer = createActiveTimer(params);
        transitionInFlightRef.current = false;
        clearIntervalSafe();
        setActiveTimer(timer);
        setPhase('focus');
        setRemainingSeconds(params.durationSeconds);
        setBreakDurationSeconds(0);
        setPhaseTiming(buildPhaseTimingFromTimer(timer));
        setIsPaused(false);
        saveTimer(timer);
    }, [clearIntervalSafe]);

    const pauseTimer = useCallback(async () => {
        if (phase === 'idle' || isPaused) return;

        if (!syncedSession) {
            if (!phaseTiming) return;
            const pausedAt = Date.now();
            setIsPaused(true);
            setPhaseTiming({
                ...phaseTiming,
                pausedAt,
            });

            if (activeTimer) {
                const updatedTimer = {
                    ...activeTimer,
                    isPaused: true,
                    pausedAt,
                };
                setActiveTimer(updatedTimer);
                saveTimer(updatedTimer);
            }
            return;
        }

        await runAction('pause', syncedSession.version);
    }, [activeTimer, isPaused, phase, phaseTiming, runAction, syncedSession]);

    const resumeTimer = useCallback(async () => {
        if (phase === 'idle' || !isPaused) return;

        if (!syncedSession) {
            if (!phaseTiming || phaseTiming.pausedAt === null) return;
            const now = Date.now();
            const pauseDurationSeconds =
                (now - phaseTiming.pausedAt) / 1000;

            const nextTiming = {
                ...phaseTiming,
                pausedAt: null,
                totalPausedSeconds:
                    phaseTiming.totalPausedSeconds + pauseDurationSeconds,
            };

            setIsPaused(false);
            setPhaseTiming(nextTiming);

            if (activeTimer) {
                const updatedTimer = {
                    ...activeTimer,
                    isPaused: false,
                    pausedAt: null,
                    totalPausedSeconds: nextTiming.totalPausedSeconds,
                };
                setActiveTimer(updatedTimer);
                saveTimer(updatedTimer);
            }
            return;
        }

        await runAction('resume', syncedSession.version);
    }, [activeTimer, isPaused, phase, phaseTiming, runAction, syncedSession]);

    const stopTimer = useCallback(async () => {
        clearIntervalSafe();
        stopAlarm();

        if (syncedSession) {
            if (syncedSession.phase === 'focus' && syncedSession.sessionId) {
                const elapsedSeconds = Math.max(
                    0,
                    syncedSession.phaseDurationSeconds - remainingSeconds
                );
                await abandonSession(syncedSession.sessionId, elapsedSeconds);
            }

            await runAction('stop', syncedSession.version);
            resetToIdle();
            return;
        }

        if (activeTimer) {
            const elapsedSeconds = Math.max(
                0,
                activeTimer.durationSeconds - remainingSeconds
            );
            await abandonSession(activeTimer.sessionId, elapsedSeconds);
        }

        resetToIdle();
    }, [
        activeTimer,
        clearIntervalSafe,
        remainingSeconds,
        resetToIdle,
        runAction,
        syncedSession,
    ]);

    const totalDurationSeconds =
        phase === 'focus'
            ? activeTimer?.durationSeconds ?? phaseTiming?.durationSeconds ?? 0
            : breakDurationSeconds;

    const progress =
        totalDurationSeconds > 0
            ? (totalDurationSeconds - remainingSeconds) / totalDurationSeconds
            : 0;

    return {
        activeTimer,
        remainingSeconds,
        phase,
        progress,
        isPaused,
        showRemoteUpdate,
        justCompletedFocus,
        startTimer,
        pauseTimer,
        resumeTimer,
        stopTimer,
    };
}
