const express = require('express');
const router = express.Router();
// const { botManager } = require('../services/bot-manager.service'); // Removed direct dependency
const { tradeQueueService } = require('../services/trade-queue.service');
const { pool, query } = require('../config/database');
const { priceEngine } = require('../services/price-engine.service');
const { v4: uuidv4 } = require('uuid');

// Middleware to ensure user is authenticated
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: 'Not authenticated' });
}

/**
 * POST /api/instant/price-check
 * Calculate instant sell prices for a list of items
 */
router.post('/price-check', ensureAuthenticated, async (req, res) => {
    try {
        const { items } = req.body; // Array of { assetId, marketHashName, appId }
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, error: 'Items array required' });
        }

        const results = [];
        let totalPayout = 0;
        let validItems = 0;

        // Process in parallel
        await Promise.all(items.map(async (item) => {
            const priceData = await priceEngine.getPrice(item.marketHashName, item.appId || 730);

            if (priceData && priceData.instantSellPrice) {
                // Smart Valuation
                let finalPrice = priceData.instantSellPrice; // Default
                let smartValuation = null;

                if (item.stickers || item.float) {
                    smartValuation = priceEngine.calculateSmartPrice(priceData.suggested, {
                        stickers: item.stickers,
                        float: item.float
                    });
                    // Recalculate Instant Sell Price based on Smart Market Price
                    if (smartValuation) {
                        finalPrice = priceEngine.calculateInstantSellPrice(smartValuation.total);
                    }
                }

                results.push({
                    marketHashName: item.marketHashName,
                    appId: item.appId,
                    price: {
                        ...priceData,
                        instantSellPrice: finalPrice
                    },
                    assetId: item.assetId,
                    smartValuation
                });
                totalPayout += finalPrice;
                validItems++;
            } else {
                results.push({
                    marketHashName: item.marketHashName,
                    appId: item.appId,
                    error: 'Price unavailable',
                    assetId: item.assetId
                });
            }
        }));

        res.json({
            success: true,
            data: {
                items: results,
                summary: {
                    totalItems: items.length,
                    validItems,
                    totalPayout: parseFloat(totalPayout.toFixed(2)),
                    currency: 'USD'
                }
            }
        });

    } catch (err) {
        console.error('Price Check Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/instant/sell
 * Bulk sell items to bot
 */
router.post('/sell', ensureAuthenticated, async (req, res) => {
    const client = await pool.connect();
    try {
        const { items } = req.body;
        const userId = req.user.steamId;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, error: 'Items array required' });
        }

        // 1. Calculate and Verify Prices
        const itemsToTrade = [];
        let grandTotal = 0;

        for (const item of items) {
            const priceData = await priceEngine.getPrice(item.marketHashName, item.appId || 730);
            if (!priceData || !priceData.instantSellPrice) {
                return res.status(400).json({ success: false, error: `Price unavailable for ${item.marketHashName}` });
            }

            let finalPrice = priceData.instantSellPrice;
            if (item.stickers || item.float) {
                const smartVal = priceEngine.calculateSmartPrice(priceData.suggested, {
                    stickers: item.stickers,
                    float: item.float
                });
                finalPrice = priceEngine.calculateInstantSellPrice(smartVal.total);
            }

            itemsToTrade.push({
                ...item,
                price: finalPrice
            });
            grandTotal += finalPrice;
        }

        // 2. Validate Trade URL (Prefer body, then profile)
        const tradeUrl = req.body.tradeUrl || req.user.tradeUrl;
        if (!tradeUrl) {
            return res.status(400).json({ success: false, error: 'Please, provide Trade URL.' });
        }

        // 3. Get Bot (From DB, since we are in API process)
        const botRes = await client.query("SELECT steam_id FROM bots WHERE status = 'online' LIMIT 1");
        if (botRes.rows.length === 0) {
            return res.status(503).json({ success: false, error: 'No bots available. Please try again later.' });
        }
        const botSteamId = botRes.rows[0].steam_id;

        await client.query('BEGIN');

        // 4. Process single item (Frontend currently sends 1 item)
        // If multiple items, we only track the first tradeUuid for the queue job, 
        // which assumes 1:1 mapping or requires worker refactor. 
        // For now, supporting single item flow safely.
        const item = itemsToTrade[0];
        const tradeUuid = uuidv4();

        await client.query(`
            INSERT INTO escrow_trades 
            (buyer_steam_id, seller_steam_id, listing_id, 
             item_app_id, item_asset_id, item_name, status, created_at, 
             trade_type, price, trade_uuid, seller_payout, 
             buyer_trade_url, seller_trade_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10, $11, $12, $13)
         `, [
            botSteamId, // Buyer is Bot
            userId,     // Seller is User
            null, // No listing_id for instant sell
            item.appId || 730,
            item.assetid || item.assetId,
            item.marketHashName,
            'queued', // Initial status
            'deposit', // trade_type
            item.price,
            tradeUuid,
            item.price,
            'https://steamcommunity.com/tradeoffer/new/?partner=BOT', // Bot Trade URL placeholder
            tradeUrl
        ]);

        await client.query('COMMIT');

        // 5. Add to Queue
        await tradeQueueService.addTradeJob({
            type: 'escrow-request-item', // DEPOSIT MODE
            tradeUuid: tradeUuid,
            tradeUrl: tradeUrl,
            itemsToReceive: [{
                assetId: item.assetid || item.assetId,
                appId: item.appId || 730,
                contextId: '2'
            }],
            itemsToGive: [],
            message: `[SGO Market] Instant Sell: ${item.marketHashName} for $${item.price.toFixed(2)}`
        }, { priority: 1 });

        return res.json({
            success: true,
            data: {
                tradeUuid: tradeUuid,
                status: 'queued',
                itemCount: 1,
                estimatedPayout: parseFloat(grandTotal.toFixed(2)),
                message: 'Trade offer queued. Please wait for the bot to send the offer.'
            }
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('CRITICAL INSTANT SELL ERROR:', err.message);
        if (err.stack) console.error(err.stack);
        res.status(500).json({ success: false, error: err.message || 'Unknown error' });
    } finally {
        client.release();
    }
});

// ... existing exports ...

/**
 * P2P Routes
 */
const p2pService = require('../services/p2p.service');

// POST /api/p2p/register-key
router.post('/p2p/register-key', ensureAuthenticated, async (req, res) => {
    try {
        const { apiKey } = req.body;
        const steamId = req.user.steamId;

        await p2pService.registerApiKey(steamId, apiKey);

        res.json({ success: true, message: 'API Key registered successfully' });
    } catch (err) {
        console.error('Register Key Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/p2p/status/:tradeOfferId
router.get('/p2p/status/:tradeOfferId', ensureAuthenticated, async (req, res) => {
    try {
        const { tradeOfferId } = req.params;
        const sellerSteamId = req.query.sellerId || req.user.steamId; // Allow checking own trades or if admin/bot

        const status = await p2pService.checkTradeStatus(sellerSteamId, tradeOfferId);

        res.json({ success: true, data: status });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
