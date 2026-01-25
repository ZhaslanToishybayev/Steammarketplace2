const axios = require('axios');
const rateLimiter = require('../utils/steam-rate-limiter');

class SteamApiService {
    constructor() {
        // Cache: steamId -> { timestamp, data }
        this.cache = new Map();
        this.CACHE_TTL = 300000; // 5 minutes in ms
    }

    async getInventory(steamId, appId = 730, contextId = 2) {
        // 1. Validation
        if (!/^\d{17}$/.test(steamId)) {
            throw new Error('Invalid Steam ID');
        }

        // 2. Check Cache
        const cacheKey = `${steamId}_${appId}`;
        const cached = this.cache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
            console.log(`[SteamApi] Cache hit for ${steamId}`);
            return cached.data;
        }

        // 3. Request to Steam using Global Rate Limiter
        console.log(`[SteamApi] Validation passed. Requesting inventory for ${steamId}...`);
        const url = `https://steamcommunity.com/inventory/${steamId}/${appId}/${contextId}`;

        try {
            const config = {
                params: { l: 'english', count: 75 },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept-Encoding': 'gzip, deflate, br'
                },
                timeout: 5000 // reasonable timeout
            };

            // Using Global Rate Limiter for request
            const response = await rateLimiter.execute(async () => {
                return axios.get(url, config);
            });
            
            const data = response.data;

            // Check for explicit private status OR the "Ghost Item" state (Count > 0 but Assets = 0)
            const isHidden = (data && data.rwgrsn === -2) ||
                (data && data.success && data.total_inventory_count > 0 && (!data.assets || data.assets.length === 0));

            if (isHidden) {
                console.warn(`[SteamApi] Inventory appears hidden (rwgrsn: ${data.rwgrsn}, assets: ${data.assets ? data.assets.length : 0}). Attempting HTML Fallback...`);

                // FALLBACK: Try to scrape HTML
                try {
                    const htmlItems = await this.fetchInventoryFromHTML(steamId, appId, contextId);
                    if (htmlItems.length > 0) {
                        console.log(`[SteamApi] HTML Fallback Successful! Found ${htmlItems.length} items.`);

                        // Save valid scraped data to cache
                        this.cache.set(cacheKey, {
                            timestamp: Date.now(),
                            data: htmlItems
                        });

                        return htmlItems;
                    }
                } catch (fallbackErr) {
                    console.error(`[SteamApi] HTML Fallback failed: ${fallbackErr.message}`);
                }

                return [];
            } else if (data && data.success && data.total_inventory_count > 0) {
                // 5. Process Data
                const processedItems = this.processInventoryResponse(data);

                // Save to cache
                this.cache.set(cacheKey, {
                    timestamp: Date.now(),
                    data: processedItems
                });

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

    async fetchInventoryFromHTML(steamId, appId, contextId) {
        console.log(`[SteamApi] Scraping HTML for ${steamId}...`);
        const url = `https://steamcommunity.com/profiles/${steamId}/inventory/`;

        try {
            // Rate Limit HTML scrape too
            const response = await rateLimiter.execute(async () => {
                return axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                    }
                });
            });

            const html = response.data;
            if (typeof html !== 'string') return [];

            // Extract g_rgAppContextData
            const match = html.match(/var g_rgAppContextData = ({.*?});/s);
            if (!match) {
                console.warn('[SteamApi] g_rgAppContextData not found in HTML');
                return [];
            }

            const data = JSON.parse(match[1]);
            const appData = data[appId];

            if (!appData || !appData.rgContexts || !appData.rgContexts[contextId]) {
                console.warn('[SteamApi] CS2 Context data not found in HTML');
                return [];
            }

            const inventoryMatch = html.match(/var g_rgInventory = ({.*?});/s);
            const descriptionMatch = html.match(/var g_rgDescriptions = ({.*?});/s);

            if (!inventoryMatch || !descriptionMatch) {
                console.warn('[SteamApi] Inventory/Description variables not found in HTML');
                return [];
            }

            const inventoryData = JSON.parse(inventoryMatch[1]);
            const descriptionData = JSON.parse(descriptionMatch[1]);

            // Convert object to array for compatible processing
            const assets = Object.values(inventoryData[appId][contextId]);
            const descriptions = Object.values(descriptionData[appId][contextId]);

            // Map descriptions
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
                    assetid: asset.id || asset.assetid, // Web often uses 'id'
                    classid: asset.classid,
                    instanceid: asset.instanceid,
                    amount: asset.amount,
                    name: desc.market_name || desc.name,
                    market_hash_name: desc.market_hash_name,
                    icon_url: desc.icon_url,
                    tradable: desc.tradable ? true : false, // Web use 1/0
                    marketable: desc.marketable ? true : false,
                    type: desc.type,
                    descriptions: desc.descriptions,
                    tags: desc.tags
                };
            }).filter(item => item !== null);

        } catch (err) {
            console.error(`[SteamApi] HTML Scrape Error: ${err.message}`);
            return [];
        }
    }

    processInventoryResponse(data) {
        // Raw items
        const assets = data.assets || [];
        const descriptions = data.descriptions || [];

        console.log(`[SteamApi Debug] Assets: ${assets.length}, Descriptions: ${descriptions.length}`);

        // Map descriptions by classid_instanceid
        const descMap = new Map();
        descriptions.forEach(desc => {
            const key = `${desc.classid}_${desc.instanceid}`;
            descMap.set(key, desc);
        });

        // Combine
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
                // Additional fields used in old logic likely
                type: desc.type,
                descriptions: desc.descriptions,
                tags: desc.tags
            };
        }).filter(item => item !== null);
    }
}

module.exports = new SteamApiService();
