const express = require('express');
const router = express.Router();
const { botManager } = require('../services/bot-manager.service'); // Check path! instant.js is in routes, bot-manager in services. ../services ok.
const { pool } = require('../config/database');
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

        // 3. Get Bot
        console.log('[Debug] Getting available bot...');
        const bot = botManager.getAvailableBot();
        if (!bot || !bot.isReady) {
            console.warn('[Debug] No bot ready');
            return res.status(503).json({ success: false, error: 'No bots available' });
        }
        console.log(`[Debug] Got bot ${bot.steamId}`);

        // 4. Create Trade Offer (Use Trade URL to ensure Token is present)
        console.log('[Debug] Creating trade offer for URL:', tradeUrl);
        const offer = bot.manager.createOffer(tradeUrl);

        // Add all items to offer
        itemsToTrade.forEach(item => {
            offer.addTheirItem({
                appid: item.appId || 730,
                contextid: item.contextId || 2,
                assetid: item.assetid || item.assetId,
                amount: 1
            });
        });

        offer.setMessage(`Instant Sell: ${items.length} items for $${grandTotal.toFixed(2)}`);

        // 4. Send Offer
        const status = await new Promise((resolve, reject) => {
            offer.send((err, status) => {
                if (err) return reject(err);
                resolve(status);
            });
        });

        console.log(`[Debug] Trade Offer Status: ${status}`);

        if (status === 'pending' || status === 'active' || status === 'sent') {
            // 5. Database Records
            const tradeId = offer.id;
            // Use config.steamId always
            const botSteamId = bot.config.steamId;

            await client.query('BEGIN');

            for (const item of itemsToTrade) {
                const tradeUuid = uuidv4();
                await client.query(`
                    INSERT INTO escrow_trades 
                    (buyer_trade_offer_id, buyer_steam_id, seller_steam_id, listing_id, item_app_id, item_asset_id, item_name, status, created_at, trade_type, price, trade_uuid, seller_payout, buyer_trade_url, seller_trade_url)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10, $11, $12, $13, $14)
                 `, [
                    tradeId,
                    botSteamId,
                    userId,
                    null,
                    item.appId || 730,
                    item.assetid || item.assetId,
                    item.marketHashName,
                    status === 'active' ? 'active' : 'sending_offer',
                    'deposit',
                    item.price,
                    tradeUuid,
                    item.price,
                    bot.config.tradeUrl || 'https://steamcommunity.com/tradeoffer/new/?partner=BOT', // Buyer (Bot) Trade URL
                    tradeUrl // Seller (User) Trade URL
                ]);
            }

            await client.query('COMMIT');

            return res.json({
                success: true,
                data: {
                    tradeUuid: tradeId,
                    status: status,
                    itemCount: itemsToTrade.length,
                    estimatedPayout: parseFloat(grandTotal.toFixed(2)),
                    message: status === 'active'
                        ? 'Trade offer sent! Please check your filtered trade offers.'
                        : 'Trade offer sent. Please accept it on Steam mobile.'
                }
            });
        }

        res.status(500).json({ success: false, error: 'Trade offer failed to send', status });

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
