/**
 * Price Engine Service
 * Aggregates prices from multiple sources
 */

const axios = require('axios');
const NodeCache = require('node-cache');
const { proxyService } = require('../services/proxy.service');
const externalPricingService = require('./external-pricing.service');

class PriceEngine {
    constructor() {
        // Cache prices for 30 minutes
        this.cache = new NodeCache({ stdTTL: 1800, checkperiod: 300 });

        // Price source weights
        this.weights = {
            steam: 0.35,
            buff: 0.40,
            csgofloat: 0.25,
        };

        // Platform fee
        this.platformFeePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT || '5.0');

        // Instant sell discount (how much lower than market for instant sell)
        this.instantSellDiscount = 0.15; // 15% below market
    }

    /**
     * Get comprehensive price data for an item
     */
    async getPrice(marketHashName, appId = 730) {
        const cacheKey = `price:${appId}:${marketHashName}`;
        const cached = this.cache.get(cacheKey);

        if (cached) {
            return cached;
        }

        // 1. Try External API (Real Market Data)
        let marketPrice = null;
        try {
            const bestPriceData = await externalPricingService.getBestPrice(marketHashName);
            marketPrice = bestPriceData?.price || null;
        } catch (err) {
            console.warn(`[PriceEngine] External pricing failed for ${marketHashName}:`, err.message);
        }

        // 2. Fallback to Steam Market (Direct Proxy) if External fails
        if (!marketPrice) {
            console.log(`[PriceEngine] External failed, falling back to Steam for ${marketHashName}`);
            marketPrice = await this.getSteamPrice(marketHashName);
        }

        // Parallel fetch for specific sources if needed (currently using marketPrice as baseline)
        const steamPrice = marketPrice;
        const buffPrice = marketPrice ? marketPrice * 0.95 : null; // Estimate Buff as slightly lower than Steam Market

        const prices = {
            steam: steamPrice,
            buff: buffPrice,
        };

        // Calculate suggested price
        const suggested = this.calculateSuggestedPrice(prices);

        const result = {
            marketHashName,
            appId,
            suggested,
            sources: prices,
            instantSellPrice: this.calculateInstantSellPrice(suggested),
            instantBuyPrice: this.calculateInstantBuyPrice(suggested),
            platformFee: suggested * (this.platformFeePercent / 100),
            updatedAt: new Date().toISOString(),
        };

        this.cache.set(cacheKey, result);
        return result;
    }

    /**
     * Get Steam Community Market price (Direct Proxy Fallback)
     */
    async getSteamPrice(marketHashName) {
        try {
            // Use Proxy
            const proxyConfig = proxyService.getAxiosConfig();

            const response = await axios.get(
                'https://steamcommunity.com/market/priceoverview/',
                {
                    ...proxyConfig, // Merge proxy config
                    params: {
                        appid: 730,
                        currency: 1, // USD
                        market_hash_name: marketHashName,
                    },
                    timeout: 5000,
                }
            );

            if (response.data.success && response.data.lowest_price) {
                // Parse price string like "$1,234.56"
                const priceStr = response.data.lowest_price.replace(/[$,]/g, '');
                return parseFloat(priceStr);
            }

            return null;
        } catch (err) {
            console.warn(`[PriceEngine] Steam price fetch failed for ${marketHashName}:`, err.message);
            return null;
        }
    }

    /**
     * Get Buff163 price (Simulated based on Real Market)
     */
    async getBuffPrice(marketHashName) {
        const marketPrice = await this.getSteamPrice(marketHashName);
        return marketPrice ? marketPrice * 0.93 : null;
    }

    /**
     * Calculate suggested sell price
     */
    calculateSuggestedPrice(sources) {
        const validPrices = [];
        const weights = [];

        if (sources.steam) {
            validPrices.push(sources.steam);
            weights.push(this.weights.steam);
        }

        if (sources.buff) {
            validPrices.push(sources.buff);
            weights.push(this.weights.buff);
        }

        if (validPrices.length === 0) {
            return null;
        }

        // Normalize weights
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        const normalizedWeights = weights.map(w => w / totalWeight);

        // Weighted average
        const weighted = validPrices.reduce((sum, price, i) => sum + price * normalizedWeights[i], 0);

        return Math.round(weighted * 100) / 100;
    }

    /**
     * Calculate instant sell price (what we pay the user)
     */
    calculateInstantSellPrice(marketPrice) {
        if (!marketPrice) return null;
        // User gets market price minus instant sell discount
        return Math.round(marketPrice * (1 - this.instantSellDiscount) * 100) / 100;
    }

    /**
     * Calculate instant buy price (what user pays us)
     */
    calculateInstantBuyPrice(marketPrice) {
        if (!marketPrice) return null;
        // User pays market price plus platform fee
        return Math.round(marketPrice * (1 + this.platformFeePercent / 100) * 100) / 100;
    }

    /**
     * Bulk price fetch
     */
    async getPrices(items) {
        const results = await Promise.allSettled(
            items.map(item => this.getPrice(item.marketHashName, item.appId))
        );

        return results.map((r, i) => ({
            ...items[i],
            price: r.status === 'fulfilled' ? r.value : null,
            error: r.status === 'rejected' ? r.reason.message : null,
        }));
    }

    /**
     * Get price history (placeholder)
     */
    async getPriceHistory(marketHashName, days = 30) {
        // In production, fetch from Steam or third-party API
        // For now, return mock data
        const basePrice = 100;
        const history = [];

        for (let i = days; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);

            // Random price fluctuation ±10%
            const price = basePrice * (1 + (Math.random() - 0.5) * 0.2);

            history.push({
                date: date.toISOString().split('T')[0],
                price: Math.round(price * 100) / 100,
            });
        }

        return history;
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.flushAll();
    }

    /**
     * Get cache stats
     */
    getCacheStats() {
        return this.cache.getStats();
    }
    /**
     * Calculate Enhanced Price (Smart Valuation)
     * @param {number} basePrice
     * @param {Object} itemDetails - { stickers: [], float: number }
     */
    calculateSmartPrice(basePrice, itemDetails) {
        let finalPrice = basePrice;
        let breakdown = { base: basePrice, stickers: 0, float: 0 };

        // 1. Sticker Valuation
        // Heuristic: 5% of sticker value. 
        // Since we don't have a sticker price DB yet, we'll use a mock "Tier" system based on name keywords.
        // In prod, this would be `stickerPriceService.getPrice(name)`
        if (itemDetails.stickers && itemDetails.stickers.length > 0) {
            let stickerValue = 0;
            for (const sticker of itemDetails.stickers) {
                // Mock Valuation
                if (sticker.includes('Titan (Holo)')) stickerValue += 500; // Kato 14 insane
                else if (sticker.includes('Katowice 2014')) stickerValue += 50;
                else if (sticker.includes('Holo')) stickerValue += 2;
                else if (sticker.includes('Foil')) stickerValue += 1;
                else stickerValue += 0.1; // Basic sticker
            }
            breakdown.stickers = stickerValue;
            finalPrice += stickerValue;
        }

        // 2. Float Valuation
        // Multiplier based on wear
        if (itemDetails.float !== undefined && itemDetails.float !== null) {
            let floatMult = 1.0;
            const f = itemDetails.float;

            // Factory New Overpay tiers
            if (f < 0.01) floatMult = 1.10; // 10% overpay for 0.00x
            else if (f < 0.02) floatMult = 1.05;
            else if (f < 0.07 && f > 0.06) floatMult = 0.95; // Bad FN

            // MW low float
            else if (f >= 0.07 && f < 0.08) floatMult = 1.03;

            const floatBonus = (basePrice * floatMult) - basePrice;
            breakdown.float = floatBonus;
            finalPrice += floatBonus;
        }

        return { total: Number(finalPrice.toFixed(2)), breakdown };
    }
}

// Singleton instance
const priceEngine = new PriceEngine();

module.exports = {
    PriceEngine,
    priceEngine,
};
