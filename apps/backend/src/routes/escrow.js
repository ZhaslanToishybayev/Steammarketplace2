/**
 * Escrow Trade Routes (Marketplace)
 * Handles bot-to-user trades and marketplace listings
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { botManager } = require('../services/bot-manager.service');
const auditService = require('../services/audit.service');
const metrics = require('../services/metrics.service');

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    next();
};

/**
 * GET /api/escrow/listings
 * Get active bot listings for marketplace
 */
router.get('/listings', async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;

        // Fetch bot steam IDs from database (instead of botManager)
        const botsResult = await query(`SELECT steam_id FROM bots WHERE status = 'online'`);
        const botSteamIds = botsResult.rows.map(b => b.steam_id);

        if (botSteamIds.length === 0) {
            return res.json({ success: true, data: [], pagination: { total: 0 } });
        }

        const result = await query(`
            SELECT * FROM listings 
            WHERE status = 'active' AND seller_steam_id = ANY($1)
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `, [botSteamIds, parseInt(limit), parseInt(offset)]);

        const countRes = await query(`
            SELECT COUNT(*) FROM listings 
            WHERE status = 'active' AND seller_steam_id = ANY($1)
        `, [botSteamIds]);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total: parseInt(countRes.rows[0].count),
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (err) {
        console.error('[Marketplace] Failed to get listings:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * GET /api/escrow/my-listings
 * Get current user's active listings
 */
router.get('/my-listings', requireAuth, async (req, res) => {
    try {
        const steamId = req.user.steamId;
        
        const result = await query(`
            SELECT * FROM listings 
            WHERE seller_steam_id = $1 AND status IN ('active', 'reserved')
            ORDER BY created_at DESC
        `, [steamId]);

        res.json({
            success: true,
            listings: result.rows
        });
    } catch (err) {
        console.error('[Marketplace] Failed to get my listings:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch listings' });
    }
});

/**
 * POST /api/escrow/buy/:listingId
 * Buy a bot item from marketplace
 */
router.post('/buy/:listingId', requireAuth, async (req, res) => {
    try {
        const { listingId } = req.params;
        const buyerSteamId = req.user.steamId;
        const tradeUrl = req.body.tradeUrl || req.user.tradeUrl;

        if (!tradeUrl) {
            return res.status(400).json({ success: false, error: 'Trade URL is required' });
        }

        // Basic Trade URL Validation
        const tradeUrlRegex = /^https?:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+&token=[a-zA-Z0-9_-]+$/;
        if (!tradeUrlRegex.test(tradeUrl)) {
            return res.status(400).json({ success: false, error: 'Invalid Steam Trade URL format' });
        }

        const tradeUuid = uuidv4();
        console.log(`[Marketplace] Starting purchase transaction for listing ${listingId}, user ${buyerSteamId}`);

        const { getClient } = require('../config/database');
        const client = await getClient();

        try {
            await client.query('BEGIN');

            // 1. Get listing with LOCK (Prevent Race Condition)
            const listingRes = await client.query("SELECT * FROM listings WHERE id = $1 FOR UPDATE", [listingId]);
            if (listingRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ success: false, error: 'Listing not found' });
            }
            const listing = listingRes.rows[0];

            if (listing.status !== 'active') {
                await client.query('ROLLBACK');
                return res.status(409).json({ success: false, error: 'Item already sold or reserved' });
            }

            // 2. Check balance with LOCK
            const userRes = await client.query("SELECT balance FROM users WHERE steam_id = $1 FOR UPDATE", [buyerSteamId]);
            const balance = parseFloat(userRes.rows[0].balance);
            const price = parseFloat(listing.price);

            if (balance < price) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, error: 'Insufficient balance' });
            }

            // 3. Check if bot is available (DB check only, no lock needed)
            const botRes = await client.query("SELECT steam_id FROM bots WHERE steam_id = $1 AND status = 'online'", [listing.seller_steam_id]);
            if (botRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(503).json({ success: false, error: 'Bot is currently unavailable' });
            }
            
            // Calculate Fees
            const platformFeePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT || '5.0');
            const platformFee = price * (platformFeePercent / 100);
            const sellerPayout = price - platformFee;

            // Deduct balance
            console.log(`[Marketplace] Deducting balance for user ${buyerSteamId}`);
            await client.query("UPDATE users SET balance = balance - $1 WHERE steam_id = $2", [price, buyerSteamId]);
            
            // Record financial metrics
            metrics.recordTradeVolume(price);
            metrics.recordPlatformFee(platformFee);
            metrics.updateBalanceMetrics(); // Update total balance metric

            // Mark listing as sold
            console.log(`[Marketplace] Marking listing ${listingId} as sold`);
            await client.query("UPDATE listings SET status = 'sold', updated_at = NOW() WHERE id = $1", [listingId]);
            
            // Create trade record (Status: processing)
            console.log(`[Marketplace] Creating escrow_trades record for ${tradeUuid}`);
            await client.query(`
                INSERT INTO escrow_trades 
                (trade_uuid, listing_id, buyer_steam_id, seller_steam_id, 
                 item_asset_id, item_name, item_app_id, price, 
                 platform_fee, platform_fee_percent, seller_payout,
                 status, trade_type, buyer_trade_url, seller_trade_url)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            `, [
                tradeUuid, listingId, buyerSteamId, listing.seller_steam_id, 
                listing.item_asset_id, listing.item_name, listing.item_app_id, 
                price, platformFee, platformFeePercent, sellerPayout,
                'processing', 'bot_sale',
                tradeUrl, listing.seller_trade_url
            ]);

            console.log(`[Marketplace] Committing transaction for trade ${tradeUuid}`);
            await client.query('COMMIT');
            console.log(`[Marketplace] Transaction COMMITTED for trade ${tradeUuid}`);

            // Audit Log
            await auditService.log(
                buyerSteamId, 
                'TRADE_BUY', 
                tradeUuid, 
                { price, listingId, seller: listing.seller_steam_id, fee: platformFee }, 
                req.ip
            );
            
            // 5. Try to Queue Trade Offer (Asynchronous Fallback)
            try {
                const { tradeQueueService } = require('../services/trade-queue.service');
                console.log(`[Marketplace] Attempting to queue item delivery for trade ${tradeUuid}`);
                
                await tradeQueueService.addTradeJob({
                    type: 'send-offer',
                    tradeUuid: tradeUuid,
                    tradeUrl: tradeUrl,
                    itemsToGive: [{
                        assetId: listing.item_asset_id,
                        appId: listing.item_app_id || 730,
                        contextId: '2'
                    }],
                    message: `[SGO Market] Your purchase: ${listing.item_name}`
                }, { priority: 1 });
                console.log(`[Marketplace] Trade job ADDED TO QUEUE for ${tradeUuid}`);
            } catch (queueErr) {
                console.warn('[Marketplace] Warning: Could not queue trade job, relying on background scanner:', queueErr.message);
            }

            console.log(`[Marketplace] Sending success response for trade ${tradeUuid}`);
            res.json({
                success: true,
                message: 'Purchase successful! The bot will send your trade offer shortly.',
                tradeUuid
            });

        } catch (dbErr) {
            console.error(`[Marketplace] Transaction FAILED for trade ${tradeUuid}:`, dbErr.message);
            if (client) await client.query('ROLLBACK');
            throw dbErr;
        } finally {
            if (client) client.release();
            console.log(`[Marketplace] DB client released for trade ${tradeUuid}`);
        }

    } catch (err) {
        console.error('[Marketplace] Buy failed:', err);
        res.status(500).json({ success: false, error: err.message || 'Purchase failed' });
    }
});

/**
 * GET /api/escrow/trades
 * Get user's trade history
 */
router.get('/trades', requireAuth, async (req, res) => {
    try {
        const { limit = 20, offset = 0 } = req.query;
        const steamId = req.user.steamId;

        const result = await query(`
            SELECT * FROM escrow_trades 
            WHERE buyer_steam_id = $1 OR seller_steam_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `, [steamId, parseInt(limit), parseInt(offset)]);

        const countRes = await query(`
            SELECT COUNT(*) FROM escrow_trades 
            WHERE buyer_steam_id = $1 OR seller_steam_id = $1
        `, [steamId]);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total: parseInt(countRes.rows[0].count),
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (err) {
        console.error('[Escrow] Failed to get trades:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch trades' });
    }
});

/**
 * GET /api/escrow/trades/:tradeUuid
 * Get single trade details
 */
router.get('/trades/:tradeUuid', requireAuth, async (req, res) => {
    try {
        const { tradeUuid } = req.params;
        const result = await query("SELECT * FROM escrow_trades WHERE trade_uuid = $1", [tradeUuid]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Trade not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Internal error' });
    }
});

module.exports = router;
