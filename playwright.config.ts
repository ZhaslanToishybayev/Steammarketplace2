/**
 * Playwright Configuration for E2E Testing
 */

import { defineConfig, devices } from '@playwright/test';
import { testConfig } from './tests/e2e/setup/test-config';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({

  // Test directory
  testDir: './tests/e2e/specs',

  // Global test timeout
  timeout: testConfig.timeouts.default,

  // Test run configuration
  expect: {
    timeout: 5000,
  },

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : testConfig.parallel.maxWorkers,

  // Reporter configuration
  reporter: [
    ['html', {
      outputFolder: 'tests/e2e/artifacts/playwright-report',
      open: 'never'
    }],
    ['json', {
      outputFile: 'tests/e2e/artifacts/test-results.json'
    }],
    ['junit', {
      outputFile: 'tests/e2e/artifacts/junit.xml'
    }],
  ],

  // Global setup and teardown
  globalSetup: require.resolve('./tests/e2e/setup/global-setup.ts'),
  globalTeardown: require.resolve('./tests/e2e/setup/global-teardown.ts'),

  // Output directory for test artifacts
  outputDir: 'tests/e2e/artifacts/test-results',

  // Use specific test data and settings
  use: {

    // Base URL for tests
    baseURL: testConfig.baseUrl,

    // Browser configuration
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Viewport size
    viewport: { width: 1920, height: 1080 },

    // Ignore HTTP errors in tests
    ignoreHTTPSErrors: true,

    // Action timeout
    actionTimeout: testConfig.timeouts.default,

    // Navigation timeout
    navigationTimeout: testConfig.timeouts.navigation,

    
    // Context options
    contextOptions: {
      // Enable web security for realistic testing
      webSecurity: true,

      // Enable service worker support
      serviceWorkers: 'allow',

      // Enable notifications for testing
      permissions: ['notifications'],

      // Set timezone for consistent testing
      timezoneId: 'America/New_York',

      // Set locale for consistent testing
      locale: 'en-US',
    },
  },

  // Configure projects for major browsers
  projects: [

    // Desktop Chromium
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Enable Chrome-specific features
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-component-extensions-with-background-pages',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--disable-renderer-backgrounding',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=VizDisplayCompositor',
            '--disable-features=TranslateUI',
            '--disable-features=PrivacySandboxSettings4',
            '--disable-features=CookieDeprecationFacilitatedTesting',
            '--enable-features=ImprovedCookieControls',
          ],
        },
      },
    },

    // Desktop Firefox
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },

    // Desktop WebKit
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
      },
    },

    // Mobile Chrome
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
      },
    },

    // Mobile Safari
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
      },
    },

    // Tablet
    {
      name: 'Tablet',
      use: {
        ...devices['iPad Pro'],
      },
    },

  ],

  // Web server configuration
  webServer: {
    command: 'npm run dev:frontend',
    url: testConfig.baseUrl,
    timeout: testConfig.timeouts.navigation,
    reuseExistingServer: !process.env.CI,
    env: {
      NODE_ENV: 'test',
      NEXT_PUBLIC_API_URL: testConfig.apiUrl,
      NEXT_PUBLIC_WS_URL: testConfig.wsUrl,
    },
  },

  // Test match patterns
  testMatch: [
    '**/*.spec.ts',
    '**/*.test.ts'
  ],

  // Test ignore patterns
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
  ],

  // Maximum number of test files to run in parallel
  maxFailures: process.env.CI ? 10 : undefined,

  // Preserve output for debugging
  preserveOutput: process.env.CI ? 'failures' : 'always',

  // Global test metadata
  metadata: {
    testEnvironment: process.env.NODE_ENV || 'test',
    testConfig: JSON.stringify({
      baseUrl: testConfig.baseUrl,
      apiUrl: testConfig.apiUrl,
      wsUrl: testConfig.wsUrl,
      features: testConfig.features,
      timeouts: testConfig.timeouts,
    }, null, 2),
  },

  // Shards configuration for parallel execution
  shard: process.env.TEST_SHARD
    ? {
        current: parseInt(process.env.TEST_SHARD.split('/')[0]),
        total: parseInt(process.env.TEST_SHARD.split('/')[1]),
      }
    : undefined,
});