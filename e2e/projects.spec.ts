import { test, expect } from '@playwright/test';

test.describe('Projects page', () => {
    test('redirects to sign-in when not authenticated', async ({ page }) => {
        await page.goto('/projects');
        await expect(page).toHaveURL(/sign-in/);
    });
});
