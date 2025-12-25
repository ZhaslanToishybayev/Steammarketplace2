/**
 * P2P Trading Routes
 * Allows users to sell their own skins through the marketplace
 */

const express = require('express');
const router = express.Router();
const { pool, query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { botManager } = require('../services/bot-manager.service');
const pricingService = require('../services/external-pricing.service');

// Platform commission (5%)
const PLATFORM_FEE_PERCENT = parseFloat(process.env.PLATFORM_FEE_PERCENT || '5');

// Middleware
const requireAuth = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ success: false, error: 'Not authenticated' });
};

/**
 * GET /api/p2p/my-listings
 * Get user's own P2P listings
 */
router.get('/my-listings', requireAuth, async (req, res) => {
    try {
        const result = await query(`
            SELECT * FROM listings 
            WHERE seller_steam_id = $1 AND listing_type = 'p2p'
            ORDER BY created_at DESC
        `, [req.user.steamId]);

        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('[P2P] Get listings error:', err);
        res.status(500).json({ success: false, error: 'Failed to get listings' });
    }
});

/**
 * POST /api/p2p/list
 * Create a new P2P listing (user sells their own skin)
 */
router.post('/list', requireAuth, async (req, res) => {
    try {
        const { assetId, appId = 730, price, tradeUrl } = req.body;
        const sellerSteamId = req.user.steamId;

        if (!assetId || !price || !tradeUrl) {
            return res.status(400).json({ success: false, error: 'assetId, price, and tradeUrl are required' });
        }

        if (price < 0.01 || price > 100000) {
            return res.status(400).json({ success: false, error: 'Price must be between $0.01 and $100,000' });
        }

        // Validate trade URL format
        const tradeUrlRegex = /^https:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+&token=[\w-]+$/;
        if (!tradeUrlRegex.test(tradeUrl)) {
            return res.status(400).json({ success: false, error: 'Invalid trade URL format. Must be a valid Steam trade URL.' });
        }

        // Verify item exists in user's inventory using bot
        const bot = botManager.getAvailableBot();
        if (!bot) {
            return res.status(503).json({ success: false, error: 'No bots available to verify inventory' });
        }

        // Get user's inventory to verify ownership
        const inventory = await bot.getInventory(sellerSteamId, appId);
        const item = inventory.find(i => i.assetid === assetId || i.id === assetId);

        if (!item) {
            return res.status(404).json({ success: false, error: 'Item not found in your inventory' });
        }

        if (!item.tradable) {
            return res.status(400).json({ success: false, error: 'Item is not tradable (trade hold active)' });
        }

        // Check if item is already listed
        const existing = await query(`
            SELECT id FROM listings 
            WHERE item_asset_id = $1 AND seller_steam_id = $2 AND status = 'active'
        `, [assetId, sellerSteamId]);

        if (existing.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'This item is already listed' });
        }

        // Create P2P listing
        const result = await query(`
            INSERT INTO listings (
                seller_steam_id, item_asset_id, item_name, item_market_hash_name,
                item_app_id, item_icon_url, item_rarity, item_exterior,
                price, currency, status, listing_type, seller_trade_url
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
        `, [
            sellerSteamId,
            assetId,
            item.name || item.market_name,
            item.market_hash_name,
            appId,
            item.icon_url || `https://steamcommunity-a.akamaihd.net/economy/image/${item.icon_url_large || item.icon_url}`,
            item.tags?.find(t => t.category === 'Rarity')?.localized_tag_name || null,
            item.tags?.find(t => t.category === 'Exterior')?.localized_tag_name || null,
            price,
            'USD',
            'active',
            'p2p',
            tradeUrl
        ]);

        console.log(`[P2P] New listing created: ${result.rows[0].id} by ${sellerSteamId}`);

        res.json({
            success: true,
            message: 'Item listed successfully!',
            data: result.rows[0]
        });

    } catch (err) {
        console.error('[P2P] List error:', err);
        res.status(500).json({ success: false, error: 'Failed to create listing' });
    }
});

/**
 * POST /api/p2p/buy/:listingId
 * Buy a P2P listing - money goes to escrow, seller receives trade request
 */
router.post('/buy/:listingId', requireAuth, async (req, res) => {
    const client = await pool.connect();
    try {
        const listingId = parseInt(req.params.listingId);
        const buyerSteamId = req.user.steamId;
        const { buyerTradeUrl } = req.body;

        if (!buyerTradeUrl) {
            return res.status(400).json({ success: false, error: 'buyerTradeUrl is required' });
        }

        await client.query('BEGIN');

        // Get listing with lock
        const listingRes = await client.query(`
            SELECT * FROM listings WHERE id = $1 AND listing_type = 'p2p' FOR UPDATE
        `, [listingId]);

        if (listingRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'P2P listing not found' });
        }

        const listing = listingRes.rows[0];

        if (listing.status !== 'active') {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, error: 'Listing is not available' });
        }

        if (listing.seller_steam_id === buyerSteamId) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, error: 'Cannot buy your own listing' });
        }

        // Check buyer balance
        const userRes = await client.query(
            'SELECT balance FROM users WHERE steam_id = $1 FOR UPDATE',
            [buyerSteamId]
        );

        if (userRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const balance = parseFloat(userRes.rows[0].balance);
        const price = parseFloat(listing.price);

        if (balance < price) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, error: 'Insufficient balance' });
        }

        // Calculate fees
        const platformFee = price * (PLATFORM_FEE_PERCENT / 100);
        const sellerPayout = price - platformFee;

        // Deduct from buyer
        await client.query(
            'UPDATE users SET balance = balance - $1 WHERE steam_id = $2',
            [price, buyerSteamId]
        );

        // Reserve listing
        await client.query(
            "UPDATE listings SET status = 'reserved', updated_at = NOW() WHERE id = $1",
            [listingId]
        );

        // Create escrow trade record
        const tradeUuid = uuidv4();
        const tradeRes = await client.query(`
            INSERT INTO escrow_trades (
                trade_uuid, listing_id, seller_steam_id, buyer_steam_id,
                item_asset_id, item_name, item_market_hash_name, item_app_id, item_icon_url,
                price, currency, status, trade_type,
                buyer_trade_url, platform_fee, seller_payout
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING *
        `, [
            tradeUuid, listingId, listing.seller_steam_id, buyerSteamId,
            listing.item_asset_id, listing.item_name, listing.item_market_hash_name,
            listing.item_app_id, listing.item_icon_url,
            price, 'USD', 'awaiting_seller', 'p2p',
            buyerTradeUrl, platformFee, sellerPayout
        ]);

        const trade = tradeRes.rows[0];

        // AUTOMATION: Send trade offer to seller requesting the item
        let sellerOfferResult = null;
        try {
            const bot = botManager.getAvailableBot();
            if (bot) {
                sellerOfferResult = await bot.requestItemFromUser({
                    sellerTradeUrl: listing.seller_trade_url,
                    assetId: listing.item_asset_id,
                    appId: listing.item_app_id || 730,
                    message: `Your item "${listing.item_name}" has been sold! Please accept this trade to complete the sale and receive $${sellerPayout.toFixed(2)}.`
                });

                // Save the seller trade offer ID
                await client.query(
                    `UPDATE escrow_trades SET seller_trade_offer_id = $1, seller_offer_sent_at = NOW() WHERE id = $2`,
                    [sellerOfferResult.offerId, trade.id]
                );

                console.log(`[P2P] Trade offer sent to seller: ${sellerOfferResult.offerId}`);
            } else {
                console.warn('[P2P] No bot available, seller must send item manually');
            }
        } catch (err) {
            console.error('[P2P] Failed to send trade offer to seller:', err.message);
            // Continue anyway - trade is still valid, just manual
        }

        await client.query('COMMIT');

        console.log(`[P2P] Purchase initiated: Trade ${tradeUuid}, Buyer: ${buyerSteamId}, Seller: ${listing.seller_steam_id}`);

        res.json({
            success: true,
            message: 'Purchase initiated! Waiting for seller to send the item.',
            data: {
                tradeUuid,
                status: 'awaiting_seller',
                item: listing.item_name,
                price,
                platformFee,
                sellerPayout
            }
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[P2P] Buy error:', err);
        res.status(500).json({ success: false, error: 'Failed to process purchase' });
    } finally {
        client.release();
    }
});

/**
 * DELETE /api/p2p/listing/:listingId
 * Cancel own P2P listing
 */
router.delete('/listing/:listingId', requireAuth, async (req, res) => {
    try {
        const listingId = parseInt(req.params.listingId);
        const sellerSteamId = req.user.steamId;

        const result = await query(`
            UPDATE listings 
            SET status = 'cancelled', updated_at = NOW()
            WHERE id = $1 AND seller_steam_id = $2 AND listing_type = 'p2p' AND status = 'active'
            RETURNING *
        `, [listingId, sellerSteamId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Listing not found or cannot be cancelled' });
        }

        res.json({ success: true, message: 'Listing cancelled' });

    } catch (err) {
        console.error('[P2P] Cancel listing error:', err);
        res.status(500).json({ success: false, error: 'Failed to cancel listing' });
    }
});

/**
 * GET /api/p2p/sales
 * Get seller's P2P sales history
 */
router.get('/sales', requireAuth, async (req, res) => {
    try {
        const result = await query(`
            SELECT t.*, l.item_name, l.item_icon_url
            FROM escrow_trades t
            JOIN listings l ON t.listing_id = l.id
            WHERE t.seller_steam_id = $1 AND t.trade_type = 'p2p'
            ORDER BY t.created_at DESC
        `, [req.user.steamId]);

        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('[P2P] Sales error:', err);
        res.status(500).json({ success: false, error: 'Failed to get sales' });
    }
});

module.exports = router;
