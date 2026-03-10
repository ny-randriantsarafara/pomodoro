import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskList } from './task-list';

const mocks = vi.hoisted(() => ({
    refresh: vi.fn(),
    createTask: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock('@/actions/task-actions', () => ({
    createTask: mocks.createTask,
    updateTask: vi.fn(),
    updateTaskStatus: vi.fn(),
}));

describe('TaskList', () => {
    beforeEach(() => {
        mocks.refresh.mockReset();
        mocks.createTask.mockReset();
    });

    it('refreshes the router after a successful task create', async () => {
        mocks.createTask.mockResolvedValue({
            success: true,
            data: {
                id: 'task-1',
                userId: 'user-1',
                title: 'Plan roadmap',
                note: null,
                status: 'active',
                dueDate: null,
                estimatedPomodoros: null,
                actualPomodoros: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });

        const user = userEvent.setup();
        render(<TaskList tasks={[]} />);

        await user.click(screen.getByRole('button', { name: /new task/i }));
        await user.type(screen.getByLabelText('Title'), 'Plan roadmap');
        await user.click(screen.getByRole('button', { name: /create task/i }));

        await waitFor(() => {
            expect(mocks.refresh).toHaveBeenCalledTimes(1);
        });
    });
});
