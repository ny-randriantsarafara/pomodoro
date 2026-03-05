import { test, expect } from '@playwright/test';

test.describe('Timer page', () => {
    test('redirects to sign-in when not authenticated', async ({ page }) => {
        await page.goto('/timer');
        await expect(page).toHaveURL(/sign-in/);
    });
});
