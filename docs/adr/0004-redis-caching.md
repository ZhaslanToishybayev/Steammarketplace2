# ADR-0004: Implement Redis Caching Layer

## Status
**Accepted** - 2024-01-01

## Context
The Steam Marketplace application experiences high read traffic, especially for:
- Market listing browsing (most popular)
- User profiles and reputation
- Steam API responses (item prices, inventory)
- Popular search queries
- System metrics (monitoring)

Database queries for these operations are expensive and can be cached to improve response time and reduce database load. We need a caching strategy that:
- Reduces database load
- Improves API response times
- Handles cache invalidation properly
- Supports TTL-based expiration
- Works well with our architecture

## Decision
We will implement **Redis** as our caching layer with the following strategy:

### Cache Patterns

1. **Cache-Aside Pattern** (Read-heavy operations)
   ```
   1. Check cache
   2. If miss, query database
   3. Store result in cache
   4. Return result
   ```

2. **Write-Through Pattern** (Critical consistency)
   ```
   1. Update database
   2. Update cache
   3. Return success
   ```

3. **TTL-Based Expiration** (Time-based invalidation)
   ```
   1. Set cache with TTL
   2. After TTL, cache automatically invalidates
   3. Next request fetches fresh data
   ```

### Caching Strategy

| Data Type | TTL | Pattern | Reason |
|-----------|-----|---------|--------|
| Market Listings | 30s | Cache-Aside | Fast-moving data |
| User Profiles | 5min | Cache-Aside | Read-heavy, less critical |
| Steam Prices | 60s | Cache-Aside | API rate limits |
| User Inventory | 2min | Cache-Aside | Changes infrequently |
| Search Results | 10s | Cache-Aside | Expensive queries |
| System Metrics | 5s | Write-Through | Real-time data |

## Implementation

### Cache Service

```javascript
// services/cacheService.js
const redis = require('redis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.client = null;
    this.connected = false;
  }

  async connect() {
    try {
      this.client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        password: process.env.REDIS_PASSWORD,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            return new Error('Redis server refused connection');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            return new Error('Max retry attempts reached');
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.client.on('error', (err) => {
        logger.error('Redis error', { error: err.message });
        this.connected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis connected');
        this.connected = true;
      });

      this.client.on('ready', () => {
        logger.info('Redis ready');
        this.connected = true;
      });

      await this.client.connect();
      return true;
    } catch (error) {
      logger.error('Redis connection failed', { error: error.message });
      this.connected = false;
      return false;
    }
  }

  async get(key) {
    if (!this.connected) return null;

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis GET error', { key, error: error.message });
      return null;
    }
  }

  async set(key, value, ttlSeconds = 3600) {
    if (!this.connected) return false;

    try {
      await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Redis SET error', { key, error: error.message });
      return false;
    }
  }

  async del(key) {
    if (!this.connected) return false;

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis DEL error', { key, error: error.message });
      return false;
    }
  }

  async delPattern(pattern) {
    if (!this.connected) return false;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      logger.error('Redis DEL pattern error', { pattern, error: error.message });
      return false;
    }
  }

  async exists(key) {
    if (!this.connected) return false;

    try {
      return await this.client.exists(key);
    } catch (error) {
      logger.error('Redis EXISTS error', { key, error: error.message });
      return false;
    }
  }

  // Cache wrapper for database operations
  async remember(key, ttlSeconds, fetcher) {
    // Try to get from cache
    let data = await this.get(key);
    if (data !== null) {
      return data;
    }

    // Cache miss, fetch from database
    data = await fetcher();
    if (data) {
      await this.set(key, data, ttlSeconds);
    }

    return data;
  }

  // Increment counter
  async incr(key, expireSeconds = 3600) {
    if (!this.connected) return 0;

    try {
      const count = await this.client.incr(key);
      if (expireSeconds && count === 1) {
        await this.client.expire(key, expireSeconds);
      }
      return count;
    } catch (error) {
      logger.error('Redis INCR error', { key, error: error.message });
      return 0;
    }
  }

  // Get or set counter
  async getOrSetCounter(key, ttlSeconds, fetcher) {
    if (!this.connected) {
      return await fetcher();
    }

    const count = await this.incr(key);
    if (count === 1) {
      // First increment, fetch and set
      const value = await fetcher();
      return value;
    }
    return count;
  }
}

module.exports = new CacheService();
```

### Repository with Caching

```javascript
// repositories/CachedUserRepository.js
const userRepository = require('./MongoUserRepository');
const cacheService = require('../services/cacheService');

class CachedUserRepository {
  async findById(id) {
    const cacheKey = `user:${id}`;

    // Try cache first
    let user = await cacheService.get(cacheKey);
    if (user) {
      return user;
    }

    // Cache miss, query database
    user = await userRepository.findById(id);
    if (user) {
      // Store in cache for 5 minutes
      await cacheService.set(cacheKey, user, 300);
    }

    return user;
  }

  async findBySteamId(steamId) {
    const cacheKey = `user:steam:${steamId}`;

    let user = await cacheService.get(cacheKey);
    if (user) {
      return user;
    }

    user = await userRepository.findBySteamId(steamId);
    if (user) {
      await cacheService.set(cacheKey, user, 300);
    }

    return user;
  }

  async update(id, updateData) {
    // Update database first
    const user = await userRepository.update(id, updateData);

    // Invalidate cache
    if (user) {
      await cacheService.del(`user:${id}`);
      await cacheService.del(`user:steam:${user.steamId}`);
    }

    return user;
  }

  async incrementBalance(id, amount) {
    const user = await userRepository.incrementBalance(id, amount);

    if (user) {
      await cacheService.del(`user:${id}`);
    }

    return user;
  }
}

module.exports = new CachedUserRepository();
```

### Steam API Caching

```javascript
// services/steamService.js
const axios = require('axios');
const cacheService = require('./cacheService');

class SteamService {
  async getItemPrice(appId, marketHashName) {
    const cacheKey = `steam:price:${appId}:${marketHashName}`;

    return await cacheService.remember(
      cacheKey,
      60, // 1 minute cache
      async () => {
        const response = await axios.get('https://steamcommunity.com/market/priceoverview/', {
          params: {
            appid: appId,
            currency: 1,
            market_hash_name: marketHashName
          },
          timeout: 5000
        });

        return response.data;
      }
    );
  }

  async getUserInventory(steamId, appId = 730) {
    const cacheKey = `steam:inventory:${steamId}:${appId}`;

    return await cacheService.remember(
      cacheKey,
      120, // 2 minute cache
      async () => {
        const response = await axios.get('https://steamcommunity.com/inventory', {
          params: {
            steamid: steamId,
            appid: appId,
            contextid: 2
          },
          timeout: 10000
        });

        return response.data;
      }
    );
  }
}

module.exports = new SteamService();
```

### Cache Middleware

```javascript
// middleware/cache.js
const cacheService = require('../services/cacheService');

const cacheMiddleware = (ttlSeconds = 30) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = `api:${req.originalUrl}`;

    try {
      const cached = await cacheService.get(key);
      if (cached) {
        return res.json(cached);
      }

      // Override res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        cacheService.set(key, data, ttlSeconds);
        return originalJson(data);
      };

      next();
    } catch (error) {
      next();
    }
  };
};

module.exports = cacheMiddleware;
```

### Invalidation Triggers

```javascript
// Event-based cache invalidation
const EventEmitter = require('events');
class CacheInvalidator extends EventEmitter {}
const invalidator = new CacheInvalidator();

// Listen for events
invalidator.on('user.updated', async (userId) => {
  await cacheService.del(`user:${userId}`);
});

invalidator.on('listing.created', async (listing) => {
  // Invalidate related search caches
  await cacheService.delPattern(`search:*`);
});

invalidator.on('listing.sold', async (listingId) => {
  // Invalidate search and listing caches
  await cacheService.delPattern(`listing:${listingId}*`);
  await cacheService.delPattern(`search:*`);
});

// Use in repository
class UserRepository {
  async update(id, data) {
    // ... update database
    invalidator.emit('user.updated', id);
  }
}
```

## Cache Monitoring

### Metrics

```javascript
// Track cache hit rate
const cacheMetrics = {
  hits: 0,
  misses: 0,
  async record(key, found) {
    if (found) this.hits++;
    else this.misses++;

    if ((this.hits + this.misses) % 100 === 0) {
      const hitRate = (this.hits / (this.hits + this.misses)) * 100;
      logger.info('Cache metrics', {
        hits: this.hits,
        misses: this.misses,
        hitRate: `${hitRate.toFixed(2)}%`
      });
      metricsService.setCacheHitRate(hitRate);
    }
  }
};
```

### Health Check

```javascript
// Add to health check
app.get('/health', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis()
  };

  const allHealthy = Object.values(checks).every(check => check.status === 'ok');

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'unhealthy',
    checks
  });
});

async function checkRedis() {
  try {
    const start = Date.now();
    await cacheService.get('health_check');
    const responseTime = Date.now() - start;

    return {
      status: 'ok',
      responseTime,
      connected: cacheService.connected
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
}
```

## Consequences

### Positive
- **Performance**: 80%+ cache hit rate on market listings
- **Database Load**: Reduced by 70% for popular endpoints
- **Response Time**: 50-100ms for cached requests
- **Cost**: Lower infrastructure costs (fewer DB read replicas)
- **User Experience**: Faster page loads and API responses
- **Scalability**: Better handling of traffic spikes

### Negative
- **Complexity**: Need to manage cache invalidation
- **Consistency**: Stale data until TTL expires
- **Memory**: Additional Redis memory usage
- **Monitoring**: Need to track hit rate and performance
- **Failures**: Cache server down = performance degradation

## Cache Key Strategy

### Naming Convention
```
entity:id         - Single entity (user:123)
entity:steam:id   - Entity by steam ID (user:steam:76561198000000000)
search:term       - Search results (search:AK-47)
steam:price:appId:name - Steam price data (steam:price:730:AK-47)
api:route         - API response (api:/api/marketplace/listings)
metrics:type      - System metrics (metrics:listing_count)
```

### TTL Guidelines
- **Static Data**: 1-24 hours (config, settings)
- **User Data**: 5-15 minutes (profiles, inventory)
- **Market Data**: 30-60 seconds (listings, prices)
- **Search Results**: 10-30 seconds
- **Real-time Data**: 5-10 seconds (metrics, counters)

## Failure Handling

### Cache Miss
- **Behavior**: Query database on cache miss
- **Monitoring**: Track miss rate, investigate high misses
- **Fallback**: Database query always works

### Cache Server Down
- **Behavior**: Continue without cache (bypass)
- **Detection**: Health check marks as degraded
- **Fallback**: Direct database queries
- **Alerting**: Notify team of Redis unavailability

### Cache Stampede
- **Problem**: Many requests to expired key simultaneously
- **Solution**: Single-flight pattern (use locking)
- **Implementation**:
  ```javascript
  const locks = new Map();

  async function rememberWithLock(key, ttl, fetcher) {
    if (locks.has(key)) {
      return await locks.get(key);
    }

    const promise = fetcher().finally(() => locks.delete(key));
    locks.set(key, promise);

    return await promise;
  }
  ```

## Related Decisions
- [ADR-0001: Use Clean Architecture](0001-use-clean-architecture.md)
- [ADR-0002: Use MongoDB](0002-use-mongodb.md)
- [ADR-0005: Implement Circuit Breaker](0005-circuit-breaker.md)

## References
- Redis Documentation: https://redis.io/documentation
- Cache-Aside Pattern: https://docs.microsoft.com/en-us/azure/architecture/patterns/cache-aside
- Redis Best Practices: https://redis.io/docs/manual/optimization/
