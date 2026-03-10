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
import { DEFAULT_TIMER_SETTINGS } from '@/lib/settings';
import { saveGuestWorkspace, loadGuestWorkspace } from '@/lib/guest-store';
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

interface UseTimerOptions {
    readonly syncEnabled?: boolean;
    readonly sessionMode?: 'signed-in' | 'guest';
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
        description: params.description,
        focusMode: params.focusMode,
        startedAt: Date.now(),
        durationSeconds: params.durationSeconds,
        isPaused: false,
        pausedAt: null,
        totalPausedSeconds: 0,
        activeSessionVersion: params.activeSessionVersion,
    };
}

function persistGuestActiveTimer(timer: ActiveTimer | null) {
    const current = loadGuestWorkspace();

    saveGuestWorkspace({
        tasks: current?.tasks ?? [],
        sessions: current?.sessions ?? [],
        settings: current?.settings ?? DEFAULT_TIMER_SETTINGS,
        activeTimer: timer,
        updatedAt: new Date().toISOString(),
    });
}

function appendGuestSessionRecord(params: {
    readonly timer: ActiveTimer;
    readonly status: 'completed' | 'abandoned';
    readonly elapsedSeconds: number;
}) {
    const current = loadGuestWorkspace();
    const startedAt = new Date(params.timer.startedAt);
    const completedAt = new Date(startedAt.getTime() + params.elapsedSeconds * 1000);

    const nextSession = {
        id: params.timer.sessionId,
        taskId: params.timer.taskId ?? null,
        task: params.timer.task,
        description: params.timer.description ?? null,
        focusMode: params.timer.focusMode,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationSeconds: params.elapsedSeconds,
        status: params.status,
    } as const;

    saveGuestWorkspace({
        tasks: current?.tasks ?? [],
        sessions: [...(current?.sessions ?? []), nextSession],
        settings: current?.settings ?? DEFAULT_TIMER_SETTINGS,
        activeTimer: null,
        updatedAt: new Date().toISOString(),
    });
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

export function useTimer(options: UseTimerOptions = {}): UseTimerReturn {
    const {
        syncEnabled = true,
        sessionMode = syncEnabled ? 'signed-in' : 'guest',
    } = options;
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
    } = useActiveSessionSync({ enabled: syncEnabled });

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
        if (sessionMode === 'guest') {
            persistGuestActiveTimer(null);
        }
        setActiveTimer(null);
        setPhase('idle');
        setRemainingSeconds(0);
        setBreakDurationSeconds(0);
        setPhaseTiming(null);
        setIsPaused(false);
    }, [clearIntervalSafe, sessionMode]);

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
            syncEnabled &&
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
        syncEnabled,
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
        if (isPaused || transitionInFlightRef.current) {
            return;
        }

        if (!syncEnabled) {
            if (phase !== 'focus' || !activeTimer || remainingSeconds > 0) {
                return;
            }

            transitionInFlightRef.current = true;
            setJustCompletedFocus(true);
            playAlarm();
            sendTimerCompleteNotification(activeTimer.task);
            appendGuestSessionRecord({
                timer: activeTimer,
                status: 'completed',
                elapsedSeconds: activeTimer.durationSeconds,
            });
            resetToIdle();
            return;
        }

        if (!syncedSession || remainingSeconds > 0) {
            return;
        }

        transitionInFlightRef.current = true;
        const currentSyncedSession = syncedSession;

        const handlePhaseCompletion = async () => {
            if (!currentSyncedSession) {
                transitionInFlightRef.current = false;
                return;
            }

            if (currentSyncedSession.phase === 'focus') {
                setJustCompletedFocus(true);
                playAlarm();
                sendTimerCompleteNotification(
                    currentSyncedSession.taskLabel ?? 'Focus session'
                );

                if (currentSyncedSession.sessionId) {
                    await completeSession(currentSyncedSession.sessionId);
                }

                const result = await runAction(
                    'skip',
                    currentSyncedSession.version
                );
                if (!result.success || !result.data) {
                    transitionInFlightRef.current = false;
                }
                return;
            }

            await runAction('stop', currentSyncedSession.version);
            resetToIdle();
        };

        void handlePhaseCompletion();
    }, [
        isPaused,
        remainingSeconds,
        resetToIdle,
        runAction,
        syncEnabled,
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
        if (sessionMode === 'guest') {
            persistGuestActiveTimer(timer);
        }
    }, [clearIntervalSafe, sessionMode]);

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
                if (sessionMode === 'guest') {
                    persistGuestActiveTimer(updatedTimer);
                }
            }
            return;
        }

        await runAction('pause', syncedSession.version);
    }, [activeTimer, isPaused, phase, phaseTiming, runAction, sessionMode, syncedSession]);

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
                if (sessionMode === 'guest') {
                    persistGuestActiveTimer(updatedTimer);
                }
            }
            return;
        }

        await runAction('resume', syncedSession.version);
    }, [activeTimer, isPaused, phase, phaseTiming, runAction, sessionMode, syncedSession]);

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

            if (sessionMode === 'guest') {
                appendGuestSessionRecord({
                    timer: activeTimer,
                    status: 'abandoned',
                    elapsedSeconds,
                });
            } else {
                await abandonSession(activeTimer.sessionId, elapsedSeconds);
            }
        }

        resetToIdle();
    }, [
        activeTimer,
        clearIntervalSafe,
        remainingSeconds,
        resetToIdle,
        runAction,
        sessionMode,
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
