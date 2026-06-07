const { test, expect } = require('@playwright/test');
const { api } = require('./helpers/api');

test.use({ storageState: 'e2e/auth-state.json' });

test.describe('Gate Security Dashboard', () => {
  test('dashboard summary API returns all sections', async () => {
    const res = await api().get('/gate-dashboard/summary');
    expect(res.data.liveStats).toBeDefined();
    expect(res.data.activeVisitors).toBeDefined();
    expect(res.data.activeVehicles).toBeDefined();
    expect(res.data.pendingGINList).toBeDefined();
    expect(res.data.pendingGOEList).toBeDefined();
    expect(res.data.pendingPassList).toBeDefined();
    expect(res.data.timeline).toBeDefined();
    console.log('✅ Dashboard summary:', JSON.stringify(res.data.liveStats));
  });

  test('dashboard page loads all sections', async ({ page }) => {
    await page.goto('/gate/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Gate Security Dashboard')).toBeVisible();
    // Stat card labels — use exact p tag
    await expect(page.getByText('Visitors Inside', { exact: true }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Pending GINs', { exact: true }).first()).toBeVisible({ timeout: 10000 });
    // Panel headers
    await expect(page.getByText('Inside Now —', { exact: false }).first()).toBeVisible();
    await expect(page.getByText("Today's Activity", { exact: false }).first()).toBeVisible();
  });

  test('dashboard refresh button works', async ({ page }) => {
    await page.goto('/gate/dashboard');
    await page.getByRole('button', { name: 'Refresh' }).click();
    await expect(page.locator('text=Gate Security Dashboard')).toBeVisible();
  });

  test('view all links navigate correctly', async ({ page }) => {
    await page.goto('/gate/dashboard');
    await page.locator('text=View all').first().click();
    await expect(page).toHaveURL(/gate\/(active|visitors|vehicles)/);
  });

  test('sidebar Gate Management all links present', async ({ page }) => {
    await page.goto('/gate/dashboard');
    await expect(page.getByRole('link', { name: 'Visitors', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Gate Inward', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Gate Outward', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Gate Passes', exact: true })).toBeVisible();
  });
});
