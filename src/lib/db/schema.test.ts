import { describe, it, expect } from 'vitest';
import {
    users,
    projects,
    focusSessions,
    sessionProjects,
    githubConnections,
    focusModeEnum,
    sessionStatusEnum,
    taskStatusEnum,
    activeSessionPhaseEnum,
    tasks,
    userSettings,
    activeSessions,
} from './schema';

describe('database schema', () => {
    it('defines focus mode enum with correct values', () => {
        expect(focusModeEnum.enumValues).toEqual(['short', 'average', 'deep']);
    });

    it('defines session status enum with correct values', () => {
        expect(sessionStatusEnum.enumValues).toEqual([
            'completed',
            'interrupted',
            'abandoned',
        ]);
    });

    it('defines task status enum with correct values', () => {
        expect(taskStatusEnum.enumValues).toEqual([
            'active',
            'completed',
            'archived',
        ]);
    });

    it('defines active session phase enum with correct values', () => {
        expect(activeSessionPhaseEnum.enumValues).toEqual([
            'focus',
            'shortBreak',
            'longBreak',
        ]);
    });

    it('defines users table with expected columns', () => {
        const columns = Object.keys(users);
        expect(columns).toContain('id');
        expect(columns).toContain('name');
        expect(columns).toContain('email');
        expect(columns).toContain('createdAt');
    });

    it('defines projects table with expected columns', () => {
        const columns = Object.keys(projects);
        expect(columns).toContain('id');
        expect(columns).toContain('userId');
        expect(columns).toContain('name');
        expect(columns).toContain('color');
        expect(columns).toContain('githubRepoUrl');
    });

    it('defines focus_sessions table with expected columns', () => {
        const columns = Object.keys(focusSessions);
        expect(columns).toContain('id');
        expect(columns).toContain('userId');
        expect(columns).toContain('focusMode');
        expect(columns).toContain('task');
        expect(columns).toContain('description');
        expect(columns).toContain('startedAt');
        expect(columns).toContain('status');
    });

    it('defines session_projects junction table with expected columns', () => {
        const columns = Object.keys(sessionProjects);
        expect(columns).toContain('sessionId');
        expect(columns).toContain('projectId');
    });

    it('defines github_connections table with expected columns', () => {
        const columns = Object.keys(githubConnections);
        expect(columns).toContain('id');
        expect(columns).toContain('userId');
        expect(columns).toContain('label');
        expect(columns).toContain('githubUsername');
        expect(columns).toContain('accessToken');
    });

    it('defines tasks table with expected columns', () => {
        const columns = Object.keys(tasks);
        expect(columns).toContain('id');
        expect(columns).toContain('userId');
        expect(columns).toContain('title');
        expect(columns).toContain('note');
        expect(columns).toContain('status');
        expect(columns).toContain('dueDate');
        expect(columns).toContain('estimatedPomodoros');
        expect(columns).toContain('actualPomodoros');
        expect(columns).toContain('createdAt');
        expect(columns).toContain('updatedAt');
        expect(tasks.userId.notNull).toBe(true);
    });

    it('defines user_settings table with expected columns', () => {
        const columns = Object.keys(userSettings);
        expect(columns).toContain('userId');
        expect(columns).toContain('workMinutes');
        expect(columns).toContain('shortBreakMinutes');
        expect(columns).toContain('longBreakMinutes');
        expect(columns).toContain('longBreakFrequency');
        expect(columns).toContain('autoStartBreaks');
        expect(columns).toContain('autoStartFocusSessions');
        expect(columns).toContain('createdAt');
        expect(columns).toContain('updatedAt');
    });

    it('defines active_sessions table with expected columns', () => {
        const columns = Object.keys(activeSessions);
        expect(columns).toContain('userId');
        expect(columns).toContain('taskId');
        expect(columns).toContain('phase');
        expect(columns).toContain('phaseStartedAt');
        expect(columns).toContain('phaseDurationSeconds');
        expect(columns).toContain('completedFocusSessions');
        expect(columns).toContain('isPaused');
        expect(columns).toContain('pausedAt');
        expect(columns).toContain('totalPausedSeconds');
        expect(columns).toContain('version');
        expect(columns).toContain('createdAt');
        expect(columns).toContain('updatedAt');
    });
});
