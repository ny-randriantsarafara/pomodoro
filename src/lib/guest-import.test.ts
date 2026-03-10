import { describe, expect, it } from 'vitest';
import {
    buildGuestImportPayload,
    hasGuestWorkspaceData,
} from './guest-import';
import type { GuestWorkspace } from './guest-store';

const workspace: GuestWorkspace = {
    tasks: [
        {
            id: 'task-1',
            title: 'Write summary',
            note: 'Keep it short',
            status: 'active',
            dueDate: null,
            estimatedPomodoros: 1,
            actualPomodoros: 0,
            createdAt: '2026-03-10T09:00:00.000Z',
            updatedAt: '2026-03-10T09:00:00.000Z',
        },
    ],
    sessions: [
        {
            id: 'session-1',
            taskId: 'task-1',
            task: 'Write summary',
            description: null,
            focusMode: 'short',
            startedAt: '2026-03-10T09:00:00.000Z',
            completedAt: '2026-03-10T09:25:00.000Z',
            durationSeconds: 1500,
            status: 'completed',
        },
    ],
    settings: {
        workMinutes: 50,
        shortBreakMinutes: 10,
        longBreakMinutes: 20,
        longBreakFrequency: 3,
        autoStartBreaks: true,
        autoStartFocusSessions: false,
    },
    activeTimer: null,
    updatedAt: '2026-03-10T09:25:00.000Z',
};

describe('guest import contracts', () => {
    it('reports when a workspace has importable data', () => {
        expect(hasGuestWorkspaceData(workspace)).toBe(true);
        expect(
            hasGuestWorkspaceData({
                ...workspace,
                tasks: [],
                sessions: [],
                activeTimer: null,
            })
        ).toBe(false);
    });

    it('builds an import payload with counts and sanitized records', () => {
        expect(buildGuestImportPayload(workspace)).toEqual({
            tasks: workspace.tasks,
            sessions: workspace.sessions,
            settings: workspace.settings,
            activeTimer: null,
            counts: {
                tasks: 1,
                sessions: 1,
                hasActiveTimer: false,
            },
        });
    });
});
