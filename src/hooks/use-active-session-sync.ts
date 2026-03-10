'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    applyActiveSessionAction,
    getActiveSession,
} from '@/actions/active-session-actions';
import type { ActiveSessionAction } from '@/lib/active-session-utils';
import { deriveRemainingSeconds } from '@/lib/active-session-machine';
import type {
    ActionResult,
    ActiveSessionSnapshot,
    ActiveTimer,
} from '@/types';

const DEFAULT_POLL_INTERVAL_MS = 2000;

interface DeriveBannerStateInput {
    readonly previousVersion: number | null;
    readonly currentVersion: number | null;
}

interface UseActiveSessionSyncOptions {
    readonly enabled?: boolean;
    readonly pollIntervalMs?: number;
}

interface UseActiveSessionSyncReturn {
    readonly session: ActiveSessionSnapshot | null;
    readonly isLoading: boolean;
    readonly error: string | null;
    readonly showRemoteUpdate: boolean;
    readonly refresh: () => Promise<void>;
    readonly dismissRemoteUpdate: () => void;
    readonly runAction: (
        action: ActiveSessionAction,
        expectedVersion: number
    ) => Promise<ActionResult<ActiveSessionSnapshot | null>>;
}

function getPhaseTimestampMs(value: Date | string): number {
    return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export function deriveBannerState(input: DeriveBannerStateInput) {
    return {
        showRemoteUpdate:
            input.previousVersion !== null &&
            input.currentVersion !== null &&
            input.previousVersion !== input.currentVersion,
    };
}

export function buildActiveTimerFromSession(
    session: Pick<
        ActiveSessionSnapshot,
        | 'sessionId'
        | 'taskId'
        | 'taskLabel'
        | 'phaseStartedAt'
        | 'phaseDurationSeconds'
        | 'isPaused'
        | 'pausedAt'
        | 'totalPausedSeconds'
        | 'version'
    >
): ActiveTimer {
    if (!session.sessionId) {
        throw new Error('Synced focus session is missing a sessionId.');
    }

    return {
        sessionId: session.sessionId,
        taskId: session.taskId ?? undefined,
        projects: [],
        task: session.taskLabel ?? 'Focus session',
        focusMode: 'short',
        startedAt: getPhaseTimestampMs(session.phaseStartedAt),
        durationSeconds: session.phaseDurationSeconds,
        isPaused: session.isPaused,
        pausedAt: session.pausedAt
            ? getPhaseTimestampMs(session.pausedAt)
            : null,
        totalPausedSeconds: session.totalPausedSeconds,
        activeSessionVersion: session.version,
    };
}

export function getSyncedRemainingSeconds(
    session: Pick<
        ActiveSessionSnapshot,
        | 'phaseStartedAt'
        | 'phaseDurationSeconds'
        | 'isPaused'
        | 'pausedAt'
        | 'totalPausedSeconds'
    >,
    nowMs: number = Date.now()
): number {
    return deriveRemainingSeconds({
        nowMs,
        phaseStartedAtMs: getPhaseTimestampMs(session.phaseStartedAt),
        phaseDurationSeconds: session.phaseDurationSeconds,
        isPaused: session.isPaused,
        pausedAtMs: session.pausedAt
            ? getPhaseTimestampMs(session.pausedAt)
            : null,
        totalPausedSeconds: session.totalPausedSeconds,
    });
}

export function useActiveSessionSync(
    options: UseActiveSessionSyncOptions = {}
): UseActiveSessionSyncReturn {
    const { enabled = true, pollIntervalMs = DEFAULT_POLL_INTERVAL_MS } =
        options;
    const [session, setSession] = useState<ActiveSessionSnapshot | null>(null);
    const [isLoading, setIsLoading] = useState(enabled);
    const [error, setError] = useState<string | null>(null);
    const [showRemoteUpdate, setShowRemoteUpdate] = useState(false);
    const previousVersionRef = useRef<number | null>(null);

    const applySession = useCallback(
        (nextSession: ActiveSessionSnapshot | null) => {
            const currentVersion = nextSession?.version ?? null;
            const bannerState = deriveBannerState({
                previousVersion: previousVersionRef.current,
                currentVersion,
            });

            setSession(nextSession);
            setShowRemoteUpdate(bannerState.showRemoteUpdate);
            previousVersionRef.current = currentVersion;
        },
        []
    );

    const refresh = useCallback(async () => {
        if (!enabled) return;

        setIsLoading((current) => (session === null ? true : current));
        const result = await getActiveSession();

        if (!result.success) {
            setError(result.error);
            setIsLoading(false);
            return;
        }

        setError(null);
        applySession(result.data);
        setIsLoading(false);
    }, [applySession, enabled, session]);

    const dismissRemoteUpdate = useCallback(() => {
        setShowRemoteUpdate(false);
    }, []);

    const runAction = useCallback(
        async (action: ActiveSessionAction, expectedVersion: number) => {
            const result = await applyActiveSessionAction({
                action,
                expectedVersion,
            });

            if (!result.success) {
                setError(result.error);
                return result;
            }

            setError(null);
            previousVersionRef.current = result.data?.version ?? null;
            setShowRemoteUpdate(false);
            setSession(result.data);
            return result;
        },
        []
    );

    useEffect(() => {
        if (!enabled) {
            setIsLoading(false);
            return;
        }

        void refresh();
        const intervalId = window.setInterval(() => {
            void refresh();
        }, pollIntervalMs);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [enabled, pollIntervalMs, refresh]);

    return {
        session,
        isLoading,
        error,
        showRemoteUpdate,
        refresh,
        dismissRemoteUpdate,
        runAction,
    };
}
