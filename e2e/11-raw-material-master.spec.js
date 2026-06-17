const { test, expect } = require('@playwright/test');
const { api } = require('./helpers/api');
const { getState, setState } = require('./helpers/state');

test.use({ storageState: 'e2e/auth-state.json' });

test.describe('Module 16 — Raw Material Master', () => {
  test('raw materials page loads', async ({ page }) => {
    await page.goto('/masters/raw-materials');
    await expect(page.getByRole('button', { name: /add material/i })).toBeVisible();
  });

  test('create raw material via API', async () => {
    const res = await api().post('/raw-materials', {
      code: `RM-E2E-${Date.now()}`, name: 'E2E IC Timer',
      materialType: 'ELECTRONIC', hsnCode: '85423190',
      gstRate: 18, brand: 'E2E Brand', partNumber: 'E2E-555',
      minStockLevel: 100, reorderQty: 500, leadTimeDays: 14,
    });
    expect(res.data.id).toBeTruthy();
    setState({ rawMaterialId: res.data.id });
    console.log('✅ Raw Material:', res.data.id);
  });

  test('raw material in list', async () => {
    const res = await api().get('/raw-materials?search=E2E');
    expect(res.data.data.length).toBeGreaterThan(0);
    console.log('✅ Raw material found');
  });

  test('update stock levels', async () => {
    const { rawMaterialId } = getState();
    const res = await api().put(`/raw-materials/${rawMaterialId}`, { maxStockLevel: 2000 });
    expect(res.data.maxStockLevel).toBe(2000);
    console.log('✅ Raw material updated');
  });

  test('raw material stats', async () => {
    const res = await api().get('/raw-materials/stats');
    expect(res.data.total).toBeGreaterThan(0);
    console.log('✅ Stats:', res.data);
  });
});
