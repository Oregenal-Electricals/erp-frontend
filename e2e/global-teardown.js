const axios = require('axios');

async function globalTeardown() {
  console.log('\n🧹 E2E Global Teardown — Purging test data...\n');

  try {
    const loginRes = await axios.post(
      'http://localhost:3001/api/v1/auth/login',
      { email: 'admin@acmeelectronics.com', password: 'Admin@1234' }
    );
    const token     = loginRes.data.accessToken;
    const companyId = loginRes.data.user.companyId;

    const purgeRes = await axios.delete(
      `http://localhost:3001/api/v1/dummy-data/purge/${companyId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Test data purged:', purgeRes.data.deleted);

    // Also purge gate test data created during tests
    const fs = require('fs');
    if (fs.existsSync('e2e/test-ids.json')) { fs.unlinkSync('e2e/test-ids.json'); }
    if (fs.existsSync('e2e/test-state.json')) { fs.unlinkSync('e2e/test-state.json'); }
    if (fs.existsSync('e2e/auth-state.json')) {
      fs.unlinkSync('e2e/auth-state.json');
    }
  } catch (err) {
    console.error('⚠️  Teardown error:', err.message);
  }

  console.log('\n✅ E2E Teardown complete\n');
}

module.exports = globalTeardown;
