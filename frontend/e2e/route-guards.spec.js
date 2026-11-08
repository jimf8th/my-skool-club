import { expect, test } from '@playwright/test';

test('protected app routes redirect anonymous users to login', async ({ page }) => {
  await page.goto('/schools');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
});

test('forgot password is reachable from login flow', async ({ page }) => {
  await page.goto('/login');

  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await expect(page.getByRole('heading', { name: /Reset your password/i })).toBeVisible();
});
