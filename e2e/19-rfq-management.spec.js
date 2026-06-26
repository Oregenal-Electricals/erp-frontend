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

test.describe('Module 24 — RFQ Management', () => {
  test.beforeAll(async () => { await refreshToken(); });
  test('RFQ list page loads', async ({ page }) => {
    await page.goto('/purchase/rfqs');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('create RFQ from approved PR', async () => {
    let { prId } = getState();
    // Fallback: get any approved PR if state is empty
    if (!prId) {
      const prRes = await api().get('/purchase-requisitions?status=APPROVED&limit=1');
      prId = prRes.data.data[0]?.id;
    }
    expect(prId).toBeTruthy();
    const vendorRes = await api().get('/vendors?limit=1');
    const vendorId = vendorRes.data.data[0]?.id;
    expect(vendorId).toBeTruthy();
    setState({ vendorId });

    const res = await api().post('/rfqs', {
      prId,
      title: `E2E RFQ ${Date.now()}`,
      responseDeadline: '2026-08-01T00:00:00.000Z',
      paymentTerms: 'NET_30',
      vendorIds: [vendorId],
    });
    expect(res.data.id).toBeTruthy();
    expect(res.data.rfqNumber).toMatch(/RFQ-/);
    expect(res.data.items.length).toBeGreaterThan(0);
    expect(res.data.vendors.length).toBe(1);
    setState({ rfqId: res.data.id });
    console.log('✅ RFQ:', res.data.rfqNumber, 'vendors=1 items=', res.data.items.length);
  });

  test('send RFQ to vendors', async () => {
    const { rfqId } = getState();
    const res = await api().post(`/rfqs/${rfqId}/send`);
    expect(res.data.status).toBe('SENT');
    console.log('✅ RFQ sent');
  });

  test('cannot send already sent RFQ', async () => {
    const { rfqId } = getState();
    try {
      await api().post(`/rfqs/${rfqId}/send`);
      throw new Error('Should fail');
    } catch (e) {
      expect(e.response?.status).toBe(400);
      console.log('✅ Double send blocked');
    }
  });

  test('RFQ stats', async () => {
    const res = await api().get('/rfqs/stats');
    expect(res.data.sent).toBeGreaterThan(0);
    console.log('✅ RFQ stats:', res.data);
  });
});
