import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskCard, formatDueDate } from './task-card';

const mocks = vi.hoisted(() => ({
    refresh: vi.fn(),
    updateTaskStatus: vi.fn(),
    updateTask: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock('@/actions/task-actions', () => ({
    updateTaskStatus: mocks.updateTaskStatus,
    updateTask: mocks.updateTask,
    createTask: vi.fn(),
}));

const task = {
    id: 'task-1',
    userId: 'user-1',
    title: 'Write changelog',
    note: 'Keep it concise',
    status: 'active' as const,
    dueDate: new Date('2026-03-11T00:00:00.000Z'),
    estimatedPomodoros: 2,
    actualPomodoros: 1,
    createdAt: new Date('2026-03-10T10:00:00.000Z'),
    updatedAt: new Date('2026-03-10T10:00:00.000Z'),
};

describe('TaskCard', () => {
    beforeEach(() => {
        mocks.refresh.mockReset();
        mocks.updateTaskStatus.mockReset();
        mocks.updateTask.mockReset();
    });

    it('refreshes the router after a successful status update', async () => {
        mocks.updateTaskStatus.mockResolvedValue({
            success: true,
            data: { ...task, status: 'completed' },
        });

        const user = userEvent.setup();
        render(<TaskCard task={task} />);

        await user.click(screen.getByRole('button', { name: /complete/i }));

        await waitFor(() => {
            expect(mocks.refresh).toHaveBeenCalledTimes(1);
        });
    });

    it('refreshes the router after a successful edit', async () => {
        mocks.updateTask.mockResolvedValue({
            success: true,
            data: { ...task, title: 'Updated title' },
        });

        const user = userEvent.setup();
        render(<TaskCard task={task} />);

        await user.click(
            screen.getAllByRole('button', { name: `Edit ${task.title}` })[0]
        );
        await user.clear(screen.getByLabelText('Title'));
        await user.type(screen.getByLabelText('Title'), 'Updated title');
        await user.click(screen.getByRole('button', { name: /save task/i }));

        await waitFor(() => {
            expect(mocks.refresh).toHaveBeenCalledTimes(1);
        });
    });
});

describe('formatDueDate', () => {
    it('formats the UTC calendar day without local timezone drift', () => {
        expect(formatDueDate(new Date('2026-03-11T00:00:00.000Z'))).toBe(
            'Mar 11, 2026'
        );
    });
});
