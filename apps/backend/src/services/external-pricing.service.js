/**
 * External Pricing Service
 * Fetches prices from Buff163, CSFloat, Steam Market
 * with Redis caching for optimal performance
 */

const axios = require('axios');
const Redis = require('ioredis');

// Redis connection (reuse existing if available)
let redis;
try {
    redis = new Redis({
        host: process.env.REDIS_HOST || 'redis',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: 3,
    });
} catch (e) {
    console.warn('Redis not available, using in-memory cache');
    redis = null;
}

// In-memory cache fallback
const memoryCache = new Map();

// Cache TTLs (in seconds)
const CACHE_TTL = {
    BUFF: 300,      // 5 minutes
    CSFLOAT: 600,   // 10 minutes  
    STEAM: 300,     // 5 minutes
    STICKER: 1800,  // 30 minutes
};

// ==================== CACHE HELPERS ====================

async function getFromCache(key) {
    if (redis) {
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
    }
    const item = memoryCache.get(key);
    if (item && item.expiry > Date.now()) {
        return item.value;
    }
    return null;
}

async function setToCache(key, value, ttlSeconds) {
    if (redis) {
        await redis.setex(key, ttlSeconds, JSON.stringify(value));
    } else {
        memoryCache.set(key, {
            value,
            expiry: Date.now() + ttlSeconds * 1000
        });
    }
}

// ==================== BUFF163 API ====================

async function getBuffPrice(marketHashName) {
    const cacheKey = `buff:${marketHashName}`;
    const cached = await getFromCache(cacheKey);
    if (cached) return cached;

    try {
        const response = await axios.get(
            `https://api.pricempire.com/v1/items/prices`,
            {
                params: {
                    api_key: process.env.PRICEMPIRE_API_KEY || 'demo',
                    currency: 'USD',
                    source: 'buff163',
                    market_hash_name: marketHashName
                },
                timeout: 5000
            }
        );

        if (response.data && response.data[marketHashName]) {
            const price = response.data[marketHashName].buff163 || null;
            const result = {
                source: 'buff163',
                price: price ? price / 100 : null,
                currency: 'USD',
                timestamp: Date.now()
            };
            await setToCache(cacheKey, result, CACHE_TTL.BUFF);
            return result;
        }
    } catch (error) {
        console.error(`Buff163 price fetch failed for ${marketHashName}:`, error.message);
    }
    return null;
}

// ==================== STEAMANALYST API ====================

async function getSteamAnalystPrice(marketHashName) {
    const cacheKey = `steamanalyst:${marketHashName}`;
    const cached = await getFromCache(cacheKey);
    if (cached) return cached;

    try {
        // SteamAnalyst public API (no key required for basic prices)
        const response = await axios.get(
            `https://csgo.steamanalyst.com/api/v2/prices`,
            {
                params: {
                    market_hash_name: marketHashName
                },
                timeout: 5000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            }
        );

        if (response.data && response.data.success) {
            const item = response.data.data;
            const result = {
                source: 'steamanalyst',
                price: item.safe_price || item.avg_price || null,
                avgPrice: item.avg_price,
                safePrice: item.safe_price,
                minPrice: item.min_price,
                maxPrice: item.max_price,
                trend: item.trend, // 'up', 'down', 'stable'
                currency: 'USD',
                timestamp: Date.now()
            };
            await setToCache(cacheKey, result, CACHE_TTL.BUFF); // Same TTL as Buff
            return result;
        }
    } catch (error) {
        // SteamAnalyst might be unavailable, that's OK
        console.warn(`SteamAnalyst price fetch failed for ${marketHashName}:`, error.message);
    }
    return null;
}

// ==================== CSFLOAT API ====================

async function getCSFloatData(inspectLink) {
    const cacheKey = `csfloat:${Buffer.from(inspectLink).toString('base64').slice(0, 50)}`;
    const cached = await getFromCache(cacheKey);
    if (cached) return cached;

    try {
        const response = await axios.get('https://api.csfloat.com/', {
            params: { url: inspectLink },
            timeout: 10000
        });

        if (response.data && response.data.iteminfo) {
            const item = response.data.iteminfo;
            const result = {
                floatValue: item.floatvalue,
                paintSeed: item.paintseed,
                paintIndex: item.paintindex,
                phase: detectDopplerPhase(item.paintindex, item.paintseed),
                fadePercentage: detectFadePercentage(item.paintindex, item.paintseed),
                stickers: item.stickers || [],
                imageUrl: item.imageurl,
                timestamp: Date.now()
            };
            await setToCache(cacheKey, result, CACHE_TTL.CSFLOAT);
            return result;
        }
    } catch (error) {
        console.error(`CSFloat fetch failed:`, error.message);
    }
    return null;
}

// ==================== STEAM MARKET ====================

async function getSteamMarketPrice(marketHashName, appId = 730) {
    const cacheKey = `steam:${appId}:${marketHashName}`;
    const cached = await getFromCache(cacheKey);
    if (cached) return cached;

    try {
        const response = await axios.get('https://steamcommunity.com/market/priceoverview/', {
            params: { appid: appId, currency: 1, market_hash_name: marketHashName },
            timeout: 5000
        });

        if (response.data && response.data.success) {
            const result = {
                source: 'steam',
                lowestPrice: parseFloat(response.data.lowest_price?.replace(/[^0-9.]/g, '') || '0'),
                medianPrice: parseFloat(response.data.median_price?.replace(/[^0-9.]/g, '') || '0'),
                volume: response.data.volume ? parseInt(response.data.volume.replace(/,/g, '')) : 0,
                currency: 'USD',
                timestamp: Date.now()
            };
            await setToCache(cacheKey, result, CACHE_TTL.STEAM);
            return result;
        }
    } catch (error) {
        console.error(`Steam Market price fetch failed for ${marketHashName}:`, error.message);
    }
    return null;
}

// ==================== STICKER PRICES ====================

const GOD_TIER_STICKERS = {
    'Titan (Holo) | Katowice 2014': 60000,
    'iBUYPOWER (Holo) | Katowice 2014': 50000,
    'Reason Gaming (Holo) | Katowice 2014': 4000,
    'Team Dignitas (Holo) | Katowice 2014': 2500,
    'Vox Eminor (Holo) | Katowice 2014': 1800,
    'Natus Vincere (Holo) | Katowice 2014': 1500,
    'Team LDLC.com (Holo) | Katowice 2014': 1200,
};

async function getStickerPrice(stickerName) {
    const cacheKey = `sticker:${stickerName}`;
    const cached = await getFromCache(cacheKey);
    if (cached) return cached;

    // 1. Check God Tier Fallback (For items too expensive for Steam Market)
    if (GOD_TIER_STICKERS[stickerName]) {
        const price = GOD_TIER_STICKERS[stickerName];
        const result = { name: stickerName, price: price, source: 'god_tier_fallback', timestamp: Date.now() };
        await setToCache(cacheKey, result, CACHE_TTL.STICKER);
        return result;
    }

    const steamPrice = await getSteamMarketPrice(`Sticker | ${stickerName}`, 730);
    if (steamPrice && steamPrice.lowestPrice > 0) {
        const result = { name: stickerName, price: steamPrice.lowestPrice, source: 'steam', timestamp: Date.now() };
        await setToCache(cacheKey, result, CACHE_TTL.STICKER);
        return result;
    }

    const buffPrice = await getBuffPrice(`Sticker | ${stickerName}`);
    if (buffPrice && buffPrice.price) {
        const result = { name: stickerName, price: buffPrice.price, source: 'buff163', timestamp: Date.now() };
        await setToCache(cacheKey, result, CACHE_TTL.STICKER);
        return result;
    }
    return null;
}

// ==================== PATTERN DETECTION ====================

function detectDopplerPhase(paintIndex, paintSeed) {
    const DOPPLER_PHASES = { 415: 'Ruby', 416: 'Sapphire', 417: 'Black Pearl', 418: 'Emerald' };
    if (DOPPLER_PHASES[paintIndex]) return DOPPLER_PHASES[paintIndex];

    if (paintIndex === 44) {
        return `Phase ${(Math.floor(paintSeed / 84) % 4) + 1}`;
    }
    if ([568, 569, 570, 571, 572].includes(paintIndex)) {
        if (paintIndex === 568) return 'Gamma Emerald';
        return `Gamma Phase ${paintIndex - 568}`;
    }
    return null;
}

function detectFadePercentage(paintIndex, paintSeed) {
    if (paintIndex !== 38) return null;
    const fadePercent = Math.round(100 - (paintSeed / 1000) * 20);
    return Math.max(80, Math.min(100, fadePercent));
}

function detectMarbleFadePattern(paintIndex, paintSeed) {
    if (paintIndex !== 413) return null;
    const FIRE_ICE_SEEDS = [
        { min: 412, max: 420, pattern: 'True Fire & Ice' },
        { min: 489, max: 496, pattern: 'True Fire & Ice' },
    ];
    for (const range of FIRE_ICE_SEEDS) {
        if (paintSeed >= range.min && paintSeed <= range.max) return range.pattern;
    }
    return 'Tricolor';
}

// ==================== COMBINED PRICE ENGINE ====================

async function getBestPrice(marketHashName, options = {}) {
    const [buffData, steamData, analytData] = await Promise.all([
        getBuffPrice(marketHashName),
        getSteamMarketPrice(marketHashName, options.appId || 730),
        getSteamAnalystPrice(marketHashName)
    ]);

    // Priority: Buff163 > SteamAnalyst > Steam Market
    let bestPrice = null, source = null;

    if (options.preferBuff !== false && buffData?.price) {
        bestPrice = buffData.price;
        source = 'buff163';
    } else if (analytData?.price) {
        bestPrice = analytData.price;
        source = 'steamanalyst';
    } else if (steamData?.lowestPrice) {
        bestPrice = steamData.lowestPrice;
        source = 'steam';
    }

    // Calculate weighted average if multiple sources available
    const prices = [];
    const weights = { buff163: 0.45, steamanalyst: 0.30, steam: 0.25 };

    if (buffData?.price) prices.push({ price: buffData.price, weight: weights.buff163 });
    if (analytData?.price) prices.push({ price: analytData.price, weight: weights.steamanalyst });
    if (steamData?.lowestPrice) prices.push({ price: steamData.lowestPrice, weight: weights.steam });

    let weightedAverage = null;
    if (prices.length > 1) {
        const totalWeight = prices.reduce((sum, p) => sum + p.weight, 0);
        weightedAverage = prices.reduce((sum, p) => sum + (p.price * p.weight / totalWeight), 0);
        weightedAverage = Math.round(weightedAverage * 100) / 100;
    }

    return {
        price: bestPrice,
        weightedPrice: weightedAverage || bestPrice,
        source,
        buff: buffData,
        steam: steamData,
        steamanalyst: analytData,
        trend: analytData?.trend || null,
        volume: steamData?.volume || 0,
        timestamp: Date.now()
    };
}

async function calculateItemValue(item, options = {}) {
    const { marketHashName, inspectLink, stickers = [], floatValue } = item;

    const priceData = await getBestPrice(marketHashName);
    let basePrice = priceData.price || 0;

    let itemData = null;
    if (inspectLink) {
        itemData = await getCSFloatData(inspectLink);
    }

    const actualFloat = itemData?.floatValue || floatValue;

    // Float multiplier
    let floatMultiplier = 1.0;
    if (actualFloat !== undefined) {
        if (actualFloat < 0.001) floatMultiplier = 1.30;
        else if (actualFloat < 0.01) floatMultiplier = 1.15;
        else if (actualFloat < 0.07) floatMultiplier = 1.05;
        else if (actualFloat > 0.90) floatMultiplier = 0.85;
    }

    // Phase multiplier
    let phaseMultiplier = 1.0;
    const phase = itemData?.phase || detectDopplerPhase(item.paintIndex, item.paintSeed);
    const PHASE_MULTIPLIERS = { 'Ruby': 2.5, 'Sapphire': 2.8, 'Black Pearl': 1.8, 'Emerald': 2.2, 'Phase 2': 1.15, 'Phase 4': 1.10 };
    if (phase) phaseMultiplier = PHASE_MULTIPLIERS[phase] || 1.0;

    // Fade multiplier
    let fadeMultiplier = 1.0;
    const fadePercent = itemData?.fadePercentage || detectFadePercentage(item.paintIndex, item.paintSeed);
    if (fadePercent >= 100) fadeMultiplier = 1.25;
    else if (fadePercent >= 98) fadeMultiplier = 1.15;

    // Sticker value
    let stickerValue = 0;
    const stickerDetails = [];
    for (const sticker of stickers) {
        const stickerName = typeof sticker === 'string' ? sticker : sticker.name;
        const stickerPrice = await getStickerPrice(stickerName);
        if (stickerPrice?.price) {
            let stickerPercent = 0.03;
            if (stickerName.includes('Katowice 2014') && stickerName.includes('Holo')) stickerPercent = 0.05;
            else if (stickerName.includes('Holo') || stickerName.includes('Foil')) stickerPercent = 0.04;

            const contribution = stickerPrice.price * stickerPercent;
            stickerValue += contribution;
            stickerDetails.push({ name: stickerName, basePrice: stickerPrice.price, contribution, percent: stickerPercent * 100 });
        }
    }

    const adjustedPrice = basePrice * floatMultiplier * phaseMultiplier * fadeMultiplier;
    const totalValue = adjustedPrice + stickerValue;

    return {
        basePrice, adjustedPrice, stickerValue, totalValue,
        breakdown: { floatMultiplier, phaseMultiplier, fadeMultiplier, phase, fadePercent, float: actualFloat, stickers: stickerDetails },
        source: priceData.source, volume: priceData.volume, timestamp: Date.now()
    };
}

module.exports = {
    getBuffPrice, getSteamMarketPrice, getSteamAnalystPrice, getCSFloatData, getStickerPrice, getBestPrice,
    detectDopplerPhase, detectFadePercentage, detectMarbleFadePattern,
    calculateItemValue, getFromCache, setToCache,
};
