/**
 * Redis Cache Service
 * Provides caching functionality for improved performance
 */

const redis = require('redis');
const logger = require('../utils/logger');
const { Sentry } = require('../config/sentry');

class CacheService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.retryAttempts = 0;
    this.maxRetries = 3;
  }

  /**
   * Initialize Redis connection
   */
  async connect() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      this.client = redis.createClient({
        url: redisUrl,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            logger.error('Redis server is refused connection');
            return new Error('The Redis server refused the connection');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            logger.error('Redis retry time exhausted');
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            logger.error('Redis max retry attempts reached');
            return undefined;
          }
          // Reconnect after
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
        this.connected = true;
        this.retryAttempts = 0;
      });

      this.client.on('error', (err) => {
        logger.error('Redis client error:', err);
        this.connected = false;

        if (Sentry) {
          Sentry.captureException(err, {
            tags: {
              service: 'cacheService',
              action: 'connection'
            }
          });
        }
      });

      this.client.on('end', () => {
        logger.warn('Redis client disconnected');
        this.connected = false;
      });

      await this.client.connect();
      return this;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.connected = false;

      if (Sentry) {
        Sentry.captureException(error, {
          tags: {
            service: 'cacheService',
            action: 'connect'
          }
        });
      }

      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.connected = false;
      logger.info('Redis client disconnected');
    }
  }

  /**
   * Check if Redis is connected
   */
  isConnected() {
    return this.connected && this.client?.isReady;
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  async get(key) {
    try {
      if (!this.isConnected()) {
        logger.warn('Redis not connected, skipping cache get');
        return null;
      }

      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Error getting cache key ${key}:`, error);

      if (Sentry) {
        Sentry.captureException(error, {
          tags: {
            service: 'cacheService',
            action: 'get',
            key
          }
        });
      }

      return null;
    }
  }

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (default: 3600)
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = 3600) {
    try {
      if (!this.isConnected()) {
        logger.warn('Redis not connected, skipping cache set');
        return false;
      }

      const serialized = JSON.stringify(value);
      await this.client.setEx(key, ttl, serialized);
      return true;
    } catch (error) {
      logger.error(`Error setting cache key ${key}:`, error);

      if (Sentry) {
        Sentry.captureException(error, {
          tags: {
            service: 'cacheService',
            action: 'set',
            key
          }
        });
      }

      return false;
    }
  }

  /**
   * Delete a key from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async del(key) {
    try {
      if (!this.isConnected()) {
        return false;
      }

      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Error deleting cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   * @param {string} pattern - Key pattern (e.g., 'user:*')
   * @returns {Promise<number>} Number of deleted keys
   */
  async delPattern(pattern) {
    try {
      if (!this.isConnected()) {
        return 0;
      }

      const keys = await this.client.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      await this.client.del(keys);
      return keys.length;
    } catch (error) {
      logger.error(`Error deleting cache pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if a key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Whether key exists
   */
  async exists(key) {
    try {
      if (!this.isConnected()) {
        return false;
      }

      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Error checking cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set TTL for a key
   * @param {string} key - Cache key
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async expire(key, ttl) {
    try {
      if (!this.isConnected()) {
        return false;
      }

      await this.client.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error(`Error setting TTL for cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get TTL for a key
   * @param {string} key - Cache key
   * @returns {Promise<number>} TTL in seconds or -1
   */
  async ttl(key) {
    try {
      if (!this.isConnected()) {
        return -1;
      }

      const ttl = await this.client.ttl(key);
      return ttl;
    } catch (error) {
      logger.error(`Error getting TTL for cache key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Increment a counter
   * @param {string} key - Cache key
   * @param {number} amount - Amount to increment (default: 1)
   * @returns {Promise<number>} New value
   */
  async incr(key, amount = 1) {
    try {
      if (!this.isConnected()) {
        return 0;
      }

      const value = await this.client.incrBy(key, amount);
      return value;
    } catch (error) {
      logger.error(`Error incrementing cache key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Cache with automatic get/set
   * @param {string} key - Cache key
   * @param {Function} fetchFunction - Function to fetch data if not cached
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<any>} Cached or fetched data
   */
  async remember(key, fetchFunction, ttl = 3600) {
    try {
      // Try to get from cache
      const cached = await this.get(key);
      if (cached !== null) {
        logger.debug(`Cache hit for key: ${key}`);
        return cached;
      }

      // Cache miss, fetch data
      logger.debug(`Cache miss for key: ${key}, fetching data...`);
      const data = await fetchFunction();

      // Store in cache
      await this.set(key, data, ttl);

      return data;
    } catch (error) {
      logger.error(`Error in remember for key ${key}:`, error);

      if (Sentry) {
        Sentry.captureException(error, {
          tags: {
            service: 'cacheService',
            action: 'remember',
            key
          }
        });
      }

      // Fallback to fetchFunction without cache
      return await fetchFunction();
    }
  }

  /**
   * Get multiple values
   * @param {string[]} keys - Array of cache keys
   * @returns {Promise<Object>} Object with key-value pairs
   */
  async mget(keys) {
    try {
      if (!this.isConnected() || keys.length === 0) {
        return {};
      }

      const values = await this.client.mGet(keys);
      const result = {};

      keys.forEach((key, index) => {
        const value = values[index];
        if (value !== null) {
          result[key] = JSON.parse(value);
        }
      });

      return result;
    } catch (error) {
      logger.error('Error in mget:', error);
      return {};
    }
  }

  /**
   * Set multiple values
   * @param {Object} keyValuePairs - Object with key-value pairs
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async mset(keyValuePairs, ttl = 3600) {
    try {
      if (!this.isConnected() || Object.keys(keyValuePairs).length === 0) {
        return false;
      }

      const pipeline = this.client.multi();

      Object.entries(keyValuePairs).forEach(([key, value]) => {
        const serialized = JSON.stringify(value);
        pipeline.setEx(key, ttl, serialized);
      });

      await pipeline.exec();
      return true;
    } catch (error) {
      logger.error('Error in mset:', error);
      return false;
    }
  }

  /**
   * Flush all cache (use with caution!)
   * @returns {Promise<boolean>} Success status
   */
  async flush() {
    try {
      if (!this.isConnected()) {
        return false;
      }

      await this.client.flushDb();
      logger.warn('Redis cache flushed');
      return true;
    } catch (error) {
      logger.error('Error flushing cache:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache statistics
   */
  async getStats() {
    try {
      if (!this.isConnected()) {
        return null;
      }

      const info = await this.client.info();
      const stats = {};

      info.split('\r\n').forEach((line) => {
        const [key, value] = line.split(':');
        if (key && value && !key.startsWith('#')) {
          stats[key] = value;
        }
      });

      return stats;
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      return null;
    }
  }
}

// Export singleton instance
const cacheService = new CacheService();

module.exports = cacheService;