import { describe, expect, it } from 'vitest';
import {
    buildActiveTimerFromSession,
    deriveBannerState,
    getSyncLoadingState,
} from './use-active-session-sync';

describe('use-active-session-sync helpers', () => {
    it('builds an active timer from a synced focus session', () => {
        const timer = buildActiveTimerFromSession({
            sessionId: 'session-1',
            taskId: 'task-1',
            taskLabel: 'Write release notes',
            focusMode: 'deep',
            projects: [
                {
                    id: 'project-1',
                    name: 'Launch prep',
                    color: '#A0A0FF',
                },
            ],
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
            focusMode: 'deep',
            projects: [
                {
                    id: 'project-1',
                    name: 'Launch prep',
                    color: '#A0A0FF',
                },
            ],
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

    it('reports sync loading as false whenever sync is disabled', () => {
        expect(
            getSyncLoadingState({
                enabled: false,
                isLoading: true,
            })
        ).toBe(false);
    });
});
