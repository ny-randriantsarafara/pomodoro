import { DEFAULT_TIMER_SETTINGS } from '@/lib/settings';
import { transitionToNextPhase } from '@/lib/active-session-machine';
import type { ActiveSessionPhase, FocusMode } from '@/lib/db/schema';
import type {
    ActiveSessionSnapshot,
    SessionProjectRef,
    TimerSettings,
} from '@/types';

export type ActiveSessionAction = 'pause' | 'resume' | 'skip' | 'stop';

export interface ActiveSessionRecord {
    readonly taskId?: string | null;
    readonly phase: ActiveSessionPhase;
    readonly phaseStartedAt: Date;
    readonly phaseDurationSeconds: number;
    readonly completedFocusSessions: number;
    readonly isPaused: boolean;
    readonly pausedAt: Date | null;
    readonly totalPausedSeconds: number;
    readonly version: number;
}

interface ActiveSessionMetadata {
    readonly sessionId: string | null;
    readonly taskLabel: string | null;
    readonly focusMode: FocusMode | null;
    readonly projects: ReadonlyArray<SessionProjectRef>;
}

export type ActiveSessionMutation = {
    readonly phase?: ActiveSessionPhase;
    readonly phaseStartedAt?: Date;
    readonly phaseDurationSeconds?: number;
    readonly completedFocusSessions?: number;
    readonly isPaused?: boolean;
    readonly pausedAt?: Date | null;
    readonly totalPausedSeconds?: number;
    readonly version: number;
    readonly updatedAt: Date;
};

interface VersionedRecord {
    readonly version: number;
}

interface NormalizePhaseActionInput {
    readonly currentPhase: ActiveSessionPhase;
    readonly action: ActiveSessionAction;
}

interface BuildActiveSessionActionUpdateInput {
    readonly session: ActiveSessionRecord;
    readonly action: ActiveSessionAction;
    readonly expectedVersion: number;
    readonly now: Date;
    readonly settings: TimerSettings;
}

type BuildActiveSessionActionUpdateResult =
    | { readonly success: false; readonly error: string }
    | {
          readonly success: true;
          readonly data: ActiveSessionMutation | null;
          readonly deleteActiveSession?: boolean;
      };

export const ACTIVE_SESSION_VERSION_ERROR =
    'Active session is out of date. Refresh and try again.';
export const ACTIVE_SESSION_NOT_FOUND_ERROR = 'Active session not found.';
export const ACTIVE_SESSION_ALREADY_EXISTS_ERROR =
    'You already have an active session.';

export function buildVersionedUpdate<T extends VersionedRecord>(record: T) {
    return {
        version: record.version + 1,
        updatedAt: new Date(),
    };
}

export function buildActiveSessionSnapshot(
    session: ActiveSessionRecord,
    metadata: ActiveSessionMetadata
): ActiveSessionSnapshot {
    return {
        taskId: session.taskId ?? null,
        sessionId: metadata.sessionId,
        taskLabel: metadata.taskLabel,
        focusMode: metadata.focusMode,
        projects: metadata.projects,
        phase: session.phase,
        phaseStartedAt: session.phaseStartedAt,
        phaseDurationSeconds: session.phaseDurationSeconds,
        completedFocusSessions: session.completedFocusSessions,
        isPaused: session.isPaused,
        pausedAt: session.pausedAt,
        totalPausedSeconds: session.totalPausedSeconds,
        version: session.version,
    };
}

export function normalizePhaseAction(input: NormalizePhaseActionInput) {
    if (input.action === 'skip') {
        if (input.currentPhase === 'focus') {
            return { nextPhase: 'shortBreak' as const };
        }

        return { nextPhase: 'focus' as const };
    }

    return {
        nextPhase: input.currentPhase,
    };
}

export function getPhaseDurationSeconds(
    phase: ActiveSessionPhase,
    settings: TimerSettings
): number {
    switch (phase) {
        case 'focus':
            return settings.workMinutes * 60;
        case 'shortBreak':
            return settings.shortBreakMinutes * 60;
        case 'longBreak':
            return settings.longBreakMinutes * 60;
    }
}

function getResumePausedSeconds(session: ActiveSessionRecord, now: Date): number {
    if (!session.pausedAt) {
        return session.totalPausedSeconds;
    }

    const pausedSeconds = Math.max(
        0,
        Math.round((now.getTime() - session.pausedAt.getTime()) / 1000)
    );

    return session.totalPausedSeconds + pausedSeconds;
}

export function buildActiveSessionActionUpdate(
    input: BuildActiveSessionActionUpdateInput
): BuildActiveSessionActionUpdateResult {
    if (input.expectedVersion !== input.session.version) {
        return {
            success: false,
            error: ACTIVE_SESSION_VERSION_ERROR,
        };
    }

    if (input.action === 'stop') {
        return {
            success: true,
            data: null,
            deleteActiveSession: true,
        };
    }

    if (input.action === 'pause') {
        return {
            success: true,
            data: {
                ...buildVersionedUpdate(input.session),
                isPaused: true,
                pausedAt: input.now,
            },
        };
    }

    if (input.action === 'resume') {
        return {
            success: true,
            data: {
                ...buildVersionedUpdate(input.session),
                isPaused: false,
                pausedAt: null,
                totalPausedSeconds: getResumePausedSeconds(
                    input.session,
                    input.now
                ),
            },
        };
    }

    const transition = transitionToNextPhase({
        currentPhase: input.session.phase,
        completedFocusCount: input.session.completedFocusSessions,
        longBreakFrequency: input.settings.longBreakFrequency,
        shortBreakSeconds: getPhaseDurationSeconds('shortBreak', input.settings),
        longBreakSeconds: getPhaseDurationSeconds('longBreak', input.settings),
        nextFocusSeconds: getPhaseDurationSeconds('focus', input.settings),
    });

    return {
        success: true,
        data: {
            ...buildVersionedUpdate(input.session),
            phase: transition.nextPhase,
            phaseStartedAt: input.now,
            phaseDurationSeconds: transition.nextDurationSeconds,
            completedFocusSessions: transition.completedFocusCount,
            isPaused: false,
            pausedAt: null,
            totalPausedSeconds: 0,
        },
    };
}

export function getDefaultActiveSessionSettings(): TimerSettings {
    return DEFAULT_TIMER_SETTINGS;
}
