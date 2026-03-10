import { describe, expect, it } from 'vitest';
import { getGuestUpgradeSummary } from './guest-upgrade-banner';

describe('getGuestUpgradeSummary', () => {
    it('returns null when there is no guest data to import', () => {
        expect(getGuestUpgradeSummary(null)).toBeNull();
    });

    it('returns import counts for a guest workspace with local data', () => {
        expect(
            getGuestUpgradeSummary({
                tasks: [
                    {
                        id: 'task-1',
                        title: 'Draft outline',
                        note: null,
                        status: 'active',
                        dueDate: null,
                        estimatedPomodoros: 2,
                        actualPomodoros: 1,
                        createdAt: '2026-03-10T10:00:00.000Z',
                        updatedAt: '2026-03-10T10:00:00.000Z',
                    },
                ],
                sessions: [
                    {
                        id: 'session-1',
                        taskId: 'task-1',
                        task: 'Draft outline',
                        description: null,
                        focusMode: 'short',
                        startedAt: '2026-03-10T10:00:00.000Z',
                        completedAt: '2026-03-10T10:25:00.000Z',
                        durationSeconds: 1500,
                        status: 'completed',
                    },
                ],
                settings: {
                    workMinutes: 25,
                    shortBreakMinutes: 5,
                    longBreakMinutes: 15,
                    longBreakFrequency: 4,
                    autoStartBreaks: false,
                    autoStartFocusSessions: false,
                },
                activeTimer: {
                    sessionId: 'active-1',
                    projects: [],
                    task: 'Draft outline',
                    focusMode: 'short',
                    startedAt: Date.parse('2026-03-10T11:00:00.000Z'),
                    durationSeconds: 1500,
                    isPaused: false,
                    pausedAt: null,
                    totalPausedSeconds: 0,
                },
                updatedAt: '2026-03-10T11:00:00.000Z',
            })
        ).toEqual({
            sessions: 1,
            tasks: 1,
            hasActiveTimer: true,
        });
    });
});
