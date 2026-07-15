import { test, expect } from '@playwright/test';

test('logged-out /jobs/new redirects to /login', async ({ page }) => {
	await page.goto('/jobs/new', { waitUntil: 'domcontentloaded' });
	await expect(page).toHaveURL(/\/login$/);
});

test('logged-out /profile redirects to /login', async ({ page }) => {
	await page.goto('/profile', { waitUntil: 'domcontentloaded' });
	await expect(page).toHaveURL(/\/login$/);
});
