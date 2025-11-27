/**
 * Playwright Configuration for Live E2E Testing
 * Environment-specific configuration for tests that use real Steam and bot credentials
 */

import { defineConfig, devices } from '@playwright/test';
import { liveTestConfig } from './live-test-config';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({

  // Test directory for live tests
  testDir: './tests/e2e/live',

  // Global test timeout (longer for live API calls)
  timeout: liveTestConfig.timeouts.trade,

  // Test run configuration
  expect: {
    timeout: liveTestConfig.timeouts.api,
  },

  // Run tests in files in parallel but be more conservative for live tests
  fullyParallel: false, // Disable for live tests to avoid conflicts

  // Fail the build on CI if you accidentally left test only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on failures (more retries for live APIs)
  retries: 3,

  // Always use single worker for live tests
  workers: 1,

  // Reporter configuration
  reporter: [
    ['html', {
      outputFolder: 'tests/e2e/artifacts/live-playwright-report',
      open: 'never'
    }],
    ['json', {
      outputFile: 'tests/e2e/artifacts/live-test-results.json'
    }],
    ['junit', {
      outputFile: 'tests/e2e/artifacts/live-junit.xml'
    }],
    ['line'] // Always show console output for live tests
  ],

  // Global setup and teardown
  globalSetup: require.resolve('./tests/e2e/setup/global-setup.ts'),
  globalTeardown: require.resolve('./tests/e2e/setup/global-teardown.ts'),

  // Output directory for test artifacts
  outputDir: 'tests/e2e/artifacts/live-test-results',

  // Use specific test data and settings
  use: {

    // Base URL for live tests
    baseURL: liveTestConfig.baseUrl,

    // Browser configuration
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Viewport size
    viewport: { width: 1920, height: 1080 },

    // Ignore HTTP errors in tests
    ignoreHTTPSErrors: true,

    // Action timeout
    actionTimeout: liveTestConfig.timeouts.default,

    // Navigation timeout
    navigationTimeout: liveTestConfig.timeouts.navigation,

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

      // Additional storage for authenticated sessions
      ...(process.env.TEST_STORAGE_STATE ? {
        storageState: process.env.TEST_STORAGE_STATE
      } : {})
    },

    // Test data for live environment
    liveTestData: {
      steamApiKey: liveTestConfig.steam.apiKey,
      testUserSteamId: liveTestConfig.steam.testUser.steamId,
      testBotSteamId: liveTestConfig.steam.testBot.steamId,
      testBotTradeUrl: liveTestConfig.steam.testBot.tradeUrl
    }
  },

  // Configure projects for major browsers (more conservative settings for live tests)
  projects: [

    // Desktop Chromium (primary browser for live tests)
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // More conservative launch options for live tests
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
            '--enable-features=ImprovedCookieControls',
            // Additional flags for stability in live environment
            '--disable-background-networking',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-accessibility',
            '--disable-features=VizDisplayCompositor',
            '--disable-features=PrivacySandboxSettings4',
            '--disable-features=CookieDeprecationFacilitatedTesting'
          ],
        },
        // Additional context options for live testing
        contextOptions: {
          // Allow popups for Steam OAuth
          permissions: ['notifications', 'popup'],
          // Extended timeouts for live API responses
          actionTimeout: liveTestConfig.timeouts.navigation,
          navigationTimeout: liveTestConfig.timeouts.navigation * 2,
        }
      },
      // Only run critical tests on chromium for live environment
      testMatch: [
        '**/03-real-e2e-trading.spec.ts',  // NEW: Comprehensive trade flow test
        '**/01-live-steam-integration.spec.ts',
        '**/02-live-minimal-flow.spec.ts'
      ]
    },

    // Fallback: Firefox for compatibility testing (run only if explicitly requested)
    process.env.RUN_FIREFOX_LIVE_TESTS ? {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        contextOptions: {
          permissions: ['notifications', 'popup'],
          actionTimeout: liveTestConfig.timeouts.navigation,
          navigationTimeout: liveTestConfig.timeouts.navigation * 2,
        }
      },
      testMatch: [
        '**/02-live-minimal-flow.spec.ts'
      ]
    } : null,

    // WebKit disabled for live tests (too unreliable with real APIs)
  ].filter(Boolean),

  // Web server configuration for live tests
  webServer: process.env.SKIP_WEB_SERVER ? undefined : {
    command: 'npm run dev:frontend',
    url: liveTestConfig.baseUrl,
    timeout: liveTestConfig.timeouts.navigation,
    reuseExistingServer: !process.env.CI,
    env: {
      NODE_ENV: 'staging',
      NEXT_PUBLIC_API_URL: liveTestConfig.apiUrl,
      NEXT_PUBLIC_WS_URL: liveTestConfig.wsUrl,
      // Live environment flags
      ENABLE_LIVE_TESTS: 'true',
      // Bot configuration for live environment
      BOT_ENCRYPTION_KEY: liveTestConfig.bot.encryptionKey,
    },
  },

  // Test match patterns
  testMatch: [
    '**/*.spec.ts'
  ],

  // Test ignore patterns
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    // Skip mocked tests in live environment
    '**/specs/**'
  ],

  // Maximum number of test files to run in parallel (conservative for live tests)
  maxFailures: 3,

  // Preserve output for debugging
  preserveOutput: 'always',

  // Global test metadata
  metadata: {
    testEnvironment: 'live',
    testConfig: JSON.stringify({
      baseUrl: liveTestConfig.baseUrl,
      apiUrl: liveTestConfig.apiUrl,
      wsUrl: liveTestConfig.wsUrl,
      features: liveTestConfig.features,
      timeouts: liveTestConfig.timeouts,
      limits: liveTestConfig.limits,
    }, null, 2),
  },

  // Shards configuration for parallel execution
  shard: process.env.TEST_SHARD
    ? {
        current: parseInt(process.env.TEST_SHARD.split('/')[0]),
        total: parseInt(process.env.TEST_SHARD.split('/')[1]),
      }
    : undefined,

  // Additional live test specific configurations
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{-projectName}{-snapshotSuffix}{ext}',
  grep: process.env.LIVE_TEST_PATTERN ? new RegExp(process.env.LIVE_TEST_PATTERN) : undefined,
  grepInvert: process.env.LIVE_TEST_GREP_INVERT ? new RegExp(process.env.LIVE_TEST_GREP_INVERT) : undefined,
});