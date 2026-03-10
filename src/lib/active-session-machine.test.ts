import { describe, expect, it } from 'vitest';
import {
    deriveRemainingSeconds,
    transitionToNextPhase,
} from './active-session-machine';

describe('active session machine', () => {
    it('derives remaining time from timestamps', () => {
        const remaining = deriveRemainingSeconds({
            nowMs: 60_000,
            phaseStartedAtMs: 0,
            phaseDurationSeconds: 120,
            isPaused: false,
            pausedAtMs: null,
            totalPausedSeconds: 0,
        });

        expect(remaining).toBe(60);
    });

    it('uses pausedAt when the phase is paused', () => {
        const remaining = deriveRemainingSeconds({
            nowMs: 100_000,
            phaseStartedAtMs: 0,
            phaseDurationSeconds: 120,
            isPaused: true,
            pausedAtMs: 30_000,
            totalPausedSeconds: 0,
        });

        expect(remaining).toBe(90);
    });

    it('moves to a short break before the long-break threshold', () => {
        expect(
            transitionToNextPhase({
                currentPhase: 'focus',
                completedFocusCount: 2,
                longBreakFrequency: 4,
                shortBreakSeconds: 300,
                longBreakSeconds: 900,
                nextFocusSeconds: 1500,
            })
        ).toEqual({
            nextPhase: 'shortBreak',
            nextDurationSeconds: 300,
            completedFocusCount: 3,
        });
    });

    it('moves to a long break at the configured frequency', () => {
        expect(
            transitionToNextPhase({
                currentPhase: 'focus',
                completedFocusCount: 3,
                longBreakFrequency: 4,
                shortBreakSeconds: 300,
                longBreakSeconds: 900,
                nextFocusSeconds: 1500,
            })
        ).toEqual({
            nextPhase: 'longBreak',
            nextDurationSeconds: 900,
            completedFocusCount: 4,
        });
    });

    it('moves back to focus after a break', () => {
        expect(
            transitionToNextPhase({
                currentPhase: 'shortBreak',
                completedFocusCount: 4,
                longBreakFrequency: 4,
                shortBreakSeconds: 300,
                longBreakSeconds: 900,
                nextFocusSeconds: 1500,
            })
        ).toEqual({
            nextPhase: 'focus',
            nextDurationSeconds: 1500,
            completedFocusCount: 4,
        });
    });
});
