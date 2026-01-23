/**
 * Analytics Routes
 * Handles user-facing analytics and statistics endpoints
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Optional auth middleware - some endpoints work without auth
const optionalAuth = (req, res, next) => {
    // Check if user is logged in via session
    if (req.session && req.session.user) {
        req.user = req.session.user;
    }
    next();
};

// Require auth for user-specific data
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    req.user = req.session.user;
    next();
};

// ==================== PRICE HISTORY ====================

/**
 * GET /api/analytics/price-history/:marketHashName
 * Get price history for a specific item
 */
router.get('/price-history/:marketHashName', async (req, res) => {
    const { marketHashName } = req.params;
    const { period = '7d', gameId = 730 } = req.query;

    // Calculate date range
    let days = 7;
    if (period === '30d') days = 30;
    if (period === '90d') days = 90;

    try {
        const result = await pool.query(`
            SELECT 
                DATE(recorded_at) as date,
                AVG(price) as avg_price,
                MIN(price) as min_price,
                MAX(price) as max_price,
                SUM(volume) as volume
            FROM price_history
            WHERE market_hash_name = $1 
              AND game_id = $2
              AND recorded_at >= NOW() - INTERVAL '${days} days'
            GROUP BY DATE(recorded_at)
            ORDER BY date ASC
        `, [marketHashName, gameId]);

        // Get current price from listings
        const currentPrice = await pool.query(`
            SELECT AVG(price) as current_price, COUNT(*) as active_listings
            FROM listings
            WHERE item_name = $1 AND status = 'active'
        `, [marketHashName]);

        res.json({
            success: true,
            data: {
                item: marketHashName,
                period,
                gameId: parseInt(gameId),
                history: result.rows,
                currentPrice: parseFloat(currentPrice.rows[0]?.current_price) || null,
                activeListings: parseInt(currentPrice.rows[0]?.active_listings) || 0
            }
        });
    } catch (err) {
        console.error('Price history error:', err);
        res.status(500).json({ success: false, error: 'Failed to load price history' });
    }
});

/**
 * GET /api/analytics/price-chart/:marketHashName
 * Get chart data for price visualization
 */
router.get('/price-chart/:marketHashName', async (req, res) => {
    const { marketHashName } = req.params;
    const { period = '7d', gameId = 730 } = req.query;

    let interval = '1 day';
    let days = 7;
    if (period === '30d') { days = 30; interval = '1 day'; }
    if (period === '90d') { days = 90; interval = '3 days'; }

    try {
        const result = await pool.query(`
            WITH time_series AS (
                SELECT generate_series(
                    DATE_TRUNC('day', NOW() - INTERVAL '${days} days'),
                    DATE_TRUNC('day', NOW()),
                    INTERVAL '${interval}'
                ) as time_bucket
            )
            SELECT 
                ts.time_bucket as date,
                COALESCE(AVG(ph.price), 0) as price,
                COALESCE(SUM(ph.volume), 0) as volume
            FROM time_series ts
            LEFT JOIN price_history ph ON DATE_TRUNC('day', ph.recorded_at) = ts.time_bucket
                AND ph.market_hash_name = $1
                AND ph.game_id = $2
            GROUP BY ts.time_bucket
            ORDER BY ts.time_bucket ASC
        `, [marketHashName, gameId]);

        res.json({
            success: true,
            data: {
                labels: result.rows.map(r => r.date),
                prices: result.rows.map(r => parseFloat(r.price) || 0),
                volumes: result.rows.map(r => parseInt(r.volume) || 0)
            }
        });
    } catch (err) {
        console.error('Price chart error:', err);
        res.status(500).json({ success: false, error: 'Failed to load chart data' });
    }
});

// ==================== STEAM MARKET FEATURED ITEMS ====================

/**
 * GET /api/analytics/steam-market-items
 * Get real CS2 skins from Steam Market API for Marketplace display
 */
router.get('/steam-market-items', async (req, res) => {
    const { limit = 24 } = req.query;
    const axios = require('axios');

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

    try {
        const items = [];
        const itemsToFetch = FEATURED_SKINS.slice(0, parseInt(limit));

        // Fetch both price and image from Steam Market
        for (const skinName of itemsToFetch) {
            try {
                // Get price first
                const priceResponse = await axios.get('https://steamcommunity.com/market/priceoverview/', {
                    params: { appid: 730, currency: 1, market_hash_name: skinName },
                    timeout: 3000,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                });

                if (priceResponse.data && priceResponse.data.success) {
                    const lowestPrice = parseFloat(priceResponse.data.lowest_price?.replace(/[^0-9.]/g, '') || '0');
                    const medianPrice = parseFloat(priceResponse.data.median_price?.replace(/[^0-9.]/g, '') || '0');

                    // Extract exterior from name
                    const exteriorMatch = skinName.match(/\((.*?)\)$/);
                    const exterior = exteriorMatch ? exteriorMatch[1] : 'Unknown';

                    // Get image from Steam Market Listings
                    let iconUrl = null;
                    try {
                        const listingsUrl = `https://steamcommunity.com/market/listings/730/${encodeURIComponent(skinName)}/render/`;
                        const listingsResponse = await axios.get(listingsUrl, {
                            params: { start: 0, count: 1, currency: 1, format: 'json' },
                            timeout: 5000,
                            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                        });

                        if (listingsResponse.data && listingsResponse.data.assets && listingsResponse.data.assets['730']) {
                            const assets = listingsResponse.data.assets['730']['2'];
                            if (assets) {
                                const firstAssetKey = Object.keys(assets)[0];
                                if (firstAssetKey && assets[firstAssetKey].icon_url) {
                                    iconUrl = `https://community.steamstatic.com/economy/image/${assets[firstAssetKey].icon_url}`;
                                }
                            }
                        }
                    } catch (imgErr) {
                        console.warn(`Failed to fetch image for ${skinName}:`, imgErr.message);
                    }

                    // Fallback to search-based image URL
                    if (!iconUrl) {
                        iconUrl = `https://community.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09-5lpKKqPrxN7LEmyVQ7MEpiLuSrYmnjQDh_UM_ZDvxcoCUdQU8MAvZq1a3wOru1MO1tc_Mn3Bmsyl0pSmMlxXih07dLK9x`;
                    }

                    items.push({
                        id: `steam-${items.length + 1}`,
                        market_hash_name: skinName,
                        name: skinName.replace(/\s*\(.*?\)\s*$/, ''),
                        price: lowestPrice || medianPrice || 0,
                        median_price: medianPrice,
                        exterior: exterior,
                        rarity: detectRarity(skinName),
                        game_id: 730,
                        game_name: 'CS2',
                        icon_url: iconUrl,
                        source: 'steam_market',
                        volume: priceResponse.data.volume ? parseInt(priceResponse.data.volume.replace(/,/g, '')) : 0
                    });
                }

                // Rate limiting - wait 300ms between requests to avoid 429
                await new Promise(resolve => setTimeout(resolve, 300));

            } catch (err) {
                console.warn(`Failed to fetch price for ${skinName}:`, err.message);
            }
        }

        res.json({
            success: true,
            data: items,
            source: 'steam_market_api',
            count: items.length
        });

    } catch (err) {
        console.error('Steam market items error:', err);
        res.status(500).json({ success: false, error: 'Failed to load Steam market items' });
    }
});

// Helper function to detect rarity from skin name
function detectRarity(skinName) {
    const name = skinName.toLowerCase();
    if (name.includes('dragon lore') || name.includes('howl') || name.includes('gungnir')) return 'Contraband';
    if (name.includes('fire serpent') || name.includes('fade') || name.includes('asiimov')) return 'Covert';
    if (name.includes('hyper beast') || name.includes('neon') || name.includes('bloodsport')) return 'Classified';
    if (name.includes('redline') || name.includes('vulcan')) return 'Restricted';
    return 'Mil-Spec';
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
        const params = [];
        let paramIndex = 1;

        if (gameId) {
            query += ` AND game_id = $${paramIndex++}`;
            params.push(gameId);
        }

        query += ` ORDER BY total_sales DESC LIMIT $${paramIndex}`;
        params.push(parseInt(limit));

        let result = await pool.query(query, params);

        // If cache is empty, calculate from listings
        if (result.rows.length === 0) {
            result = await pool.query(`
                SELECT 
                    item_name as market_hash_name,
                    item_app_id as game_id,
                    COUNT(*) as total_sales,
                    AVG(price) as avg_price,
                    MAX(item_icon_url) as image_url,
                    MAX(item_rarity) as rarity
                FROM listings
                WHERE status = 'sold'
                GROUP BY item_name, item_app_id
                ORDER BY total_sales DESC
                LIMIT $1
            `, [parseInt(limit)]);
        }

        res.json({
            success: true,
            data: result.rows.map(item => ({
                ...item,
                avg_price: parseFloat(item.avg_price) || 0,
                total_sales: parseInt(item.total_sales) || 0,
                price_trend: parseFloat(item.price_trend) || 0
            }))
        });
    } catch (err) {
        console.error('Popular items error:', err);
        res.status(500).json({ success: false, error: 'Failed to load popular items' });
    }
});

// ==================== USER STATISTICS ====================

/**
 * GET /api/analytics/my-trades
 * Get current user's trade statistics
 */
router.get('/my-trades', requireAuth, async (req, res) => {
    const steamId = req.user.steamId || req.user.steam_id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    try {
        // Get overall stats
        const statsResult = await pool.query(`
            SELECT 
                COUNT(CASE WHEN buyer_steam_id = $1 THEN 1 END) as total_bought,
                COUNT(CASE WHEN seller_steam_id = $1 THEN 1 END) as total_sold,
                COALESCE(SUM(CASE WHEN buyer_steam_id = $1 THEN price ELSE 0 END), 0) as total_spent,
                COALESCE(SUM(CASE WHEN seller_steam_id = $1 THEN seller_payout ELSE 0 END), 0) as total_earned
            FROM escrow_trades
            WHERE (buyer_steam_id = $1 OR seller_steam_id = $1)
              AND status = 'completed'
        `, [steamId]);

        // Get recent trades
        const tradesResult = await pool.query(`
            SELECT 
                t.id,
                t.status,
                t.price,
                t.platform_fee as fee,
                t.created_at,
                t.completed_at,
                t.item_name,
                l.item_icon_url as image_url,
                CASE WHEN t.buyer_steam_id = $1 THEN 'buy' ELSE 'sell' END as trade_type
            FROM escrow_trades t
            LEFT JOIN listings l ON t.listing_id = l.id
            WHERE t.buyer_steam_id = $1 OR t.seller_steam_id = $1
            ORDER BY t.created_at DESC
            LIMIT $2 OFFSET $3
        `, [steamId, parseInt(limit), offset]);

        // Get total count
        const countResult = await pool.query(`
            SELECT COUNT(*) as total
            FROM escrow_trades
            WHERE buyer_steam_id = $1 OR seller_steam_id = $1
        `, [steamId]);

        const stats = statsResult.rows[0];
        const profit = parseFloat(stats.total_earned) - parseFloat(stats.total_spent);

        res.json({
            success: true,
            data: {
                stats: {
                    totalBought: parseInt(stats.total_bought) || 0,
                    totalSold: parseInt(stats.total_sold) || 0,
                    totalSpent: parseFloat(stats.total_spent) || 0,
                    totalEarned: parseFloat(stats.total_earned) || 0,
                    profit: profit
                },
                trades: tradesResult.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: parseInt(countResult.rows[0].total)
                }
            }
        });
    } catch (err) {
        console.error('My trades error:', err);
        res.status(500).json({ success: false, error: 'Failed to load trade statistics' });
    }
});

// ==================== INVENTORY VALUE ====================

/**
 * GET /api/analytics/inventory-value
 * Estimate total value of user's inventory
 */
router.get('/inventory-value', requireAuth, async (req, res) => {
    const steamId = req.user.steamId || req.user.steam_id;

    try {
        // Get user's active listings value
        const listingsResult = await pool.query(`
            SELECT 
                COUNT(*) as total_items,
                COALESCE(SUM(price), 0) as total_value,
                AVG(price) as avg_price
            FROM listings
            WHERE seller_steam_id = $1 AND status = 'active'
        `, [steamId]);

        // Get top valuable items
        const topItemsResult = await pool.query(`
            SELECT item_name, price, item_icon_url as image_url, item_rarity as rarity
            FROM listings
            WHERE seller_steam_id = $1 AND status = 'active'
            ORDER BY price DESC
            LIMIT 5
        `, [steamId]);

        // Get value change (compare with 7 days ago prices from history)
        const valueChangeResult = await pool.query(`
            WITH current_value AS (
                SELECT COALESCE(SUM(l.price), 0) as value
                FROM listings l
                WHERE l.seller_steam_id = $1 AND l.status = 'active'
            ),
            old_prices AS (
                SELECT DISTINCT ON (l.item_name) 
                    l.item_name,
                    COALESCE(ph.price, l.price) as old_price
                FROM listings l
                LEFT JOIN price_history ph ON ph.market_hash_name = l.item_name
                    AND ph.recorded_at >= NOW() - INTERVAL '7 days'
                    AND ph.recorded_at <= NOW() - INTERVAL '6 days'
                WHERE l.seller_steam_id = $1 AND l.status = 'active'
            ),
            old_value AS (
                SELECT COALESCE(SUM(old_price), 0) as value FROM old_prices
            )
            SELECT 
                cv.value as current_value,
                ov.value as old_value,
                CASE WHEN ov.value > 0 
                    THEN ((cv.value - ov.value) / ov.value * 100)
                    ELSE 0 
                END as change_percent
            FROM current_value cv, old_value ov
        `, [steamId]);

        const stats = listingsResult.rows[0];
        const change = valueChangeResult.rows[0];

        res.json({
            success: true,
            data: {
                totalItems: parseInt(stats.total_items) || 0,
                totalValue: parseFloat(stats.total_value) || 0,
                avgPrice: parseFloat(stats.avg_price) || 0,
                topItems: topItemsResult.rows,
                valueChange: {
                    currentValue: parseFloat(change?.current_value) || 0,
                    oldValue: parseFloat(change?.old_value) || 0,
                    changePercent: parseFloat(change?.change_percent) || 0
                }
            }
        });
    } catch (err) {
        console.error('Inventory value error:', err);
        res.status(500).json({ success: false, error: 'Failed to calculate inventory value' });
    }
});

// ==================== MARKET OVERVIEW ====================

/**
 * GET /api/analytics/market-overview
 * Get overall market statistics
 */
router.get('/market-overview', optionalAuth, async (req, res) => {
    try {
        const [
            totalStats,
            tradeStats,
            todayStats,
            gameStats
        ] = await Promise.all([
            // Total listings stats
            pool.query(`
                SELECT 
                    COUNT(*) as total_listings,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_listings,
                    COUNT(CASE WHEN status = 'sold' THEN 1 END) as total_sold,
                    COALESCE(SUM(CASE WHEN status = 'sold' THEN price ELSE 0 END), 0) as total_volume
                FROM listings
            `),
            // ALL trades stats from escrow_trades
            pool.query(`
                SELECT 
                    COUNT(*) as total_trades,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_trades,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_trades,
                    COUNT(CASE WHEN status = 'pending_payment' THEN 1 END) as pending_trades,
                    COALESCE(SUM(price), 0) as total_trade_volume,
                    COALESCE(SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END), 0) as completed_volume
                FROM escrow_trades
            `),
            // Today's stats - ALL trades, not just completed
            pool.query(`
                SELECT 
                    COUNT(*) as trades_today,
                    COALESCE(SUM(price), 0) as volume_today,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_today
                FROM escrow_trades
                WHERE created_at >= CURRENT_DATE
            `),
            // Stats by game from escrow_trades
            pool.query(`
                SELECT 
                    item_app_id as game_id,
                    COUNT(*) as trades_count,
                    COALESCE(SUM(price), 0) as volume
                FROM escrow_trades
                GROUP BY item_app_id
            `)
        ]);

        const trades = tradeStats.rows[0];

        res.json({
            success: true,
            data: {
                total: {
                    listings: parseInt(totalStats.rows[0].total_listings) || 0,
                    activeListings: parseInt(totalStats.rows[0].active_listings) || 0,
                    totalSold: parseInt(totalStats.rows[0].total_sold) || 0,
                    totalVolume: parseFloat(totalStats.rows[0].total_volume) || 0
                },
                trades: {
                    total: parseInt(trades.total_trades) || 0,
                    completed: parseInt(trades.completed_trades) || 0,
                    cancelled: parseInt(trades.cancelled_trades) || 0,
                    pending: parseInt(trades.pending_trades) || 0,
                    totalVolume: parseFloat(trades.total_trade_volume) || 0,
                    completedVolume: parseFloat(trades.completed_volume) || 0
                },
                today: {
                    trades: parseInt(todayStats.rows[0].trades_today) || 0,
                    volume: parseFloat(todayStats.rows[0].volume_today) || 0,
                    completed: parseInt(todayStats.rows[0].completed_today) || 0
                },
                byGame: gameStats.rows.map(g => ({
                    gameId: g.game_id,
                    gameName: g.game_id === 730 ? 'CS2' : g.game_id === 570 ? 'Dota 2' : 'Other',
                    trades: parseInt(g.trades_count) || 0,
                    volume: parseFloat(g.volume) || 0
                }))
            }
        });
    } catch (err) {
        console.error('Market overview error:', err);
        res.status(500).json({ success: false, error: 'Failed to load market overview' });
    }
});

module.exports = router;
