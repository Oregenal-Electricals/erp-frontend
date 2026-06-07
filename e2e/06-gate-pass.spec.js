const { test, expect } = require('@playwright/test');
const { api } = require('./helpers/api');
const { getState, setState } = require('./helpers/state');

test.use({ storageState: 'e2e/auth-state.json' });

test.describe('Gate Pass System', () => {
  test('gate passes list loads', async ({ page }) => {
    await page.goto('/gate/passes');
    await expect(page.getByRole('button', { name: 'New Pass' })).toBeVisible();
  });

  test('create RETURNABLE pass via API', async () => {
    const plantId = process.env.E2E_PLANT;
    const res = await api().post('/gate-passes', {
      plantId, type: 'RETURNABLE',
      purpose: 'E2E test take equipment for calibration',
      carrierName: 'E2E Carrier One', carrierMobile: '9000000002',
      itemDescription: 'E2E Digital Multimeter', quantity: 1, unit: 'NOS', estimatedValue: 15000,
    });
    expect(res.data.type).toBe('RETURNABLE');
    setState({ returnablePassId: res.data.id });
    console.log('✅ Returnable pass:', res.data.passNumber);
  });

  test('create NON_RETURNABLE pass via API', async () => {
    const plantId = process.env.E2E_PLANT;
    const res = await api().post('/gate-passes', {
      plantId, type: 'NON_RETURNABLE',
      purpose: 'E2E test scrap material disposal',
      carrierName: 'E2E Carrier Two',
      itemDescription: 'E2E Scrap Copper Wire', quantity: 10, unit: 'KG',
    });
    expect(res.data.type).toBe('NON_RETURNABLE');
    setState({ nonReturnablePassId: res.data.id });
    console.log('✅ Non-returnable pass:', res.data.passNumber);
  });

  test('full returnable pass workflow', async () => {
    const { returnablePassId } = getState();
    let res = await api().patch(`/gate-passes/${returnablePassId}/approve`, { remarks: 'E2E approved' });
    expect(res.data.status).toBe('APPROVED');
    res = await api().patch(`/gate-passes/${returnablePassId}/issue`);
    expect(res.data.status).toBe('ISSUED');
    res = await api().patch(`/gate-passes/${returnablePassId}/return`, { remarks: 'Items returned' });
    expect(res.data.status).toBe('RETURNED');
    res = await api().patch(`/gate-passes/${returnablePassId}/close`);
    expect(res.data.status).toBe('CLOSED');
    console.log('✅ PENDING→APPROVED→ISSUED→RETURNED→CLOSED');
  });

  test('non-returnable pass workflow', async () => {
    const { nonReturnablePassId } = getState();
    let res = await api().patch(`/gate-passes/${nonReturnablePassId}/approve`);
    expect(res.data.status).toBe('APPROVED');
    res = await api().patch(`/gate-passes/${nonReturnablePassId}/issue`);
    expect(res.data.status).toBe('ISSUED');
    res = await api().patch(`/gate-passes/${nonReturnablePassId}/close`);
    expect(res.data.status).toBe('CLOSED');
    console.log('✅ Non-returnable: PENDING→APPROVED→ISSUED→CLOSED');
  });

  test('staff exit pass workflow', async () => {
    const plantId = process.env.E2E_PLANT;
    const usersRes = await api().get('/users');
    const userId = usersRes.data[0]?.id;
    const res = await api().post('/gate-passes', {
      plantId, type: 'STAFF_EXIT',
      purpose: 'E2E staff exit doctor visit',
      carrierName: 'E2E Employee',
      itemDescription: 'Personal bag', quantity: 1, unit: 'NOS',
      employeeId: userId, exitType: 'MEDICAL', departmentName: 'Production',
    });
    const staffId = res.data.id;
    let r = await api().patch(`/gate-passes/${staffId}/approve`);
    expect(r.data.status).toBe('APPROVED');
    r = await api().patch(`/gate-passes/${staffId}/issue`);
    expect(r.data.status).toBe('ISSUED');
    r = await api().patch(`/gate-passes/${staffId}/return`, { remarks: 'Employee returned' });
    expect(r.data.status).toBe('RETURNED');
    r = await api().patch(`/gate-passes/${staffId}/close`);
    expect(r.data.status).toBe('CLOSED');
    console.log('✅ Staff exit: full workflow complete');
  });

  test('pass list page shows passes', async ({ page }) => {
    await page.goto('/gate/passes');
    await page.waitForTimeout(1000);
    await expect(page.locator('td').filter({ hasText: 'E2E Carrier One' }).first()).toBeVisible();
  });

  test('pass detail page loads correctly', async ({ page }) => {
    const { returnablePassId } = getState();
    await page.goto(`/gate/passes/${returnablePassId}`);
    await expect(page.locator('text=E2E Digital Multimeter')).toBeVisible();
    await expect(page.locator('span').filter({ hasText: 'CLOSED' }).first()).toBeVisible();
  });

  test('gate pass stats are correct', async () => {
    const res = await api().get('/gate-passes/stats');
    expect(res.data.total).toBeGreaterThan(0);
    expect(res.data.staffExit).toBeGreaterThan(0);
    console.log('✅ Pass stats:', res.data);
  });
});
