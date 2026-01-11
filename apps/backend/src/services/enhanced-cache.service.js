const Redis = require('ioredis');

class EnhancedSteamCache {
    constructor() {
        this.redis = new Redis({
            host: process.env.REDIS_HOST || 'redis',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD,
        });

        this.CACHE_TTL = {
            inventory: 300, // 5 minutes
            playerInfo: 600, // 10 minutes
            marketPrices: 1800 // 30 minutes
        };
    }

    async get(key) {
        try {
            const data = await this.redis.get(`steam_cache:${key}`);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`Cache GET error for ${key}:`, error);
            return null;
        }
    }

    async set(key, data, ttl = 'inventory') {
        try {
            const ttlSeconds = this.CACHE_TTL[ttl] || 300;
            await this.redis.setex(`steam_cache:${key}`, ttlSeconds, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`Cache SET error for ${key}:`, error);
            return false;
        }
    }

    async invalidate(pattern) {
        try {
            const keys = await this.redis.keys(`steam_cache:${pattern}`);
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
            return keys.length;
        } catch (error) {
            console.error(`Cache INVALIDATE error for ${pattern}:`, error);
            return 0;
        }
    }

    async getStats() {
        try {
            const info = await this.redis.info('memory');
            const keysInfo = await this.redis.info('keyspace');
            return {
                memory: info,
                keyspace: keysInfo,
                connected: true
            };
        } catch (error) {
            return { connected: false, error: error.message };
        }
    }
}

module.exports = EnhancedSteamCache;