const { test, expect } = require('@playwright/test');
const { api } = require('./helpers/api');
const { getState, setState } = require('./helpers/state');

test.use({ storageState: 'e2e/auth-state.json' });

test.describe('Module 21 — BOM Management', () => {
  test('BOM list page loads', async ({ page }) => {
    await page.goto('/inventory/bom');
    await expect(page.getByRole('button', { name: /create bom/i })).toBeVisible();
  });

  test('create BOM', async () => {
    const { productId } = getState();
    const res = await api().post('/boms', {
      productId, version: 'v-e2e', description: 'E2E Test BOM',
    });
    expect(res.data.id).toBeTruthy();
    expect(res.data.bomNumber).toMatch(/BOM-/);
    setState({ bomId: res.data.id });
    console.log('✅ BOM:', res.data.bomNumber);
  });

  test('add BOM item', async () => {
    const { bomId } = getState();
    const res = await api().post(`/boms/${bomId}/items`, {
      itemCode: 'RM-E2E-001', itemName: 'E2E IC Timer',
      uom: 'PCS', quantity: 2, wastagePercent: 5,
      unitCost: 12.5, isCritical: true, sequence: 1,
    });
    expect(res.data.effectiveQty).toBeCloseTo(2.1, 1);
    expect(res.data.totalCost).toBeCloseTo(26.25, 1);
    setState({ bomItemId: res.data.id });
    console.log('✅ BOM item with correct cost calc');
  });

  test('BOM total cost calculated', async () => {
    const { bomId } = getState();
    const res = await api().get(`/boms/${bomId}`);
    expect(res.data.totalCost).toBeGreaterThan(0);
    console.log('✅ BOM total cost:', res.data.totalCost);
  });

  test('approve BOM', async () => {
    const { bomId } = getState();
    const res = await api().post(`/boms/${bomId}/approve`);
    expect(res.data.status).toBe('APPROVED');
    console.log('✅ BOM approved');
  });

  test('cannot add item to approved BOM', async () => {
    const { bomId } = getState();
    try {
      await api().post(`/boms/${bomId}/items`, {
        itemCode: 'RM-E2E-002', itemName: 'Should Fail',
        uom: 'PCS', quantity: 1,
      });
      throw new Error('Should have been rejected');
    } catch (e) {
      expect(e.response?.status).toBe(400);
      console.log('✅ BOM immutability enforced');
    }
  });

  test('clone BOM creates new DRAFT', async () => {
    const { bomId } = getState();
    const res = await api().post(`/boms/${bomId}/clone`);
    expect(res.data.status).toBe('DRAFT');
    expect(res.data.items.length).toBeGreaterThan(0);
    setState({ clonedBomId: res.data.id });
    console.log('✅ BOM cloned:', res.data.bomNumber);
  });

  test('BOM stats', async () => {
    const res = await api().get('/boms/stats');
    expect(res.data.approved).toBeGreaterThan(0);
    console.log('✅ BOM stats:', res.data);
  });
});
