const { test, expect } = require('@playwright/test');
const { api } = require('./helpers/api');
const { getState, setState } = require('./helpers/state');

test.use({ storageState: 'e2e/auth-state.json' });

test.describe('Module 14 — Vendor Master', () => {
  test('vendors page loads', async ({ page }) => {
    await page.goto('/masters/vendors');
    await expect(page.getByRole('button', { name: /add vendor/i })).toBeVisible();
  });

  test('create vendor via API', async () => {
    const res = await api().post('/vendors', {
      code: `VND-E2E-${Date.now()}`, name: 'E2E Test Vendor',
      vendorType: 'SUPPLIER', phone: '9000000200',
      city: 'Chennai', state: 'Tamil Nadu',
      gstin: '33AABCT3518Q1ZV', paymentTerms: 'NET_30',
    });
    expect(res.data.id).toBeTruthy();
    setState({ vendorId: res.data.id });
    console.log('✅ Vendor:', res.data.id);
  });

  test('vendor appears in list', async () => {
    const res = await api().get('/vendors?search=E2E');
    expect(res.data.data.length).toBeGreaterThan(0);
    console.log('✅ Vendor found in list');
  });

  test('update vendor rating', async () => {
    const { vendorId } = getState();
    const res = await api().put(`/vendors/${vendorId}`, { rating: 4, creditLimit: 100000 });
    expect(res.data.rating).toBe(4);
    console.log('✅ Vendor updated');
  });

  test('vendor stats updated', async () => {
    const res = await api().get('/vendors/stats');
    expect(res.data.total).toBeGreaterThan(0);
    console.log('✅ Vendor stats:', res.data);
  });
});
