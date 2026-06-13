/**
 * Bot Pool Manager
 * Manages multiple trading bots with load balancing
 */

const Redis = require('ioredis');

class BotPoolManager {
    constructor() {
        this.bots = new Map(); // botId -> BotInstance
        this.redis = null;
        this.healthCheckInterval = null;

        this.init();
    }

    init() {
        try {
            this.redis = new Redis({
                host: process.env.REDIS_HOST || 'redis',
                port: process.env.REDIS_PORT || 6379,
                family: 4,
                password: process.env.REDIS_PASSWORD,
            });
        } catch (e) {
            console.warn('Redis not available for bot pool');
        }

        // Start health checks
        this.startHealthChecks();
    }

    // Register a bot in the pool
    registerBot(botId, botInstance, metadata = {}) {
        this.bots.set(botId, {
            instance: botInstance,
            metadata: {
                accountName: metadata.accountName || botId,
                steamId: metadata.steamId,
                registeredAt: Date.now(),
                ...metadata
            },
            stats: {
                activeTrades: 0,
                completedTrades: 0,
                failedTrades: 0,
                inventoryCount: 0,
                lastActive: Date.now(),
                isOnline: false,
                isHealthy: false
            }
        });

        console.log(`Bot ${botId} registered in pool`);
        this.updateRedisState(botId);
    }

    // Remove bot from pool
    unregisterBot(botId) {
        this.bots.delete(botId);
        if (this.redis) {
            this.redis.del(`bot:${botId}:status`);
        }
        console.log(`Bot ${botId} unregistered from pool`);
    }

    // Update bot status in Redis
    async updateRedisState(botId) {
        const bot = this.bots.get(botId);
        if (!bot || !this.redis) return;

        await this.redis.hset(`bot:${botId}:status`, {
            isOnline: bot.stats.isOnline ? '1' : '0',
            activeTrades: bot.stats.activeTrades.toString(),
            completedTrades: bot.stats.completedTrades.toString(),
            inventoryCount: bot.stats.inventoryCount.toString(),
            lastActive: bot.stats.lastActive.toString(),
            accountName: bot.metadata.accountName
        });

        // Update pool list
        await this.redis.sadd('bot:pool', botId);
    }

    // Get best available bot (load balancing)
    getBestBot(options = {}) {
        const { excludeBots = [], requireOnline = true, minInventory = 0 } = options;

        let bestBot = null;
        let lowestLoad = Infinity;

        for (const [botId, bot] of this.bots) {
            // Skip excluded bots
            if (excludeBots.includes(botId)) continue;

            // Skip offline bots if required
            if (requireOnline && !bot.stats.isOnline) continue;

            // Skip bots with insufficient inventory
            if (bot.stats.inventoryCount < minInventory) continue;

            // Skip unhealthy bots
            if (!bot.stats.isHealthy) continue;

            // Calculate load score (lower is better)
            const load = bot.stats.activeTrades;

            if (load < lowestLoad) {
                lowestLoad = load;
                bestBot = { id: botId, ...bot };
            }
        }

        return bestBot;
    }

    // Get bot by ID
    getBot(botId) {
        return this.bots.get(botId);
    }

    // Get all bots
    getAllBots() {
        const result = [];
        for (const [id, bot] of this.bots) {
            result.push({ id, ...bot.metadata, ...bot.stats });
        }
        return result;
    }

    // Get online bots count
    getOnlineCount() {
        let count = 0;
        for (const [, bot] of this.bots) {
            if (bot.stats.isOnline) count++;
        }
        return count;
    }

    // Update bot stats
    updateBotStats(botId, stats) {
        const bot = this.bots.get(botId);
        if (!bot) return;

        bot.stats = { ...bot.stats, ...stats, lastActive: Date.now() };
        this.updateRedisState(botId);
    }

    // Mark bot as online/offline
    setBotOnline(botId, isOnline) {
        this.updateBotStats(botId, { isOnline, isHealthy: isOnline });
    }

    // Increment active trades
    incrementActiveTrades(botId) {
        const bot = this.bots.get(botId);
        if (bot) {
            bot.stats.activeTrades++;
            this.updateRedisState(botId);
        }
    }

    // Decrement active trades
    decrementActiveTrades(botId) {
        const bot = this.bots.get(botId);
        if (bot && bot.stats.activeTrades > 0) {
            bot.stats.activeTrades--;
            this.updateRedisState(botId);
        }
    }

    // Record completed trade
    recordTradeComplete(botId, success) {
        const bot = this.bots.get(botId);
        if (bot) {
            if (success) {
                bot.stats.completedTrades++;
            } else {
                bot.stats.failedTrades++;
            }
            this.decrementActiveTrades(botId);
        }
    }

    // Health check for all bots
    async checkBotHealth(botId) {
        const bot = this.bots.get(botId);
        if (!bot) return false;

        try {
            // Check if bot instance is responsive
            const instance = bot.instance;
            if (instance && typeof instance.isLoggedIn === 'function') {
                const isLoggedIn = await instance.isLoggedIn();
                bot.stats.isHealthy = isLoggedIn;
                bot.stats.isOnline = isLoggedIn;
                return isLoggedIn;
            }
            return false;
        } catch (e) {
            console.error(`Health check failed for bot ${botId}:`, e.message);
            bot.stats.isHealthy = false;
            return false;
        }
    }

    // Start periodic health checks
    startHealthChecks(interval = 60000) {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }

        this.healthCheckInterval = setInterval(async () => {
            for (const [botId] of this.bots) {
                await this.checkBotHealth(botId);
            }
        }, interval);
    }

    // Stop health checks
    stopHealthChecks() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }

    // Get pool statistics
    getPoolStats() {
        const stats = {
            totalBots: this.bots.size,
            onlineBots: 0,
            healthyBots: 0,
            totalActiveTrades: 0,
            totalCompletedTrades: 0,
            totalFailedTrades: 0,
            totalInventory: 0
        };

        for (const [, bot] of this.bots) {
            if (bot.stats.isOnline) stats.onlineBots++;
            if (bot.stats.isHealthy) stats.healthyBots++;
            stats.totalActiveTrades += bot.stats.activeTrades;
            stats.totalCompletedTrades += bot.stats.completedTrades;
            stats.totalFailedTrades += bot.stats.failedTrades;
            stats.totalInventory += bot.stats.inventoryCount;
        }

        return stats;
    }
}

// Singleton instance
const botPool = new BotPoolManager();

module.exports = {
    BotPoolManager,
    botPool
};
