import { test, expect } from '@playwright/test';

test.describe('Sign in page', () => {
    test('renders sign-in page with GitHub button', async ({ page }) => {
        await page.goto('/sign-in');
        await expect(page.getByText('Pomodoro')).toBeVisible();
        await expect(page.getByText('Focus. Build. Ship.')).toBeVisible();
        await expect(
            page.getByRole('button', { name: /github/i })
        ).toBeVisible();
    });

    test('root page redirects to sign-in', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveURL(/sign-in/);
    });
});
