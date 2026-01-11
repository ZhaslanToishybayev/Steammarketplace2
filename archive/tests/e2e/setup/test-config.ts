/**
 * E2E Test Configuration
 * Centralized configuration for all E2E testing components
 */

export interface TestConfig {
  // Application URLs
  baseUrl: string;
  apiUrl: string;
  wsUrl: string;

  // Timeout configurations
  timeouts: {
    default: number;
    navigation: number;
    api: number;
    trade: number;
    inventory: number;
  };

  // Test user credentials
  users: {
    regular: {
      steamId: string;
      username: string;
      displayName: string;
      tradeUrl: string;
    };
    admin: {
      steamId: string;
      username: string;
      displayName: string;
      tradeUrl: string;
    };
  };

  // Database connections for test data setup
  databases: {
    postgres: {
      host: string;
      port: number;
      database: string;
      username: string;
      password: string;
    };
    mongodb: {
      uri: string;
    };
    redis: {
      host: string;
      port: number;
      password: string;
      db: number;
    };
  };

  // Feature flags for test suites
  features: {
    auth: boolean;
    inventory: boolean;
    trading: boolean;
    pricing: boolean;
    wallet: boolean;
    admin: boolean;
    realtime: boolean;
    errorHandling: boolean;
  };

  // Retry configuration
  retry: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
  };

  // Screenshot/video settings
  media: {
    screenshotOnFailure: boolean;
    videoOnFailure: boolean;
    traceOnFailure: boolean;
  };

  // Parallel execution limits
  parallel: {
    maxWorkers: number;
    maxConcurrentTrades: number;
  };
}

/**
 * Default test configuration
 */
export const testConfig: TestConfig = {
  // Application URLs
  baseUrl: 'http://localhost:3000',
  apiUrl: 'http://localhost:3001/api',
  wsUrl: 'ws://localhost:3001',

  // Timeout configurations (in milliseconds)
  timeouts: {
    default: 30000,        // 30 seconds
    navigation: 60000,     // 60 seconds for page loads
    api: 10000,           // 10 seconds for API calls
    trade: 120000,        // 2 minutes for trade flows
    inventory: 180000,    // 3 minutes for inventory sync
  },

  // Test user credentials
  users: {
    regular: {
      steamId: '76561198012345678',
      username: 'testuser',
      displayName: 'Test User',
      tradeUrl: 'https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=abcdefg',
    },
    admin: {
      steamId: '76561198087654321',
      username: 'adminuser',
      displayName: 'Admin User',
      tradeUrl: 'https://steamcommunity.com/tradeoffer/new/?partner=987654321&token=hijklmn',
    },
  },

  // Database connections for test data setup
  databases: {
    postgres: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'steam_marketplace_test',
      username: process.env.POSTGRES_USER || 'steam_user',
      password: process.env.POSTGRES_PASSWORD || 'steam_password',
    },
    mongodb: {
      uri: process.env.MONGODB_URI || `mongodb://localhost:${process.env.MONGO_PORT || '27017'}/${process.env.MONGO_DB || 'steam_marketplace_test'}`,
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || 'redis_password',
      db: parseInt(process.env.REDIS_DB || '0'),
    },
  },

  // Feature flags for test suites
  features: {
    auth: true,
    inventory: true,
    trading: true,
    pricing: true,
    wallet: true,
    admin: true,
    realtime: true,
    errorHandling: true,
  },

  // Retry configuration
  retry: {
    maxRetries: 3,
    baseDelay: 1000,   // 1 second
    maxDelay: 10000,   // 10 seconds
  },

  // Screenshot/video settings
  media: {
    screenshotOnFailure: true,
    videoOnFailure: true,
    traceOnFailure: true,
  },

  // Parallel execution limits
  parallel: {
    maxWorkers: 4,
    maxConcurrentTrades: 2,
  },
};

/**
 * Environment-specific configuration overrides
 */
export const getTestConfig = (): TestConfig => {
  const env = process.env.NODE_ENV || 'test';

  switch (env) {
    case 'ci':
      return {
        ...testConfig,
        parallel: {
          ...testConfig.parallel,
          maxWorkers: 2, // Reduced for CI environments
        },
        timeouts: {
          ...testConfig.timeouts,
          default: 60000,    // Extended timeouts for CI
          navigation: 120000,
        },
      };

    case 'dev':
      return {
        ...testConfig,
        features: {
          ...testConfig.features,
          realtime: false, // Disable realtime tests in dev
        },
      };

    default:
      return testConfig;
  }
};

/**
 * Test data configuration
 */
export const testDataConfig = {
  // Inventory items to create for testing
  inventory: {
    games: [730, 570, 440, 252490], // CS:GO, Dota 2, TF2, Rust
    itemsPerGame: 10,
    includeRarity: true,
    includeWear: true,
    includeFloat: true,
    includeStickers: true,
  },

  // Pricing data
  pricing: {
    historyDays: 7,
    updateInterval: 300, // seconds
  },

  // Trade data
  trades: {
    pendingTrades: 3,
    completedTrades: 5,
    failedTrades: 2,
  },

  // Wallet data
  wallet: {
    defaultBalance: 1000,
    minTransactionAmount: 1,
    maxTransactionAmount: 500,
  },

  // Bot data
  bots: {
    count: 3,
    maxConcurrentTrades: 5,
    tradeUrl: 'https://steamcommunity.com/tradeoffer/new/?partner=987654321&token=testbot',
  },
};

export default getTestConfig();