import { test, expect } from '@playwright/test';

test.describe('Guest mode', () => {
    test('allows a signed-out user to open the local-only guest timer', async ({
        page,
    }) => {
        await page.goto('/');

        await page.getByRole('link', { name: /continue as guest/i }).click();

        await expect(page).toHaveURL(/guest\/timer/);
        await expect(page.getByText(/local only/i)).toBeVisible();
        await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
    });

    test('shows a guest upgrade banner on sign-in when local guest data exists', async ({
        page,
    }) => {
        await page.addInitScript(() => {
            window.localStorage.setItem(
                'pomodoro-guest-workspace',
                JSON.stringify({
                    tasks: [],
                    sessions: [
                        {
                            id: 'guest-session-1',
                            taskId: null,
                            task: 'Draft launch notes',
                            description: null,
                            focusMode: 'short',
                            startedAt: '2026-03-11T08:00:00.000Z',
                            completedAt: '2026-03-11T08:25:00.000Z',
                            durationSeconds: 1500,
                            status: 'completed',
                        },
                    ],
                    settings: {
                        workMinutes: 25,
                        shortBreakMinutes: 5,
                        longBreakMinutes: 15,
                        longBreakFrequency: 4,
                        autoStartBreaks: false,
                        autoStartFocusSessions: false,
                    },
                    activeTimer: null,
                    updatedAt: '2026-03-11T08:30:00.000Z',
                })
            );
        });

        await page.goto('/sign-in');

        await expect(
            page.getByText(/your local guest sessions are ready to import/i)
        ).toBeVisible();
    });
});
