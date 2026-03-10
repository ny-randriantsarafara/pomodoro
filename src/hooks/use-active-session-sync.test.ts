import { describe, expect, it } from 'vitest';
import {
    buildActiveTimerFromSession,
    deriveBannerState,
} from './use-active-session-sync';

describe('use-active-session-sync helpers', () => {
    it('builds an active timer from a synced focus session', () => {
        const timer = buildActiveTimerFromSession({
            sessionId: 'session-1',
            taskId: 'task-1',
            taskLabel: 'Write release notes',
            phase: 'focus',
            phaseStartedAt: new Date('2026-03-10T10:00:00.000Z'),
            phaseDurationSeconds: 1500,
            isPaused: false,
            pausedAt: null,
            totalPausedSeconds: 0,
            version: 4,
        });

        expect(timer).toMatchObject({
            sessionId: 'session-1',
            taskId: 'task-1',
            task: 'Write release notes',
            focusMode: 'short',
            activeSessionVersion: 4,
            isPaused: false,
        });
    });

    it('marks remote updates when the synced version changes', () => {
        expect(
            deriveBannerState({
                previousVersion: 3,
                currentVersion: 4,
            }).showRemoteUpdate
        ).toBe(true);
    });
});
