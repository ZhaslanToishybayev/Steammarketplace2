/**
 * Unit tests for cache middleware
 * Тестирует middleware кэширования
 */

// Mock cacheService
const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  delPattern: jest.fn()
};

// Mock logger
const mockLogger = {
  debug: jest.fn(),
  error: jest.fn()
};

jest.mock('../../../services/cacheService', () => mockCacheService);
jest.mock('../../../utils/logger', () => mockLogger);

describe('Cache Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      method: 'GET',
      originalUrl: '/api/test',
      url: '/api/test',
      user: { id: 'user123' }
    };

    res = {
      json: jest.fn(),
      set: jest.fn()
    };

    next = jest.fn();
  });

  describe('generateCacheKey', () => {
    test('should generate cache key for authenticated user', () => {
      const { generateCacheKey } = require('../../../middleware/cache');

      const cacheKey = generateCacheKey(req, 'api');

      expect(cacheKey).toBe('api:GET:user123:/api/test');
    });

    test('should generate cache key for anonymous user', () => {
      const { generateCacheKey } = require('../../../middleware/cache');
      req.user = null;

      const cacheKey = generateCacheKey(req, 'api');

      expect(cacheKey).toBe('api:GET:anonymous:/api/test');
    });

    test('should use custom prefix', () => {
      const { generateCacheKey } = require('../../../middleware/cache');

      const cacheKey = generateCacheKey(req, 'custom');

      expect(cacheKey).toBe('custom:GET:user123:/api/test');
    });
  });

  describe('cacheResponse', () => {
    test('should skip non-GET requests', async () => {
      // Setup
      req.method = 'POST';

      const { cacheResponse } = require('../../../middleware/cache');
      const middleware = cacheResponse(3600);

      await middleware(req, res, next);

      // Assert
      expect(mockCacheService.get).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    test('should return cached response on cache hit', async () => {
      // Setup
      const cachedData = { id: 1, name: 'Test' };
      mockCacheService.get.mockResolvedValue(cachedData);

      const { cacheResponse } = require('../../../middleware/cache');
      const middleware = cacheResponse(3600);

      await middleware(req, res, next);

      // Assert
      expect(mockCacheService.get).toHaveBeenCalledWith('api:GET:user123:/api/test');
      expect(res.set).toHaveBeenCalledWith('X-Cache', 'HIT');
      expect(res.json).toHaveBeenCalledWith(cachedData);
      expect(next).not.toHaveBeenCalled();
    });

    test('should cache and return new response on cache miss', async () => {
      // Setup
      mockCacheService.get.mockResolvedValue(null);
      const responseData = { id: 2, name: 'New Data' };

      const { cacheResponse } = require('../../../middleware/cache');
      const middleware = cacheResponse(3600);

      await middleware(req, res, next);

      // Execute
      res.json(responseData);

      // Assert
      expect(mockCacheService.get).toHaveBeenCalled();
      expect(res.set).toHaveBeenCalledWith('X-Cache', 'MISS');
      expect(res.json).toHaveBeenCalledWith(responseData);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'api:GET:user123:/api/test',
        responseData,
        3600
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Cached response for api:GET:user123:/api/test'
      );
    });

    test('should handle cache service errors gracefully', async () => {
      // Setup
      mockCacheService.get.mockRejectedValue(new Error('Redis error'));
      const responseData = { id: 3, name: 'Data' };

      const { cacheResponse } = require('../../../middleware/cache');
      const middleware = cacheResponse(3600);

      await middleware(req, res, next);

      // Execute
      res.json(responseData);

      // Assert
      expect(mockLogger.error).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(responseData);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('cacheWithKey', () => {
    test('should use custom key generator', async () => {
      // Setup
      const customKey = 'custom:key:123';
      const keyGenerator = jest.fn().mockReturnValue(customKey);
      const cachedData = { id: 1, data: 'cached' };

      mockCacheService.get.mockResolvedValue(cachedData);

      const { cacheWithKey } = require('../../../middleware/cache');
      const middleware = cacheWithKey(keyGenerator, 3600);

      await middleware(req, res, next);

      // Assert
      expect(keyGenerator).toHaveBeenCalledWith(req);
      expect(mockCacheService.get).toHaveBeenCalledWith(customKey);
      expect(res.json).toHaveBeenCalledWith(cachedData);
    });
  });

  describe('invalidateCache', () => {
    test('should invalidate cache after successful response', (done) => {
      // Setup
      req.user = { id: 'user123' };
      res.statusCode = 200;

      const { invalidateCache } = require('../../../middleware/cache');
      const middleware = invalidateCache('user:{userId}:*', 'userId');

      // Execute
      middleware(req, res, next);

      // Simulate response finish
      setTimeout(() => {
        // Assert
        expect(mockCacheService.delPattern).toHaveBeenCalledWith('user:user123:*');
        expect(mockLogger.debug).toHaveBeenCalledWith(
          expect.stringContaining('Invalidated')
        );
        done();
      }, 0);
    });

    test('should not invalidate cache on error response', (done) => {
      // Setup
      res.statusCode = 500;

      const { invalidateCache } = require('../../../middleware/cache');
      const middleware = invalidateCache('api:*');

      // Execute
      middleware(req, res, next);

      setTimeout(() => {
        // Assert
        expect(mockCacheService.delPattern).not.toHaveBeenCalled();
        done();
      }, 0);
    });

    test('should handle pattern without userId substitution', (done) => {
      // Setup
      res.statusCode = 200;

      const { invalidateCache } = require('../../../middleware/cache');
      const middleware = invalidateCache('api:public:*');

      // Execute
      middleware(req, res, next);

      setTimeout(() => {
        // Assert
        expect(mockCacheService.delPattern).toHaveBeenCalledWith('api:public:*');
        done();
      }, 0);
    });
  });

  describe('memoize', () => {
    test('should return cached result', async () => {
      // Setup
      const mockFn = jest.fn().mockResolvedValue('result');
      const { memoize } = require('../../../middleware/cache');
      const memoizedFn = memoize(mockFn, 3600);

      // First call
      const result1 = await memoizedFn('arg1', 'arg2');

      // Second call with same args
      const result2 = await memoizedFn('arg1', 'arg2');

      // Assert
      expect(result1).toBe('result');
      expect(result2).toBe('result');
      expect(mockFn).toHaveBeenCalledTimes(1); // Called only once
    });

    test('should call function when cache miss', async () => {
      // Setup
      const mockFn = jest.fn().mockResolvedValue('result');
      const { memoize } = require('../../../middleware/cache');
      const memoizedFn = memoize(mockFn, 3600);

      // Execute
      const result = await memoizedFn('arg1', 'arg2');

      // Assert
      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });

  describe('rateLimit', () => {
    test('should allow request under rate limit', async () => {
      // Setup
      req.ip = '192.168.1.1';
      mockCacheService.incr.mockResolvedValue(1);
      mockCacheService.expire.mockResolvedValue(true);

      const { rateLimit } = require('../../../middleware/cache');
      const middleware = rateLimit(100, 15 * 60 * 1000);

      await middleware(req, res, next);

      // Assert
      expect(mockCacheService.incr).toHaveBeenCalledWith('ratelimit:192.168.1.1');
      expect(res.set).toHaveBeenCalledWith({
        'X-RateLimit-Limit': 100,
        'X-RateLimit-Remaining': 99,
        'X-RateLimit-Reset': expect.any(Date)
      });
      expect(next).toHaveBeenCalled();
    });

    test('should block request over rate limit', async () => {
      // Setup
      req.ip = '192.168.1.1';
      mockCacheService.incr.mockResolvedValue(101);

      const { rateLimit } = require('../../../middleware/cache');
      const middleware = rateLimit(100, 15 * 60 * 1000);

      await middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Too many requests',
        retryAfter: 900
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should allow request when cache service fails', async () => {
      // Setup
      req.ip = '192.168.1.1';
      mockCacheService.incr.mockRejectedValue(new Error('Redis down'));

      const { rateLimit } = require('../../../middleware/cache');
      const middleware = rateLimit(100, 15 * 60 * 1000);

      await middleware(req, res, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('CacheKeys', () => {
    test('should generate correct cache keys', () => {
      const { CacheKeys } = require('../../../middleware/cache');

      expect(CacheKeys.user('user123')).toBe('user:user123');
      expect(CacheKeys.userInventory('user123')).toBe('inventory:user123');
      expect(CacheKeys.userTrades('user123')).toBe('trades:user123');
      expect(CacheKeys.steamInventory('76561198782060203')).toBe(
        'steam:inventory:76561198782060203:730'
      );
      expect(CacheKeys.marketListings(1)).toBe('market:listings:1');
      expect(CacheKeys.tradeOffer('offer123')).toBe('trade:offer:offer123');
      expect(CacheKeys.auth('user123')).toBe('auth:user123');
      expect(CacheKeys.session('session123')).toBe('session:session123');
      expect(CacheKeys.api('GET', '/api/test', 'user123')).toBe('api:GET:user123:/api/test');
    });
  });
});