const { test, expect } = require('@playwright/test');
const { api } = require('./helpers/api');
const { getState, setState } = require('./helpers/state');

test.use({ storageState: 'e2e/auth-state.json' });

test.describe('Module 13 — Item Master', () => {
  test('items page loads', async ({ page }) => {
    await page.goto('/inventory/items');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('create UOM via API', async () => {
    const res = await api().post('/items/uom', {
      code: `E2E-PCS-${Date.now()}`, name: 'E2E Pieces', description: 'E2E test UOM',
    });
    expect(res.data.id).toBeTruthy();
    setState({ uomId: res.data.id });
    console.log('✅ UOM:', res.data.id);
  });

  test('create item category', async () => {
    const res = await api().post('/items/categories', {
      code: `E2E-CAT-${Date.now()}`, name: 'E2E Category',
    });
    expect(res.data.id).toBeTruthy();
    setState({ categoryId: res.data.id });
    console.log('✅ Category:', res.data.id);
  });

  test('create item via API', async () => {
    const { uomId, categoryId } = getState();
    const res = await api().post('/items', {
      itemCode: `ITM-E2E-${Date.now()}`, itemName: 'E2E Test Item',
      itemType: 'RAW_MATERIAL', uomId, categoryId,
      hsnCode: '85423190', gstRate: 18,
    });
    expect(res.data.id).toBeTruthy();
    setState({ itemId: res.data.id });
    console.log('✅ Item:', res.data.id);
  });

  test('item appears in list', async () => {
    const res = await api().get('/items?search=E2E');
    expect(res.data.data?.length || res.data.length).toBeGreaterThan(0);
    console.log('✅ Item found in list');
  });

  test('item stats updated', async () => {
    const res = await api().get('/items/stats');
    expect(res.data.total).toBeGreaterThan(0);
    console.log('✅ Item stats:', res.data);
  });
});
