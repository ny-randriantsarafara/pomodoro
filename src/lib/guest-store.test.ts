import { describe, expect, it, beforeEach } from 'vitest';
import {
    clearGuestWorkspace,
    loadGuestWorkspace,
    saveGuestWorkspace,
    type GuestWorkspace,
} from './guest-store';

const workspace: GuestWorkspace = {
    tasks: [
        {
            id: 'task-1',
            title: 'Read chapter 3',
            note: null,
            status: 'active',
            dueDate: null,
            estimatedPomodoros: 2,
            actualPomodoros: 0,
            createdAt: '2026-03-10T10:00:00.000Z',
            updatedAt: '2026-03-10T10:00:00.000Z',
        },
    ],
    sessions: [
        {
            id: 'session-1',
            taskId: 'task-1',
            task: 'Read chapter 3',
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
    activeTimer: null,
    updatedAt: '2026-03-10T10:25:00.000Z',
};

describe('guest workspace storage', () => {
    beforeEach(() => {
        clearGuestWorkspace();
        localStorage.clear();
    });

    it('round-trips guest workspace data', () => {
        saveGuestWorkspace(workspace);

        expect(loadGuestWorkspace()).toEqual(workspace);
    });

    it('returns null for invalid guest workspace payloads', () => {
        localStorage.setItem('pomodoro-guest-workspace', '{"tasks":42}');

        expect(loadGuestWorkspace()).toBeNull();
    });

    it('clears persisted guest workspace data', () => {
        saveGuestWorkspace(workspace);
        clearGuestWorkspace();

        expect(loadGuestWorkspace()).toBeNull();
    });
});
