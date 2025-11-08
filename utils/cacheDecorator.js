/**
 * Cache Decorator
 * Provides decorators for caching function results
 */

const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

/**
 * Cache decorator for class methods
 * @param {number} ttl - Time to live in seconds
 * @param {Function} keyGenerator - Function to generate cache key
 * @returns {Function} Decorator function
 */
function cacheable(ttl = 3600, keyGenerator = null) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args) {
      const self = this;
      const className = self.constructor.name;

      // Generate cache key
      let cacheKey;
      if (keyGenerator) {
        cacheKey = keyGenerator(self, ...args);
      } else {
        // Default key based on class, method, and arguments
        const argsStr = JSON.stringify(args, (key, value) => {
          // Skip large objects
          if (typeof value === 'object' && value !== null) {
            return '[Object]';
          }
          return value;
        });
        cacheKey = `decorator:${className}:${propertyKey}:${argsStr}`;
      }

      try {
        // Try to get from cache
        const cached = await cacheService.get(cacheKey);
        if (cached !== null) {
          logger.debug(`Cache hit for ${cacheKey}`);
          return cached;
        }

        logger.debug(`Cache miss for ${cacheKey}, executing method`);

        // Execute method
        const result = await originalMethod.apply(self, args);

        // Store in cache
        await cacheService.set(cacheKey, result, ttl);

        return result;
      } catch (error) {
        logger.error(`Cache decorator error for ${cacheKey}:`, error);

        // Fallback to executing method without cache
        return await originalMethod.apply(self, args);
      }
    };

    return descriptor;
  };
}

/**
 * Invalidate cache decorator - clears related caches after method execution
 * @param {string|Function} patternOrGenerator - Cache pattern or key generator
 * @returns {Function} Decorator function
 */
function invalidateCache(patternOrGenerator) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args) {
      const self = this;
      const className = self.constructor.name;

      // Execute the method first
      const result = await originalMethod.apply(self, args);

      try {
        // Generate pattern to invalidate
        let pattern;
        if (typeof patternOrGenerator === 'function') {
          pattern = patternOrGenerator(self, ...args);
        } else {
          pattern = patternOrGenerator;
        }

        // Replace {userId} with actual user ID if present
        if (self.user && pattern.includes('{userId}')) {
          pattern = pattern.replace('{userId}', self.user.id);
        }

        const deleted = await cacheService.delPattern(pattern);
        logger.debug(`Invalidated ${deleted} cache keys for pattern: ${pattern}`);

        return result;
      } catch (error) {
        logger.error('Cache invalidation error:', error);
        return result;
      }
    };

    return descriptor;
  };
}

/**
 * Memoization for async functions
 * @param {number} ttl - Time to live in seconds
 * @returns {Function} Memoized function
 */
function memoize(ttl = 3600) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    const cache = new Map();

    descriptor.value = async function (...args) {
      const self = this;
      const className = self.constructor.name;
      const methodName = propertyKey;

      // Create cache key
      const argsStr = JSON.stringify(args);
      const cacheKey = `memoize:${className}:${methodName}:${argsStr}`;

      // Check if result is cached
      if (cache.has(cacheKey)) {
        logger.debug(`Memoization hit for ${cacheKey}`);
        return cache.get(cacheKey);
      }

      // Execute method
      const result = await originalMethod.apply(self, args);

      // Store in cache
      cache.set(cacheKey, result);

      // Also store in Redis
      await cacheService.set(cacheKey, result, ttl);

      return result;
    };

    return descriptor;
  };
}

/**
 * Rate limiting decorator
 * @param {number} maxRequests - Maximum requests
 * @param {number} windowMs - Time window in ms
 * @returns {Function} Decorator function
 */
function rateLimit(maxRequests = 100, windowMs = 60000) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args) {
      const self = this;
      const className = self.constructor.name;
      const methodName = propertyKey;

      // Generate rate limit key
      const key = `ratelimit:${className}:${methodName}:${self.user?.id || 'anonymous'}`;

      // Increment counter
      const current = await cacheService.incr(key);

      if (current === 1) {
        await cacheService.expire(key, Math.ceil(windowMs / 1000));
      }

      if (current > maxRequests) {
        throw new Error('Rate limit exceeded');
      }

      return await originalMethod.apply(self, args);
    };

    return descriptor;
  };
}

/**
 * Create a cached version of a function
 * @param {Function} fn - Function to cache
 * @param {number} ttl - Time to live in seconds
 * @param {Function} keyGenerator - Custom key generator
 * @returns {Function} Cached function
 */
function createCachedFunction(fn, ttl = 3600, keyGenerator = null) {
  return async function (...args) {
    // Generate cache key
    const argsStr = JSON.stringify(args);
    let cacheKey;

    if (keyGenerator) {
      cacheKey = keyGenerator(...args);
    } else {
      cacheKey = `function:${fn.name}:${argsStr}`;
    }

    // Try to get from cache
    const cached = await cacheService.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Execute function
    const result = await fn(...args);

    // Store in cache
    await cacheService.set(cacheKey, result, ttl);

    return result;
  };
}

module.exports = {
  cacheable,
  invalidateCache,
  memoize,
  rateLimit,
  createCachedFunction
};