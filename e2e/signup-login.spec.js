import { test, expect } from '@playwright/test';

// Generate a unique user for each test run to avoid conflicts
const timestamp = Date.now();
const testUser = {
  username: `e2e_user_${timestamp}`,
  email: `e2e_${timestamp}@test.com`,
  password: 'TestPassword123!',
};

test.describe('Signup and Login Flow', () => {
  test('should navigate to signup page and register a new user', async ({ page }) => {
    await page.goto('/signup');

    // Wait for the signup form to be visible
    await expect(page.locator('form')).toBeVisible({ timeout: 10000 });

    // Fill out the signup form
    await page.fill('input[name="username"], input[placeholder*="username" i]', testUser.username);
    await page.fill('input[name="email"], input[type="email"]', testUser.email);
    await page.fill('input[name="password"], input[type="password"]', testUser.password);

    // Submit the form
    await page.click('button[type="submit"]');

    // Should redirect away from signup (to verify-email or conversations)
    await page.waitForURL(/\/(verify-email|conversations|chat)/, { timeout: 10000 });
  });

  test('should navigate to login page and authenticate', async ({ page }) => {
    // First, sign up a user
    await page.goto('/signup');
    await expect(page.locator('form')).toBeVisible({ timeout: 10000 });

    const loginUser = {
      username: `login_${timestamp}`,
      email: `login_${timestamp}@test.com`,
      password: 'TestPassword123!',
    };

    await page.fill('input[name="username"], input[placeholder*="username" i]', loginUser.username);
    await page.fill('input[name="email"], input[type="email"]', loginUser.email);
    await page.fill('input[name="password"], input[type="password"]', loginUser.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/(verify-email|conversations|chat)/, { timeout: 10000 });

    // Now log out and log back in
    await page.goto('/login');
    await expect(page.locator('form')).toBeVisible({ timeout: 10000 });

    await page.fill('input[name="email"], input[type="email"]', loginUser.email);
    await page.fill('input[name="password"], input[type="password"]', loginUser.password);
    await page.click('button[type="submit"]');

    // Should redirect to the main app
    await page.waitForURL(/\/(conversations|chat|settings)/, { timeout: 10000 });
  });

  test('should show validation errors for empty form submission', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.locator('form')).toBeVisible({ timeout: 10000 });

    // Submit without filling anything
    await page.click('button[type="submit"]');

    // Should stay on the signup page (not redirect)
    await expect(page).toHaveURL(/\/signup/);
  });
});
