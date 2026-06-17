const { test, expect } = require('@playwright/test');
const { api } = require('./helpers/api');
const { getState, setState } = require('./helpers/state');

test.use({ storageState: 'e2e/auth-state.json' });

test.describe('Module 18 — Price List Management', () => {
  test('price lists page loads', async ({ page }) => {
    await page.goto('/masters/price-lists');
    await expect(page.getByRole('button', { name: /add price list/i })).toBeVisible();
  });

  test('create price list', async () => {
    const res = await api().post('/price-lists', {
      code: `PL-E2E-${Date.now()}`, name: 'E2E Sales Price List',
      listType: 'SALES', currency: 'INR', isDefault: false,
    });
    expect(res.data.id).toBeTruthy();
    setState({ priceListId: res.data.id });
    console.log('✅ Price List:', res.data.id);
  });

  test('add price item', async () => {
    const { priceListId } = getState();
    const res = await api().post(`/price-lists/${priceListId}/items`, {
      itemType: 'PRODUCT', itemId: 'test-id',
      itemCode: 'PRD-E2E-001', itemName: 'E2E Control Panel',
      uom: 'PCS', price: 15000, minQty: 1,
    });
    expect(res.data.id).toBeTruthy();
    expect(res.data.isApproved).toBe(false);
    setState({ priceItemId: res.data.id });
    console.log('✅ Price item added');
  });

  test('approve price item — freezes price', async () => {
    const { priceListId, priceItemId } = getState();
    const res = await api().post(`/price-lists/${priceListId}/items/${priceItemId}/approve`);
    expect(res.data.isApproved).toBe(true);
    console.log('✅ Price approved and frozen');
  });

  test('cannot modify approved price', async () => {
    const { priceListId, priceItemId } = getState();
    try {
      await api().put(`/price-lists/${priceListId}/items/${priceItemId}`, { price: 99999 });
      throw new Error('Should have been rejected');
    } catch (e) {
      expect(e.response?.status).toBe(400);
      console.log('✅ Price freeze enforced correctly');
    }
  });

  test('price list stats', async () => {
    const res = await api().get('/price-lists/stats');
    expect(res.data.total).toBeGreaterThan(0);
    console.log('✅ Price list stats:', res.data);
  });
});
