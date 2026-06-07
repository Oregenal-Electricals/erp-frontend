const { test, expect } = require('@playwright/test');
const { api } = require('./helpers/api');
const { getState, setState } = require('./helpers/state');

test.use({ storageState: 'e2e/auth-state.json' });

test.describe('Visitor Management', () => {
  test('visitors list page loads', async ({ page }) => {
    await page.goto('/gate/visitors');
    await expect(page.getByRole('button', { name: 'Register Visitor' })).toBeVisible();
  });

  test('register new visitor via API', async () => {
    const res = await api().post('/visitors', {
      firstName: 'E2E', lastName: 'Visitor',
      mobile: '9000000001', idProofType: 'AADHAAR',
      idProofNumber: '1111-2222-3333', visitorCompany: 'E2E Test Corp',
    });
    expect(res.data.id).toBeTruthy();
    setState({ visitorId: res.data.id });
    console.log('✅ Visitor:', res.data.id);
  });

  test('visitor appears in list', async () => {
    const res = await api().get('/visitors?search=E2E');
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.data[0].firstName).toBe('E2E');
    console.log('✅ Visitor found in list');
  });

  test('check-in visitor via API', async () => {
    const { visitorId } = getState();
    const plantId = process.env.E2E_PLANT;
    const res = await api().post('/visitor-logs/check-in', {
      visitorId, plantId, purpose: 'E2E automated test visit',
    });
    expect(res.data.status).toBe('CHECKED_IN');
    setState({ visitorLogId: res.data.id });
    console.log('✅ Checked in:', res.data.id);
  });

  test('active visitors page shows checked-in visitor', async ({ page }) => {
    await page.goto('/gate/active');
    await expect(page.locator('text=E2E Visitor')).toBeVisible();
  });

  test('check-out visitor via API', async () => {
    const { visitorLogId } = getState();
    const res = await api().patch(`/visitor-logs/${visitorLogId}/checkout`, { remarks: 'E2E checkout' });
    expect(res.data.status).toBe('CHECKED_OUT');
    console.log('✅ Checked out');
  });

  test('visitor stats updated', async () => {
    const res = await api().get('/visitors/stats');
    expect(res.data.totalVisitors).toBeGreaterThan(0);
    console.log('✅ Stats:', res.data);
  });
});
