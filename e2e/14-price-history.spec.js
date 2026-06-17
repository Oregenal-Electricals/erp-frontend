const { test, expect } = require('@playwright/test');
const { api } = require('./helpers/api');

test.use({ storageState: 'e2e/auth-state.json' });

test.describe('Module 19 — Price History', () => {
  test('price history page loads', async ({ page }) => {
    await page.goto('/masters/price-history');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('price history stats', async () => {
    const res = await api().get('/price-history/stats');
    expect(res.data.total).toBeGreaterThan(0);
    console.log('✅ Price history stats:', res.data);
  });

  test('search price history', async () => {
    const res = await api().get('/price-history/search?search=PRD-E2E');
    expect(res.data.data).toBeDefined();
    console.log('✅ Price history search works');
  });

  test('get effective price', async () => {
    const res = await api().get('/price-history/effective/PRD-E2E-001');
    expect(Array.isArray(res.data)).toBe(true);
    console.log('✅ Effective price lookup works');
  });
});
