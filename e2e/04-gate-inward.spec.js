const { test, expect } = require('@playwright/test');
const { api } = require('./helpers/api');
const { getState, setState } = require('./helpers/state');

test.use({ storageState: 'e2e/auth-state.json' });

test.describe('Gate Inward (GIN)', () => {
  test('gate inward list loads', async ({ page }) => {
    await page.goto('/gate/inward');
    await expect(page.getByRole('button', { name: 'New GIN' })).toBeVisible();
  });

  test('create GIN via API', async () => {
    const plantId = process.env.E2E_PLANT;
    const res = await api().post('/gate-inward', {
      plantId, supplierName: 'E2E Steel Suppliers',
      poNumber: 'PO-E2E-0001', invoiceNumber: 'INV-E2E-0001',
      materialDescription: 'E2E Test Material Steel Rods',
      quantity: 50, unit: 'NOS', grossWeight: 2500,
    });
    expect(res.data.status).toBe('PENDING');
    setState({ ginId: res.data.id, ginNumber: res.data.ginNumber });
    console.log('✅ GIN:', res.data.ginNumber);
  });

  test('GIN appears in list', async ({ page }) => {
    await page.goto('/gate/inward');
    await page.waitForTimeout(1000);
    await expect(page.locator('td').filter({ hasText: 'E2E Steel Suppliers' }).first()).toBeVisible();
  });

  test('verify GIN', async () => {
    const { ginId } = getState();
    const res = await api().patch(`/gate-inward/${ginId}/verify`, { remarks: 'E2E verified' });
    expect(res.data.status).toBe('VERIFIED');
    console.log('✅ GIN verified');
  });

  test('send GIN to stores', async () => {
    const { ginId } = getState();
    const res = await api().patch(`/gate-inward/${ginId}/send-to-stores`);
    expect(res.data.status).toBe('SENT_TO_STORES');
    console.log('✅ GIN sent to stores');
  });

  test('complete GIN', async () => {
    const { ginId } = getState();
    const res = await api().patch(`/gate-inward/${ginId}/complete`);
    expect(res.data.status).toBe('COMPLETED');
    console.log('✅ GIN completed');
  });

  test('GIN detail page loads', async ({ page }) => {
    const { ginId } = getState();
    await page.goto(`/gate/inward/${ginId}`);
    await expect(page.locator('text=E2E Steel Suppliers')).toBeVisible();
    await expect(page.locator('span').filter({ hasText: 'COMPLETED' }).first()).toBeVisible();
  });
});
