const axios = require('axios');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');
const { botManager } = require('./bot-manager.service');
const { proxyService } = require('./proxy.service');
const rateLimiter = require('../utils/steam-rate-limiter');
const metrics = require('./metrics.service');

class InventoryManager {
    constructor() {
        this.cache = new NodeCache({ stdTTL: 900, checkperiod: 120 }); // 15 min cache (was 5 min)
        this.cacheHtml = new NodeCache({ stdTTL: 900 }); // 15 min for HTML fallback (was 10 min)
    }

    /**
     * Main entry point to get inventory.
     * Tries strategies in order of reliability/speed.
     */
    async getInventory(steamId, appId = 730, contextId = 2) {
        let items = [];
        let error = null;

        // 0. Check Cache
        const cacheKey = `${steamId}_${appId}_${contextId}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
            console.log(`[InventoryManager] Cache hit for ${steamId}`);
            return cached;
        }

        console.log(`[InventoryManager] Fetching for ${steamId}...`);

        // Strategy 1: Bot (Best for Friends Only, but requires bot to be online)
        try {
            const botItems = await this.fetchViaBot(steamId, appId, contextId);
            if (botItems && botItems.length > 0) {
                this.saveCache(cacheKey, botItems);
                return botItems;
            }
        } catch (e) {
            console.warn(`[InventoryManager] Bot Strategy skipped: ${e.message}`);
        }

        // Strategy 2: Direct API (Fastest)
        try {
            const apiResult = await this.fetchViaDirectApi(steamId, appId, contextId);
            if (apiResult.items && apiResult.items.length > 0) {
                this.saveCache(cacheKey, apiResult.items);
                return apiResult.items;
            }
            // Check for Ghost Inventory Logic
            if (apiResult.isGhost) {
                console.warn('[InventoryManager] Ghost Inventory detected (API). Trying HTML Fallback immediately.');
                // Fallthrough to HTML
            } else if (apiResult.isPrivate) {
                console.warn('[InventoryManager] Private Inventory detected (API). Trying HTML Fallback.');
                // Fallthrough to HTML
            }
        } catch (e) {
            console.warn(`[InventoryManager] API Strategy failed: ${e.message}`);
            error = e;
        }

        // Strategy 3: HTML Scraping (The "Super Legacy" Fallback)
        try {
            const htmlItems = await this.fetchViaHtml(steamId, appId, contextId);
            if (htmlItems && htmlItems.length > 0) {
                this.saveCache(cacheKey, htmlItems);
                return htmlItems;
            }
            // If HTML returns empty but no error, it really is empty or private
        } catch (e) {
            console.warn(`[InventoryManager] HTML Strategy failed: ${e.message}`);
            if (!error) error = e;
        }

        // Strategy 4: Proxy (Optional, if Direct API failed with 429)
        // (Skipping for now to prioritize valid HTML fallback, but can be added)

        // If we get here, all strategies failed or returned empty
        console.log('[InventoryManager] All strategies exhausted. Returning empty.');

        // If we detected Ghost Status during API check, let's signal that
        // This allows the frontend to show "Steam Syncing" instead of "Empty"
        if (this.lastGhostStatus) {
            return { error: 'GHOST_INVENTORY', items: [] };
        }

        return [];
    }

    saveCache(key, data) {
        this.cache.set(key, data);
    }

    // =========================================================================
    // Strategies
    // =========================================================================

    /**
     * Strategy 1: Ask a Steam Bot to fetch
     * No rate limit needed - uses authenticated bot connection
     */
    async fetchViaBot(steamId, appId, contextId) {
        // Reset ghost status tracker
        this.lastGhostStatus = false;

        const bot = botManager.getAvailableBot();
        if (!bot) throw new Error('No bots available');

        return new Promise((resolve, reject) => {
            bot.manager.getUserInventoryContents(steamId, appId, contextId, true, (err, inventory) => {
                if (err) {
                    metrics.recordInventoryFetch('bot', 'error');
                    return reject(err);
                }

                // Convert steam-tradeoffer-manager items to our format
                const items = inventory.map(item => ({
                    assetid: item.assetid,
                    classid: item.classid,
                    instanceid: item.instanceid,
                    market_hash_name: item.market_hash_name,
                    name: item.name,
                    icon_url: item.icon_url,
                    tradable: item.tradable,
                    marketable: item.marketable,
                    amount: item.amount
                }));

                console.log(`[InventoryManager] Bot found ${items.length} items [via: bot]`);
                metrics.recordInventoryFetch('bot', 'success');
                resolve(items);
            });
        });
    }

    /**
     * Strategy 2: Direct Axios Call to Public API
     * Returns { items: [], isPrivate: boolean, isGhost: boolean }
     * Uses rate limiter and metrics tracking
     */
    async fetchViaDirectApi(steamId, appId, contextId) {
        const url = `https://steamcommunity.com/inventory/${steamId}/${appId}/${contextId}`;
        const config = {
            params: { l: 'english', count: 75 }, // Keep count low
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://steamcommunity.com'
            },
            timeout: 10000 // Increased timeout
        };

        // Use rate limiter to prevent 429 errors
        return await rateLimiter.execute(async () => {
            try {
                const response = await axios.get(url, config);
                const data = response.data;

                // Record successful fetch
                metrics.recordInventoryFetch('direct', 'success');
                console.log(`[InventoryManager] API fetch success [via: direct IP]`);

                if (data && data.success && data.total_inventory_count > 0) {
                    // Check for Ghost Inventory (Count > 0, but no assets)
                    if (!data.assets || data.assets.length === 0) {
                        this.lastGhostStatus = true;
                        return { items: [], isPrivate: false, isGhost: true };
                    }

                    // Parse valid items
                    const processed = this.processApiData(data);
                    return { items: processed, isPrivate: false, isGhost: false };
                }

                if (data && data.rwgrsn === -2) {
                    return { items: [], isPrivate: true, isGhost: false };
                }

                return { items: [], isPrivate: false, isGhost: false };
            } catch (err) {
                // Handle rate limiting
                if (err.response?.status === 429) {
                    console.warn('[InventoryManager] Rate limited by Steam (429) [via: direct IP]');
                    metrics.recordInventoryFetch('direct', 'rate_limited');
                    metrics.recordRateLimitHit();
                    throw err; // Re-throw to trigger retry/circuit breaker
                }
                
                // Log other errors
                metrics.recordInventoryFetch('direct', 'error');
                console.error(`[InventoryManager] API fetch error [via: direct IP]: ${err.message}`);
                throw err;
            }
        });
    }

    /**
     * Strategy 3: HTML Scraping via Cheerio
     * Uses rate limiter and metrics tracking
     */
    async fetchViaHtml(steamId, appId, contextId) {
        console.log(`[InventoryManager] Scraping HTML for ${steamId}...`);
        const url = `https://steamcommunity.com/profiles/${steamId}/inventory/`;

        // Use rate limiter to prevent 429 errors
        return await rateLimiter.execute(async () => {
            try {
                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Referer': 'https://steamcommunity.com'
                    },
                    timeout: 10000
                });

                const html = response.data;
                if (typeof html !== 'string') {
                    metrics.recordInventoryFetch('direct', 'error');
                    return [];
                }

                // Check for "Private" text visible to human
                if (html.includes('This inventory is private')) {
                    console.warn('[InventoryManager] HTML confirms: Inventory is Private [via: direct IP]');
                    metrics.recordInventoryFetch('direct', 'success');
                    return [];
                }

                // Try extract g_rgInventory
                const inventoryMatch = html.match(/var g_rgInventory = ({.*?});/s);
                const descriptionMatch = html.match(/var g_rgDescriptions = ({.*?});/s);

                if (!inventoryMatch) {
                    console.warn('[InventoryManager] HTML Scrape: g_rgInventory not found (Ghost/Private) [via: direct IP]');
                    metrics.recordInventoryFetch('direct', 'success');
                    return [];
                }

                const inventoryData = JSON.parse(inventoryMatch[1]);
                const descriptionData = descriptionMatch ? JSON.parse(descriptionMatch[1]) : {};

                // Data structure in HTML: inventoryData[appId][contextId] = { assetid: { ... }, ... }
                const appInv = inventoryData[appId] && inventoryData[appId][contextId];
                if (!appInv) {
                    metrics.recordInventoryFetch('direct', 'success');
                    return [];
                }

                const assets = Object.values(appInv);
                const appDesc = descriptionData[appId] && descriptionData[appId][contextId];

                // Map descriptions
                const descMap = new Map();
                if (appDesc) {
                    Object.values(appDesc).forEach(desc => {
                        const key = `${desc.classid}_${desc.instanceid}`;
                        descMap.set(key, desc);
                    });
                }

                console.log(`[InventoryManager] HTML scrape success [via: direct IP]`);
                metrics.recordInventoryFetch('direct', 'success');

                return assets.map(asset => {
                    const key = `${asset.classid}_${asset.instanceid}`;
                    const desc = descMap.get(key);

                    if (!desc) return null;

                    return {
                        assetid: asset.id || asset.assetid,
                        classid: asset.classid,
                        instanceid: asset.instanceid,
                        amount: asset.amount,
                        name: desc.market_name || desc.name,
                        market_hash_name: desc.market_hash_name,
                        icon_url: desc.icon_url,
                        tradable: desc.tradable ? true : false,
                        marketable: desc.marketable ? true : false,
                        type: desc.type,
                        descriptions: desc.descriptions,
                        tags: desc.tags
                    };
                }).filter(i => i !== null);
            } catch (err) {
                // Handle rate limiting
                if (err.response?.status === 429) {
                    console.warn('[InventoryManager] Rate limited by Steam (429) [via: direct IP]');
                    metrics.recordInventoryFetch('direct', 'rate_limited');
                    metrics.recordRateLimitHit();
                    throw err;
                }
                
                metrics.recordInventoryFetch('direct', 'error');
                console.error(`[InventoryManager] HTML fetch error [via: direct IP]: ${err.message}`);
                throw err;
            }
        });
    }

    processApiData(data) {
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
                // ... other fields
            };
        }).filter(item => item !== null);
    }
}

module.exports = new InventoryManager();
