import { describe, it, expect } from 'vitest';
import {
    computeRemainingSeconds,
    buildPhaseTimingFromTimer,
    createIdleTimerState,
    reduceTimerState,
} from './timer-state';
import type { PhaseTiming, TimerState } from './timer-state';
import type { ActiveTimer } from '@/types';

function makeTimer(overrides: Partial<ActiveTimer> = {}): ActiveTimer {
    return {
        sessionId: 'test-session',
        task: 'Test task',
        projects: [],
        focusMode: 'short',
        startedAt: Date.now(),
        durationSeconds: 1500,
        isPaused: false,
        pausedAt: null,
        totalPausedSeconds: 0,
        ...overrides,
    };
}

describe('computeRemainingSeconds', () => {
    it('returns full duration when just started', () => {
        const now = Date.now();
        const timing: PhaseTiming = {
            startedAt: now,
            durationSeconds: 1500,
            pausedAt: null,
            totalPausedSeconds: 0,
        };
        expect(computeRemainingSeconds(timing, false, now)).toBe(1500);
    });

    it('subtracts elapsed time', () => {
        const now = Date.now();
        const timing: PhaseTiming = {
            startedAt: now - 300_000, // 5 minutes ago
            durationSeconds: 1500,
            pausedAt: null,
            totalPausedSeconds: 0,
        };
        expect(computeRemainingSeconds(timing, false, now)).toBe(1200);
    });

    it('uses pausedAt as anchor when paused', () => {
        const start = Date.now() - 600_000; // 10 minutes ago
        const pausedAt = start + 300_000; // paused after 5 minutes
        const timing: PhaseTiming = {
            startedAt: start,
            durationSeconds: 1500,
            pausedAt,
            totalPausedSeconds: 0,
        };
        // Even though "now" is 10 min after start, paused at 5 min
        expect(computeRemainingSeconds(timing, true, Date.now())).toBe(1200);
    });

    it('returns 0 when time is up', () => {
        const now = Date.now();
        const timing: PhaseTiming = {
            startedAt: now - 2000_000,
            durationSeconds: 1500,
            pausedAt: null,
            totalPausedSeconds: 0,
        };
        expect(computeRemainingSeconds(timing, false, now)).toBe(0);
    });
});

describe('createIdleTimerState', () => {
    it('returns idle state with all fields zeroed', () => {
        const state = createIdleTimerState();
        expect(state.phase).toBe('idle');
        expect(state.activeTimer).toBeNull();
        expect(state.remainingSeconds).toBe(0);
        expect(state.isPaused).toBe(false);
        expect(state.justCompletedFocus).toBe(false);
    });
});

describe('reduceTimerState', () => {
    it('handles start action', () => {
        const idle = createIdleTimerState();
        const timer = makeTimer({ durationSeconds: 1500 });
        const state = reduceTimerState(idle, { type: 'start', timer });
        expect(state.phase).toBe('focus');
        expect(state.activeTimer).toBe(timer);
        expect(state.remainingSeconds).toBe(1500);
    });

    it('handles tick action', () => {
        const timer = makeTimer();
        const focusState: TimerState = {
            activeTimer: timer,
            phase: 'focus',
            remainingSeconds: 1500,
            breakDurationSeconds: 0,
            phaseTiming: buildPhaseTimingFromTimer(timer),
            isPaused: false,
            justCompletedFocus: false,
        };
        const state = reduceTimerState(focusState, {
            type: 'tick',
            remainingSeconds: 1499,
        });
        expect(state.remainingSeconds).toBe(1499);
    });

    it('handles reset action', () => {
        const timer = makeTimer();
        const focusState: TimerState = {
            activeTimer: timer,
            phase: 'focus',
            remainingSeconds: 1000,
            breakDurationSeconds: 0,
            phaseTiming: buildPhaseTimingFromTimer(timer),
            isPaused: false,
            justCompletedFocus: true,
        };
        const state = reduceTimerState(focusState, { type: 'reset' });
        expect(state.phase).toBe('idle');
        expect(state.activeTimer).toBeNull();
        expect(state.justCompletedFocus).toBe(false);
    });
});
