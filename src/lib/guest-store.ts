import type { ActiveTimer, TimerSettings } from '@/types';

export const GUEST_WORKSPACE_STORAGE_KEY = 'pomodoro-guest-workspace';

export interface GuestTaskRecord {
    readonly id: string;
    readonly title: string;
    readonly note: string | null;
    readonly status: 'active' | 'completed' | 'archived';
    readonly dueDate: string | null;
    readonly estimatedPomodoros: number | null;
    readonly actualPomodoros: number;
    readonly createdAt: string;
    readonly updatedAt: string;
}

export interface GuestSessionRecord {
    readonly id: string;
    readonly taskId: string | null;
    readonly task: string;
    readonly description: string | null;
    readonly focusMode: 'short' | 'average' | 'deep';
    readonly startedAt: string;
    readonly completedAt: string | null;
    readonly durationSeconds: number;
    readonly status: 'completed' | 'interrupted' | 'abandoned';
}

export interface GuestWorkspace {
    readonly tasks: ReadonlyArray<GuestTaskRecord>;
    readonly sessions: ReadonlyArray<GuestSessionRecord>;
    readonly settings: TimerSettings;
    readonly activeTimer: ActiveTimer | null;
    readonly updatedAt: string;
}

function getProperty(obj: object, key: string): unknown {
    const desc = Object.getOwnPropertyDescriptor(obj, key);
    return desc !== undefined ? desc.value : undefined;
}

function isStringOrNull(value: unknown): value is string | null {
    return value === null || typeof value === 'string';
}

function isNumberOrNull(value: unknown): value is number | null {
    return value === null || typeof value === 'number';
}

function isTaskRecord(value: unknown): value is GuestTaskRecord {
    if (value === null || typeof value !== 'object') return false;

    return (
        typeof getProperty(value, 'id') === 'string' &&
        typeof getProperty(value, 'title') === 'string' &&
        isStringOrNull(getProperty(value, 'note')) &&
        (getProperty(value, 'status') === 'active' ||
            getProperty(value, 'status') === 'completed' ||
            getProperty(value, 'status') === 'archived') &&
        isStringOrNull(getProperty(value, 'dueDate')) &&
        isNumberOrNull(getProperty(value, 'estimatedPomodoros')) &&
        typeof getProperty(value, 'actualPomodoros') === 'number' &&
        typeof getProperty(value, 'createdAt') === 'string' &&
        typeof getProperty(value, 'updatedAt') === 'string'
    );
}

function isSessionRecord(value: unknown): value is GuestSessionRecord {
    if (value === null || typeof value !== 'object') return false;

    return (
        typeof getProperty(value, 'id') === 'string' &&
        isStringOrNull(getProperty(value, 'taskId')) &&
        typeof getProperty(value, 'task') === 'string' &&
        isStringOrNull(getProperty(value, 'description')) &&
        (getProperty(value, 'focusMode') === 'short' ||
            getProperty(value, 'focusMode') === 'average' ||
            getProperty(value, 'focusMode') === 'deep') &&
        typeof getProperty(value, 'startedAt') === 'string' &&
        isStringOrNull(getProperty(value, 'completedAt')) &&
        typeof getProperty(value, 'durationSeconds') === 'number' &&
        (getProperty(value, 'status') === 'completed' ||
            getProperty(value, 'status') === 'interrupted' ||
            getProperty(value, 'status') === 'abandoned')
    );
}

function isTimerSettings(value: unknown): value is TimerSettings {
    if (value === null || typeof value !== 'object') return false;

    return (
        typeof getProperty(value, 'workMinutes') === 'number' &&
        typeof getProperty(value, 'shortBreakMinutes') === 'number' &&
        typeof getProperty(value, 'longBreakMinutes') === 'number' &&
        typeof getProperty(value, 'longBreakFrequency') === 'number' &&
        typeof getProperty(value, 'autoStartBreaks') === 'boolean' &&
        typeof getProperty(value, 'autoStartFocusSessions') === 'boolean'
    );
}

function isActiveTimer(value: unknown): value is ActiveTimer {
    if (value === null || typeof value !== 'object') return false;

    return (
        typeof getProperty(value, 'sessionId') === 'string' &&
        Array.isArray(getProperty(value, 'projects')) &&
        typeof getProperty(value, 'task') === 'string' &&
        (getProperty(value, 'focusMode') === 'short' ||
            getProperty(value, 'focusMode') === 'average' ||
            getProperty(value, 'focusMode') === 'deep') &&
        typeof getProperty(value, 'startedAt') === 'number' &&
        typeof getProperty(value, 'durationSeconds') === 'number' &&
        typeof getProperty(value, 'isPaused') === 'boolean' &&
        isNumberOrNull(getProperty(value, 'pausedAt')) &&
        typeof getProperty(value, 'totalPausedSeconds') === 'number'
    );
}

function parseGuestWorkspace(stored: string): GuestWorkspace | null {
    let parsed: unknown;

    try {
        parsed = JSON.parse(stored);
    } catch {
        return null;
    }

    if (parsed === null || typeof parsed !== 'object') return null;

    const tasks = getProperty(parsed, 'tasks');
    const sessions = getProperty(parsed, 'sessions');
    const settings = getProperty(parsed, 'settings');
    const activeTimer = getProperty(parsed, 'activeTimer');
    const updatedAt = getProperty(parsed, 'updatedAt');

    if (
        !Array.isArray(tasks) ||
        !tasks.every(isTaskRecord) ||
        !Array.isArray(sessions) ||
        !sessions.every(isSessionRecord) ||
        !isTimerSettings(settings) ||
        !(activeTimer === null || isActiveTimer(activeTimer)) ||
        typeof updatedAt !== 'string'
    ) {
        return null;
    }

    return {
        tasks,
        sessions,
        settings,
        activeTimer,
        updatedAt,
    };
}

export function saveGuestWorkspace(workspace: GuestWorkspace): void {
    try {
        localStorage.setItem(
            GUEST_WORKSPACE_STORAGE_KEY,
            JSON.stringify(workspace)
        );
    } catch {
        // localStorage may be unavailable
    }
}

export function loadGuestWorkspace(): GuestWorkspace | null {
    try {
        const stored = localStorage.getItem(GUEST_WORKSPACE_STORAGE_KEY);
        if (!stored) return null;
        return parseGuestWorkspace(stored);
    } catch {
        return null;
    }
}

export function clearGuestWorkspace(): void {
    try {
        localStorage.removeItem(GUEST_WORKSPACE_STORAGE_KEY);
    } catch {
        // localStorage may be unavailable
    }
}
