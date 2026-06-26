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

test.describe('Module 29 — PO Amendment', () => {
  test.beforeAll(async () => { await refreshToken(); });
  test('amendments page loads', async ({ page }) => {
    await page.goto('/purchase/amendments');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('create PO amendment', async () => {
    let { poId, poNumber } = getState();
    if (!poId) {
      const poRes = await api().get('/purchase-orders?status=SENT&limit=1');
      poId = poRes.data.data[0]?.id;
      poNumber = poRes.data.data[0]?.poNumber;
    }
    expect(poId).toBeTruthy();
    const res = await api().post('/po-amendments', {
      poId,
      amendmentType: 'DATE_CHANGE',
      reason: 'E2E test — vendor requested delivery extension',
      changes: { deliveryDate: { old: '2026-09-15', new: '2026-09-29' } },
    });
    expect(res.data.id).toBeTruthy();
    expect(res.data.amendmentNumber).toContain('AMD-');
    expect(res.data.amendmentNumber).toContain(poNumber);
    setState({ amendmentId: res.data.id });
    console.log('✅ Amendment:', res.data.amendmentNumber);
  });

  test('submit amendment', async () => {
    const { amendmentId } = getState();
    const res = await api().post(`/po-amendments/${amendmentId}/submit`);
    expect(res.data.status).toBe('SUBMITTED');
    console.log('✅ Amendment submitted');
  });

  test('approve amendment', async () => {
    const { amendmentId } = getState();
    const res = await api().post(`/po-amendments/${amendmentId}/approve`);
    expect(res.data.status).toBe('APPROVED');
    console.log('✅ Amendment approved');
  });

  test('view amendments by PO', async () => {
    const { poId } = getState();
    const res = await api().get(`/po-amendments/po/${poId}`);
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.data[0].amendmentType).toBe('DATE_CHANGE');
    console.log('✅ PO amendments:', res.data.length);
  });

  test('amendment stats by type', async () => {
    const res = await api().get('/po-amendments/stats');
    expect(res.data.approved).toBeGreaterThan(0);
    expect(res.data.byType.length).toBeGreaterThan(0);
    console.log('✅ Amendment stats:', res.data);
  });
});
