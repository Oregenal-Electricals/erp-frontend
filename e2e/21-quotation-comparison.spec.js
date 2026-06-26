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

test.describe('Module 26 — Quotation Comparison', () => {
  test.beforeAll(async () => { await refreshToken(); });
  test('comparison page loads', async ({ page }) => {
    await page.goto('/purchase/comparison');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('get comparison matrix for RFQ', async () => {
    let { rfqId } = getState();
    if (!rfqId) {
      const rfqRes = await api().get('/rfqs?status=SENT&limit=1');
      rfqId = rfqRes.data.data[0]?.id;
    }
    expect(rfqId).toBeTruthy();
    const res = await api().get(`/quotation-comparison/${rfqId}`);
    expect(res.data.rfq).toBeTruthy();
    expect(res.data.matrix.length).toBeGreaterThan(0);
    expect(res.data.totalQuotations).toBeGreaterThan(0);
    const firstItem = res.data.matrix[0];
    expect(firstItem.vendors.length).toBeGreaterThan(0);
    setState({ comparisonMatrix: res.data.matrix, comparisonRfqId: rfqId });
    console.log('✅ Matrix: items=', res.data.matrix.length, 'quotations=', res.data.totalQuotations);
  });

  test('L1 ranking assigned correctly', async () => {
    const { comparisonMatrix } = getState();
    const firstRow = comparisonMatrix[0];
    const rankedVendors = firstRow.vendors.filter(v => v.hasQuote && v.rank);
    expect(rankedVendors.length).toBeGreaterThan(0);
    const l1 = rankedVendors.find(v => v.rank === 1);
    expect(l1).toBeTruthy();
    console.log('✅ L1 vendor:', l1.vendorName, 'price=₹', l1.unitPrice);
  });

  test('select vendor for items', async () => {
    const { comparisonMatrix, rfqId, quotationId } = getState();
    const firstItem = comparisonMatrix[0];
    const l1Vendor = firstItem.vendors.find(v => v.rank === 1);
    expect(l1Vendor).toBeTruthy();

    const res = await api().post(`/quotation-comparison/${rfqId}/select`, {
      selections: [{
        rfqItemId: firstItem.rfqItemId,
        selectedVendorId: l1Vendor.vendorId,
        selectedQuotationId: l1Vendor.quotationId,
        selectedItemId: l1Vendor.quotationItemId,
        selectionReason: 'L1 lowest price - E2E test',
      }],
    });
    expect(res.data.totalSelections || res.data.selections?.length).toBeGreaterThan(0);
    console.log('✅ Vendor selected:', res.data.message);
  });

  test('get comparison summary', async () => {
    const { rfqId } = getState();
    const res = await api().get(`/quotation-comparison/${rfqId}/summary`);
    expect(res.data.totalSelections).toBeGreaterThan(0);
    expect(res.data.vendorSummary.length).toBeGreaterThan(0);
    console.log('✅ Summary: selections=', res.data.totalSelections, 'vendors=', res.data.vendorSummary.length);
  });
});
