const { test, expect } = require('@playwright/test');
const { api } = require('./helpers/api');
const { getState, setState } = require('./helpers/state');
const axios = require('axios');

test.use({ storageState: 'e2e/auth-state.json' });

async function refreshToken() {
  const res = await axios.post('http://localhost:3001/api/v1/auth/login', {
    email: 'admin@acmeelectronics.com', password: 'Admin@1234'
  });
  process.env.E2E_TOKEN = res.data.accessToken;
}

test.describe('Module 27 — Purchase Order', () => {
  test.beforeAll(async () => { await refreshToken(); });
  test('PO list page loads', async ({ page }) => {
    await page.goto('/purchase/orders');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('create purchase order', async () => {
    let { vendorId } = getState();
    if (!vendorId) {
      const vRes = await api().get('/vendors?limit=1');
      vendorId = vRes.data.data[0]?.id;
    }
    expect(vendorId).toBeTruthy();
    const res = await api().post('/purchase-orders', {
      vendorId,
      deliveryDate: '2026-09-15T00:00:00.000Z',
      paymentTerms: 'NET_30',
      deliveryAddress: 'Acme Electronics, Chennai - E2E Test',
      items: [
        { itemCode: 'RM-E2E-T01', itemName: 'E2E Test IC', uom: 'PCS', orderedQty: 500, unitPrice: 11.5, discount: 5, taxRate: 18, hsnCode: '85423190' },
        { itemCode: 'RM-E2E-T02', itemName: 'E2E Test Capacitor', uom: 'PCS', orderedQty: 2000, unitPrice: 2.3, taxRate: 18 },
      ],
    });
    expect(res.data.id).toBeTruthy();
    expect(res.data.poNumber).toMatch(/PO-/);
    expect(res.data.subtotal).toBeGreaterThan(0);
    expect(res.data.totalTax).toBeGreaterThan(0);
    expect(res.data.totalAmount).toBeGreaterThan(0);
    expect(res.data.items.length).toBe(2);
    setState({ poId: res.data.id, poNumber: res.data.poNumber, poItems: res.data.items });
    console.log('✅ PO:', res.data.poNumber, 'subtotal=₹', res.data.subtotal, 'tax=₹', res.data.totalTax, 'total=₹', res.data.totalAmount);
  });

  test('PO detail page loads', async ({ page }) => {
    let { poId } = getState();
    if (!poId) {
      const res = await api().get('/purchase-orders?limit=1');
      poId = res.data.data[0]?.id;
    }
    if (!poId) {
      console.log('⚠️ No PO found — skipping page test');
      return;
    }
    const response = await page.goto(`/purchase/orders/${poId}`);
    expect(response?.status()).not.toBe(404);
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).toContain(poId);
    console.log('✅ PO detail page loaded:', url);
  });

  test('approve PO — prices frozen', async () => {
    const { poId } = getState();
    const res = await api().post(`/purchase-orders/${poId}/approve`);
    expect(res.data.status).toBe('APPROVED');
    expect(res.data.approvedAt).toBeTruthy();
    console.log('✅ PO approved at', res.data.approvedAt);
  });

  test('cannot edit items after approval — price freeze enforced', async () => {
    const { poId, poItems } = getState();
    try {
      await api().put(`/purchase-orders/${poId}/items/${poItems[0].id}`, { unitPrice: 999 });
      throw new Error('Should have been blocked');
    } catch (e) {
      expect(e.response?.status).toBe(400);
      expect(e.response?.data?.message).toContain('FROZEN');
      console.log('✅ Price freeze enforced:', e.response?.data?.message);
    }
  });

  test('send PO to vendor', async () => {
    const { poId } = getState();
    const res = await api().post(`/purchase-orders/${poId}/send`);
    expect(res.data.status).toBe('SENT');
    console.log('✅ PO sent to vendor');
  });

  test('PO stats and total value', async () => {
    const res = await api().get('/purchase-orders/stats');
    expect(res.data.total).toBeGreaterThan(0);
    expect(res.data.totalValue).toBeGreaterThan(0);
    console.log('✅ PO stats:', res.data);
  });
});
