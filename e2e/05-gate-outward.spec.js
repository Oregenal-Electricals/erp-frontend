const { test, expect } = require('@playwright/test');
const { api } = require('./helpers/api');
const { getState, setState } = require('./helpers/state');

test.use({ storageState: 'e2e/auth-state.json' });

test.describe('Gate Outward (GOE)', () => {
  test('gate outward list loads', async ({ page }) => {
    await page.goto('/gate/outward');
    await expect(page.getByRole('button', { name: 'New GOE' })).toBeVisible();
  });

  test('create GOE via API', async () => {
    const plantId = process.env.E2E_PLANT;
    const res = await api().post('/gate-outward', {
      plantId, customerName: 'E2E Customer Ltd',
      salesOrderNumber: 'SO-E2E-0001', deliveryChallanNumber: 'DC-E2E-0001',
      materialDescription: 'E2E Test Products PCB Boards',
      quantity: 100, unit: 'NOS', grossWeight: 50,
    });
    expect(res.data.status).toBe('PENDING');
    setState({ goeId: res.data.id, goeNumber: res.data.goeNumber });
    console.log('✅ GOE:', res.data.goeNumber);
  });

  test('GOE appears in list', async ({ page }) => {
    await page.goto('/gate/outward');
    await page.waitForTimeout(1000);
    await expect(page.locator('td').filter({ hasText: 'E2E Customer Ltd' }).first()).toBeVisible();
  });

  test('approve GOE', async () => {
    const { goeId } = getState();
    const res = await api().patch(`/gate-outward/${goeId}/approve`, { remarks: 'E2E approved' });
    expect(res.data.status).toBe('APPROVED');
    console.log('✅ GOE approved');
  });

  test('dispatch GOE', async () => {
    const { goeId } = getState();
    const res = await api().patch(`/gate-outward/${goeId}/dispatch`);
    expect(res.data.status).toBe('DISPATCHED');
    console.log('✅ GOE dispatched');
  });

  test('mark GOE delivered', async () => {
    const { goeId } = getState();
    const res = await api().patch(`/gate-outward/${goeId}/delivered`);
    expect(res.data.status).toBe('DELIVERED');
    console.log('✅ GOE delivered');
  });

  test('GOE detail page shows progress', async ({ page }) => {
    const { goeId } = getState();
    await page.goto(`/gate/outward/${goeId}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2, [class*="subtitle"]').first()).toBeVisible();
    const statusEl = page.locator('span').filter({ hasText: 'DELIVERED' });
    const count = await statusEl.count();
    expect(count).toBeGreaterThan(0);
  });
});
