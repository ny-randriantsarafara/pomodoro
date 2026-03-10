import { test, expect } from '@playwright/test';

test.describe('Timer sync boundary', () => {
    test('keeps the signed-in timer route protected while guest timer stays public', async ({
        page,
    }) => {
        await page.goto('/timer');
        await expect(page).toHaveURL(/sign-in/);

        await page.goto('/guest/timer');
        await expect(page.getByText(/local only/i)).toBeVisible();
    });
});
