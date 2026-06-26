const { test, expect } = require('@playwright/test');
const { api } = require('./helpers/api');
const axios = require('axios');

test.use({ storageState: 'e2e/auth-state.json' });

async function refreshToken() {
  const res = await axios.post('http://localhost:3001/api/v1/auth/login', {
    email: 'admin@acmeelectronics.com', password: 'Admin@1234'
  });
  process.env.E2E_TOKEN = res.data.accessToken;
}

test.describe('Module 30 — Purchase Analytics', () => {
  test.beforeAll(async () => { await refreshToken(); });
  test('analytics page loads', async ({ page }) => {
    await page.goto('/purchase/analytics');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('overview KPIs', async () => {
    const res = await api().get('/purchase-analytics/overview');
    expect(res.data.totalPos).toBeGreaterThan(0);
    expect(res.data.totalPoValue).toBeGreaterThan(0);
    expect(typeof res.data.pendingPrs).toBe('number');
    expect(typeof res.data.totalRfqs).toBe('number');
    console.log('✅ Overview: totalPos=', res.data.totalPos, 'totalValue=₹', res.data.totalPoValue);
  });

  test('spend by vendor', async () => {
    const res = await api().get('/purchase-analytics/spend-by-vendor');
    expect(Array.isArray(res.data)).toBe(true);
    if (res.data.length > 0) {
      expect(res.data[0].vendorName).toBeTruthy();
      expect(res.data[0].totalSpend).toBeGreaterThan(0);
      expect(res.data[0].poCount).toBeGreaterThan(0);
    }
    console.log('✅ Vendor spend:', res.data.length, 'vendors');
  });

  test('spend by month', async () => {
    const res = await api().get('/purchase-analytics/spend-by-month');
    expect(res.data.length).toBe(12);
    expect(res.data[0]).toHaveProperty('month');
    expect(res.data[0]).toHaveProperty('amount');
    const activeMonths = res.data.filter(m => m.amount > 0);
    expect(activeMonths.length).toBeGreaterThan(0);
    console.log('✅ Monthly data: active months=', activeMonths.length);
  });

  test('PO status distribution', async () => {
    const res = await api().get('/purchase-analytics/po-status');
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data.length).toBeGreaterThan(0);
    const total = res.data.reduce((s, p) => s + p.count, 0);
    expect(total).toBeGreaterThan(0);
    console.log('✅ PO status:', res.data);
  });

  test('RFQ conversion rate', async () => {
    const res = await api().get('/purchase-analytics/rfq-conversion');
    expect(typeof res.data.totalRfqs).toBe('number');
    expect(typeof res.data.conversionRate).toBe('number');
    expect(res.data.conversionRate).toBeGreaterThanOrEqual(0);
    expect(res.data.conversionRate).toBeLessThanOrEqual(100);
    console.log('✅ RFQ conversion:', res.data.conversionRate, '%');
  });

  test('top items by spend', async () => {
    const res = await api().get('/purchase-analytics/top-items');
    expect(Array.isArray(res.data)).toBe(true);
    if (res.data.length > 0) {
      expect(res.data[0].itemCode).toBeTruthy();
      expect(res.data[0].totalSpend).toBeGreaterThan(0);
    }
    console.log('✅ Top items:', res.data.length, 'items');
  });
});
