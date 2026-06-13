const SteamApiService = require('./steam-api.service');
const OptimizedSteamApiService = require('./steam-api-optimized.service');

class SteamApiManager {
    constructor() {
        this.enableOptimized = process.env.ENABLE_OPTIMIZED_STEAM_API === 'true';
        this.fallbackCount = 0;
        this.maxFallbacks = 3;

        console.log(`[SteamApiManager] Initialized with optimized API: ${this.enableOptimized}`);
    }

    async getInventory(steamId, appId = 730, contextId = 2) {
        if (this.enableOptimized) {
            try {
                return await OptimizedSteamApiService.getInventory(steamId, appId, contextId);
            } catch (error) {
                console.warn('[SteamApiManager] Optimized API failed, falling back to standard:', error.message);
                this.fallbackCount++;
                if (this.fallbackCount >= this.maxFallbacks) {
                    console.error('[SteamApiManager] Too many fallbacks, disabling optimized API');
                    this.enableOptimized = false;
                }
                return await SteamApiService.getInventory(steamId, appId, contextId);
            }
        } else {
            return await SteamApiService.getInventory(steamId, appId, contextId);
        }
    }

    async getPlayerInfo(steamId) {
        if (this.enableOptimized) {
            try {
                return await OptimizedSteamApiService.getPlayerInfo(steamId);
            } catch (error) {
                console.warn('[SteamApiManager] Optimized API failed for player info:', error.message);
                return await SteamApiService.getPlayerInfo(steamId);
            }
        } else {
            return await SteamApiService.getPlayerInfo(steamId);
        }
    }

    async getMarketPrices(appId = 730) {
        if (this.enableOptimized) {
            try {
                return await OptimizedSteamApiService.getMarketPrices(appId);
            } catch (error) {
                console.warn('[SteamApiManager] Optimized API failed for market prices:', error.message);
                return await SteamApiService.getMarketPrices(appId);
            }
        } else {
            return await SteamApiService.getMarketPrices(appId);
        }
    }

    async getCacheStats() {
        if (this.enableOptimized) {
            return await OptimizedSteamApiService.getCacheStats();
        } else {
            return {
                cacheHits: 0,
                cacheMisses: 0,
                memoryCacheSize: 0,
                cacheHitRate: 0,
                redisMemory: 'N/A',
                apiCalls: 0
            };
        }
    }

    async invalidateUserCache(steamId) {
        if (this.enableOptimized) {
            return await OptimizedSteamApiService.invalidateUserCache(steamId);
        } else {
            return 0;
        }
    }

    // Метод для переключения режимов
    setOptimizedMode(enabled) {
        this.enableOptimized = enabled;
        console.log(`[SteamApiManager] Switched to ${enabled ? 'optimized' : 'standard'} mode`);
    }

    getMode() {
        return {
            optimized: this.enableOptimized,
            fallbackCount: this.fallbackCount,
            maxFallbacks: this.maxFallbacks
        };
    }
}

module.exports = new SteamApiManager();