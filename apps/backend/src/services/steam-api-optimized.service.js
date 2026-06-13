const axios = require('axios');
const Redis = require('ioredis');

class OptimizedSteamApiService {
    constructor() {
        // Redis подключение для кэширования
        this.redis = new Redis({
            host: process.env.REDIS_HOST || 'redis',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD || undefined,
            db: 1, // Используем отдельную базу для Steam кэша
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            maxRetriesPerRequest: 3
        });

        // In-memory cache для частых запросов
        this.memoryCache = new Map();
        this.CACHE_TTL = {
            inventory: 300, // 5 минут
            playerInfo: 600, // 10 минут
            marketPrices: 1800 // 30 минут
        };

        // Rate limiting
        this.requests = [];
        this.RATE_LIMIT = 30; // requests per minute
        this.RATE_WINDOW = 60000; // 1 minute

        // Метрики
        this.metrics = {
            cacheHits: 0,
            cacheMisses: 0,
            redisErrors: 0,
            apiCalls: 0
        };
    }

    generateCacheKey(type, steamId, appId = 730, contextId = 2) {
        switch (type) {
            case 'inventory':
                return `steam:inventory:${steamId}:${appId}:${contextId}`;
            case 'playerInfo':
                return `steam:player:${steamId}`;
            case 'marketPrices':
                return `steam:market:${appId}`;
            default:
                return `steam:${type}:${steamId}`;
        }
    }

    async waitForRateLimit() {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < this.RATE_WINDOW);

        if (this.requests.length >= this.RATE_LIMIT) {
            const oldest = this.requests[0];
            const waitTime = this.RATE_WINDOW - (now - oldest) + 1000;
            console.log(`[SteamApi] Rate limit hit. Waiting ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.requests.push(Date.now());
    }

    async getFromCache(type, steamId, appId, contextId) {
        const cacheKey = this.generateCacheKey(type, steamId, appId, contextId);

        // Сначала проверяем in-memory cache
        const memoryResult = this.memoryCache.get(cacheKey);
        if (memoryResult && (Date.now() - memoryResult.timestamp < 60000)) { // 1 минута в памяти
            this.metrics.cacheHits++;
            console.log(`[SteamApi] Memory cache hit for ${steamId}`);
            return memoryResult.data;
        }

        try {
            // Проверяем Redis cache
            const redisResult = await this.redis.get(cacheKey);
            if (redisResult) {
                this.metrics.cacheHits++;
                const data = JSON.parse(redisResult);
                console.log(`[SteamApi] Redis cache hit for ${steamId}`);

                // Сохраняем в in-memory cache для быстрого доступа
                this.memoryCache.set(cacheKey, {
                    timestamp: Date.now(),
                    data
                });

                return data;
            }
        } catch (error) {
            this.metrics.redisErrors++;
            console.warn(`[SteamApi] Redis cache error: ${error.message}`);
        }

        this.metrics.cacheMisses++;
        return null;
    }

    async setToCache(type, steamId, data, appId, contextId) {
        const cacheKey = this.generateCacheKey(type, steamId, appId, contextId);
        const ttl = this.CACHE_TTL[type] || 300; // seconds

        try {
            // Сохраняем в Redis
            await this.redis.setex(cacheKey, ttl, JSON.stringify(data));

            // Сохраняем в in-memory cache
            this.memoryCache.set(cacheKey, {
                timestamp: Date.now(),
                data
            });

            console.log(`[SteamApi] Data cached for ${steamId} (TTL: ${ttl}s)`);
        } catch (error) {
            this.metrics.redisErrors++;
            console.warn(`[SteamApi] Redis set error: ${error.message}`);
        }
    }

    async getInventory(steamId, appId = 730, contextId = 2) {
        // 1. Валидация
        if (!/^\d{17}$/.test(steamId)) {
            throw new Error('Invalid Steam ID');
        }

        // 2. Проверка кэша
        const cached = await this.getFromCache('inventory', steamId, appId, contextId);
        if (cached) {
            return cached;
        }

        // 3. Rate limiting
        await this.waitForRateLimit();
        this.metrics.apiCalls++;

        // 4. Запрос к Steam API
        console.log(`[SteamApi] Requesting inventory for ${steamId}...`);
        const url = `https://steamcommunity.com/inventory/${steamId}/${appId}/${contextId}`;

        try {
            const config = {
                params: { l: 'english', count: 75 },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept-Encoding': 'gzip, deflate, br'
                },
                timeout: 5000
            };

            const response = await axios.get(url, config);
            const data = response.data;

            // Проверка на приватный инвентарь
            const isHidden = (data && data.rwgrsn === -2) ||
                (data && data.success && data.total_inventory_count > 0 && (!data.assets || data.assets.length === 0));

            if (isHidden) {
                console.warn(`[SteamApi] Inventory hidden for ${steamId}`);
                return [];
            }

            if (data && data.success && data.total_inventory_count > 0) {
                const processedItems = this.processInventoryResponse(data);

                // Сохраняем в кэш
                await this.setToCache('inventory', steamId, processedItems, appId, contextId);

                console.log(`[SteamApi] Success! Found ${processedItems.length} items.`);
                return processedItems;
            }

            return [];

        } catch (error) {
            console.error(`[SteamApi] Request failed: ${error.message}`);
            if (error.response?.status === 429) {
                console.warn('[SteamApi] Rate Limited (429)');
            }
            throw error;
        }
    }

    async getPlayerInfo(steamId) {
        // Проверка кэша
        const cached = await this.getFromCache('playerInfo', steamId);
        if (cached) {
            return cached;
        }

        await this.waitForRateLimit();
        this.metrics.apiCalls++;

        const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/`;
        const params = {
            key: process.env.STEAM_API_KEY,
            steamids: steamId
        };

        try {
            const response = await axios.get(url, { params, timeout: 5000 });
            const data = response.data;

            if (data && data.response && data.response.players && data.response.players.length > 0) {
                const player = data.response.players[0];

                await this.setToCache('playerInfo', steamId, player);

                return player;
            }

            return null;

        } catch (error) {
            console.error(`[SteamApi] Player info request failed: ${error.message}`);
            throw error;
        }
    }

    async getMarketPrices(appId = 730) {
        const cached = await this.getFromCache('marketPrices', null, appId);
        if (cached) {
            return cached;
        }

        await this.waitForRateLimit();
        this.metrics.apiCalls++;

        // Это упрощенный пример - реальная реализация потребует fetch нескольких предметов
        try {
            const prices = {}; // Здесь должна быть логика получения цен
            await this.setToCache('marketPrices', null, prices, appId);

            return prices;

        } catch (error) {
            console.error(`[SteamApi] Market prices request failed: ${error.message}`);
            throw error;
        }
    }

    processInventoryResponse(data) {
        const assets = data.assets || [];
        const descriptions = data.descriptions || [];

        const descMap = new Map();
        descriptions.forEach(desc => {
            const key = `${desc.classid}_${desc.instanceid}`;
            descMap.set(key, desc);
        });

        return assets.map(asset => {
            const key = `${asset.classid}_${asset.instanceid}`;
            const desc = descMap.get(key);

            if (!desc) return null;

            return {
                assetid: asset.assetid,
                classid: asset.classid,
                instanceid: asset.instanceid,
                amount: asset.amount,
                name: desc.market_name || desc.name,
                market_hash_name: desc.market_hash_name,
                icon_url: desc.icon_url,
                tradable: desc.tradable,
                marketable: desc.marketable,
                type: desc.type,
                descriptions: desc.descriptions,
                tags: desc.tags
            };
        }).filter(item => item !== null);
    }

    async getCacheStats() {
        const stats = {
            ...this.metrics,
            memoryCacheSize: this.memoryCache.size,
            cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100
        };

        try {
            const redisInfo = await this.redis.info('memory');
            const memoryMatch = redisInfo.match(/used_memory_human:(\d+\.\d+\w)/);
            stats.redisMemory = memoryMatch ? memoryMatch[1] : 'unknown';
        } catch (error) {
            stats.redisMemory = 'error';
        }

        return stats;
    }

    async invalidateUserCache(steamId) {
        const patterns = [
            `steam:inventory:${steamId}:*`,
            `steam:player:${steamId}`
        ];

        let totalInvalidated = 0;
        for (const pattern of patterns) {
            try {
                const keys = await this.redis.keys(pattern);
                if (keys.length > 0) {
                    await this.redis.del(...keys);
                    totalInvalidated += keys.length;
                }
            } catch (error) {
                console.warn(`[SteamApi] Cache invalidation error for pattern ${pattern}: ${error.message}`);
            }
        }

        // Очищаем in-memory cache
        for (const [key] of this.memoryCache) {
            if (key.includes(`:${steamId}:`) || key === `steam:player:${steamId}`) {
                this.memoryCache.delete(key);
            }
        }

        return totalInvalidated;
    }
}

module.exports = new OptimizedSteamApiService();