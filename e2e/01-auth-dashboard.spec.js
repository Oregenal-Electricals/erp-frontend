const { test, expect } = require('@playwright/test');

test.use({ storageState: 'e2e/auth-state.json' });

test.describe('Auth & Dashboard', () => {
  test('login page redirects to dashboard when authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator('text=Smart ERP')).toBeVisible();
  });

  test('sidebar shows Gate Management section', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('text=Gate Management')).toBeVisible();
  });

  test('gate dashboard loads with stat cards', async ({ page }) => {
    await page.goto('/gate/dashboard');
    await expect(page.locator('h1, h2, h3').filter({ hasText: 'Gate Security Dashboard' }).first()).toBeVisible();
    await expect(page.locator('p').filter({ hasText: 'Visitors Inside' }).first()).toBeVisible();
    await expect(page.locator('p').filter({ hasText: 'Vehicles Inside' }).first()).toBeVisible();
    await expect(page.locator('p').filter({ hasText: 'Pending GINs' }).first()).toBeVisible();
    await expect(page.locator('p').filter({ hasText: 'Active Passes' }).first()).toBeVisible();
  });
});
