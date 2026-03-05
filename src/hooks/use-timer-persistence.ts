'use client';

import { TIMER_STORAGE_KEY } from '@/lib/constants';
import type { ActiveTimer } from '@/types';

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
    const focusMode = obj.focusMode;
    const startedAt = obj.startedAt;
    const durationSeconds = obj.durationSeconds;
    const isPaused = obj.isPaused;
    const pausedAt = obj.pausedAt;
    const totalPausedSeconds = obj.totalPausedSeconds;

    if (
        typeof task !== 'string' ||
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
        projects,
        task,
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
