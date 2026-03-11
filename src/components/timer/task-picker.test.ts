import { describe, it, expect } from 'vitest';
import type { Task } from '@/lib/db/schema';
import { sortByRecency, getVisibleTasks, MAX_VISIBLE_PILLS } from './task-picker';

function makeTask(overrides: Partial<Task> = {}): Task {
    return {
        id: crypto.randomUUID(),
        userId: 'user-1',
        title: 'Task',
        note: null,
        status: 'active',
        dueDate: null,
        estimatedPomodoros: null,
        actualPomodoros: 0,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        ...overrides,
    };
}

describe('sortByRecency', () => {
    it('sorts by actualPomodoros descending', () => {
        const a = makeTask({ title: 'A', actualPomodoros: 1 });
        const b = makeTask({ title: 'B', actualPomodoros: 5 });
        const c = makeTask({ title: 'C', actualPomodoros: 3 });
        const sorted = [a, b, c].sort(sortByRecency);
        expect(sorted.map((t) => t.title)).toEqual(['B', 'C', 'A']);
    });

    it('breaks ties by updatedAt descending', () => {
        const a = makeTask({
            title: 'A',
            actualPomodoros: 2,
            updatedAt: new Date('2026-03-01'),
        });
        const b = makeTask({
            title: 'B',
            actualPomodoros: 2,
            updatedAt: new Date('2026-03-10'),
        });
        const sorted = [a, b].sort(sortByRecency);
        expect(sorted.map((t) => t.title)).toEqual(['B', 'A']);
    });

    it('handles tasks with zero pomodoros', () => {
        const a = makeTask({
            title: 'A',
            actualPomodoros: 0,
            updatedAt: new Date('2026-03-05'),
        });
        const b = makeTask({
            title: 'B',
            actualPomodoros: 0,
            updatedAt: new Date('2026-03-10'),
        });
        const sorted = [a, b].sort(sortByRecency);
        expect(sorted.map((t) => t.title)).toEqual(['B', 'A']);
    });
});

describe('getVisibleTasks', () => {
    it('returns up to MAX_VISIBLE_PILLS tasks', () => {
        const tasks = [
            makeTask({ title: 'A', actualPomodoros: 5 }),
            makeTask({ title: 'B', actualPomodoros: 4 }),
            makeTask({ title: 'C', actualPomodoros: 3 }),
            makeTask({ title: 'D', actualPomodoros: 2 }),
            makeTask({ title: 'E', actualPomodoros: 1 }),
            makeTask({ title: 'F', actualPomodoros: 0 }),
        ];

        const visible = getVisibleTasks(tasks, null);

        expect(visible).toHaveLength(MAX_VISIBLE_PILLS);
        expect(visible.map((t) => t.title)).toEqual(['A', 'B', 'C', 'D']);
    });

    it('returns all tasks when fewer than MAX_VISIBLE_PILLS', () => {
        const tasks = [
            makeTask({ title: 'A', actualPomodoros: 2 }),
            makeTask({ title: 'B', actualPomodoros: 1 }),
        ];

        const visible = getVisibleTasks(tasks, null);

        expect(visible).toHaveLength(2);
        expect(visible.map((t) => t.title)).toEqual(['A', 'B']);
    });

    it('includes selected task even if not in top recent', () => {
        const lowPriorityTask = makeTask({
            id: 'selected-id',
            title: 'Selected',
            actualPomodoros: 0,
            updatedAt: new Date('2020-01-01'),
        });
        const tasks = [
            makeTask({ title: 'A', actualPomodoros: 5 }),
            makeTask({ title: 'B', actualPomodoros: 4 }),
            makeTask({ title: 'C', actualPomodoros: 3 }),
            makeTask({ title: 'D', actualPomodoros: 2 }),
            makeTask({ title: 'E', actualPomodoros: 1 }),
            lowPriorityTask,
        ];

        const visible = getVisibleTasks(tasks, 'selected-id');

        expect(visible).toHaveLength(MAX_VISIBLE_PILLS);
        expect(visible.map((t) => t.title)).toContain('Selected');
        // Selected replaces 4th slot, so we get A, B, C, Selected
        expect(visible.map((t) => t.title)).toEqual(['A', 'B', 'C', 'Selected']);
    });

    it('keeps selected task in place if already in recent', () => {
        const selectedTask = makeTask({
            id: 'selected-id',
            title: 'B',
            actualPomodoros: 4,
        });
        const tasks = [
            makeTask({ title: 'A', actualPomodoros: 5 }),
            selectedTask,
            makeTask({ title: 'C', actualPomodoros: 3 }),
            makeTask({ title: 'D', actualPomodoros: 2 }),
            makeTask({ title: 'E', actualPomodoros: 1 }),
        ];

        const visible = getVisibleTasks(tasks, 'selected-id');

        expect(visible).toHaveLength(MAX_VISIBLE_PILLS);
        // B stays in its natural position (2nd)
        expect(visible.map((t) => t.title)).toEqual(['A', 'B', 'C', 'D']);
    });

    it('returns empty array for empty tasks', () => {
        const visible = getVisibleTasks([], null);
        expect(visible).toEqual([]);
    });
});
