const { test, expect } = require('@playwright/test');
const { api } = require('./helpers/api');
const { getState, setState } = require('./helpers/state');

test.use({ storageState: 'e2e/auth-state.json' });

test.describe('Module 17 — HSN/SAC Master', () => {
  test('hsn-sac page loads', async ({ page }) => {
    await page.goto('/masters/hsn-sac');
    await expect(page.getByRole('button', { name: /add code/i })).toBeVisible();
  });

  test('create HSN code', async () => {
    const res = await api().post('/hsn-sac', {
      code: `9${Date.now().toString().slice(-7)}`, codeType: 'HSN',
      description: 'E2E Test HSN Code', gstRate: 18,
    });
    expect(res.data.id).toBeTruthy();
    expect(res.data.igstRate).toBe(18);
    expect(res.data.cgstRate).toBe(9);
    expect(res.data.sgstRate).toBe(9);
    setState({ hsnId: res.data.id });
    console.log('✅ HSN created with correct GST split');
  });

  test('create SAC code', async () => {
    const res = await api().post('/hsn-sac', {
      code: `8${Date.now().toString().slice(-5)}`, codeType: 'SAC',
      description: 'E2E Test SAC Code', gstRate: 12,
    });
    expect(res.data.cgstRate).toBe(6);
    console.log('✅ SAC created');
  });

  test('hsn-sac list and stats', async () => {
    const res = await api().get('/hsn-sac/stats');
    expect(res.data.hsn).toBeGreaterThan(0);
    expect(res.data.sac).toBeGreaterThan(0);
    console.log('✅ HSN/SAC stats:', res.data);
  });

  test('update HSN description', async () => {
    const { hsnId } = getState();
    const res = await api().put(`/hsn-sac/${hsnId}`, { gstRate: 12 });
    expect(res.data.igstRate).toBe(12);
    expect(res.data.cgstRate).toBe(6);
    console.log('✅ GST rates updated correctly');
  });
});
