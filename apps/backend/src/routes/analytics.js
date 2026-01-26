// ==================== STEAM MARKET FEATURED ITEMS ====================

const express = require('express');
const router = express.Router();
const axios = require('axios');
const steamRateLimiter = require('../utils/steam-rate-limiter');
const { redisClient } = require('../config/redis');
const metrics = require('../services/metrics.service');

/**
 * GET /api/analytics/steam-market-items
 * Get real CS2 skins from Steam Market API for Marketplace display
 */
router.get('/steam-market-items', async (req, res) => {
    const { limit = 24 } = req.query;
    
    // CACHE LOGIC
    const CACHE_KEY = 'analytics:steam_market_items:v1';
    const CACHE_TTL = 86400; // 24 hours

    try {
        // 1. Check Redis Cache
        const cached = await redisClient.get(CACHE_KEY);
        if (cached) {
            console.log('[Analytics] Cache HIT for steam-market-items');
            metrics.recordCacheHit(CACHE_KEY);
            return res.json({
                ...JSON.parse(cached),
                source: 'redis_cache',
                cached_at: new Date().toISOString()
            });
        }

        console.log('[Analytics] Cache MISS - fetching from Steam Market API');
        metrics.recordCacheMiss(CACHE_KEY);

        // Popular CS2 skin names to fetch from Steam Market
        const FEATURED_SKINS = [
            'AK-47 | Redline (Field-Tested)',
            'AWP | Asiimov (Field-Tested)',
            'M4A4 | Asiimov (Field-Tested)',
            'AK-47 | Neon Rider (Factory New)',
            'USP-S | Kill Confirmed (Field-Tested)',
            'Glock-18 | Fade (Factory New)',
            'M4A1-S | Hyper Beast (Field-Tested)',
            'AWP | Dragon Lore (Field-Tested)',
            'AK-47 | Fire Serpent (Field-Tested)',
            'M4A4 | Howl (Field-Tested)',
            'AWP | Fade (Factory New)',
            'Desert Eagle | Blaze (Factory New)',
            'AK-47 | Vulcan (Factory New)',
            'M4A1-S | Golden Coil (Factory New)',
            'AWP | Hyper Beast (Factory New)',
            'AK-47 | Bloodsport (Factory New)',
            'M4A4 | Neo-Noir (Factory New)',
            'Glock-18 | Water Elemental (Factory New)',
            'USP-S | Orion (Factory New)',
            'AWP | Containment Breach (Factory New)',
            'AK-47 | Ice Coaled (Factory New)',
            'M4A1-S | Printstream (Factory New)',
            'Desert Eagle | Printstream (Factory New)',
            'AWP | Gungnir (Factory New)',
        ];

        const items = [];
        const itemsToFetch = FEATURED_SKINS.slice(0, parseInt(limit));

        // Fetch prices from Steam Market
        for (const skinName of itemsToFetch) {
            try {
                // Get price using Rate Limiter
                const priceResponse = await steamRateLimiter.execute(async () => {
                    return axios.get('https://steamcommunity.com/market/priceoverview/', {
                        params: { appid: 730, currency: 1, market_hash_name: skinName },
                        timeout: 5000,
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                    });
                });

                if (priceResponse.data && priceResponse.data.success) {
                    const lowestPrice = parseFloat(priceResponse.data.lowest_price?.replace(/[^0-9.]/g, '') || '0');
                    const medianPrice = parseFloat(priceResponse.data.median_price?.replace(/[^0-9.]/g, '') || '0');

                    // Generate Static Icon URL (Avoid extra request)
                    const iconUrl = generateStaticIconUrl(skinName);

                    items.push({
                        id: `steam-${items.length + 1}`,
                        market_hash_name: skinName,
                        name: skinName.replace(/\s*\(.*?\)\s*$/, ''),
                        price: lowestPrice || medianPrice || 0,
                        median_price: medianPrice,
                        exterior: detectExterior(skinName),
                        rarity: detectRarity(skinName),
                        game_id: 730,
                        game_name: 'CS2',
                        icon_url: iconUrl,
                        source: 'steam_market',
                        volume: priceResponse.data.volume ? parseInt(priceResponse.data.volume.replace(/,/g, '')) : 0
                    });
                }

                // Rate limiting - wait small delay even with rate limiter to be polite
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (err) {
                console.warn(`Failed to fetch price for ${skinName}:`, err.message);
            }
        }

        const responsePayload = {
            success: true,
            data: items,
            source: 'steam_market_api',
            count: items.length,
            fetched_at: new Date().toISOString()
        };

        // Cache the result
        if (items.length > 0) {
            await redisClient.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(responsePayload));
            console.log(`[Analytics] Cached ${items.length} items for 24 hours`);
        }

        res.json(responsePayload);

    } catch (err) {
        console.error('Steam market items error:', err);
        res.status(500).json({ success: false, error: 'Failed to load Steam market items' });
    }
});

// Helper: Static Icon Generation
function generateStaticIconUrl(skinName) {
    // Map of known hashes for popular skins to avoid /render/ API calls
    const ICON_MAP = {
        'AK-47 | Redline (Field-Tested)': '-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09-5lpKKqPrxN7LEmyVQ7MEpiLuSrYmnjQDh_UM_ZDvxcoCUdQU8MAvZq1a3wOru1MO1tc_Mn3Bmsyl0pSmMlxXih07dLK9x',
        'AWP | Asiimov (Field-Tested)': '-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FAR17PLfYQJD_9W7m5a0mvLwOq7c2D5V7_pwj-3I_t2t2wXnqRZpZGGiJoCddVQ2ZVjV-gLrkOvo0Je_vcvJzHY3uCEm7HvbyR3lgRxJaeBr0_rLVgPA',
        // Add more hashes here if needed, or use a generic fallback
    };

    const hash = ICON_MAP[skinName];
    if (hash) {
        return `https://community.steamstatic.com/economy/image/${hash}`;
    }
    
    // Fallback to a search-based or generic image if hash unknown
    return `https://community.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09-5lpKKqPrxN7LEmyVQ7MEpiLuSrYmnjQDh_UM_ZDvxcoCUdQU8MAvZq1a3wOru1MO1tc_Mn3Bmsyl0pSmMlxXih07dLK9x`;
}

// Helper function to detect rarity from skin name
function detectRarity(skinName) {
    const name = skinName.toLowerCase();
    if (name.includes('dragon lore') || name.includes('howl') || name.includes('gungnir')) return 'Contraband';
    if (name.includes('fire serpent') || name.includes('fade') || name.includes('asiimov')) return 'Covert';
    if (name.includes('hyper beast') || name.includes('neon') || name.includes('bloodsport')) return 'Classified';
    if (name.includes('redline') || name.includes('vulcan')) return 'Restricted';
    return 'Mil-Spec';
}

function detectExterior(skinName) {
    const match = skinName.match(/\((.*?)\)$/);
    return match ? match[1] : 'Unknown';
}

// ==================== POPULAR ITEMS ====================

/**
 * GET /api/analytics/popular-items
 * Get top traded items
 */
router.get('/popular-items', async (req, res) => {
    const { limit = 20, gameId, category } = req.query;

    try {
        // First try cache
        let query = `
            SELECT market_hash_name, game_id, total_sales, avg_price, 
                   volume_24h, price_trend, image_url, rarity
            FROM popular_items_cache
            WHERE 1=1
        `;
        
        // Mock response for now as we don't have this table populated yet
        res.json({ success: true, data: [] });

    } catch (err) {
        console.error('Popular items error:', err);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

module.exports = router;
