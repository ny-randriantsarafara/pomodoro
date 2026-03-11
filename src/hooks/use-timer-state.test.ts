import { describe, expect, it } from 'vitest';
import {
    reduceTimerState,
    shouldRestorePersistedTimer,
    type TimerState,
} from './timer-state';

describe('reduceTimerState', () => {
    const idleState: TimerState = {
        activeTimer: null,
        phase: 'idle',
        remainingSeconds: 0,
        breakDurationSeconds: 0,
        phaseTiming: null,
        isPaused: false,
        justCompletedFocus: false,
    };

    it('sets the completion pulse without mutating the rest of the timer state', () => {
        expect(
            reduceTimerState(idleState, {
                type: 'pulse-completed-focus',
            })
        ).toEqual({
            ...idleState,
            justCompletedFocus: true,
        });
    });

    it('can reset to idle without clearing an active completion pulse', () => {
        expect(
            reduceTimerState(
                {
                    ...idleState,
                    justCompletedFocus: true,
                },
                {
                    type: 'reset',
                    preserveCompletionPulse: true,
                }
            )
        ).toEqual({
            ...idleState,
            justCompletedFocus: true,
        });
    });

    it('transitions to break phase with correct duration and timing', () => {
        const nowMs = 100_000;
        const breakDurationSeconds = 300;

        const focusState: TimerState = {
            ...idleState,
            activeTimer: {
                sessionId: 'sess-1',
                projects: [],
                task: 'Test task',
                focusMode: 'short',
                startedAt: 0,
                durationSeconds: 1500,
                isPaused: false,
                pausedAt: null,
                totalPausedSeconds: 0,
            },
            phase: 'focus',
            remainingSeconds: 0,
            justCompletedFocus: true,
        };

        const result = reduceTimerState(focusState, {
            type: 'start-break',
            breakDurationSeconds,
            nowMs,
        });

        expect(result.phase).toBe('break');
        expect(result.remainingSeconds).toBe(breakDurationSeconds);
        expect(result.breakDurationSeconds).toBe(breakDurationSeconds);
        expect(result.isPaused).toBe(false);
        expect(result.phaseTiming).toEqual({
            startedAt: nowMs,
            durationSeconds: breakDurationSeconds,
            pausedAt: null,
            totalPausedSeconds: 0,
        });
        // activeTimer is cleared since focus session is done
        expect(result.activeTimer).toBeNull();
        expect(result.justCompletedFocus).toBe(false);
    });
});

describe('shouldRestorePersistedTimer', () => {
    it('does not restore guest timers into the signed-in timer route', () => {
        expect(
            shouldRestorePersistedTimer('signed-in', {
                sessionId: 'guest-123',
                projects: [],
                task: 'Draft outline',
                focusMode: 'short',
                startedAt: 0,
                durationSeconds: 1500,
                isPaused: false,
                pausedAt: null,
                totalPausedSeconds: 0,
            })
        ).toBe(false);
    });

    it('restores guest timers inside the guest timer route', () => {
        expect(
            shouldRestorePersistedTimer('guest', {
                sessionId: 'guest-123',
                projects: [],
                task: 'Draft outline',
                focusMode: 'short',
                startedAt: 0,
                durationSeconds: 1500,
                isPaused: false,
                pausedAt: null,
                totalPausedSeconds: 0,
            })
        ).toBe(true);
    });
});
