const { test, expect } = require('@playwright/test');
const { api } = require('./helpers/api');
const { getState, setState } = require('./helpers/state');

test.use({ storageState: 'e2e/auth-state.json' });

// Runtime unique number — evaluated when test runs
const vehicleNum = `E2E${Date.now().toString().slice(-5)}`;

test.describe('Vehicle Management', () => {
  test('vehicles list page loads', async ({ page }) => {
    await page.goto('/gate/vehicles');
    await expect(page.getByRole('button', { name: 'Register Vehicle' })).toBeVisible();
  });

  test('register vehicle via API', async () => {
    const res = await api().post('/vehicles', {
      vehicleNumber: vehicleNum,
      vehicleType: 'TRUCK',
      ownerName: 'E2E Transport Co',
    });
    expect(res.data.id).toBeTruthy();
    setState({ vehicleId: res.data.id, vehicleNumber: res.data.vehicleNumber });
    console.log('✅ Vehicle:', vehicleNum, res.data.id);
  });

  test('log vehicle entry via API', async () => {
    const { vehicleId } = getState();
    const plantId = process.env.E2E_PLANT;
    const res = await api().post('/vehicle-logs/entry', {
      vehicleId, plantId, driverName: 'E2E Driver', purpose: 'INWARD', inWeight: 5000,
    });
    expect(res.data.status).toBe('INSIDE');
    setState({ vehicleLogId: res.data.id });
    console.log('✅ Vehicle entry:', res.data.id);
  });

  test('active vehicles page shows vehicle', async ({ page }) => {
    const { vehicleNumber } = getState();
    await page.goto('/gate/vehicles-active');
    await page.waitForTimeout(800);
    await expect(page.locator(`text=${vehicleNumber}`)).toBeVisible();
  });

  test('log vehicle exit with weight', async () => {
    const { vehicleLogId } = getState();
    const res = await api().patch(`/vehicle-logs/${vehicleLogId}/exit`, {
      outWeight: 2500, remarks: 'E2E exit',
    });
    expect(res.data.status).toBe('EXITED');
    expect(res.data.netWeight).toBe(2500);
    console.log('✅ Vehicle exit, netWeight:', res.data.netWeight);
  });

  test('vehicle stats updated', async () => {
    const res = await api().get('/vehicles/stats');
    expect(res.data.totalVehicles).toBeGreaterThan(0);
    console.log('✅ Stats:', res.data);
  });
});
