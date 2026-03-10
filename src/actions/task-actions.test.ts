import { describe, expect, it } from 'vitest';
import { normalizeTaskInput, resolveTaskStatusAction } from './task-actions';

describe('normalizeTaskInput', () => {
    it('trims strings and parses optional fields', async () => {
        const formData = new FormData();
        formData.set('title', '  Write release notes  ');
        formData.set('note', '  Mention guest mode  ');
        formData.set('dueDate', '2026-03-11');
        formData.set('estimatedPomodoros', '3');

        await expect(normalizeTaskInput(formData)).resolves.toEqual({
            title: 'Write release notes',
            note: 'Mention guest mode',
            dueDate: new Date('2026-03-11T00:00:00.000Z'),
            estimatedPomodoros: 3,
        });
    });

    it('treats blank optional fields as null', async () => {
        const formData = new FormData();
        formData.set('title', 'Inbox cleanup');
        formData.set('note', '   ');
        formData.set('dueDate', '');
        formData.set('estimatedPomodoros', '');

        await expect(normalizeTaskInput(formData)).resolves.toEqual({
            title: 'Inbox cleanup',
            note: null,
            dueDate: null,
            estimatedPomodoros: null,
        });
    });

    it('throws for invalid estimated pomodoros', async () => {
        const formData = new FormData();
        formData.set('title', 'Inbox cleanup');
        formData.set('estimatedPomodoros', '0');

        await expect(normalizeTaskInput(formData)).rejects.toThrow(
            'Estimated pomodoros must be at least 1'
        );
    });
});

describe('resolveTaskStatusAction', () => {
    it('maps complete to completed', async () => {
        await expect(resolveTaskStatusAction('complete')).resolves.toBe(
            'completed'
        );
    });

    it('maps archive to archived', async () => {
        await expect(resolveTaskStatusAction('archive')).resolves.toBe(
            'archived'
        );
    });
});
