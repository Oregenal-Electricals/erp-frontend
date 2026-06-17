const { test, expect } = require('@playwright/test');
const { api } = require('./helpers/api');
const { getState, setState } = require('./helpers/state');

test.use({ storageState: 'e2e/auth-state.json' });

test.describe('Module 22 — BOM Revision Control', () => {
  test('BOM revisions page loads', async ({ page }) => {
    await page.goto('/inventory/bom-revisions');
    await expect(page.getByRole('button', { name: /new revision/i })).toBeVisible();
  });

  test('create BOM revision', async () => {
    let { productId, bomId, clonedBomId } = getState();
    if (!productId) {
      const pRes = await api().get('/products?limit=1');
      productId = pRes.data.data[0]?.id;
    }
    if (!bomId || !clonedBomId) {
      const bRes = await api().get(`/boms/product/${productId}`);
      const boms = bRes.data;
      bomId = boms[0]?.id;
      clonedBomId = boms[1]?.id || boms[0]?.id;
    }
    const res = await api().post('/bom-revisions', {
      productId, bomId: clonedBomId, previousBomId: bomId,
      revisionNumber: 'REV-E2E-001', changeType: 'MINOR',
      changeDescription: 'E2E test — changed IC to newer variant',
      ecnNumber: 'ECN-E2E-001',
    });
    expect(res.data.id).toBeTruthy();
    expect(res.data.status).toBe('DRAFT');
    setState({ bomRevisionId: res.data.id });
    console.log('✅ BOM revision:', res.data.id);
  });

  test('BOM revision links old and new BOM', async () => {
    const { bomRevisionId, bomId, clonedBomId } = getState();
    const res = await api().get(`/bom-revisions/${bomRevisionId}`);
    expect(res.data.bom.id || res.data.bomId).toBe(clonedBomId);
    expect(res.data.previousBom?.id || res.data.previousBomId).toBe(bomId);
    console.log('✅ BOM revision links verified');
  });

  test('approve BOM revision', async () => {
    const { bomRevisionId } = getState();
    const res = await api().post(`/bom-revisions/${bomRevisionId}/approve`);
    expect(res.data.status).toBe('APPROVED');
    console.log('✅ BOM revision approved');
  });

  test('BOM revision history by product', async () => {
    const { productId } = getState();
    const res = await api().get(`/bom-revisions/product/${productId}`);
    expect(res.data.length).toBeGreaterThan(0);
    console.log('✅ Product BOM history:', res.data.length, 'revisions');
  });

  test('BOM revision stats', async () => {
    const res = await api().get('/bom-revisions/stats');
    expect(res.data.total).toBeGreaterThan(0);
    expect(res.data.approved).toBeGreaterThan(0);
    console.log('✅ BOM revision stats:', res.data);
  });
});
