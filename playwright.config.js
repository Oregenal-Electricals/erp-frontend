const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 60000,
  retries: 1,
  workers: 1, // sequential — gate tests depend on each other

  reporter: [
    ['html', { outputFolder: 'e2e-report', open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    video: 'on',            // record every test
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // output dir for videos + screenshots
  outputDir: 'e2e-results',

  globalSetup: './e2e/global-setup.js',
  globalTeardown: './e2e/global-teardown.js',
});
