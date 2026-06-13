// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright configuration for Steam Marketplace E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
    testDir: './tests',
    testMatch: '**/*.spec.js',

    /* Run tests in parallel */
    fullyParallel: true,

    /* Fail the build on CI if you accidentally left test.only in the source code */
    forbidOnly: !!process.env.CI,

    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,

    /* Workers */
    workers: process.env.CI ? 1 : undefined,

    /* Reporter to use */
    reporter: [
        ['html', { outputFolder: 'test-results/html' }],
        ['json', { outputFile: 'test-results/results.json' }],
        ['list'],
    ],

    /* Shared settings for all the projects below */
    use: {
        /* Base URL for all requests */
        baseURL: process.env.TEST_URL || 'http://localhost:3000',

        /* Collect trace when retrying the failed test */
        trace: 'on-first-retry',

        /* Take screenshot on failure */
        screenshot: 'only-on-failure',

        /* Video on failure */
        video: 'on-first-retry',
    },

    /* Configure projects for major browsers */
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        // Uncomment for multi-browser testing
        // {
        //   name: 'firefox',
        //   use: { ...devices['Desktop Firefox'] },
        // },
        // {
        //   name: 'webkit',
        //   use: { ...devices['Desktop Safari'] },
        // },
    ],

    /* Run local dev server before starting the tests */
    // webServer: {
    //   command: 'npm start',
    //   url: 'http://localhost:3001/api/health',
    //   reuseExistingServer: !process.env.CI,
    //   timeout: 120 * 1000,
    // },
});
