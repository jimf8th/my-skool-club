import { expect, test } from '@playwright/test';

test.describe('public legal and support routes', () => {
  test('public home renders and links to core public pages', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /School life/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Create Account' }).first()).toBeVisible();

    await page.getByRole('link', { name: 'About' }).first().click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByRole('heading', { name: /Built for stronger school communities/i })).toBeVisible();
  });

  test('legal pages are directly reachable for public users', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.getByRole('heading', { name: 'Terms of Service' })).toBeVisible();

    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible();

    await page.goto('/community-standards');
    await expect(page.getByRole('heading', { name: 'Community Standards' })).toBeVisible();

    await page.goto('/support');
    await expect(page.getByRole('heading', { name: 'Help & Support' })).toBeVisible();
  });
});
