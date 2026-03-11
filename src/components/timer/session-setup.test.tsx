import { render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SessionSetup } from './session-setup';
import { startSession } from '@/actions/session-actions';

vi.mock('@/actions/session-actions', () => ({
    startSession: vi.fn(),
}));

const task = {
    id: 'task-1',
    userId: 'user-1',
    title: 'Write release notes',
    note: null,
    status: 'active' as const,
    dueDate: null,
    estimatedPomodoros: 2,
    actualPomodoros: 0,
    createdAt: new Date('2026-03-10T10:00:00.000Z'),
    updatedAt: new Date('2026-03-10T10:00:00.000Z'),
};

describe('SessionSetup', () => {
    beforeEach(() => {
        vi.mocked(startSession).mockReset();
    });

    it('lets an existing task enable start without requiring projects', async () => {
        const user = userEvent.setup();

        const view = render(
            <SessionSetup
                projects={[]}
                tasks={[task]}
                onStart={vi.fn()}
            />
        );

        const start = within(view.container).getByRole('button', {
            name: 'Start',
        });
        expect(start).toBeDisabled();

        const [taskButton] = within(view.container).getAllByRole('button', {
            name: 'Write release notes',
        });
        await user.click(taskButton);

        expect(start).toBeEnabled();
    });

    it('lets a quick task enable start without requiring a saved task', async () => {
        const user = userEvent.setup();
        const onStart = vi.fn();

        const view = render(
            <SessionSetup
                projects={[]}
                tasks={[]}
                sessionMode="guest"
                onStart={onStart}
            />
        );

        const quickTaskInput = within(view.container).getByPlaceholderText(
            "Or type what you're about to work on"
        );
        await user.type(quickTaskInput, 'Ship onboarding polish');

        const [startButton] = within(view.container).getAllByRole('button', {
            name: 'Start',
        });
        expect(startButton).toBeEnabled();

        await user.click(startButton);

        expect(startSession).not.toHaveBeenCalled();

        expect(onStart).toHaveBeenCalledWith(
            expect.objectContaining({
                sessionId: expect.stringMatching(/^guest-/),
                taskId: undefined,
                task: 'Ship onboarding polish',
                description: undefined,
                projects: [],
            })
        );
    });

    it('starts a focus session with DB persistence for signed-in users', async () => {
        const user = userEvent.setup();
        const onStart = vi.fn();

        vi.mocked(startSession).mockResolvedValue({
            success: true,
            data: {
                id: 'session-1',
            },
        } as never);

        const view = render(
            <SessionSetup
                projects={[]}
                tasks={[task]}
                onStart={onStart}
            />
        );

        const [taskButton] = within(view.container).getAllByRole('button', {
            name: 'Write release notes',
        });
        await user.click(taskButton);
        const [startButton] = within(view.container).getAllByRole('button', {
            name: 'Start',
        });
        await user.click(startButton);

        await waitFor(() => {
            expect(startSession).toHaveBeenCalledWith(
                [],
                'Write release notes',
                'short',
                undefined,
                'task-1'
            );
        });

        expect(onStart).toHaveBeenCalledWith(
            expect.objectContaining({
                sessionId: 'session-1',
                taskId: 'task-1',
                task: 'Write release notes',
                projects: [],
            })
        );
    });
});
