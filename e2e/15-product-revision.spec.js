const { test, expect } = require('@playwright/test');
const { api } = require('./helpers/api');
const { getState, setState } = require('./helpers/state');

test.use({ storageState: 'e2e/auth-state.json' });

test.describe('Module 20 — Product Revision Control', () => {
  test('product revisions page loads', async ({ page }) => {
    await page.goto('/masters/product-revisions');
    await expect(page.getByRole('button', { name: /add revision/i })).toBeVisible();
  });

  test('create product revision', async () => {
    // Get any existing product if E2E product not in state
    let { productId } = getState();
    if (!productId) {
      const res = await api().get('/products?limit=1');
      productId = res.data.data[0]?.id;
    }
    const res = await api().post('/product-revisions', {
      productId, revisionNumber: 'Rev E2E-A',
      changeDescription: 'E2E test revision', changeType: 'MINOR',
    });
    expect(res.data.id).toBeTruthy();
    expect(res.data.status).toBe('DRAFT');
    setState({ productRevisionId: res.data.id });
    console.log('✅ Product revision:', res.data.id);
  });

  test('approve product revision', async () => {
    const { productRevisionId } = getState();
    const res = await api().post(`/product-revisions/${productRevisionId}/approve`);
    expect(res.data.status).toBe('APPROVED');
    console.log('✅ Product revision approved');
  });

  test('mark revision obsolete', async () => {
    const { productRevisionId } = getState();
    const res = await api().post(`/product-revisions/${productRevisionId}/obsolete`);
    expect(res.data.status).toBe('OBSOLETE');
    console.log('✅ Product revision obsoleted');
  });

  test('product revision stats', async () => {
    const res = await api().get('/product-revisions/stats');
    expect(res.data.total).toBeGreaterThan(0);
    console.log('✅ Stats:', res.data);
  });
});
