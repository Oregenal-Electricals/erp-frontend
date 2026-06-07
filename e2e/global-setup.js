const { chromium } = require('@playwright/test');
const axios = require('axios');

const BACKEND = 'http://localhost:3001/api/v1';
const CREDS   = { email: 'admin@acmeelectronics.com', password: 'Admin@1234' };

async function globalSetup() {
  console.log('\n🔧 E2E Global Setup — Phase 2 Gate Management\n');

  // 1. Get token
  const loginRes = await axios.post(`${BACKEND}/auth/login`, CREDS);
  const token    = loginRes.data.accessToken;
  const companyId = loginRes.data.user.companyId;

  // 2. Seed dummy data
  console.log('🌱 Seeding test data...');
  const seedRes = await axios.post(
    `${BACKEND}/dummy-data/seed/${companyId}`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  console.log('✅ Seeded:', seedRes.data.created);

  // 3. Get plant ID for tests
  const plantsRes = await axios.get(`${BACKEND}/masters/plants`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const plantId = plantsRes.data[0]?.id;

  // 4. Store context for tests
  process.env.E2E_TOKEN     = token;
  process.env.E2E_COMPANY   = companyId;
  process.env.E2E_PLANT     = plantId;
  process.env.E2E_EMAIL     = CREDS.email;
  process.env.E2E_PASSWORD  = CREDS.password;

  // 5. Save auth state
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page    = await context.newPage();

  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', CREDS.email);
  await page.fill('input[type="password"]', CREDS.password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  await context.storageState({ path: 'e2e/auth-state.json' });
  await browser.close();

  console.log('✅ Auth state saved');
  console.log(`✅ Plant ID: ${plantId}`);
  console.log('\n🚀 Starting tests...\n');
}

module.exports = globalSetup;
