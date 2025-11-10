/**
 * Redis Cache Service
 * Provides caching functionality using Redis
 */

const redis = require('redis');
const logger = require('../../utils/logger');

class RedisCacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 300; // 5 minutes
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  /**
   * Initialize Redis connection
   */
  async connect() {
    try {
      this.client = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            logger.error('Redis connection refused');
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
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis connected successfully');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        logger.info('Redis ready to accept commands');
      });

      this.client.on('end', () => {
        logger.info('Redis connection closed');
        this.isConnected = false;
      });

      await this.client.connect();
      return this;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  async get(key) {
    try {
      if (!this.isConnected) {
        return null;
      }

      const value = await this.client.get(key);

      if (value === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return JSON.parse(value);
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = this.defaultTTL) {
    try {
      if (!this.isConnected) {
        return false;
      }

      const serialized = JSON.stringify(value);
      await this.client.setEx(key, ttl, serialized);
      this.stats.sets++;
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete a value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async del(key) {
    try {
      if (!this.isConnected) {
        return false;
      }

      await this.client.del(key);
      this.stats.deletes++;
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   * @param {string} pattern - Key pattern (e.g., 'user:*')
   * @returns {Promise<number>} Number of deleted keys
   */
  async delPattern(pattern) {
    try {
      if (!this.isConnected) {
        return 0;
      }

      const keys = await this.client.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      await this.client.del(keys);
      this.stats.deletes += keys.length;
      return keys.length;
    } catch (error) {
      logger.error(`Cache delete pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if a key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Exists status
   */
  async exists(key) {
    try {
      if (!this.isConnected) {
        return false;
      }

      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
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
      if (!this.isConnected) {
        return false;
      }

      await this.client.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error(`Cache expire error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get TTL for a key
   * @param {string} key - Cache key
   * @returns {Promise<number>} TTL in seconds
   */
  async ttl(key) {
    try {
      if (!this.isConnected) {
        return -1;
      }

      return await this.client.ttl(key);
    } catch (error) {
      logger.error(`Cache TTL error for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Increment a counter
   * @param {string} key - Cache key
   * @param {number} increment - Increment value (default: 1)
   * @returns {Promise<number>} New value
   */
  async inc(key, increment = 1) {
    try {
      if (!this.isConnected) {
        return 0;
      }

      return await this.client.incrBy(key, increment);
    } catch (error) {
      logger.error(`Cache increment error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Add to a set
   * @param {string} key - Cache key
   * @param {string} value - Value to add
   * @returns {Promise<boolean>} Success status
   */
  async sadd(key, value) {
    try {
      if (!this.isConnected) {
        return false;
      }

      await this.client.sAdd(key, value);
      return true;
    } catch (error) {
      logger.error(`Cache sadd error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get all members of a set
   * @param {string} key - Cache key
   * @returns {Promise<Array>} Set members
   */
  async smembers(key) {
    try {
      if (!this.isConnected) {
        return [];
      }

      return await this.client.sMembers(key);
    } catch (error) {
      logger.error(`Cache smembers error for key ${key}:`, error);
      return [];
    }
  }

  /**
   * Check if value exists in set
   * @param {string} key - Cache key
   * @param {string} value - Value to check
   * @returns {Promise<boolean>} Exists status
   */
  async sismember(key, value) {
    try {
      if (!this.isConnected) {
        return false;
      }

      const result = await this.client.sIsMember(key, value);
      return result === 1;
    } catch (error) {
      logger.error(`Cache sismember error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Generate cache key with namespace
   * @param {string} namespace - Cache namespace
   * @param {string} identifier - Cache identifier
   * @returns {string} Formatted cache key
   */
  generateKey(namespace, identifier) {
    return `steam_marketplace:${namespace}:${identifier}`;
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits / (this.stats.hits + this.stats.misses) || 0;
    return {
      ...this.stats,
      hitRate: Number((hitRate * 100).toFixed(2)),
      isConnected: this.isConnected
    };
  }

  /**
   * Clear all cache (use with caution)
   * @returns {Promise<boolean>} Success status
   */
  async flushAll() {
    try {
      if (!this.isConnected) {
        return false;
      }

      await this.client.flushAll();
      logger.warn('Cache flushed completely');
      return true;
    } catch (error) {
      logger.error('Cache flush all error:', error);
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    try {
      if (this.client) {
        await this.client.quit();
        this.isConnected = false;
        logger.info('Redis connection closed gracefully');
      }
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    }
  }

  /**
   * Middleware for automatic caching
   * @param {string} key - Cache key
   * @param {number} ttl - TTL in seconds
   * @param {Function} fetcher - Function to fetch data if not cached
   * @returns {Promise<any>} Cached or fresh data
   */
  async memoize(key, ttl, fetcher) {
    try {
      // Try to get from cache
      const cached = await this.get(key);
      if (cached !== null) {
        return cached;
      }

      // Fetch fresh data
      const data = await fetcher();

      // Cache the result
      await this.set(key, data, ttl);

      return data;
    } catch (error) {
      logger.error(`Memoize error for key ${key}:`, error);
      // If caching fails, try to fetch fresh data
      return await fetcher();
    }
  }
}

module.exports = new RedisCacheService();
