import { describe, it, expect } from 'vitest';
import type { Task } from '@/lib/db/schema';

function sortByRecency(a: Task, b: Task): number {
    if (b.actualPomodoros !== a.actualPomodoros) {
        return b.actualPomodoros - a.actualPomodoros;
    }
    return b.updatedAt.getTime() - a.updatedAt.getTime();
}

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
