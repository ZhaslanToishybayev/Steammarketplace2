/**
 * Redis Configuration
 * Centralized Redis client for sessions, caching, and pub/sub
 */

const Redis = require('ioredis');

// Redis connection options
console.log('[RedisDebug] REDIS_HOST:', process.env.REDIS_HOST);
console.log('[RedisDebug] REDIS_PORT:', process.env.REDIS_PORT);
const redisOptions = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    family: 4, // Force IPv4
    db: parseInt(process.env.REDIS_SESSIONS_DB || '0'),
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        console.log(`[Redis] Reconnecting in ${delay}ms... (attempt ${times})`);
        return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
};

if (process.env.REDIS_PASSWORD) {
    redisOptions.password = process.env.REDIS_PASSWORD;
}

// Main Redis client (for sessions)
const redisClient = new Redis(redisOptions);

// DEBUG LOGGING PROXY & COMPATIBILITY FIX
const originalSet = redisClient.set.bind(redisClient);
redisClient.set = function (...args) {
    // console.log('[RedisDebug] SET called with args:', JSON.stringify(args));

    // Fix compatibility between connect-redis v7+ and ioredis:
    // ioredis expects: set(key, val, 'EX', ttl)
    // connect-redis sends: set(key, val, { expiration: { type: 'EX', value: ttl } })

    if (args.length >= 3 && typeof args[2] === 'object' && args[2] !== null) {
        const options = args[2];
        if (options.expiration && options.expiration.type === 'EX') {
            // Transform to flat args: key, val, 'EX', ttl
            const newArgs = [args[0], args[1], 'EX', options.expiration.value];
            // If callback was passed as 4th arg
            if (typeof args[3] === 'function') {
                newArgs.push(args[3]);
            }
            // console.log('[RedisFix] Transformed to flat args');
            return originalSet(...newArgs).catch(err => {
                console.error('[RedisFix] SET failed:', err);
                throw err;
            });
        }
    }

    return originalSet(...args).catch(err => {
        console.error('[RedisDebug] SET failed:', err);
        throw err;
    });
};

// Pub/Sub clients for Socket.io adapter
const pubClient = new Redis(redisOptions);
const subClient = new Redis(redisOptions);

// Event handlers
redisClient.on('connect', () => {
    console.log('🔴 Redis client connecting...');
});

redisClient.on('ready', () => {
    console.log('✅ Redis client ready');
});

redisClient.on('error', (err) => {
    console.error('❌ Redis client error:', err.message);
});

redisClient.on('close', () => {
    console.log('⚠️ Redis connection closed');
});

// Test connection
async function testRedisConnection() {
    try {
        await redisClient.ping();
        console.log('✅ Redis connection test passed');
        return true;
    } catch (err) {
        console.error('❌ Redis connection test failed:', err.message);
        return false;
    }
}

// Graceful shutdown
async function closeRedisConnections() {
    try {
        await Promise.all([
            redisClient.quit(),
            pubClient.quit(),
            subClient.quit(),
        ]);
        console.log('✅ Redis connections closed');
    } catch (err) {
        console.error('❌ Error closing Redis connections:', err.message);
    }
}

module.exports = {
    redisClient,
    pubClient,
    subClient,
    testRedisConnection,
    closeRedisConnections,
    redisOptions,
};
