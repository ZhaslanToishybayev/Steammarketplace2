/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse
 */

const rateLimit = require('express-rate-limit');

// Helper to create Redis store if available
function createStore() {
    try {
        const { redisClient } = require('../config/redis');
        const RedisStore = require('rate-limit-redis').default;
        return new RedisStore({
            sendCommand: (...args) => redisClient.call(...args),
        });
    } catch (err) {
        console.warn('⚠️ Rate limiter using memory store (Redis not available)');
        return undefined; // Falls back to memory store
    }
}

// Standard API rate limiter (100 requests per 15 minutes)
const apiLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 min
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many requests, please try again later',
        code: 'RATE_LIMITED',
    },
    skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/api/health';
    },
});

// Stricter auth rate limiter (5 attempts per minute)
const authLimiter = rateLimit({
    windowMs: parseInt(process.env.AUTH_RATE_LIMIT_TTL || '60') * 1000, // 1 min
    max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5'),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many authentication attempts, please try again later',
        code: 'AUTH_RATE_LIMITED',
    },
});

// Trade/write operations rate limiter (30 per minute)
const writeLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 min
    max: parseInt(process.env.THROTTLE_WRITE_LIMIT || '30'),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many write operations, please slow down',
        code: 'WRITE_RATE_LIMITED',
    },
});

// Very strict limiter for sensitive operations (10 per hour)
const sensitiveOperationsLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: parseInt(process.env.MAX_TRADES_PER_HOUR || '10'),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Hourly limit reached for this operation',
        code: 'HOURLY_LIMIT_EXCEEDED',
    },
});

module.exports = {
    apiLimiter,
    authLimiter,
    writeLimiter,
    sensitiveOperationsLimiter,
};
