const SteamRateLimiter = require('../../src/utils/steam-rate-limiter');

// Mock dependencies
jest.mock('../../src/config/redis', () => {
    const RedisMock = require('ioredis-mock');
    return {
        redisClient: new RedisMock(),
    };
});

jest.mock('../../src/utils/logger', () => ({
    logger: {
        warn: jest.fn(),
        info: jest.fn(),
    }
}));

describe('SteamRateLimiter Unit Test', () => {
    let rateLimiter;
    // Access the class via the singleton property we added
    const { SteamRateLimiter } = require('../../src/utils/steam-rate-limiter');
    const { redisClient } = require('../../src/config/redis');

    beforeEach(async () => {
        rateLimiter = new SteamRateLimiter();
        await redisClient.flushall();
        // Reset config for tests
        rateLimiter.maxRequests = 5;
        rateLimiter.windowMs = 1000; // 1 second window for fast tests
        redisClient.status = 'ready';
    });

    test('should allow requests within limit', async () => {
        for (let i = 0; i < 5; i++) {
            const start = Date.now();
            await rateLimiter.waitForSlot();
            const duration = Date.now() - start;
            expect(duration).toBeLessThan(100); // Should be immediate
        }
    });

    test('should block requests over limit', async () => {
        // Use up 5 slots
        for (let i = 0; i < 5; i++) {
            await rateLimiter.waitForSlot();
        }

        // 6th request should wait
        const start = Date.now();
        await rateLimiter.waitForSlot();
        const duration = Date.now() - start;

        expect(duration).toBeGreaterThanOrEqual(1000); // Waited for next window
    });

    test('should handle Redis not ready', async () => {
        redisClient.status = 'connecting';
        
        // Should pass immediately even if limit "would" be hit (fail open)
        await rateLimiter.waitForSlot();
        
        const { logger } = require('../../src/utils/logger');
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Redis not ready'));
    });
});
