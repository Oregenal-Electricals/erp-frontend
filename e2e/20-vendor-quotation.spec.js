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

test.describe('Module 25 — Vendor Quotation', () => {
  test.beforeAll(async () => { await refreshToken(); });
  test('quotations page loads', async ({ page }) => {
    await page.goto('/purchase/quotations');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('create vendor quotation', async () => {
    let { rfqId, vendorId } = getState();
    if (!rfqId) {
      const rfqRes = await api().get('/rfqs?status=SENT&limit=1');
      rfqId = rfqRes.data.data[0]?.id;
      const vRes = await api().get('/rfqs/' + rfqId);
      vendorId = vRes.data.vendors[0]?.vendorId;
    }
    expect(rfqId).toBeTruthy();
    expect(vendorId).toBeTruthy();
    const res = await api().post('/vendor-quotations', {
      rfqId,
      vendorId,
      validUntil: '2026-08-15T00:00:00.000Z',
      deliveryDays: 21,
      paymentTerms: 'NET_30',
    });
    expect(res.data.id).toBeTruthy();
    expect(res.data.quotationNumber).toMatch(/VQ-/);
    expect(res.data.items.length).toBeGreaterThan(0);
    setState({ quotationId: res.data.id, quotationItems: res.data.items });
    console.log('✅ Quotation:', res.data.quotationNumber, 'items=', res.data.items.length);
  });

  test('enter pricing for all items', async () => {
    const { quotationId, quotationItems } = getState();
    for (const item of quotationItems) {
      const res = await api().put(`/vendor-quotations/${quotationId}/items/${item.id}`, {
        unitPrice: 11.5,
        quotedQty: item.requiredQty,
        discount: 5,
        taxRate: 18,
      });
      expect(res.data.unitPrice).toBe(11.5);
      expect(res.data.totalPrice).toBeGreaterThan(0);
    }
    console.log('✅ All items priced');
  });

  test('submit quotation', async () => {
    const { quotationId } = getState();
    const res = await api().post(`/vendor-quotations/${quotationId}/submit`);
    expect(res.data.status).toBe('SUBMITTED');
    console.log('✅ Quotation submitted');
  });

  test('finalize quotation', async () => {
    const { quotationId } = getState();
    const res = await api().post(`/vendor-quotations/${quotationId}/finalize`);
    expect(res.data.status).toBe('FINALIZED');
    expect(res.data.totalAmount).toBeGreaterThan(0);
    console.log('✅ Quotation finalized, total=₹', res.data.totalAmount);
  });

  test('vendor quotation stats', async () => {
    const res = await api().get('/vendor-quotations/stats');
    expect(res.data.finalized).toBeGreaterThan(0);
    console.log('✅ VQ stats:', res.data);
  });
});
