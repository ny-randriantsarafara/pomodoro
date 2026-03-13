'use client';

import { TIMER_STORAGE_KEY, BREAK_STORAGE_KEY } from '@/lib/constants';
import type { ActiveTimer } from '@/types';
import type { PhaseTiming } from './timer-state';

export interface PersistedBreak {
    readonly phaseTiming: PhaseTiming;
    readonly breakDurationSeconds: number;
}

export function saveTimer(timer: ActiveTimer): void {
    try {
        localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timer));
    } catch {
        // localStorage may be unavailable
    }
}

function getProperty(obj: object, key: string): unknown {
    const desc = Object.getOwnPropertyDescriptor(obj, key);
    return desc !== undefined ? desc.value : undefined;
}

function isValidProjectRef(x: unknown): x is { id: string; name: string; color: string } {
    if (x === null || typeof x !== 'object') return false;
    const id = getProperty(x, 'id');
    const name = getProperty(x, 'name');
    const color = getProperty(x, 'color');
    return (
        typeof id === 'string' &&
        typeof name === 'string' &&
        typeof color === 'string'
    );
}

function parseStoredTimer(stored: string): ActiveTimer | null {
    let parsed: unknown;
    try {
        parsed = JSON.parse(stored);
    } catch {
        return null;
    }
    if (parsed === null || typeof parsed !== 'object') return null;
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(parsed)) {
        obj[k] = v;
    }

    const sessionId = obj.sessionId;
    if (typeof sessionId !== 'string') return null;
    const taskId = obj.taskId;

    let projects: ReadonlyArray<{ id: string; name: string; color: string }>;
    if (Array.isArray(obj.projects) && obj.projects.every(isValidProjectRef)) {
        projects = obj.projects;
    } else if (
        typeof obj.projectId === 'string' &&
        typeof obj.projectName === 'string' &&
        typeof obj.projectColor === 'string'
    ) {
        projects = [
            {
                id: obj.projectId,
                name: obj.projectName,
                color: obj.projectColor,
            },
        ];
    } else {
        return null;
    }

    const task = obj.task;
    const description = obj.description;
    const focusMode = obj.focusMode;
    const startedAt = obj.startedAt;
    const durationSeconds = obj.durationSeconds;
    const isPaused = obj.isPaused;
    const pausedAt = obj.pausedAt;
    const totalPausedSeconds = obj.totalPausedSeconds;

    if (
        typeof task !== 'string' ||
        (description !== undefined &&
            description !== null &&
            typeof description !== 'string') ||
        (focusMode !== 'short' && focusMode !== 'average' && focusMode !== 'deep') ||
        typeof startedAt !== 'number' ||
        typeof durationSeconds !== 'number' ||
        typeof isPaused !== 'boolean' ||
        (pausedAt !== null && typeof pausedAt !== 'number') ||
        typeof totalPausedSeconds !== 'number'
    ) {
        return null;
    }

    return {
        sessionId,
        taskId: typeof taskId === 'string' ? taskId : undefined,
        projects,
        task,
        description:
            typeof description === 'string' ? description : undefined,
        focusMode,
        startedAt,
        durationSeconds,
        isPaused,
        pausedAt,
        totalPausedSeconds,
    };
}

export function loadTimer(): ActiveTimer | null {
    try {
        const stored = localStorage.getItem(TIMER_STORAGE_KEY);
        if (!stored) return null;
        return parseStoredTimer(stored);
    } catch {
        return null;
    }
}

export function clearTimer(): void {
    try {
        localStorage.removeItem(TIMER_STORAGE_KEY);
    } catch {
        // localStorage may be unavailable
    }
}

export function saveBreak(breakState: PersistedBreak): void {
    try {
        localStorage.setItem(BREAK_STORAGE_KEY, JSON.stringify(breakState));
    } catch {
        // localStorage may be unavailable
    }
}

export function loadBreak(): PersistedBreak | null {
    try {
        const stored = localStorage.getItem(BREAK_STORAGE_KEY);
        if (!stored) return null;
        const parsed = JSON.parse(stored);
        if (
            parsed === null ||
            typeof parsed !== 'object' ||
            typeof parsed.breakDurationSeconds !== 'number' ||
            parsed.phaseTiming === null ||
            typeof parsed.phaseTiming !== 'object' ||
            typeof parsed.phaseTiming.startedAt !== 'number' ||
            typeof parsed.phaseTiming.durationSeconds !== 'number' ||
            typeof parsed.phaseTiming.totalPausedSeconds !== 'number'
        ) {
            return null;
        }
        return {
            phaseTiming: {
                startedAt: parsed.phaseTiming.startedAt,
                durationSeconds: parsed.phaseTiming.durationSeconds,
                pausedAt: parsed.phaseTiming.pausedAt ?? null,
                totalPausedSeconds: parsed.phaseTiming.totalPausedSeconds,
            },
            breakDurationSeconds: parsed.breakDurationSeconds,
        };
    } catch {
        return null;
    }
}

export function clearBreak(): void {
    try {
        localStorage.removeItem(BREAK_STORAGE_KEY);
    } catch {
        // localStorage may be unavailable
    }
}
