# Redis Caching Implementation

## 📋 Overview

Redis caching has been integrated into the application to improve performance, reduce database load, and enhance user experience. The implementation provides a robust, fault-tolerant caching layer with multiple strategies and patterns.

## 🏗️ Architecture

### Components

1. **CacheService** (`services/cacheService.js`)
   - Core Redis client wrapper
   - Connection management
   - Error handling and retry logic
   - Graceful degradation when Redis is unavailable

2. **Cache Middleware** (`middleware/cache.js`)
   - HTTP response caching
   - Cache invalidation
   - Rate limiting
   - Custom key generation

3. **Cache Decorators** (`utils/cacheDecorator.js`)
   - Method-level caching
   - Automatic cache invalidation
   - Memoization
   - Rate limiting decorators

4. **Redis Configuration** (`config/redis.js`)
   - Connection settings
   - TTL defaults
   - Key prefixes
   - Cache strategies

## 🚀 Quick Start

### 1. Environment Configuration

Add to your `.env` file:

```bash
# Redis Connection
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password

# For Docker Compose
REDIS_PASSWORD=changeme_in_production
```

### 2. Basic Usage

```javascript
const cacheService = require('./services/cacheService');

// Get from cache
const user = await cacheService.get('user:12345');

// Set with TTL (1 hour)
await cacheService.set('user:12345', userData, 3600);

// Cache with automatic get/set
const data = await cacheService.remember('api:data', async () => {
  return await fetchDataFromDB();
}, 1800);
```

### 3. Using Middleware

```javascript
const { cacheResponse } = require('./middleware/cache');

// Cache GET requests for 5 minutes
app.get('/api/market/listings', cacheResponse(300), async (req, res) => {
  // This response will be cached
  const listings = await getListings();
  res.json(listings);
});

// Invalidate cache after update
const { invalidateCache } = require('./middleware/cache');

app.post('/api/market/listings', invalidateCache('market:listings:*'), async (req, res) => {
  // After successful update, cache is invalidated
  await updateListing();
  res.json({ success: true });
});
```

## 📚 API Reference

### CacheService

#### Connection
```javascript
// Initialize
await cacheService.connect();

// Check connection
if (cacheService.isConnected()) {
  // Use cache
}

// Disconnect
await cacheService.disconnect();
```

#### Basic Operations
```javascript
// Get value
const value = await cacheService.get('key');

// Set value with TTL
await cacheService.set('key', value, ttlSeconds);

// Delete key
await cacheService.del('key');

// Delete by pattern
await cacheService.delPattern('user:*');

// Check if key exists
const exists = await cacheService.exists('key');

// Set TTL
await cacheService.expire('key', ttlSeconds);

// Get TTL
const ttl = await cacheService.ttl('key');
```

#### Advanced Operations
```javascript
// Remember (cache with automatic get/set)
const data = await cacheService.remember('key', fetchFunction, ttl);

// Increment counter
const count = await cacheService.incr('counter');
const count = await cacheService.incr('counter', 5);

// Get multiple values
const values = await cacheService.mget(['key1', 'key2', 'key3']);

// Set multiple values
await cacheService.mset({
  key1: value1,
  key2: value2,
  key3: value3
}, ttl);

// Flush all cache
await cacheService.flush();

// Get statistics
const stats = await cacheService.getStats();
```

### Middleware

#### Cache Response
```javascript
const { cacheResponse } = require('./middleware/cache');

// Basic usage
app.get('/api/data', cacheResponse(300), handler);

// With custom prefix
app.get('/api/data', cacheResponse(300, 'custom'), handler);

// Custom key generator
const { cacheWithKey } = require('./middleware/cache');

const keyGen = (req) => `custom:${req.params.id}`;
app.get('/api/data/:id', cacheWithKey(keyGen, 300), handler);
```

#### Invalidate Cache
```javascript
const { invalidateCache } = require('./middleware/cache');

// Invalidate by pattern
app.post('/api/data', invalidateCache('api:data:*'), handler);

// Invalidate with user ID
app.post('/api/user/profile', invalidateCache('user:{userId}:*', 'userId'), handler);
```

#### Rate Limiting
```javascript
const { rateLimit } = require('./middleware/cache');

// Basic rate limiting
app.get('/api/data', rateLimit(100, 15 * 60 * 1000), handler);

// Different limits for different endpoints
app.get('/api/auth/login', rateLimit(5, 60 * 1000), handler); // 5 per minute
app.get('/api/data', rateLimit(1000, 60 * 1000), handler); // 1000 per minute
```

### Decorators

#### Cacheable
```javascript
const { cacheable } = require('../utils/cacheDecorator');

class UserService {
  @cacheable(600) // Cache for 10 minutes
  async getUser(id) {
    return await db.users.findById(id);
  }

  @cacheable(300, (self, id) => `user:profile:${id}`)
  async getUserProfile(id) {
    return await db.users.findById(id).populate('profile');
  }
}
```

#### Invalidate Cache
```javascript
const { invalidateCache } = require('../utils/cacheDecorator');

class UserService {
  @invalidateCache('user:*')
  async updateUser(id, data) {
    return await db.users.findByIdAndUpdate(id, data);
  }

  @invalidateCache((self, id) => `user:${id}:*`)
  async deleteUser(id) {
    return await db.users.findByIdAndDelete(id);
  }
}
```

#### Memoize
```javascript
const { memoize } = require('../utils/cacheDecorator');

class DataService {
  @memoize(1800) // Cache for 30 minutes
  async fetchExpensiveData(param) {
    // Expensive operation
    return await doExpensiveCalculation(param);
  }
}
```

#### Rate Limit
```javascript
const { rateLimit } = require('../utils/cacheDecorator');

class AuthService {
  @rateLimit(5, 60000) // 5 requests per minute
  async login(username, password) {
    return await authenticate(username, password);
  }
}
```

## 🎯 Cache Strategies

### 1. User Data Caching
**Use Case:** User profiles, settings, session data

```javascript
// Cache user data
await cacheService.set(
  `user:${userId}`,
  userData,
  10 * 60 // 10 minutes
);

// Middleware
app.get('/api/user/profile', cacheResponse(600), getProfile);

// Invalidate on update
app.post('/api/user/profile',
  invalidateCache('user:{userId}:*', 'userId'),
  updateProfile
);
```

### 2. Inventory Caching
**Use Case:** Steam inventory, marketplace listings

```javascript
// Cache with shorter TTL (changes frequently)
await cacheService.set(
  `inventory:${steamId}:${appId}`,
  inventoryData,
  5 * 60 // 5 minutes
);

// Invalidate on trade
app.post('/api/trade',
  invalidateCache('inventory:*'),
  createTrade
);
```

### 3. API Response Caching
**Use Case:** Third-party API responses, market data

```javascript
// Remember pattern for API calls
const marketData = await cacheService.remember(
  `market:prices:${itemId}`,
  async () => {
    return await fetchFromSteamAPI(itemId);
  },
  2 * 60 // 2 minutes
);
```

### 4. Database Query Caching
**Use Case:** Expensive database queries

```javascript
// With decorator
class TradeService {
  @cacheable(1800, (self, userId) => `trades:${userId}`)
  async getUserTrades(userId) {
    return await db.trades.find({ userId }).sort({ createdAt: -1 });
  }
}
```

## 🔑 Cache Key Patterns

### Standard Keys
```javascript
// User data
user:{userId}
user:{userId}:profile
user:{userId}:settings

// Inventory
inventory:{steamId}
inventory:{steamId}:{appId}

// Trades
trade:offer:{offerId}
trades:{userId}
trades:{userId}:pending

// Market data
market:listings
market:listings:{page}
market:prices:{itemId}

// API cache
api:{method}:{url}:{userId}
```

### Using CacheKeys Helper
```javascript
const { CacheKeys } = require('./middleware/cache');

const key1 = CacheKeys.user(userId);
const key2 = CacheKeys.userInventory(userId);
const key3 = CacheKeys.steamInventory(steamId, 730);
const key4 = CacheKeys.marketListings(1);
const key5 = CacheKeys.tradeOffer(offerId);
```

## ⏱️ TTL Recommendations

| Data Type | TTL | Reason |
|-----------|-----|--------|
| User Session | 24 hours | Persistent sessions |
| User Profile | 10 minutes | Updates occasionally |
| Inventory | 5 minutes | Changes frequently |
| Market Listings | 2 minutes | Real-time data |
| Trade Offers | 1 hour | Status updates |
| API Responses | 5 minutes | Varies by API |
| Rate Limits | 15 minutes | Sliding window |
| Temporary Data | 5 minutes | Short-lived |

## 🛠️ Configuration

### Redis Configuration (`config/redis.js`)

```javascript
module.exports = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  defaults: {
    userSession: 24 * 60 * 60,
    apiResponse: 5 * 60,
    inventory: 5 * 60
  },
  strategies: {
    public: { ttl: 5 * 60 },
    user: { ttl: 10 * 60 },
    dynamic: { ttl: 60 },
    static: { ttl: 60 * 60 }
  }
};
```

### Environment Variables

```bash
# Connection
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=password

# Cloud providers
# Redis Cloud
REDIS_TLS_ENABLED=true
REDIS_TLS_CERT=path/to/cert
REDIS_TLS_KEY=path/to/key

# Redis Sentinel
REDIS_SENTINEL_ENABLED=true
REDIS_SENTINEL_NAME=mymaster
REDIS_SENTINEL_HOSTS=host1:26379,host2:26379

# Redis Cluster
REDIS_CLUSTER_ENABLED=true
REDIS_CLUSTER_NODES=host1:7000,host2:7000
```

## 🔍 Monitoring

### Get Cache Statistics
```javascript
const stats = await cacheService.getStats();
console.log('Redis Stats:', {
  used_memory: stats.used_memory,
  connected_clients: stats.connected_clients,
  total_commands_processed: stats.total_commands_processed,
  keyspace_hits: stats.keyspace_hits,
  keyspace_misses: stats.keyspace_misses
});
```

### Cache Hit Rate
```javascript
// Calculate hit rate
const hits = parseInt(stats.keyspace_hits);
const misses = parseInt(stats.keyspace_misses);
const hitRate = (hits / (hits + misses)) * 100;

console.log(`Cache Hit Rate: ${hitRate.toFixed(2)}%`);
```

### Health Check
```javascript
// Add to health check endpoint
app.get('/health', async (req, res) => {
  const redisConnected = cacheService.isConnected();
  res.json({
    status: 'OK',
    redis: redisConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});
```

## 🧪 Testing

### Test Cache Service
```bash
# Start Redis
docker-compose up redis

# Run test
node -e "
const cache = require('./services/cacheService');
cache.connect().then(() => {
  return cache.set('test', { data: 'value' }, 60);
}).then(() => {
  return cache.get('test');
}).then((value) => {
  console.log('Cached value:', value);
  process.exit(0);
});
"
```

### Mock Redis for Tests
```javascript
// tests/setup.js
jest.mock('./services/cacheService', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  isConnected: () => true
}));
```

## ⚠️ Best Practices

### DO
- ✅ Use appropriate TTL values
- ✅ Handle cache misses gracefully
- ✅ Invalidate cache on data updates
- ✅ Monitor cache hit rates
- ✅ Use meaningful key names
- ✅ Set reasonable rate limits
- ✅ Handle Redis connection failures
- ✅ Use transactions for multiple operations

### DON'T
- ❌ Cache sensitive data (passwords, tokens)
- ❌ Set TTL too long for frequently changing data
- ❌ Cache whole user objects with auth tokens
- ❌ Ignore cache errors (always have fallback)
- ❌ Use Redis as primary data store
- ❌ Cache authenticated user data for public access
- ❌ Cache error responses
- ❌ Use overly complex cache keys

## 🚨 Error Handling

### Graceful Degradation
```javascript
// In service
async getUserData(userId) {
  // Try cache first
  const cached = await cacheService.get(`user:${userId}`);

  if (cached) {
    return cached;
  }

  // Fallback to database
  const data = await db.users.findById(userId);

  if (data) {
    await cacheService.set(`user:${userId}`, data, 600);
  }

  return data;
}
```

### Connection Failure Handling
```javascript
// In middleware
app.get('/api/data', async (req, res, next) => {
  if (!cacheService.isConnected()) {
    logger.warn('Redis not connected, bypassing cache');
    return next();
  }

  // Continue with caching
  cacheResponse(300)(req, res, next);
});
```

## 📊 Performance Tips

### 1. Use Pipeline for Batch Operations
```javascript
// Instead of multiple calls
for (const key of keys) {
  await cacheService.del(key);
}

// Use pipeline
const pipeline = cacheService.client.multi();
keys.forEach(key => pipeline.del(key));
await pipeline.exec();
```

### 2. Use Appropriate Data Structures
```javascript
// For lists (recent activities)
await cacheService.client.lpush('user:activities', JSON.stringify(activity));
await cacheService.client.ltrim('user:activities', 0, 99); // Keep only 100

// For sets (unique values)
await cacheService.client.sadd('user:permissions', permission);
await cacheService.client.smembers('user:permissions');
```

### 3. Compress Large Data
```javascript
const zlib = require('zlib');

// For large objects
const compressed = zlib.gzipSync(JSON.stringify(largeData));
await cacheService.set('key', compressed);
```

## 🔐 Security

### 1. Authentication
```javascript
// Include user ID in cache key
const key = `user:${userId}:data`;
```

### 2. Input Sanitization
```javascript
// Sanitize keys
const sanitizedKey = key.replace(/[^a-zA-Z0-9:_-]/g, '');
```

### 3. Access Control
```javascript
// Only cache public data
app.get('/api/public/data', cacheResponse(300), handler);

// Don't cache private data
app.get('/api/private/data', handler);
```

## 🎯 Use Cases

### 1. Session Management
```javascript
// Store session
await cacheService.set(`session:${sessionId}`, {
  userId,
  steamId,
  expiresAt
}, 24 * 60 * 60);
```

### 2. Rate Limiting
```javascript
// IP-based rate limiting
const { rateLimit } = require('./middleware/cache');
app.use(rateLimit(1000, 15 * 60 * 1000));
```

### 3. Caching Third-Party API
```javascript
// Cache Steam API responses
const prices = await cacheService.remember(
  `steam:prices:${appId}:${itemId}`,
  async () => {
    return await fetchSteamMarketPrices(appId, itemId);
  },
  60
);
```

### 4. Database Query Optimization
```javascript
// Cache expensive queries
class TradeService {
  @cacheable(1800, (self, filters) => `trades:search:${JSON.stringify(filters)}`)
  async searchTrades(filters) {
    return await db.trades.find(filters).exec();
  }
}
```

## 📈 Scaling

### 1. Redis Cluster
```javascript
// config/redis.js
module.exports = {
  cluster: {
    enabled: true,
    nodes: ['host1:7000', 'host2:7000', 'host3:7000']
  }
};
```

### 2. Read Replicas
```javascript
// Use different Redis for reads
const readClient = redis.createClient({ url: 'redis://read-replica:6379' });
const writeClient = redis.createClient({ url: 'redis://master:6379' });
```

### 3. Eviction Policy
```bash
# In redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
```

## 📚 Resources

- [Redis Documentation](https://redis.io/documentation)
- [Node.js Redis Client](https://github.com/redis/node-redis)
- [Redis Best Practices](https://redis.io/docs/manual/optimization/)
- [Cache Patterns](https://redis.io/docs/manual/data-patterns/)

## ✅ Checklist

- [ ] Redis configured in environment
- [ ] Cache service initialized in app.js
- [ ] Appropriate TTL values set
- [ ] Cache keys follow naming convention
- [ ] Cache invalidation implemented
- [ ] Error handling in place
- [ ] Monitoring setup
- [ ] Performance testing completed
- [ ] Security considerations applied
- [ ] Documentation updated