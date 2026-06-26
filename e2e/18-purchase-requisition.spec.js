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

test.describe('Module 23 — Purchase Requisition', () => {
  test.beforeAll(async () => { await refreshToken(); });
  test('PR list page loads', async ({ page }) => {
    await page.goto('/purchase/requisitions');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('create PR via API', async () => {
    const res = await api().post('/purchase-requisitions', {
      title: `E2E Test PR ${Date.now()}`,
      requiredDate: '2026-09-01T00:00:00.000Z',
      department: 'Production',
      priority: 'HIGH',
      items: [
        { itemCode: 'RM-E2E-T01', itemName: 'E2E Test IC', uom: 'PCS', requiredQty: 500, estimatedUnitPrice: 12 },
        { itemCode: 'RM-E2E-T02', itemName: 'E2E Test Capacitor', uom: 'PCS', requiredQty: 2000, estimatedUnitPrice: 2.5 },
      ],
    });
    expect(res.data.id).toBeTruthy();
    expect(res.data.prNumber).toMatch(/PR-/);
    expect(res.data.items.length).toBeGreaterThan(0);
    setState({ prId: res.data.id, prNumber: res.data.prNumber });
    console.log('✅ PR:', res.data.prNumber, 'items=', res.data.items.length);
  });

  test('PR appears in list', async () => {
    const res = await api().get('/purchase-requisitions?priority=HIGH');
    expect(res.data.data.length).toBeGreaterThan(0);
    console.log('✅ PR found in list');
  });

  test('submit PR for approval', async () => {
    const { prId } = getState();
    const res = await api().post(`/purchase-requisitions/${prId}/submit`);
    expect(res.data.status).toBe('SUBMITTED');
    console.log('✅ PR submitted');
  });

  test('approve PR', async () => {
    const { prId } = getState();
    const res = await api().post(`/purchase-requisitions/${prId}/approve`);
    expect(res.data.status).toBe('APPROVED');
    console.log('✅ PR approved');
  });

  test('cannot submit already approved PR', async () => {
    const { prId } = getState();
    try {
      await api().post(`/purchase-requisitions/${prId}/submit`);
      throw new Error('Should have been rejected');
    } catch (e) {
      expect(e.response?.status).toBe(400);
      console.log('✅ Double submit blocked');
    }
  });

  test('PR stats updated', async () => {
    const res = await api().get('/purchase-requisitions/stats');
    expect(res.data.approved).toBeGreaterThan(0);
    console.log('✅ PR stats:', res.data);
  });
});
