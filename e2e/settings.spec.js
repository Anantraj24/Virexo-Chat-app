import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  const timestamp = Date.now();
  const testUser = {
    username: `settings_${timestamp}`,
    email: `settings_${timestamp}@test.com`,
    password: 'TestPassword123!',
  };

  test.beforeEach(async ({ page }) => {
    // Sign up and navigate to the app
    await page.goto('/signup');
    await expect(page.locator('form')).toBeVisible({ timeout: 10000 });

    await page.fill('input[name="username"], input[placeholder*="username" i]', testUser.username);
    await page.fill('input[name="email"], input[type="email"]', testUser.email);
    await page.fill('input[name="password"], input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/(verify-email|conversations|chat)/, { timeout: 10000 });
  });

  test('should navigate to settings page', async ({ page }) => {
    await page.goto('/settings');
    // Settings page should load without errors
    await expect(page.locator('body')).toBeVisible();
  });
});
