/**
 * Cache Middleware
 * Provides middleware for caching API responses
 */

const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

/**
 * Generate cache key from request
 * @param {Object} req - Express request object
 * @param {string} prefix - Cache key prefix
 * @returns {string} Cache key
 */
const generateCacheKey = (req, prefix = 'api') => {
  const url = req.originalUrl || req.url;
  const method = req.method;
  const userId = req.user?.id || 'anonymous';

  // Create a unique key based on URL, method, and user
  return `${prefix}:${method}:${userId}:${url}`;
};

/**
 * Middleware to cache GET requests
 * @param {number} ttl - Time to live in seconds (default: 3600)
 * @param {string} keyPrefix - Cache key prefix (default: 'api')
 * @returns {Function} Express middleware
 */
const cacheResponse = (ttl = 3600, keyPrefix = 'api') => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Don't cache if user is not authenticated (or if you want to cache public data)
    // if (!req.user) {
    //   return next();
    // }

    const cacheKey = generateCacheKey(req, keyPrefix);

    try {
      // Try to get from cache
      const cachedResponse = await cacheService.get(cacheKey);

      if (cachedResponse) {
        logger.debug(`Cache hit for ${cacheKey}`);
        res.set('X-Cache', 'HIT');
        return res.json(cachedResponse);
      }

      // Cache miss, intercept json response
      const originalJson = res.json.bind(res);

      res.json = (data) => {
        // Store in cache
        cacheService.set(cacheKey, data, ttl)
          .then(() => {
            logger.debug(`Cached response for ${cacheKey}`);
          })
          .catch((err) => {
            logger.error(`Error caching response for ${cacheKey}:`, err);
          });

        res.set('X-Cache', 'MISS');
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error(`Cache middleware error for ${cacheKey}:`, error);
      next();
    }
  };
};

/**
 * Middleware to cache with custom key generator
 * @param {Function} keyGenerator - Function to generate cache key
 * @param {number} ttl - Time to live in seconds
 * @returns {Function} Express middleware
 */
const cacheWithKey = (keyGenerator, ttl = 3600) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    try {
      const cacheKey = keyGenerator(req);
      const cachedResponse = await cacheService.get(cacheKey);

      if (cachedResponse) {
        res.set('X-Cache', 'HIT');
        return res.json(cachedResponse);
      }

      const originalJson = res.json.bind(res);

      res.json = (data) => {
        cacheService.set(cacheKey, data, ttl)
          .catch((err) => {
            logger.error(`Error caching response for ${cacheKey}:`, err);
          });

        res.set('X-Cache', 'MISS');
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};

/**
 * Middleware to invalidate cache
 * @param {string} pattern - Cache key pattern to invalidate
 * @param {string} userIdParam - Parameter name to extract user ID from (optional)
 * @returns {Function} Express middleware
 */
const invalidateCache = (pattern, userIdParam = null) => {
  return async (req, res, next) => {
    // Call next to execute the route handler first
    next();

    try {
      // After response is sent, invalidate cache
      res.on('finish', async () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          let cachePattern = pattern;

          // Replace {userId} with actual user ID if specified
          if (userIdParam && req.user) {
            cachePattern = pattern.replace('{userId}', req.user.id);
          }

          const deleted = await cacheService.delPattern(cachePattern);
          logger.debug(`Invalidated ${deleted} cache keys for pattern: ${cachePattern}`);
        }
      });
    } catch (error) {
      logger.error('Cache invalidation error:', error);
    }
  };
};

/**
 * Memoization middleware for expensive function calls
 * @param {Function} fn - Function to memoize
 * @param {number} ttl - Time to live in seconds
 * @returns {Function} Memoized function
 */
const memoize = (fn, ttl = 3600) => {
  return async (...args) => {
    const cacheKey = `memoize:${fn.name}:${JSON.stringify(args)}`;

    // Try to get from cache
    const cached = await cacheService.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Cache miss, execute function
    const result = await fn(...args);

    // Store in cache
    await cacheService.set(cacheKey, result, ttl);

    return result;
  };
};

/**
 * Rate limiting using Redis
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} Express middleware
 */
const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return async (req, res, next) => {
    try {
      const key = `ratelimit:${req.ip}`;
      const current = await cacheService.incr(key);

      if (current === 1) {
        await cacheService.expire(key, Math.ceil(windowMs / 1000));
      }

      res.set({
        'X-RateLimit-Limit': maxRequests,
        'X-RateLimit-Remaining': Math.max(0, maxRequests - current),
        'X-RateLimit-Reset': new Date(Date.now() + windowMs)
      });

      if (current > maxRequests) {
        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }

      next();
    } catch (error) {
      logger.error('Rate limit error:', error);
      // Allow request to proceed if Redis is down
      next();
    }
  };
};

/**
 * Cache key builder utilities
 */
const CacheKeys = {
  user: (userId) => `user:${userId}`,
  userInventory: (userId) => `inventory:${userId}`,
  userTrades: (userId) => `trades:${userId}`,
  steamInventory: (steamId, appId = 730) => `steam:inventory:${steamId}:${appId}`,
  marketListings: (page = 1) => `market:listings:${page}`,
  tradeOffer: (offerId) => `trade:offer:${offerId}`,
  auth: (userId) => `auth:${userId}`,
  session: (sessionId) => `session:${sessionId}`,
  api: (method, url, userId) => `api:${method}:${userId}:${url}`
};

module.exports = {
  cacheResponse,
  cacheWithKey,
  invalidateCache,
  memoize,
  rateLimit,
  CacheKeys,
  generateCacheKey
};