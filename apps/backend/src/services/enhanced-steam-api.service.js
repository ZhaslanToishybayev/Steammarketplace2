const axios = require('axios');
const EnhancedSteamCache = require('./enhanced-cache.service');
const rateLimiter = require('../utils/steam-rate-limiter');
const { recordInventoryFetch } = require('./metrics.service');

class EnhancedSteamApiService {
    constructor() {
        this.cache = new EnhancedSteamCache();
        this.CACHE_KEYS = {
            INVENTORY: 'inventory',
            PLAYER_INFO: 'player_info',
            MARKET_PRICES: 'market_prices'
        };
    }

    async getInventory(steamId, appId = 730, contextId = 2) {
        const cacheKey = `${this.CACHE_KEYS.INVENTORY}:${steamId}_${appId}_${contextId}`;
        const cached = await this.cache.get(cacheKey);

        if (cached) {
            console.log(`[EnhancedSteamApi] Cache hit for ${steamId}`);
            return cached;
        }

        // Use Redis-based rate limiter
        return await rateLimiter.execute(async () => {
            console.log(`[EnhancedSteamApi] Requesting inventory for ${steamId} [via: direct IP]...`);
            const url = `https://steamcommunity.com/inventory/${steamId}/${appId}/${contextId}`;

            try {
                const config = {
                    params: { l: 'english', count: 75 },
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept-Encoding': 'gzip, deflate, br'
                    },
                    timeout: 10000
                };

                const response = await axios.get(url, config);
                const data = response.data;

                // Check for private inventory
                const isHidden = (data && data.rwgrsn === -2) ||
                    (data && data.success && data.total_inventory_count > 0 && (!data.assets || data.assets.length === 0));

                if (isHidden) {
                    console.warn(`[EnhancedSteamApi] Inventory hidden for ${steamId}`);
                    recordInventoryFetch('direct', 'success');
                    return [];
                }

                if (data && data.success && data.total_inventory_count > 0) {
                    const processedItems = this.processInventoryResponse(data);
                    await this.cache.set(cacheKey, processedItems, 'inventory');
                    console.log(`[EnhancedSteamApi] Success! Found ${processedItems.length} items.`);
                    recordInventoryFetch('direct', 'success');
                    return processedItems;
                }

                recordInventoryFetch('direct', 'success');
                return [];

            } catch (error) {
                if (error.response && error.response.status === 429) {
                    console.error(`[EnhancedSteamApi] Rate limited by Steam (429)`);
                    recordInventoryFetch('direct', 'rate_limited');
                } else {
                    console.error(`[EnhancedSteamApi] Request failed: ${error.message}`);
                    recordInventoryFetch('direct', 'error');
                }
                throw error;
            }
        });
    }

    async getPlayerInfo(steamId) {
        const cacheKey = `${this.CACHE_KEYS.PLAYER_INFO}:${steamId}`;
        const cached = await this.cache.get(cacheKey);

        if (cached) {
            return cached;
        }

        // Use Redis-based rate limiter
        return await rateLimiter.execute(async () => {
            const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/`;
            const params = {
                key: process.env.STEAM_API_KEY,
                steamids: steamId
            };

            try {
                const response = await axios.get(url, { params, timeout: 10000 });
                const data = response.data;

                if (data && data.response && data.response.players && data.response.players.length > 0) {
                    const player = data.response.players[0];
                    await this.cache.set(cacheKey, player, 'player_info');
                    return player;
                }

                return null;

            } catch (error) {
                console.error(`[EnhancedSteamApi] Player info request failed: ${error.message}`);
                throw error;
            }
        });
    }

    async getMarketPrices(appId = 730) {
        const cacheKey = `${this.CACHE_KEYS.MARKET_PRICES}:${appId}`;
        const cached = await this.cache.get(cacheKey);

        if (cached) {
            return cached;
        }

        // Use Redis-based rate limiter
        return await rateLimiter.execute(async () => {
            const url = `https://steamcommunity.com/market/priceoverview/`;

            // This is a simplified example - real implementation would need to fetch multiple items
            try {
                // For now, return empty object
                // Real implementation would fetch popular CS2 items
                const prices = {};
                await this.cache.set(cacheKey, prices, 'market_prices');
                return prices;

            } catch (error) {
                console.error(`[EnhancedSteamApi] Market prices request failed: ${error.message}`);
                throw error;
            }
        });
    }

    processInventoryResponse(data) {
        // Simplified processing - real implementation would be more detailed
        const items = [];

        if (data.assets) {
            data.assets.forEach(asset => {
                const description = data.descriptions.find(d => d.classid === asset.classid);
                if (description) {
                    items.push({
                        assetid: asset.assetid,
                        classid: asset.classid,
                        instanceid: asset.instanceid,
                        amount: asset.amount,
                        name: description.name,
                        type: description.type,
                        market_hash_name: description.market_hash_name,
                        tradable: description.tradable,
                        marketable: description.marketable,
                        icon_url: description.icon_url
                    });
                }
            });
        }

        return items;
    }

    async getCacheStats() {
        return await this.cache.getStats();
    }

    async invalidateUserCache(steamId) {
        const patterns = [
            `${this.CACHE_KEYS.INVENTORY}:${steamId}_*`,
            `${this.CACHE_KEYS.PLAYER_INFO}:${steamId}`
        ];

        let totalInvalidated = 0;
        for (const pattern of patterns) {
            totalInvalidated += await this.cache.invalidate(pattern);
        }

        return totalInvalidated;
    }
}

module.exports = EnhancedSteamApiService;