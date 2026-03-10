import { buildActiveTimerFromSession } from './use-active-session-sync';
import type { ActiveSessionSnapshot, ActiveTimer } from '@/types';

export type TimerPhase = 'idle' | 'focus' | 'break';

export interface PhaseTiming {
    readonly startedAt: number;
    readonly durationSeconds: number;
    readonly pausedAt: number | null;
    readonly totalPausedSeconds: number;
}

export interface TimerState {
    readonly activeTimer: ActiveTimer | null;
    readonly phase: TimerPhase;
    readonly remainingSeconds: number;
    readonly breakDurationSeconds: number;
    readonly phaseTiming: PhaseTiming | null;
    readonly isPaused: boolean;
    readonly justCompletedFocus: boolean;
}

export type TimerAction =
    | { readonly type: 'apply-synced-session'; readonly session: ActiveSessionSnapshot }
    | { readonly type: 'clear-completed-focus' }
    | { readonly type: 'pause-local'; readonly timer: ActiveTimer; readonly timing: PhaseTiming }
    | { readonly type: 'pulse-completed-focus' }
    | {
          readonly type: 'reset';
          readonly preserveCompletionPulse?: boolean;
      }
    | { readonly type: 'resume-local'; readonly timer: ActiveTimer; readonly timing: PhaseTiming }
    | { readonly type: 'start'; readonly timer: ActiveTimer }
    | { readonly type: 'tick'; readonly remainingSeconds: number };

function getPhaseTimestampMs(value: Date | string): number {
    return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export function computeRemainingSeconds(
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

export function buildPhaseTimingFromTimer(timer: ActiveTimer): PhaseTiming {
    return {
        startedAt: timer.startedAt,
        durationSeconds: timer.durationSeconds,
        pausedAt: timer.pausedAt,
        totalPausedSeconds: timer.totalPausedSeconds,
    };
}

export function createIdleTimerState(): TimerState {
    return {
        activeTimer: null,
        phase: 'idle',
        remainingSeconds: 0,
        breakDurationSeconds: 0,
        phaseTiming: null,
        isPaused: false,
        justCompletedFocus: false,
    };
}

export function buildTimerStateFromSyncedSession(
    session: ActiveSessionSnapshot,
    nowMs: number = Date.now()
): TimerState {
    if (session.phase === 'focus' && session.sessionId) {
        const timer = buildActiveTimerFromSession(session);
        return {
            activeTimer: timer,
            phase: 'focus',
            remainingSeconds: computeRemainingSeconds(
                buildPhaseTimingFromTimer(timer),
                session.isPaused,
                nowMs
            ),
            breakDurationSeconds: 0,
            phaseTiming: buildPhaseTimingFromTimer(timer),
            isPaused: session.isPaused,
            justCompletedFocus: false,
        };
    }

    const phaseTiming = {
        startedAt: getPhaseTimestampMs(session.phaseStartedAt),
        durationSeconds: session.phaseDurationSeconds,
        pausedAt: session.pausedAt
            ? getPhaseTimestampMs(session.pausedAt)
            : null,
        totalPausedSeconds: session.totalPausedSeconds,
    };

    return {
        activeTimer: null,
        phase: 'break',
        remainingSeconds: computeRemainingSeconds(
            phaseTiming,
            session.isPaused,
            nowMs
        ),
        breakDurationSeconds: session.phaseDurationSeconds,
        phaseTiming,
        isPaused: session.isPaused,
        justCompletedFocus: false,
    };
}

export function reduceTimerState(
    state: TimerState,
    action: TimerAction
): TimerState {
    switch (action.type) {
        case 'apply-synced-session': {
            return {
                ...buildTimerStateFromSyncedSession(action.session),
                justCompletedFocus: state.justCompletedFocus,
            };
        }
        case 'clear-completed-focus':
            return {
                ...state,
                justCompletedFocus: false,
            };
        case 'pause-local':
            return {
                ...state,
                activeTimer: action.timer,
                phaseTiming: action.timing,
                isPaused: true,
            };
        case 'pulse-completed-focus':
            return {
                ...state,
                justCompletedFocus: true,
            };
        case 'reset':
            return {
                ...createIdleTimerState(),
                justCompletedFocus: action.preserveCompletionPulse
                    ? state.justCompletedFocus
                    : false,
            };
        case 'resume-local':
            return {
                ...state,
                activeTimer: action.timer,
                phaseTiming: action.timing,
                isPaused: false,
            };
        case 'start':
            return {
                activeTimer: action.timer,
                phase: 'focus',
                remainingSeconds: action.timer.durationSeconds,
                breakDurationSeconds: 0,
                phaseTiming: buildPhaseTimingFromTimer(action.timer),
                isPaused: false,
                justCompletedFocus: false,
            };
        case 'tick':
            return {
                ...state,
                remainingSeconds: action.remainingSeconds,
            };
        default:
            return state;
    }
}
