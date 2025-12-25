// Global test setup and configuration
const path = require('path');

// Set up environment variables for testing
process.env.NODE_ENV = 'test';
process.env.STEAM_API_KEY = 'test_api_key_for_testing';
process.env.STEAM_REALM = 'http://localhost:3000';

// Mock console.log to reduce noise in tests (unless DEBUG is set)
if (!process.env.DEBUG) {
  console.log = () => {};
}

// Global test utilities
global.testUtils = {
  // Helper to create test servers
  createTestServer: async (port = 0) => {
    const express = require('express');
    const app = express();
    app.use(express.json());

    // Add test routes
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    return new Promise((resolve) => {
      const server = app.listen(port, () => {
        const actualPort = server.address().port;
        resolve({
          app,
          server,
          url: `http://localhost:${actualPort}`,
          port: actualPort
        });
      });
    });
  },

  // Helper to wait for a condition
  waitFor: async (condition, timeout = 5000, interval = 100) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  },

  // Helper to generate test data
  generateTestData: {
    steamUser: () => ({
      id: `user_${Math.random().toString(36).substr(2, 9)}`,
      steamId: `7656119${Math.floor(Math.random() * 900000000 + 100000000)}`,
      nickname: `TestUser${Math.floor(Math.random() * 1000)}`,
      avatar: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/test.jpg',
      profileUrl: 'https://steamcommunity.com/profiles/test',
      tradeUrl: 'https://steamcommunity.com/trade/test/tradeoffers/',
      apiKey: `test_api_key_${Math.random().toString(36).substr(2, 9)}`,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }),

    inventoryItem: () => ({
      assetId: `asset_${Math.random().toString(36).substr(2, 9)}`,
      classId: `class_${Math.random().toString(36).substr(2, 9)}`,
      instanceId: `instance_${Math.random().toString(36).substr(2, 9)}`,
      amount: Math.floor(Math.random() * 5) + 1,
      name: 'Test Item',
      type: 'Test Type',
      rarity: 'Test Rarity',
      quality: 'Factory New',
      exterior: 'Field-Tested',
      image: 'https://steamcommunity-a.akamaihd.net/economy/image/test.png',
      imageLarge: 'https://steamcommunity-a.akamaihd.net/economy/image/test_large.png',
      tradable: true,
      marketable: true,
      marketHashName: 'Test_Item',
      description: 'Test item description',
      appId: '730',
      price: Math.floor(Math.random() * 1000) + 10
    })
  },

  // Helper to clean up resources
  cleanup: async () => {
    // Close any open handles
    if (global.testServer) {
      await new Promise(resolve => {
        global.testServer.close(resolve);
      });
    }
  }
};

// Setup and teardown for all tests
beforeAll(async () => {
  // Any global setup needed
});

afterAll(async () => {
  // Clean up any global resources
  await global.testUtils.cleanup();
});

// Clean up after each test
afterEach(() => {
  // Clear any timers or intervals
  jest.clearAllTimers();
});

// Global error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = testUtils;