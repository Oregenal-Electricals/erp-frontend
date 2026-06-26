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

test.describe('Module 28 — PO Approval', () => {
  test.beforeAll(async () => { await refreshToken(); });
  test('PO approvals page loads', async ({ page }) => {
    await page.goto('/purchase/approvals');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('create approval settings', async () => {
    const level = Math.floor(Math.random() * 90) + 10; // random 10-99
    const res = await api().post('/po-approvals/settings', {
      level,
      levelName: `E2E Purchase Manager ${Date.now()}`,
      minAmount: 0,
      maxAmount: 100000,
    });
    expect(res.data.id).toBeTruthy();
    setState({ approvalSettingId: res.data.id });
    console.log('✅ Approval setting L1 created');
  });

  test('get approval settings', async () => {
    const res = await api().get('/po-approvals/settings');
    expect(res.data.length).toBeGreaterThan(0);
    console.log('✅ Settings:', res.data.length, 'levels');
  });

  test('create a new DRAFT PO for approval test', async () => {
    let { vendorId } = getState();
    if (!vendorId) {
      const vRes = await api().get('/vendors?limit=1');
      vendorId = vRes.data.data[0]?.id;
    }
    const res = await api().post('/purchase-orders', {
      vendorId,
      deliveryDate: '2026-10-01T00:00:00.000Z',
      paymentTerms: 'NET_30',
      items: [{ itemCode: 'RM-APR-001', itemName: 'Approval Test Item', uom: 'PCS', orderedQty: 100, unitPrice: 50, taxRate: 18 }],
    });
    expect(res.data.id).toBeTruthy();
    setState({ approvalPoId: res.data.id });
    console.log('✅ Draft PO for approval:', res.data.poNumber);
  });

  test('approve PO via approval workflow', async () => {
    const { approvalPoId } = getState();
    expect(approvalPoId).toBeTruthy();
    const res = await api().post(`/po-approvals/${approvalPoId}/approve`, {
      remarks: 'E2E test approval — all good',
    });
    expect(res.data.approval).toBeTruthy();
    expect(res.data.message).toBeTruthy();
    const msg = res.data.message;
    expect(msg.includes('approved') || msg.includes('remaining')).toBe(true);
    console.log('✅ Approval result:', msg);
  });

  test('view approval history', async () => {
    const { approvalPoId } = getState();
    const res = await api().get(`/po-approvals/${approvalPoId}/history`);
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.data[0].action).toBe('APPROVED');
    console.log('✅ History:', res.data.length, 'records');
  });

  test('reject a PO via approval', async () => {
    let { vendorId } = getState();
    if (!vendorId) {
      const vRes = await api().get('/vendors?limit=1');
      vendorId = vRes.data.data[0]?.id;
    }
    const poRes = await api().post('/purchase-orders', {
      vendorId,
      deliveryDate: '2026-10-15T00:00:00.000Z',
      items: [{ itemCode: 'RM-REJ-001', itemName: 'Reject Test Item', uom: 'PCS', orderedQty: 50, unitPrice: 10, taxRate: 18 }],
    });
    const rejPoId = poRes.data.id;
    const res = await api().post(`/po-approvals/${rejPoId}/reject`, {
      remarks: 'E2E test rejection — price too high',
    });
    expect(res.data.approval.action).toBe('REJECTED');
    console.log('✅ Rejection recorded');
  });

  test('approval stats', async () => {
    const res = await api().get('/po-approvals/stats');
    expect(res.data.approved).toBeGreaterThan(0);
    expect(res.data.rejected).toBeGreaterThan(0);
    console.log('✅ Approval stats:', res.data);
  });
});
