const express = require('express');
const router = express.Router();
const p2pService = require('../services/p2p.service');
const auditService = require('../services/audit.service');
const { pool, query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Middleware
const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ error: 'Not authenticated' });
};

/**
 * POST /api/p2p/register-key
 * Register Steam API Key
 */
router.post('/register-key', ensureAuthenticated, async (req, res) => {
    try {
        const { apiKey } = req.body;
        const steamId = req.user.steamId;
        
        await p2pService.registerApiKey(steamId, apiKey);
        res.json({ success: true, message: 'API Key registered' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/p2p/list-item
 * Create P2P Listing
 */
router.post('/list-item', ensureAuthenticated, async (req, res) => {
    try {
        const { assetId, price, description, tradeUrl } = req.body;
        const steamId = req.user.steamId;

        // Verify user owns item (should call inventory service, skipping for speed/mock)
        // Insert into listings
        const result = await query(`
            INSERT INTO listings (
                seller_steam_id, seller_trade_url, item_asset_id,
                item_name, item_app_id, price, status, listing_type, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, 'active', 'p2p', NOW())
            RETURNING id
        `, [
            steamId, 
            tradeUrl || req.user.tradeUrl || '', 
            assetId, 
            'P2P Item (Mock Name)', // Should fetch real name
            730, 
            price
        ]);

        res.json({ success: true, listingId: result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Failed to list item' });
    }
});

/**
 * POST /api/p2p/buy/:listingId
 * Buy P2P Item
 */
router.post('/buy/:listingId', ensureAuthenticated, async (req, res) => {
    const client = await pool.connect();
    try {
        const { listingId } = req.params;
        const buyerId = req.user.steamId;
        const buyerTradeUrl = req.body.tradeUrl || req.user.tradeUrl;

        await client.query('BEGIN');

        // 1. Get Listing
        const listRes = await client.query("SELECT * FROM listings WHERE id = $1 AND status = 'active' FOR UPDATE", [listingId]);
        if (listRes.rows.length === 0) throw new Error('Listing not found or sold');
        const listing = listRes.rows[0];

        if (listing.seller_steam_id === buyerId) throw new Error('Cannot buy your own item');

        // 2. Check Balance
        const userRes = await client.query("SELECT balance FROM users WHERE steam_id = $1", [buyerId]);
        const balance = parseFloat(userRes.rows[0].balance);
        const price = parseFloat(listing.price);

        if (balance < price) throw new Error('Insufficient balance');

        // 3. Deduct Balance
        await client.query("UPDATE users SET balance = balance - $1 WHERE steam_id = $2", [price, buyerId]);

        // 3.5 Calculate Fees
        const platformFeePercent = 5.0;
        const platformFee = price * (platformFeePercent / 100);
        const sellerPayout = price - platformFee;

        // 4. Create Trade Record
        const tradeUuid = uuidv4();
        await client.query(`
            INSERT INTO escrow_trades (
                trade_uuid, listing_id, buyer_steam_id, seller_steam_id,
                item_asset_id, item_name, item_app_id, price,
                platform_fee, platform_fee_percent, seller_payout,
                status, trade_type, buyer_trade_url, seller_trade_url, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'awaiting_seller_send', 'p2p', $12, $13, NOW())
        `, [
            tradeUuid, listingId, buyerId, listing.seller_steam_id,
            listing.item_asset_id, listing.item_name, listing.item_app_id, price,
            platformFee, platformFeePercent, sellerPayout,
            buyerTradeUrl, listing.seller_trade_url
        ]);

        // 5. Update Listing
        await client.query("UPDATE listings SET status = 'reserved' WHERE id = $1", [listingId]);

        await client.query('COMMIT');

        // Audit Log
        await auditService.log(
            buyerId, 
            'TRADE_BUY_P2P', 
            tradeUuid, 
            { price, listingId, seller: listing.seller_steam_id }, 
            req.ip
        );

        res.json({ 
            success: true, 
            tradeUuid, 
            message: 'Item purchased. Waiting for seller to send offer.' 
        });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ success: false, error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;