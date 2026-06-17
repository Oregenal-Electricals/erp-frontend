const { test, expect } = require('@playwright/test');
const { api } = require('./helpers/api');
const { getState, setState } = require('./helpers/state');

test.use({ storageState: 'e2e/auth-state.json' });

test.describe('Module 15 — Product Master', () => {
  test('products page loads', async ({ page }) => {
    await page.goto('/masters/products');
    await expect(page.getByRole('button', { name: /add product/i })).toBeVisible();
  });

  test('create product via API', async () => {
    const res = await api().post('/products', {
      code: `PRD-E2E-${Date.now()}`, name: 'E2E Control Panel',
      productType: 'FINISHED_GOOD', hsnCode: '85372000',
      gstRate: 18, brand: 'E2E', revision: 'Rev A',
    });
    expect(res.data.id).toBeTruthy();
    setState({ productId: res.data.id });
    console.log('✅ Product:', res.data.id);
  });

  test('product appears in list', async () => {
    const res = await api().get('/products?search=E2E');
    expect(res.data.data.length).toBeGreaterThan(0);
    console.log('✅ Product found');
  });

  test('update product revision', async () => {
    const { productId } = getState();
    const res = await api().put(`/products/${productId}`, { revision: 'Rev B' });
    expect(res.data.revision).toBe('Rev B');
    console.log('✅ Product updated');
  });

  test('product stats', async () => {
    const res = await api().get('/products/stats');
    expect(res.data.total).toBeGreaterThan(0);
    console.log('✅ Product stats:', res.data);
  });
});
