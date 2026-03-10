import { describe, expect, it } from 'vitest';
import {
    buildTimerStateFromSyncedSession,
    reduceTimerState,
    shouldRestorePersistedTimer,
    type TimerState,
} from './timer-state';

describe('buildTimerStateFromSyncedSession', () => {
    it('maps a synced focus session into local timer state', () => {
        const state = buildTimerStateFromSyncedSession({
            taskId: 'task-1',
            sessionId: 'session-1',
            taskLabel: 'Write docs',
            focusMode: 'deep',
            projects: [],
            phase: 'focus',
            phaseStartedAt: new Date('2026-03-10T10:00:00.000Z'),
            phaseDurationSeconds: 3000,
            completedFocusSessions: 1,
            isPaused: false,
            pausedAt: null,
            totalPausedSeconds: 0,
            version: 7,
        });

        expect(state.activeTimer).toMatchObject({
            sessionId: 'session-1',
            taskId: 'task-1',
            task: 'Write docs',
            focusMode: 'deep',
            activeSessionVersion: 7,
        });
        expect(state.phase).toBe('focus');
        expect(state.breakDurationSeconds).toBe(0);
        expect(state.isPaused).toBe(false);
        expect(state.phaseTiming).toMatchObject({
            durationSeconds: 3000,
        });
    });
});

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
