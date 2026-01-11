// Load test configuration with multiple traffic profiles
// Usage: artillery run load-test.js --config-profile=<profile>
// Available profiles: smoke, load, stress, spike, endurance

const configProfile = process.env.CONFIG_PROFILE || process.env.npm_config_config_profile || 'development';

// Profile-specific configurations
const profiles = {
  // Smoke test - Quick validation of basic functionality
  smoke: {
    phases: [
      {
        name: 'smoke-test',
        duration: 60,
        arrivalRate: 1,
        rampTo: 5,
      }
    ],
    weightOverrides: {
      'Anonymous - Inventory API Load Test': 40,
      'Anonymous - Pricing API Load Test': 30,
      'Authenticated User Flow - Inventory Sync': 20,
      'Anonymous - Public Trade Statistics': 10,
    }
  },

  // Load test - Normal expected load
  load: {
    phases: [
      {
        name: 'warm-up',
        duration: 60,
        arrivalRate: 5,
        rampTo: 20,
      },
      {
        name: 'normal-load',
        duration: 300,
        arrivalRate: 20,
      },
      {
        name: 'peak-load',
        duration: 180,
        arrivalRate: 20,
        rampTo: 50,
      },
      {
        name: 'cool-down',
        duration: 60,
        arrivalRate: 50,
        rampTo: 5,
      }
    ],
    weightOverrides: {
      'Authenticated User Flow - Inventory Sync': 30,
      'Authenticated User Flow - Trade Operations': 25,
      'Authenticated User Flow - Wallet Operations': 20,
      'Authenticated User Flow - Market Operations': 15,
      'Anonymous - Inventory API Load Test': 5,
      'Anonymous - Pricing API Load Test': 3,
      'Anonymous - Public Trade Statistics': 2,
    }
  },

  // Stress test - Beyond normal load
  stress: {
    phases: [
      {
        name: 'warm-up',
        duration: 60,
        arrivalRate: 10,
        rampTo: 30,
      },
      {
        name: 'normal-load',
        duration: 180,
        arrivalRate: 30,
      },
      {
        name: 'stress-load',
        duration: 300,
        arrivalRate: 30,
        rampTo: 100,
      },
      {
        name: 'overload',
        duration: 120,
        arrivalRate: 100,
        rampTo: 200,
      },
      {
        name: 'recovery',
        duration: 180,
        arrivalRate: 200,
        rampTo: 20,
      }
    ],
    weightOverrides: {
      'Authenticated User Flow - Inventory Sync': 25,
      'Authenticated User Flow - Trade Operations': 25,
      'Authenticated User Flow - Wallet Operations': 20,
      'Authenticated User Flow - Market Operations': 20,
      'Anonymous - Inventory API Load Test': 5,
      'Anonymous - Pricing API Load Test': 3,
      'Anonymous - Public Trade Statistics': 2,
    }
  },

  // Spike test - Sudden load changes
  spike: {
    phases: [
      {
        name: 'baseline',
        duration: 60,
        arrivalRate: 10,
      },
      {
        name: 'spike-up',
        duration: 30,
        arrivalRate: 10,
        rampTo: 200,
      },
      {
        name: 'spike-peak',
        duration: 60,
        arrivalRate: 200,
      },
      {
        name: 'spike-down',
        duration: 30,
        arrivalRate: 200,
        rampTo: 10,
      },
      {
        name: 'recovery',
        duration: 120,
        arrivalRate: 10,
      }
    ],
    weightOverrides: {
      'Authenticated User Flow - Inventory Sync': 35,
      'Authenticated User Flow - Trade Operations': 30,
      'Authenticated User Flow - Wallet Operations': 20,
      'Anonymous - Inventory API Load Test': 10,
      'Anonymous - Pricing API Load Test': 5,
    }
  },

  // Endurance test - Long duration at moderate load
  endurance: {
    phases: [
      {
        name: 'warm-up',
        duration: 120,
        arrivalRate: 10,
        rampTo: 30,
      },
      {
        name: 'sustained-load',
        duration: 1800, // 30 minutes
        arrivalRate: 30,
      },
      {
        name: 'cool-down',
        duration: 120,
        arrivalRate: 30,
        rampTo: 5,
      }
    ],
    weightOverrides: {
      'Authenticated User Flow - Inventory Sync': 30,
      'Authenticated User Flow - Trade Operations': 25,
      'Authenticated User Flow - Wallet Operations': 20,
      'Authenticated User Flow - Market Operations': 15,
      'Anonymous - Inventory API Load Test': 5,
      'Anonymous - Pricing API Load Test': 3,
      'Anonymous - Public Trade Statistics': 2,
    }
  },

  // Development profile - Original configuration
  development: {
    phases: [
      {
        name: 'warm-up',
        duration: 30,
        arrivalRate: 10,
        rampTo: 20,
      },
      {
        name: 'ramp-up',
        duration: 120,
        arrivalRate: 20,
        rampTo: 100,
      },
      {
        name: 'sustained-load',
        duration: 300,
        arrivalRate: 100,
      },
      {
        name: 'spike',
        duration: 60,
        arrivalRate: 100,
        rampTo: 500,
      },
      {
        name: 'cool-down',
        duration: 120,
        arrivalRate: 500,
        rampTo: 10,
      },
    ],
    weightOverrides: {}
  }
};

// Get the selected profile configuration
const selectedProfile = profiles[configProfile] || profiles.development;

// Base configuration
const config = {
  target: process.env.API_URL || 'http://localhost:3001',
  phases: selectedProfile.phases,
  defaults: {
    headers: {
      'Content-Type': 'application/json',
      // Authentication token - can be set via environment variable
      'Authorization': process.env.AUTH_TOKEN ? `Bearer ${process.env.AUTH_TOKEN}` : undefined,
    },
    // Global variables for scenarios
    variables: {
      // Mock user data for authenticated scenarios
      userId: 'test-user-id',
      tradeId: 'test-trade-id',
      itemId: 'test-item-id',
      botId: 'test-bot-id',
    },
  },
};

// Base scenarios
const scenarios = [
  // AUTHENTICATED SCENARIOS
  {
    name: 'Authenticated User Flow - Inventory Sync',
    weight: selectedProfile.weightOverrides['Authenticated User Flow - Inventory Sync'] || 25,
    flow: [
      {
        // Simulate user logging in via Steam OAuth
        get: {
          url: '/api/auth/steam',
          expect: [
            { statusCode: [200, 302] }, // May redirect to Steam
          ],
        },
      },
      {
        // Simulate inventory sync after authentication
        get: {
          url: '/api/inventory/sync',
          headers: {
            'Authorization': process.env.AUTH_TOKEN ? `Bearer ${process.env.AUTH_TOKEN}` : 'Bearer mock-jwt-token',
          },
          expect: [
            { statusCode: [200, 201, 202, 401, 429] },
          ],
          capture: {
            json: '$.data.syncId',
            as: 'syncId',
          },
        },
      },
      {
        // Check inventory after sync
        get: {
          url: '/api/inventory',
          headers: {
            'Authorization': process.env.AUTH_TOKEN ? `Bearer ${process.env.AUTH_TOKEN}` : 'Bearer mock-jwt-token',
          },
          expect: [
            { statusCode: [200, 401, 429] },
            { hasProperty: 'data' },
          ],
        },
      },
      {
        // Get user statistics
        get: {
          url: '/api/user/statistics',
          headers: {
            'Authorization': process.env.AUTH_TOKEN ? `Bearer ${process.env.AUTH_TOKEN}` : 'Bearer mock-jwt-token',
          },
          expect: [
            { statusCode: [200, 401, 429] },
            { hasProperty: 'statistics' },
          ],
        },
      },
    ],
  },
  {
    name: 'Authenticated User Flow - Trade Operations',
    weight: selectedProfile.weightOverrides['Authenticated User Flow - Trade Operations'] || 20,
    flow: [
      {
        // Get user's trade history
        get: {
          url: '/api/trades',
          headers: {
            'Authorization': process.env.AUTH_TOKEN ? `Bearer ${process.env.AUTH_TOKEN}` : 'Bearer mock-jwt-token',
          },
          expect: [
            { statusCode: [200, 401, 429] },
            { hasProperty: 'data' },
          ],
        },
      },
      {
        // Get trade statistics
        get: {
          url: '/api/trades/stats',
          headers: {
            'Authorization': process.env.AUTH_TOKEN ? `Bearer ${process.env.AUTH_TOKEN}` : 'Bearer mock-jwt-token',
          },
          expect: [
            { statusCode: [200, 401, 429] },
            { hasProperty: 'statistics' },
          ],
        },
      },
      {
        // Create a trade offer
        post: {
          url: '/api/trades/create',
          headers: {
            'Authorization': process.env.AUTH_TOKEN ? `Bearer ${process.env.AUTH_TOKEN}` : 'Bearer mock-jwt-token',
          },
          json: {
            itemsOffered: ['item1', 'item2'],
            itemsRequested: ['item3'],
            message: 'Test trade from load test',
            tradeUrl: 'https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=abc123',
          },
          expect: [
            { statusCode: [200, 201, 400, 401, 422, 429] },
          ],
          capture: {
            json: '$.data.tradeId',
            as: 'tradeId',
          },
        },
      },
      {
        // Get specific trade details
        get: {
          url: '/api/trades/{{ tradeId }}',
          headers: {
            'Authorization': process.env.AUTH_TOKEN ? `Bearer ${process.env.AUTH_TOKEN}` : 'Bearer mock-jwt-token',
          },
          expect: [
            { statusCode: [200, 401, 404, 429] },
            { hasProperty: 'data' },
          ],
        },
      },
      {
        // Update trade status
        patch: {
          url: '/api/trades/{{ tradeId }}',
          headers: {
            'Authorization': process.env.AUTH_TOKEN ? `Bearer ${process.env.AUTH_TOKEN}` : 'Bearer mock-jwt-token',
          },
          json: {
            status: 'cancelled',
          },
          expect: [
            { statusCode: [200, 400, 401, 404, 429] },
          ],
        },
      },
    ],
  },
  {
    name: 'Authenticated User Flow - Wallet Operations',
    weight: selectedProfile.weightOverrides['Authenticated User Flow - Wallet Operations'] || 15,
    flow: [
      {
        // Check wallet balance
        get: {
          url: '/api/wallet/balance',
          headers: {
            'Authorization': process.env.AUTH_TOKEN ? `Bearer ${process.env.AUTH_TOKEN}` : 'Bearer mock-jwt-token',
          },
          expect: [
            { statusCode: [200, 401, 429] },
            { hasProperty: 'balance' },
          ],
        },
      },
      {
        // Get transaction history
        get: {
          url: '/api/wallet/transactions?page=1&limit=10',
          headers: {
            'Authorization': process.env.AUTH_TOKEN ? `Bearer ${process.env.AUTH_TOKEN}` : 'Bearer mock-jwt-token',
          },
          expect: [
            { statusCode: [200, 401, 429] },
            { hasProperty: 'data' },
          ],
        },
      },
      {
        // Initiate a deposit
        post: {
          url: '/api/wallet/deposit',
          headers: {
            'Authorization': process.env.AUTH_TOKEN ? `Bearer ${process.env.AUTH_TOKEN}` : 'Bearer mock-jwt-token',
          },
          json: {
            amount: Math.floor(Math.random() * 500) + 50, // Random amount between 50-550
            method: 'stripe',
            currency: 'USD',
          },
          expect: [
            { statusCode: [200, 201, 400, 401, 422, 429] },
          ],
        },
      },
      {
        // Check balance after deposit
        get: {
          url: '/api/wallet/balance',
          headers: {
            'Authorization': process.env.AUTH_TOKEN ? `Bearer ${process.env.AUTH_TOKEN}` : 'Bearer mock-jwt-token',
          },
          expect: [
            { statusCode: [200, 401, 429] },
            { hasProperty: 'balance' },
          ],
        },
      },
    ],
  },
  {
    name: 'Authenticated User Flow - Market Operations',
    weight: selectedProfile.weightOverrides['Authenticated User Flow - Market Operations'] || 15,
    flow: [
      {
        // Browse market listings
        get: {
          url: '/api/market/listings?appId=730&page=1&limit=20',
          headers: {
            'Authorization': process.env.AUTH_TOKEN ? `Bearer ${process.env.AUTH_TOKEN}` : 'Bearer mock-jwt-token',
          },
          expect: [
            { statusCode: [200, 401, 429] },
            { hasProperty: 'data' },
          ],
        },
      },
      {
        // Get market statistics
        get: {
          url: '/api/market/stats',
          headers: {
            'Authorization': process.env.AUTH_TOKEN ? `Bearer ${process.env.AUTH_TOKEN}` : 'Bearer mock-jwt-token',
          },
          expect: [
            { statusCode: [200, 401, 429] },
            { hasProperty: 'stats' },
          ],
        },
      },
      {
        // Get personalized price recommendations
        get: {
          url: '/api/market/recommendations?appId=730',
          headers: {
            'Authorization': process.env.AUTH_TOKEN ? `Bearer ${process.env.AUTH_TOKEN}` : 'Bearer mock-jwt-token',
          },
          expect: [
            { statusCode: [200, 401, 429] },
            { hasProperty: 'recommendations' },
          ],
        },
      },
      {
        // Check user's market activity
        get: {
          url: '/api/market/activity',
          headers: {
            'Authorization': process.env.AUTH_TOKEN ? `Bearer ${process.env.AUTH_TOKEN}` : 'Bearer mock-jwt-token',
          },
          expect: [
            { statusCode: [200, 401, 429] },
            { hasProperty: 'activity' },
          ],
        },
      },
    ],
  },
  // ANONYMOUS SCENARIOS (existing ones with updated comments)
  {
    name: 'Anonymous - Inventory API Load Test',
    weight: selectedProfile.weightOverrides['Anonymous - Inventory API Load Test'] || 10,
    flow: [
      {
        get: {
          url: '/api/inventory',
          expect: [
            { statusCode: [200, 429] },
            { hasProperty: 'data' },
          ],
          capture: {
            json: '$.data[0].id',
            as: 'itemId',
          },
        },
      },
      {
        get: {
          url: '/api/inventory?page=2&limit=20',
          expect: [
            { statusCode: [200, 429] },
            { hasProperty: 'data' },
          ],
        },
      },
      {
        get: {
          url: '/api/inventory?appId=730&tradable=true',
          expect: [
            { statusCode: [200, 429] },
            { hasProperty: 'data' },
          ],
        },
      },
    ],
  },
  {
    name: 'Anonymous - Pricing API Load Test',
    weight: selectedProfile.weightOverrides['Anonymous - Pricing API Load Test'] || 8,
    flow: [
      {
        get: {
          url: '/api/pricing/item/{{ itemId }}',
          expect: [
            { statusCode: [200, 429] },
            { hasProperty: 'price' },
          ],
        },
      },
      {
        get: {
          url: '/api/pricing/history/{{ itemId }}?days=7',
          expect: [
            { statusCode: [200, 429] },
            { hasProperty: 'history' },
          ],
        },
      },
      {
        get: {
          url: '/api/pricing/trends?appId=730&limit=10',
          expect: [
            { statusCode: [200, 429] },
            { hasProperty: 'trends' },
          ],
        },
      },
    ],
  },
  {
    name: 'Anonymous - Public Trade Statistics',
    weight: selectedProfile.weightOverrides['Anonymous - Public Trade Statistics'] || 5,
    flow: [
      {
        get: {
          url: '/api/trades/stats/public',
          expect: [
            { statusCode: [200, 429] },
            { hasProperty: 'publicStatistics' },
          ],
        },
      },
      {
        get: {
          url: '/api/trades/leaderboard',
          expect: [
            { statusCode: [200, 429] },
            { hasProperty: 'leaderboard' },
          ],
        },
      },
    ],
  },
  {
    name: 'Anonymous - Market Browse',
    weight: selectedProfile.weightOverrides['Anonymous - Market Browse'] || 2,
    flow: [
      {
        get: {
          url: '/api/market/listings?appId=730&page=1&limit=20',
          expect: [
            { statusCode: [200, 429] },
            { hasProperty: 'data' },
          ],
        },
      },
      {
        get: {
          url: '/api/market/stats',
          expect: [
            { statusCode: [200, 429] },
            { hasProperty: 'stats' },
          ],
        },
      },
    ],
  },
];

// Metrics and reporting configuration
const metrics = {
  // Authentication-specific metrics
  auth_attempts: {
    type: 'counter',
    description: 'Number of authentication attempts',
  },
  auth_failures: {
    type: 'counter',
    description: 'Number of authentication failures',
  },
  auth_success_rate: {
    type: 'rate',
    description: 'Authentication success rate',
  },
  // User-specific metrics
  user_requests: {
    type: 'counter',
    description: 'Number of user-specific requests',
  },
  trade_operations: {
    type: 'counter',
    description: 'Number of trade operations',
  },
  wallet_operations: {
    type: 'counter',
    description: 'Number of wallet operations',
  },
  inventory_syncs: {
    type: 'counter',
    description: 'Number of inventory sync operations',
  },
  // Cache and performance metrics
  cache_hits: {
    type: 'counter',
    description: 'Number of cache hits',
  },
  cache_misses: {
    type: 'counter',
    description: 'Number of cache misses',
  },
  db_queries: {
    type: 'counter',
    description: 'Number of database queries',
  },
  api_response_time: {
    type: 'histogram',
    description: 'API response time distribution',
    unit: 'milliseconds',
  },
  // Rate limiting metrics
  rate_limited_requests: {
    type: 'counter',
    description: 'Number of requests that hit rate limits',
  },
};

// Create and export the complete configuration
module.exports = {
  config,
  scenarios,
  metrics,
  plugins: {
    metrics: {
      output: `./artifacts/metrics-${configProfile}.json`,
    },
  },
  reporter: {
    html: {
      template: 'default',
      output: `./artifacts/load-test-report-${configProfile}.html`,
    },
  },
};