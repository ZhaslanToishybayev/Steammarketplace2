/**
 * Unit tests for rateLimitMiddleware
 * Тестирует middleware ограничения скорости запросов
 */

// Mock console.log to reduce test noise
const originalLog = console.log;
console.log = jest.fn();

describe('RateLimit Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    console.log.mockClear();

    req = {};
    res = {
      locals: {}
    };
    next = jest.fn();

    // Mock Date.now for consistent testing
    jest.spyOn(Date, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    if (Date.now.mockRestore) {
      Date.now.mockRestore();
    }
    console.log = originalLog;
  });

  describe('rateLimitMiddleware', () => {
    test('should call next when first request', () => {
      // Setup
      const { rateLimitMiddleware } = require('../../../middleware/rateLimitMiddleware');

      // Execute
      rateLimitMiddleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.locals.lastRequestTime).toBe(0);
    });

    test('should add delay when requests are too fast', (done) => {
      // Setup
      const { rateLimitMiddleware } = require('../../../middleware/rateLimitMiddleware');

      // First request at time 0
      rateLimitMiddleware(req, res, next);

      // Second request at time 100ms (less than 500ms minDelay)
      Date.now.mockReturnValue(100);

      // Execute
      rateLimitMiddleware(req, res, next);

      // Assert
      // Wait for setTimeout
      setTimeout(() => {
        expect(next).toHaveBeenCalledTimes(2);
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('[RateLimitMiddleware] Задержка')
        );
        done();
      }, 100);
    });

    test('should not add delay when enough time has passed', () => {
      // Setup
      const { rateLimitMiddleware } = require('../../../middleware/rateLimitMiddleware');

      // First request
      rateLimitMiddleware(req, res, next);

      // Second request at time 600ms (more than 500ms minDelay)
      Date.now.mockReturnValue(600);

      // Execute
      rateLimitMiddleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledTimes(2);
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('[RateLimitMiddleware] Задержка')
      );
    });

    test('should update lastRequestTime after successful request', () => {
      // Setup
      const { rateLimitMiddleware } = require('../../../middleware/rateLimitMiddleware');

      // Execute
      rateLimitMiddleware(req, res, next);

      // Assert
      expect(res.locals.lastRequestTime).toBe(Date.now());
    });

    test('should handle multiple sequential requests with proper timing', (done) => {
      // Setup
      const { rateLimitMiddleware } = require('../../../middleware/rateLimitMiddleware');

      Date.now.mockReturnValue(0);
      rateLimitMiddleware(req, res, next);

      Date.now.mockReturnValue(100);
      rateLimitMiddleware(req, res, next);

      Date.now.mockReturnValue(700);
      rateLimitMiddleware(req, res, next);

      setTimeout(() => {
        expect(next).toHaveBeenCalledTimes(3);
        expect(console.log).toHaveBeenCalledTimes(1); // Only once for the second request
        done();
      }, 100);
    });
  });

  describe('withRateLimit', () => {
    let mockAsyncFunction;
    let rateLimiter;

    beforeEach(() => {
      // Mock rateLimiter
      rateLimiter = {
        addRequest: jest.fn()
      };

      jest.doMock('../../../utils/rateLimit', () => rateLimiter);

      mockAsyncFunction = jest.fn().mockResolvedValue('success');
    });

    test('should execute function successfully when no rate limit', async () => {
      // Setup
      rateLimiter.addRequest.mockImplementation(async (fn) => fn());

      const { withRateLimit } = require('../../../middleware/rateLimitMiddleware');
      const result = await withRateLimit(mockAsyncFunction);

      // Assert
      expect(result).toBe('success');
      expect(mockAsyncFunction).toHaveBeenCalled();
    });

    test('should throw error when function throws', async () => {
      // Setup
      const error = new Error('Function error');
      rateLimiter.addRequest.mockImplementation(async (fn) => fn());

      mockAsyncFunction.mockRejectedValue(error);

      const { withRateLimit } = require('../../../middleware/rateLimitMiddleware');

      // Execute & Assert
      await expect(withRateLimit(mockAsyncFunction)).rejects.toThrow('Function error');
    });

    test('should throw custom error on rate limit (RateLimitExceeded)', async () => {
      // Setup
      const rateLimitError = new Error('RateLimitExceeded');
      rateLimiter.addRequest.mockRejectedValue(rateLimitError);

      const { withRateLimit } = require('../../../middleware/rateLimitMiddleware');

      // Execute & Assert
      await expect(withRateLimit(mockAsyncFunction)).rejects.toThrow(
        'Слишком много запросов. Попробуйте позже.'
      );
    });

    test('should throw custom error on rate limit (429)', async () => {
      // Setup
      const rateLimitError = new Error('429 Too Many Requests');
      rateLimiter.addRequest.mockRejectedValue(rateLimitError);

      const { withRateLimit } = require('../../../middleware/rateLimitMiddleware');

      // Execute & Assert
      await expect(withRateLimit(mockAsyncFunction)).rejects.toThrow(
        'Слишком много запросов. Попробуйте позже.'
      );
    });

    test('should throw custom error on rate limit (eresult 84)', async () => {
      // Setup
      const rateLimitError = new Error('Steam API error');
      rateLimitError.eresult = 84;
      rateLimiter.addRequest.mockRejectedValue(rateLimitError);

      const { withRateLimit } = require('../../../middleware/rateLimitMiddleware');

      // Execute & Assert
      await expect(withRateLimit(mockAsyncFunction)).rejects.toThrow(
        'Слишком много запросов. Попробуйте позже.'
      );
    });

    test('should rethrow non-rate-limit errors', async () => {
      // Setup
      const error = new Error('Database error');
      rateLimiter.addRequest.mockRejectedValue(error);

      const { withRateLimit } = require('../../../middleware/rateLimitMiddleware');

      // Execute & Assert
      await expect(withRateLimit(mockAsyncFunction)).rejects.toThrow('Database error');
    });
  });
});