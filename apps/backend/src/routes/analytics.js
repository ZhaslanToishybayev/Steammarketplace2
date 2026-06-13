const express = require('express');
const router = express.Router();
const axios = require('axios');
const steamRateLimiter = require('../utils/steam-rate-limiter');
const { redisClient } = require('../config/redis');
const metrics = require('../services/metrics.service');

router.get('/market-overview', async (req, res) => {
    try {
        const { query } = require('../config/database');
        
        const tradeStats = await query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'completed') as completed,
                COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
                COUNT(*) FILTER (WHERE status IN ('pending_payment', 'awaiting_seller', 'awaiting_buyer')) as pending
            FROM escrow_trades
        `);

        const volumeStats = await query(`
            SELECT 
                COALESCE(SUM(price) FILTER (WHERE status = 'completed'), 0) as success_volume
            FROM escrow_trades
        `);

        const todayStats = await query(`
            SELECT 
                COALESCE(SUM(total_volume), 0) as today_volume
            FROM daily_stats
            WHERE date = CURRENT_DATE
        `);

        res.json({
            success: true,
            data: {
                trades: {
                    total: parseInt(tradeStats.rows[0].total),
                    completed: parseInt(tradeStats.rows[0].completed),
                    cancelled: parseInt(tradeStats.rows[0].cancelled),
                    pending: parseInt(tradeStats.rows[0].pending)
                },
                volume: {
                    success: parseFloat(volumeStats.rows[0].success_volume)
                },
                today: {
                    volume: parseFloat(todayStats.rows[0].today_volume)
                }
            }
        });

    } catch (err) {
        console.error('Market overview error:', err);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

router.get('/steam-market-items', async (req, res) => {
    const { limit = 24 } = req.query;
    
    const CACHE_KEY = 'analytics:steam_market_items:v1';
    const CACHE_TTL = 86400; 

    try {
        const cached = await redisClient.get(CACHE_KEY);
        if (cached) {
            metrics.recordCacheHit(CACHE_KEY);
            return res.json({
                ...JSON.parse(cached),
                source: 'redis_cache',
                cached_at: new Date().toISOString()
            });
        }

        metrics.recordCacheMiss(CACHE_KEY);

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

        for (const skinName of itemsToFetch) {
            try {
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
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (err) {}
        }

        const responsePayload = {
            success: true,
            data: items,
            source: 'steam_market_api',
            count: items.length,
            fetched_at: new Date().toISOString()
        };

        if (items.length > 0) {
            await redisClient.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(responsePayload));
        }

        res.json(responsePayload);

    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to load Steam market items' });
    }
});

function generateStaticIconUrl(skinName) {
    const ICON_MAP = {
        'AK-47 | Redline (Field-Tested)': '-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09-5lpKKqPrxN7LEmyVQ7MEpiLuSrYmnjQDh_UM_ZDvxcoCUdQU8MAvZq1a3wOru1MO1tc_Mn3Bmsyl0pSmMlxXih07dLK9x',
        'AWP | Asiimov (Field-Tested)': '-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FAR17PLfYQJD_9W7m5a0mvLwOq7c2D5V7_pwj-3I_t2t2wXnqRZpZGGiJoCddVQ2ZVjV-gLrkOvo0Je_vcvJzHY3uCEm7HvbyR3lgRxJaeBr0_rLVgPA',
    };

    const hash = ICON_MAP[skinName];
    if (hash) return `https://community.steamstatic.com/economy/image/${hash}`;
    return `https://community.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09-5lpKKqPrxN7LEmyVQ7MEpiLuSrYmnjQDh_UM_ZDvxcoCUdQU8MAvZq1a3wOru1MO1tc_Mn3Bmsyl0pSmMlxXih07dLK9x`;
}

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

router.get('/popular-items', async (req, res) => {
    const { limit = 20, gameId } = req.query;

    try {
        const { query } = require('../config/database');
        
        let dbQuery = `
            SELECT 
                item_name as market_hash_name,
                item_app_id as game_id,
                COUNT(*) as total_sales,
                AVG(price) as avg_price,
                MAX(item_icon_url) as image_url,
                MAX(item_rarity) as rarity
            FROM listings
            WHERE status = 'sold'
        `;
        
        const params = [];
        if (gameId) {
            dbQuery += ` AND item_app_id = $1`;
            params.push(parseInt(gameId));
        }
        
        dbQuery += `
            GROUP BY item_name, item_app_id
            ORDER BY total_sales DESC
            LIMIT $${params.length + 1}
        `;
        params.push(parseInt(limit));
        
        const result = await query(dbQuery, params);
        
        if (result.rows.length === 0) {
            let fallbackQuery = `
                SELECT 
                    item_name as market_hash_name,
                    item_app_id as game_id,
                    0 as total_sales,
                    AVG(price) as avg_price,
                    MAX(item_icon_url) as image_url,
                    MAX(item_rarity) as rarity
                FROM listings
                WHERE status = 'active'
            `;
            const fallbackParams = [];
            if (gameId) {
                fallbackQuery += ` AND item_app_id = $1`;
                fallbackParams.push(parseInt(gameId));
            }
            fallbackQuery += `
                GROUP BY item_name, item_app_id
                LIMIT $${fallbackParams.length + 1}
            `;
            fallbackParams.push(parseInt(limit));
            
            const fallbackResult = await query(fallbackQuery, fallbackParams);
            return res.json({ success: true, data: fallbackResult.rows });
        }

        res.json({ success: true, data: result.rows });

    } catch (err) {
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

module.exports = router;
