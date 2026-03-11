import { describe, it, expect } from 'vitest';
import { buildTimerStateFromSyncedSession } from './timer-state';
import type { ActiveSessionSnapshot } from '@/types';

function makeSnapshot(
    overrides: Partial<ActiveSessionSnapshot> = {}
): ActiveSessionSnapshot {
    return {
        taskId: null,
        sessionId: null,
        taskLabel: null,
        focusMode: null,
        projects: [],
        phase: 'focus',
        phaseStartedAt: new Date('2026-03-11T10:00:00Z'),
        phaseDurationSeconds: 1500,
        completedFocusSessions: 0,
        isPaused: false,
        pausedAt: null,
        totalPausedSeconds: 0,
        version: 1,
        ...overrides,
    };
}

describe('buildTimerStateFromSyncedSession', () => {
    const nowMs = new Date('2026-03-11T10:05:00Z').getTime();

    it('returns focus phase when phase is focus and sessionId is present', () => {
        const session = makeSnapshot({
            phase: 'focus',
            sessionId: 'session-1',
            taskLabel: 'My Task',
            focusMode: 'short',
        });
        const state = buildTimerStateFromSyncedSession(session, nowMs);
        expect(state.phase).toBe('focus');
        expect(state.activeTimer).not.toBeNull();
        expect(state.remainingSeconds).toBeGreaterThan(0);
    });

    it('returns focus phase when phase is focus but sessionId is null', () => {
        const session = makeSnapshot({
            phase: 'focus',
            sessionId: null,
        });
        const state = buildTimerStateFromSyncedSession(session, nowMs);
        expect(state.phase).toBe('focus');
        expect(state.activeTimer).toBeNull();
        expect(state.remainingSeconds).toBeGreaterThan(0);
    });

    it('returns focus phase when paused with null sessionId', () => {
        const pausedAt = new Date('2026-03-11T10:03:00Z');
        const session = makeSnapshot({
            phase: 'focus',
            sessionId: null,
            isPaused: true,
            pausedAt,
            totalPausedSeconds: 0,
        });
        const state = buildTimerStateFromSyncedSession(session, nowMs);
        expect(state.phase).toBe('focus');
        expect(state.activeTimer).toBeNull();
        expect(state.isPaused).toBe(true);
        expect(state.remainingSeconds).toBe(1320);
    });

    it('returns break phase for shortBreak', () => {
        const session = makeSnapshot({
            phase: 'shortBreak',
            phaseDurationSeconds: 300,
        });
        const state = buildTimerStateFromSyncedSession(session, nowMs);
        expect(state.phase).toBe('break');
        expect(state.breakDurationSeconds).toBe(300);
    });

    it('returns break phase for longBreak', () => {
        const session = makeSnapshot({
            phase: 'longBreak',
            phaseDurationSeconds: 900,
        });
        const state = buildTimerStateFromSyncedSession(session, nowMs);
        expect(state.phase).toBe('break');
        expect(state.breakDurationSeconds).toBe(900);
    });
});
