import { render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SessionSetup } from './session-setup';
import { abandonSession, startSession } from '@/actions/session-actions';
import { createActiveSession } from '@/actions/active-session-actions';

vi.mock('@/actions/session-actions', () => ({
    startSession: vi.fn(),
    abandonSession: vi.fn(),
}));

vi.mock('@/actions/active-session-actions', () => ({
    createActiveSession: vi.fn(),
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
        vi.mocked(abandonSession).mockReset();
        vi.mocked(createActiveSession).mockReset();
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
        expect(createActiveSession).not.toHaveBeenCalled();

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

    it('creates a synced active session after starting a task-backed focus session', async () => {
        const user = userEvent.setup();
        const onStart = vi.fn();

        vi.mocked(startSession).mockResolvedValue({
            success: true,
            data: {
                id: 'session-1',
            },
        } as never);

        vi.mocked(createActiveSession).mockResolvedValue({
            success: true,
            data: {
                sessionId: 'session-1',
                taskId: 'task-1',
                taskLabel: 'Write release notes',
                phase: 'focus',
                phaseStartedAt: new Date('2026-03-10T10:00:00.000Z'),
                phaseDurationSeconds: 1500,
                isPaused: false,
                pausedAt: null,
                totalPausedSeconds: 0,
                version: 1,
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

        await waitFor(() => {
            expect(createActiveSession).toHaveBeenCalledWith({
                taskId: 'task-1',
                phase: 'focus',
                phaseDurationSeconds: 1500,
            });
        });

        expect(onStart).toHaveBeenCalledWith(
            expect.objectContaining({
                sessionId: 'session-1',
                taskId: 'task-1',
                task: 'Write release notes',
                activeSessionVersion: 1,
                projects: [],
            })
        );
    });
});
