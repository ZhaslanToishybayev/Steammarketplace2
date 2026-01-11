/**
 * Jest Setup for E2E API Tests
 * Runs before all API tests to set up the test environment
 */

import { testConfig } from '../setup/test-config';
import TestDataSeeder from '../setup/test-data-seeder';
import { botManager } from '../setup/bot-simulator';

// Extend Jest matchers
import '@jest/extended';

// Global test variables
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(a: number, b: number): R;
    }
  }
}

// Custom matcher for testing numbers within a range
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Global test configuration
let seeder: TestDataSeeder;

// Setup function
export default async (): Promise<void> => {
  console.log('🚀 Setting up E2E API tests...');

  try {
    // Initialize test data seeder
    seeder = new TestDataSeeder();

    // Seed test data
    await seeder.seedAll();

    // Initialize bot simulator
    botManager.addBot({
      accountName: 'api-test-bot',
      sharedSecret: 'test-shared-secret-api',
      identitySecret: 'test-identity-secret-api',
      steamId: '76561198011111111',
    });

    await botManager.startAll();

    // Configure bot for API testing
    const bot = botManager.getBot('api-test-bot');
    if (bot) {
      bot.configure({
        loginDelay: 500,
        tradeAcceptanceDelay: 1000,
        failureRate: 0, // No failures for API tests
      });
    }

    console.log('✅ E2E API test setup completed');

  } catch (error) {
    console.error('❌ E2E API test setup failed:', error);
    throw error;
  }
};

// Global test helpers
declare global {
  var testHelpers: {
    generateTestUser: () => any;
    generateTestTrade: () => any;
    generateTestItem: () => any;
    waitFor: (condition: () => boolean | Promise<boolean>, timeout?: number) => Promise<void>;
    retry: <T>(fn: () => Promise<T>, retries?: number, delay?: number) => Promise<T>;
  };
}

// Test helpers
global.testHelpers = {
  generateTestUser: () => ({
    steamId: `76561198${Math.floor(Math.random() * 90000000) + 10000000}`,
    username: `testuser${Math.floor(Math.random() * 10000)}`,
    displayName: `Test User ${Math.floor(Math.random() * 10000)}`,
    email: `test${Math.floor(Math.random() * 10000)}@example.com`,
    tradeUrl: `https://steamcommunity.com/tradeoffer/new/?partner=${Math.floor(Math.random() * 90000000) + 10000000}&token=${Math.random().toString(36).substring(2, 10)}`,
    role: 'USER' as const,
  }),

  generateTestTrade: () => ({
    type: 'TRADE' as const,
    offerItems: [
      {
        name: 'AK-47 | Redline (Field-Tested)',
        appId: 730,
        classId: '123456',
        instanceId: '0',
        assetId: 'asset123',
        amount: '1',
      }
    ],
    requestItems: [
      {
        name: 'M4A4 | Desert-Strike (Factory New)',
        appId: 730,
        classId: '789012',
        instanceId: '0',
        assetId: 'asset456',
        amount: '1',
      }
    ],
    profit: Math.floor(Math.random() * 10000) / 100,
    fee: Math.floor(Math.random() * 1000) / 100,
  }),

  generateTestItem: () => ({
    name: `Test Item ${Math.floor(Math.random() * 10000)}`,
    appId: 730,
    classId: `class_${Math.floor(Math.random() * 10000)}`,
    instanceId: '0',
    description: 'Test item for API testing',
    type: 'Rifle',
    rarity: 'Covert',
    quality: 'Factory New',
    iconUrl: 'https://steamcdn-a.akamaihd.net/test_icon.png',
    tradable: true,
    marketable: true,
    commodified: true,
    float: Math.random(),
    wear: 'Factory New',
    stickers: [],
  }),

  waitFor: async (condition: () => boolean | Promise<boolean>, timeout: number = 5000): Promise<void> => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  },

  retry: async <T>(fn: () => Promise<T>, retries: number = 3, delay: number = 1000): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return global.testHelpers.retry(fn, retries - 1, delay * 2); // Exponential backoff
      }
      throw error;
    }
  },
};

// Mock console methods in test environment to reduce noise
if (process.env.NODE_ENV === 'test') {
  const originalConsole = { ...console };

  beforeAll(() => {
    // Optionally mute console output during tests
    if (process.env.SILENT_TESTS === 'true') {
      console.log = jest.fn();
      console.info = jest.fn();
      console.warn = jest.fn();
    }
  });

  afterAll(() => {
    // Restore original console methods
    Object.assign(console, originalConsole);
  });
}

// Database connection cleanup
afterAll(async () => {
  if (seeder) {
    await seeder.disconnect();
  }
});