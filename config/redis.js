/**
 * Redis Configuration
 */

const config = {
  // Redis connection settings
  url: process.env.REDIS_URL || 'redis://localhost:6379',

  // Connection pool settings
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,

  // Default TTL values (in seconds)
  defaults: {
    userSession: 24 * 60 * 60, // 24 hours
    apiResponse: 5 * 60, // 5 minutes
    userInventory: 10 * 60, // 10 minutes
    marketData: 2 * 60, // 2 minutes
    steamData: 30 * 60, // 30 minutes
    tradeOffer: 60 * 60, // 1 hour
    rateLimit: 15 * 60, // 15 minutes
    temporary: 5 * 60 // 5 minutes
  },

  // Key prefixes
  prefixes: {
    session: 'session:',
    user: 'user:',
    inventory: 'inventory:',
    trade: 'trade:',
    market: 'market:',
    steam: 'steam:',
    api: 'api:',
    rateLimit: 'ratelimit:',
    cache: 'cache:'
  },

  // Cache strategies
  strategies: {
    // Aggressive caching for public data
    public: {
      ttl: 5 * 60, // 5 minutes
      staleWhileRevalidate: true
    },

    // Moderate caching for user data
    user: {
      ttl: 10 * 60, // 10 minutes
      staleWhileRevalidate: true
    },

    // Short caching for dynamic data
    dynamic: {
      ttl: 60, // 1 minute
      staleWhileRevalidate: false
    },

    // Long caching for static data
    static: {
      ttl: 60 * 60, // 1 hour
      staleWhileRevalidate: true
    },

    // No caching for sensitive data
    nocache: {
      ttl: 0,
      staleWhileRevalidate: false
    }
  },

  // Redis sentinel configuration (for production)
  sentinel: {
    enabled: process.env.REDIS_SENTINEL_ENABLED === 'true',
    name: process.env.REDIS_SENTINEL_NAME || 'mymaster',
    hosts: (process.env.REDIS_SENTINEL_HOSTS || 'localhost:26379').split(',')
  },

  // Redis cluster configuration (for high availability)
  cluster: {
    enabled: process.env.REDIS_CLUSTER_ENABLED === 'true',
    nodes: (process.env.REDIS_CLUSTER_NODES || 'localhost:7000').split(','),
    options: {
      redisOptions: {
        password: process.env.REDIS_PASSWORD
      }
    }
  },

  // TLS configuration (for cloud Redis)
  tls: {
    enabled: process.env.REDIS_TLS_ENABLED === 'true',
    cert: process.env.REDIS_TLS_CERT,
    key: process.env.REDIS_TLS_KEY,
    ca: process.env.REDIS_TLS_CA
  }
};

// Database numbers (for multi-database Redis)
const databases = {
  0: 'sessions',
  1: 'cache',
  2: 'rate limiting',
  3: 'temporary data',
  4: 'analytics',
  5: 'locks',
  6: 'queues',
  7: 'reserved'
};

module.exports = {
  config,
  databases
};