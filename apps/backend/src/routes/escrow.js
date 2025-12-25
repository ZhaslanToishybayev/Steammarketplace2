/**
 * Escrow Trade Routes (Production Version)
 * API endpoints for escrow trading system with real database queries
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { EscrowService, TradeStatus } = require('../services/escrow.service');
const { botManager } = require('../services/bot-manager.service');

// Initialize escrow service with database
const escrowService = new EscrowService({ query }, botManager);

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    // DEBUG LOGGING
    console.log('[AuthDebug] requireAuth hit');
    console.log('[AuthDebug] Session ID:', req.sessionID);
    console.log('[AuthDebug] User:', req.user ? req.user.steamId : 'No user');
    console.log('[AuthDebug] Headers:', JSON.stringify(req.headers['cookie']));
    console.log('[AuthDebug] IsAuthenticated:', req.isAuthenticated ? req.isAuthenticated() : 'Method missing');

    if (!req.isAuthenticated || !req.isAuthenticated()) {
        console.log('[AuthDebug] Auth failed - sending 401');
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    next();
};

// ==========================================
// LISTING ENDPOINTS
// ==========================================

/**
 * GET /api/escrow/listings
 * Get active listings with optional filters
 */
router.get('/listings', async (req, res) => {
    try {
        const {
            appId,
            minPrice,
            maxPrice,
            search,
            sortBy = 'created_at',
            sortOrder = 'desc',
            limit = 20,
            offset = 0
        } = req.query;

        // Build dynamic query
        let queryText = `
      SELECT id, seller_steam_id, item_asset_id, item_name, item_market_hash_name,
             item_app_id, item_icon_url, item_rarity, item_exterior, item_float, item_stickers,
             price, currency, status, views_count, created_at
      FROM listings 
      WHERE status = 'active'
    `;
        const params = [];
        let paramIndex = 1;

        if (appId) {
            queryText += ` AND item_app_id = $${paramIndex++}`;
            params.push(parseInt(appId));
        }

        if (minPrice) {
            queryText += ` AND price >= $${paramIndex++}`;
            params.push(parseFloat(minPrice));
        }

        if (maxPrice) {
            queryText += ` AND price <= $${paramIndex++}`;
            params.push(parseFloat(maxPrice));
        }

        if (search) {
            queryText += ` AND (item_name ILIKE $${paramIndex} OR item_market_hash_name ILIKE $${paramIndex++})`;
            params.push(`%${search}%`);
        }

        // Float filtering
        if (req.query.minFloat) {
            queryText += ` AND item_float >= $${paramIndex++}`;
            params.push(parseFloat(req.query.minFloat));
        }

        if (req.query.maxFloat) {
            queryText += ` AND item_float <= $${paramIndex++}`;
            params.push(parseFloat(req.query.maxFloat));
        }

        // Sticker filtering (Has stickers)
        if (req.query.hasStickers === 'true') {
            queryText += ` AND jsonb_array_length(item_stickers) > 0`;
        }


        // Sorting (whitelist allowed columns)
        const allowedSortColumns = ['created_at', 'price', 'item_name'];
        const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
        const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        queryText += ` ORDER BY ${sortColumn} ${order}`;

        // Pagination
        queryText += ` LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await query(queryText, params);

        // Get total count
        let countQuery = `SELECT COUNT(*) FROM listings WHERE status = 'active'`;
        const countResult = await query(countQuery);
        const total = parseInt(countResult.rows[0].count);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (err) {
        console.error('[Escrow] Failed to get listings:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch listings'
        });
    }
});

/**
 * GET /api/escrow/listings/:id
 * Get single listing by ID
 */
router.get('/listings/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(`
      SELECT * FROM listings WHERE id = $1
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Listing not found',
            });
        }

        // Increment view count
        await query('UPDATE listings SET views_count = views_count + 1 WHERE id = $1', [id]);

        res.json({
            success: true,
            data: result.rows[0],
        });
    } catch (err) {
        console.error('[Escrow] Failed to get listing:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch listing'
        });
    }
});

/**
 * POST /api/escrow/listings
 * Create a new listing
 */
router.post('/listings', requireAuth, async (req, res) => {
    try {
        const {
            assetId,
            appId,
            price,
            currency = 'USD',
            itemName,
            itemIconUrl,
            itemRarity,
            itemExterior,
            itemFloat,
            itemMarketHashName,
            itemStickers = [], // Default to empty array
            tradeUrl // Destructure tradeUrl from body
        } = req.body;

        // ... existing validation ...

        // Insert listing
        const result = await query(`
      INSERT INTO listings (
        seller_steam_id, seller_trade_url, item_asset_id, item_name, 
        item_market_hash_name, item_app_id, item_icon_url, item_rarity,
        item_exterior, item_float, item_stickers, price, currency, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'active')
      RETURNING *
    `, [
            req.user.steamId,
            tradeUrl,
            assetId,
            itemName || 'Unknown Item',
            itemMarketHashName,
            appId,
            itemIconUrl,
            itemRarity,
            itemExterior,
            itemFloat,
            JSON.stringify(itemStickers), // $11: stickers
            parseFloat(price),            // $12: price
            currency,                     // $13: currency
        ]);

        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'Listing created successfully',
        });
    } catch (err) {
        console.error('[Escrow] Failed to create listing:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to create listing'
        });
    }
});

/**
 * DELETE /api/escrow/listings/:id
 * Cancel/remove a listing
 */
router.delete('/listings/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        // Verify ownership
        const listing = await query(`
      SELECT * FROM listings WHERE id = $1 AND status = 'active'
    `, [id]);

        if (listing.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Listing not found',
            });
        }

        if (listing.rows[0].seller_steam_id !== req.user.steamId) {
            return res.status(403).json({
                success: false,
                error: 'You can only cancel your own listings',
            });
        }

        // Mark as cancelled (soft delete)
        await query(`
      UPDATE listings SET status = 'cancelled', updated_at = NOW() WHERE id = $1
    `, [id]);

        res.json({
            success: true,
            message: 'Listing cancelled successfully',
        });
    } catch (err) {
        console.error('[Escrow] Failed to delete listing:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to delete listing'
        });
    }
});

// ==========================================
// PURCHASE ENDPOINTS
// ==========================================

/**
 * POST /api/escrow/buy/:listingId
 * Initiate purchase of a listing
 */
/**
 * POST /api/escrow/buy/:listingId
 * Initiate purchase (REAL MONEY/BALANCE VERSION)
 */
router.post('/buy/:listingId', requireAuth, async (req, res) => {
    let client = null;
    try {
        const { listingId } = req.params;
        const buyerSteamId = req.user.steamId;

        // check buyer trade url
        // check buyer trade url
        const tradeUrl = req.user?.tradeUrl;
        if (!tradeUrl) {
            return res.status(400).json({ success: false, error: 'Please set your trade URL before purchasing' });
        }

        const { getClient } = require('../config/database');
        client = await getClient();
        await client.query('BEGIN'); // Start Transaction

        // 1. Lock User for Balance Check
        const userRes = await client.query(
            'SELECT balance FROM users WHERE steam_id = $1 FOR UPDATE',
            [buyerSteamId]
        );

        if (userRes.rows.length === 0) {
            throw new Error('User not found in wallet system');
        }

        const currentBalance = parseFloat(userRes.rows[0].balance);

        // 2. Lock Listing to prevent double buy
        const listingRes = await client.query(
            "SELECT * FROM listings WHERE id = $1 AND status = 'active' FOR UPDATE",
            [listingId]
        );

        if (listingRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'Listing not found or sold' });
        }

        const listing = listingRes.rows[0];

        // Self-buy check
        if (listing.seller_steam_id === buyerSteamId) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, error: 'Cannot buy your own item' });
        }

        // 3. Check Affordability
        const price = parseFloat(listing.price);
        if (currentBalance < price) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                error: `Insufficient balance. You need $${price} but have $${currentBalance}`,
                shortfall: price - currentBalance
            });
        }

        // 4. Deduct Balance
        await client.query(
            'UPDATE users SET balance = balance - $1 WHERE steam_id = $2',
            [price, buyerSteamId]
        );

        // 5. Create Trade Record
        const platformFeePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT || '5.0');
        const platformFee = price * (platformFeePercent / 100);
        const sellerPayout = price - platformFee;
        const tradeUuid = uuidv4();

        // Check if seller is one of our bots
        const sellingBot = botManager.getAllBots().find(b => b.config.steamId === listing.seller_steam_id);
        const isBotSale = !!sellingBot;

        const bot = isBotSale ? sellingBot : botManager.getAvailableBot();

        // Resolve Bot DB ID
        let botId = null;
        if (bot) {
            const botRes = await client.query('SELECT id FROM bots WHERE steam_id = $1', [bot.config.steamId]);
            if (botRes.rows.length > 0) {
                botId = botRes.rows[0].id;
            } else {
                // Auto-create bot record if missing (Safety net)
                const newBot = await client.query(
                    "INSERT INTO bots (steam_id, account_name, status, created_at) VALUES ($1, $2, 'online', NOW()) RETURNING id",
                    [bot.config.steamId, bot.config.accountName]
                );
                botId = newBot.rows[0].id;
            }
        }

        // If it's a bot sale, we skip 'payment_received' step and go straight to sending the item ('awaiting_buyer' logic essentially, but we trigger it immediately)
        // Actually, the statuses are:
        // P2P: pending -> payment_received -> awaiting_seller -> seller_accepted -> awaiting_buyer -> outcome
        // Bot: pending -> payment_received -> (skip awaiting_seller) -> awaiting_buyer -> outcome
        // We will start at 'payment_received' but immediately advance.

        const initialStatus = 'payment_received';

        const tradeRes = await client.query(`
          INSERT INTO escrow_trades (
            trade_uuid, listing_id, buyer_steam_id, buyer_trade_url,
            seller_steam_id, seller_trade_url, bot_id,
            item_asset_id, item_name, item_app_id,
            price, platform_fee, platform_fee_percent, seller_payout, currency,
            status, expires_at, trade_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          RETURNING *
        `, [
            tradeUuid, listing.id, buyerSteamId, tradeUrl,
            listing.seller_steam_id, listing.seller_trade_url, botId,
            listing.item_asset_id, listing.item_name, listing.item_app_id,
            price, platformFee, platformFeePercent, sellerPayout, listing.currency,
            initialStatus,
            new Date(Date.now() + 30 * 60 * 1000),
            isBotSale ? 'bot_sale' : 'p2p' // Added trade_type to distinguish
        ]);

        const trade = tradeRes.rows[0];

        // 6. Mark Listing Reserved
        await client.query(
            "UPDATE listings SET status = 'reserved', updated_at = NOW() WHERE id = $1",
            [listing.id]
        );

        // 7. Create Payment Transaction Record (Internal Wallet)
        await client.query(`
          INSERT INTO escrow_transactions (
            transaction_uuid, escrow_trade_id, steam_id, type, amount, currency, status, payment_provider
          ) VALUES ($1, $2, $3, 'payment', $4, $5, 'completed', 'internal_wallet')
        `, [uuidv4(), trade.id, buyerSteamId, price, listing.currency]);

        // 8. Commit
        await client.query('COMMIT');

        // Post-Commit Async Actions (Bot logic)
        if (bot) {
            try {
                if (isBotSale) {
                    // DIRECT SALE: Send item to buyer
                    console.log(`[Escrow] Bot Sale: Sending item directly to buyer ${buyerSteamId}...`);

                    const offerId = await bot.sendTradeOffer({
                        partnerTradeUrl: tradeUrl,
                        itemsToGive: [{ // GIVE item
                            assetId: trade.item_asset_id,
                            appId: trade.item_app_id,
                            contextId: '2',
                        }],
                        message: `[Steam Marketplace] Purchase #${tradeUuid.slice(0, 8)} - Here is your item!`,
                    });

                    // Update trade to awaiting_buyer (item sent)
                    query(`
                        UPDATE escrow_trades 
                        SET buyer_trade_offer_id = $1, status = 'awaiting_buyer', buyer_offer_sent_at = NOW()
                        WHERE id = $2
                      `, [offerId, trade.id]);

                } else {
                    // P2P SALE (Direct): Instruct seller to send item
                    console.log(`[Escrow] P2P Sale: Waiting for seller ${trade.seller_steam_id} to send item...`);

                    // Update trade to awaiting_seller_send (We use 'awaiting_seller' for now as generic 'waiting for seller action')
                    // But strictly speaking, we are waiting for seller to SEND to BUYER, not to BOT.
                    // We'll keep 'awaiting_seller' but the frontend should interpret it based on trade_type.

                    query(`
                        UPDATE escrow_trades 
                        SET status = 'awaiting_seller', updated_at = NOW()
                        WHERE id = $1
                      `, [trade.id]);

                    // TODO: Notify Seller via Socket/Email to send the item
                }
            } catch (botErr) {
                console.error('[Escrow] Bot offer failed in background:', botErr);
                // Mark as failed so it's not stuck
                query(`
                    UPDATE escrow_trades 
                    SET status = 'error_sending', updated_at = NOW()
                    WHERE id = $1
                `, [trade.id]);
            }
        }

        res.status(201).json({
            success: true,
            data: trade,
            message: isBotSale ? 'Purchase successful! Bot is sending the item.' : 'Purchase successful! Waiting for seller to send item.',
        });

    } catch (err) {
        if (client) await client.query('ROLLBACK');
        console.error('[Escrow] Buy failed:', err);
        res.status(500).json({ success: false, error: err.message || 'Purchase failed' });
    } finally {
        if (client) client.release();
    }
});

/**
 * POST /api/escrow/buy-cart
 * Initiate purchase for multiple listings (Cart Checkout)
 */
router.post('/buy-cart', requireAuth, async (req, res) => {
    let client = null;
    try {
        const { listingIds } = req.body;
        const buyerSteamId = req.user.steamId;
        const tradeUrl = req.user?.tradeUrl;

        if (!listingIds || !Array.isArray(listingIds) || listingIds.length === 0) {
            return res.status(400).json({ success: false, error: 'No items selected' });
        }

        if (!tradeUrl) {
            return res.status(400).json({ success: false, error: 'Please set your trade URL before purchasing' });
        }

        const { getClient } = require('../config/database');
        client = await getClient();
        await client.query('BEGIN'); // Start Transaction

        // 1. Lock User for Balance Check
        const userRes = await client.query(
            'SELECT balance FROM users WHERE steam_id = $1 FOR UPDATE',
            [buyerSteamId]
        );

        if (userRes.rows.length === 0) {
            throw new Error('User not found');
        }

        const currentBalance = parseFloat(userRes.rows[0].balance);

        // 2. Lock Listings and Get Details
        const listingsRes = await client.query(
            "SELECT * FROM listings WHERE id = ANY($1) AND status = 'active' FOR UPDATE",
            [listingIds]
        );

        const listings = listingsRes.rows;

        if (listings.length !== listingIds.length) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, error: 'One or more items are no longer available' });
        }

        // 3. Calculate Total and Validate
        let totalPrice = 0;
        const platformFeePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT || '5.0');

        for (const item of listings) {
            if (item.seller_steam_id === buyerSteamId) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, error: 'Cannot buy your own item' });
            }
            totalPrice += parseFloat(item.price);
        }

        // 4. Check Affordability
        if (currentBalance < totalPrice) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                error: `Insufficient balance. Need $${totalPrice.toFixed(2)} but have $${currentBalance.toFixed(2)}`
            });
        }

        // 5. Deduct Balance
        await client.query(
            'UPDATE users SET balance = balance - $1 WHERE steam_id = $2',
            [totalPrice, buyerSteamId]
        );

        // 6. Group by Seller (To optimize trade offers)
        const sellerGroups = {};
        for (const item of listings) {
            if (!sellerGroups[item.seller_steam_id]) {
                sellerGroups[item.seller_steam_id] = [];
            }
            sellerGroups[item.seller_steam_id].push(item);
        }

        const tradesCreated = [];
        const botActions = []; // Post-commit actions

        // 7. Process Each Seller Group
        for (const sellerSteamId in sellerGroups) {
            const sellerItems = sellerGroups[sellerSteamId];
            const tradeUuid = uuidv4(); // One UUID per batch? Or per item? Let's do per item for now to match DB schema 
            // DB schema expects one row per item traded usually.
            // But we want to send ONE trade offer.

            // Resolve Bot (if seller is bot)
            const sellingBot = botManager.getAllBots().find(b => b.config.steamId === sellerSteamId);
            const isBotSale = !!sellingBot;

            let botId = null;
            if (sellingBot) {
                // Get/Create bot ID logic (simplified reuse)
                const botRes = await client.query('SELECT id FROM bots WHERE steam_id = $1', [sellerSteamId]);
                if (botRes.rows.length > 0) botId = botRes.rows[0].id;
            }

            // Create Escrow Trade Records (One per item)
            // But we will link them to the SAME trade_offer_id later
            const groupTradeIds = [];

            for (const item of sellerItems) {
                const itemUuid = uuidv4();
                const price = parseFloat(item.price);
                const platformFee = price * (platformFeePercent / 100);
                const sellerPayout = price - platformFee;

                const tradeRes = await client.query(`
                    INSERT INTO escrow_trades (
                        trade_uuid, listing_id, buyer_steam_id, buyer_trade_url,
                        seller_steam_id, seller_trade_url, bot_id,
                        item_asset_id, item_name, item_app_id,
                        price, platform_fee, platform_fee_percent, seller_payout, currency,
                        status, expires_at, trade_type
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
                    RETURNING id
                `, [
                    itemUuid, item.id, buyerSteamId, tradeUrl,
                    sellerSteamId, item.seller_trade_url, botId,
                    item.item_asset_id, item.item_name, item.item_app_id,
                    price, platformFee, platformFeePercent, sellerPayout, item.currency,
                    'payment_received',
                    new Date(Date.now() + 30 * 60 * 1000),
                    isBotSale ? 'bot_sale' : 'p2p'
                ]);

                groupTradeIds.push({ tradeId: tradeRes.rows[0].id, item });

                // Mark listing reserved
                await client.query("UPDATE listings SET status = 'reserved', updated_at = NOW() WHERE id = $1", [item.id]);

                // Create Transaction
                await client.query(`
                   INSERT INTO escrow_transactions (
                     transaction_uuid, escrow_trade_id, steam_id, type, amount, currency, status, payment_provider
                   ) VALUES ($1, $2, $3, 'payment', $4, $5, 'completed', 'internal_wallet')
                 `, [uuidv4(), tradeRes.rows[0].id, buyerSteamId, price, item.currency]);
            }

            // Prepare Bot Action
            if (isBotSale) {
                botActions.push({
                    bot: sellingBot,
                    tradeUrl: tradeUrl,
                    items: sellerItems,
                    tradeIds: groupTradeIds.map(g => g.tradeId),
                    buyerId: buyerSteamId
                });
            }
        }

        await client.query('COMMIT');

        // 8. Execute Bot Offers (Post-Commit)
        for (const action of botActions) {
            try {
                console.log(`[Escrow] Batch Bot Sale: Sending ${action.items.length} items to ${action.buyerId}...`);

                const itemsToGive = action.items.map(item => ({
                    assetId: item.item_asset_id,
                    appId: item.item_app_id,
                    contextId: '2',
                }));

                const offerId = await action.bot.sendTradeOffer({
                    partnerTradeUrl: action.tradeUrl,
                    itemsToGive: itemsToGive,
                    message: `[Steam Marketplace] Batch Purchase (${itemsToGive.length} items) - Enjoy!`,
                });

                // Update ALL trades in this batch with the SAME offer ID
                // And mark as 'awaiting_buyer'
                await query(`
                    UPDATE escrow_trades 
                    SET buyer_trade_offer_id = $1, status = 'awaiting_buyer', buyer_offer_sent_at = NOW()
                    WHERE id = ANY($2)
                `, [offerId, action.tradeIds]);

            } catch (err) {
                console.error('[Escrow] Batch bot offer failed:', err);
                query(`
                    UPDATE escrow_trades 
                    SET status = 'error_sending', updated_at = NOW()
                    WHERE id = ANY($1)
                `, [action.tradeIds]);
            }
        }

        res.status(200).json({
            success: true,
            message: `Successfully purchased ${listings.length} items. Trades are being sent.`,
        });

    } catch (err) {
        if (client) await client.query('ROLLBACK');
        console.error('[Escrow] Buy-Cart failed:', err);
        res.status(500).json({ success: false, error: err.message || 'Batch purchase failed' });
    } finally {
        if (client) client.release();
    }
});

/**
 * GET /api/escrow/trades
 * Get user's escrow trades
 */
router.get('/trades', requireAuth, async (req, res) => {
    try {
        const { status, role, limit = 20, offset = 0 } = req.query;
        const steamId = req.user.steamId;

        let queryText = `
      SELECT t.*, 
        CASE WHEN t.buyer_steam_id = $1 THEN 'buyer' ELSE 'seller' END as role
      FROM escrow_trades t
      WHERE (t.buyer_steam_id = $1 OR t.seller_steam_id = $1)
    `;
        const params = [steamId];
        let paramIndex = 2;

        if (status) {
            queryText += ` AND t.status = $${paramIndex++}`;
            params.push(status);
        }

        if (role === 'buyer') {
            queryText += ` AND t.buyer_steam_id = $1`;
        } else if (role === 'seller') {
            queryText += ` AND t.seller_steam_id = $1`;
        }

        queryText += ` ORDER BY t.created_at DESC`;
        queryText += ` LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await query(queryText, params);

        // Get total count
        const countResult = await query(`
      SELECT COUNT(*) FROM escrow_trades 
      WHERE buyer_steam_id = $1 OR seller_steam_id = $1
    `, [steamId]);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].count),
                limit: parseInt(limit),
                offset: parseInt(offset),
            },
        });
    } catch (err) {
        console.error('[Escrow] Failed to get trades:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch trades'
        });
    }
});

/**
 * GET /api/escrow/trades/:tradeUuid
 * Get single trade details
 */
router.get('/trades/:tradeUuid', requireAuth, async (req, res) => {
    try {
        const { tradeUuid } = req.params;

        const result = await query(`
      SELECT t.*,
        CASE WHEN t.buyer_steam_id = $2 THEN 'buyer' ELSE 'seller' END as user_role
      FROM escrow_trades t
      WHERE t.trade_uuid = $1 AND (t.buyer_steam_id = $2 OR t.seller_steam_id = $2)
    `, [tradeUuid, req.user.steamId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Trade not found',
            });
        }

        // Get status history
        const historyResult = await query(`
      SELECT new_status as status, created_at as timestamp
      FROM escrow_trade_history
      WHERE escrow_trade_id = $1
      ORDER BY created_at ASC
    `, [result.rows[0].id]);

        const trade = result.rows[0];
        trade.status_history = historyResult.rows;

        res.json({
            success: true,
            data: trade,
        });
    } catch (err) {
        console.error('[Escrow] Failed to get trade:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch trade'
        });
    }
});

/**
 * POST /api/escrow/trades/:tradeUuid/pay
 * Process payment for trade (simulated for demo)
 */
router.post('/trades/:tradeUuid/pay', requireAuth, async (req, res) => {
    try {
        const { tradeUuid } = req.params;
        const { paymentMethod } = req.body;

        // Get trade
        const tradeResult = await query(`
      SELECT * FROM escrow_trades 
      WHERE trade_uuid = $1 AND buyer_steam_id = $2 AND status = 'pending_payment'
    `, [tradeUuid, req.user.steamId]);

        if (tradeResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Trade not found or payment already processed',
            });
        }

        const trade = tradeResult.rows[0];

        // Create payment transaction record
        const transactionUuid = uuidv4();
        await query(`
      INSERT INTO escrow_transactions (
        transaction_uuid, escrow_trade_id, steam_id, type, amount, currency, status, payment_provider
      ) VALUES ($1, $2, $3, 'payment', $4, $5, 'completed', $6)
    `, [transactionUuid, trade.id, req.user.steamId, trade.price, trade.currency, paymentMethod || 'stripe']);

        // Update trade status
        await query(`
      UPDATE escrow_trades 
      SET status = 'payment_received', payment_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `, [trade.id]);

        // Record history
        await query(`
      INSERT INTO escrow_trade_history (escrow_trade_id, old_status, new_status, changed_by)
      VALUES ($1, 'pending_payment', 'payment_received', $2)
    `, [trade.id, req.user.steamId]);

        // Send WebSocket notification
        const io = req.app.get('io');
        if (io) {
            io.to(`user:${trade.seller_steam_id}`).emit('escrow:payment_received', {
                tradeUuid,
                itemName: trade.item_name,
                price: trade.price,
            });
        }

        // Queue trade offer to seller (Rate Limited via TradeQueueService)
        try {
            console.log(`[Escrow] Queueing trade offer for seller ${trade.seller_steam_id}...`);
            const { tradeQueueService } = require('../services/trade-queue.service');

            const { jobId } = await tradeQueueService.addTradeJob({
                type: 'escrow-request-item',
                tradeUuid,
                tradeId: trade.id,
                tradeUrl: trade.seller_trade_url,
                itemsToReceive: [{
                    assetId: trade.item_asset_id,
                    appId: trade.item_app_id,
                    contextId: '2',
                }],
                itemsToGive: [],
                message: `[Steam Marketplace] Please send your ${trade.item_name} for escrow trade #${tradeUuid.slice(0, 8)}`,
            }, { priority: 3 }); // Priority 3 = Normal escrow

            // Update trade status to awaiting_seller (offer will be sent by queue processor)
            await query(`
              UPDATE escrow_trades 
              SET status = 'awaiting_seller', seller_offer_sent_at = NOW()
              WHERE id = $1
            `, [trade.id]);

            await query(`
              INSERT INTO escrow_trade_history (escrow_trade_id, old_status, new_status, notes)
              VALUES ($1, 'payment_received', 'awaiting_seller', $2)
            `, [trade.id, `Trade job ${jobId} queued`]);

            console.log(`[Escrow] Trade job ${jobId} queued successfully`);
        } catch (queueErr) {
            console.error('[Escrow] Failed to queue trade offer:', queueErr.message);
            // Trade continues, but manual intervention may be needed
        }

        res.json({
            success: true,
            data: {
                trade_uuid: tradeUuid,
                status: 'payment_received',
                message: 'Payment successful! We are now requesting the item from the seller.',
            },
        });
    } catch (err) {
        console.error('[Escrow] Failed to process payment:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to process payment'
        });
    }
});

/**
 * POST /api/escrow/trades/:tradeUuid/cancel
 * Cancel a trade
 */
router.post('/trades/:tradeUuid/cancel', requireAuth, async (req, res) => {
    try {
        const { tradeUuid } = req.params;
        const { reason } = req.body;

        // Get trade
        const tradeResult = await query(`
      SELECT * FROM escrow_trades 
      WHERE trade_uuid = $1 AND (buyer_steam_id = $2 OR seller_steam_id = $2)
    `, [tradeUuid, req.user.steamId]);

        if (tradeResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Trade not found',
            });
        }

        const trade = tradeResult.rows[0];

        // Check if trade can be cancelled
        const nonCancellableStatuses = ['completed', 'cancelled', 'refunded'];
        if (nonCancellableStatuses.includes(trade.status)) {
            return res.status(400).json({
                success: false,
                error: `Cannot cancel trade in ${trade.status} status`,
            });
        }

        // Cancel trade
        await query(`
      UPDATE escrow_trades 
      SET status = 'cancelled', cancel_reason = $2, cancelled_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `, [trade.id, reason]);

        // Restore listing if exists
        await query(`
      UPDATE listings SET status = 'active', updated_at = NOW() WHERE id = $1
    `, [trade.listing_id]);

        // Record history
        await query(`
      INSERT INTO escrow_trade_history (escrow_trade_id, old_status, new_status, changed_by, notes)
      VALUES ($1, $2, 'cancelled', $3, $4)
    `, [trade.id, trade.status, req.user.steamId, reason]);

        // If payment was received, create refund record
        if (['payment_received', 'awaiting_seller'].includes(trade.status)) {
            await query(`
        INSERT INTO escrow_transactions (
          transaction_uuid, escrow_trade_id, steam_id, type, amount, currency, status
        ) VALUES ($1, $2, $3, 'refund', $4, $5, 'completed')
      `, [uuidv4(), trade.id, trade.buyer_steam_id, trade.price, trade.currency]);
        }

        res.json({
            success: true,
            data: {
                trade_uuid: tradeUuid,
                status: 'cancelled',
                message: 'Trade cancelled successfully.',
            },
        });
    } catch (err) {
        console.error('[Escrow] Failed to cancel trade:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to cancel trade'
        });
    }
});

// ==========================================
// BOT STATUS ENDPOINT
// ==========================================

/**
 * GET /api/escrow/bots/status
 * Get bot pool status
 */
router.get('/bots/status', async (req, res) => {
    try {
        const stats = botManager.getStatistics();

        res.json({
            success: true,
            data: stats,
        });
    } catch (err) {
        console.error('[Escrow] Failed to get bot status:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch bot status'
        });
    }
});

/**
 * POST /api/escrow/trades/:tradeUuid/retry
 * Retry sending the trade offer (for error_sending status)
 */
router.post('/trades/:tradeUuid/retry', requireAuth, async (req, res) => {
    try {
        const { tradeUuid } = req.params;

        // 1. Get Trade
        const tradeRes = await query(`
            SELECT * FROM escrow_trades 
            WHERE trade_uuid = $1 AND buyer_steam_id = $2
        `, [tradeUuid, req.user.steamId]);

        if (tradeRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Trade not found' });
        }

        const trade = tradeRes.rows[0];

        // 2. Validate Status
        if (trade.status !== 'error_sending') {
            return res.status(400).json({ success: false, error: 'Trade is not in a retryable state' });
        }

        // 3. Resolve Bot
        let bot = null;
        if (trade.bot_id) {
            const botRes = await query('SELECT steam_id FROM bots WHERE id = $1', [trade.bot_id]);
            if (botRes.rows.length > 0) {
                const botSteamId = botRes.rows[0].steam_id;
                bot = botManager.getAllBots().find(b => b.config.steamId === botSteamId);
            }
        }

        if (!bot) {
            // Fallback: get any available bot if original bot not found (though unusual)
            bot = botManager.getAvailableBot();
        }

        if (!bot) {
            return res.status(503).json({ success: false, error: 'No bots available' });
        }

        console.log(`[Escrow] Retrying trade ${tradeUuid}...`);

        // 4. Send Offer (Async)
        // We do this sync partially to catch immediate errors, or async?
        // Let's do await to give immediate feedback.

        const itemsToGive = [{
            assetId: trade.item_asset_id,
            appId: trade.item_app_id,
            contextId: '2'
        }];

        const offerId = await bot.sendTradeOffer({
            partnerTradeUrl: trade.buyer_trade_url,
            itemsToGive: itemsToGive,
            message: `[Steam Marketplace] Retry Purchase #${tradeUuid.slice(0, 8)}`,
        });

        // 5. Update Status
        await query(`
            UPDATE escrow_trades 
            SET buyer_trade_offer_id = $1, status = 'awaiting_buyer', buyer_offer_sent_at = NOW()
            WHERE id = $2
        `, [offerId, trade.id]);

        res.json({ success: true, message: 'Trade offer sent successfully!' });

    } catch (err) {
        console.error('[Escrow] Retry failed:', err);
        // Keep status as error_sending, but return error to user
        res.status(502).json({ success: false, error: 'Steam is still unstable. Please try again in a minute.' });
    }
});

/**
 * POST /api/escrow/trades/:tradeUuid/cancel
 * Cancel a failed trade and refund the user (for error_sending status)
 */
router.post('/trades/:tradeUuid/cancel', requireAuth, async (req, res) => {
    let client = null;
    try {
        const { tradeUuid } = req.params;
        const buyerSteamId = req.user.steamId;

        const { getClient } = require('../config/database');
        client = await getClient();
        await client.query('BEGIN');

        // 1. Lock Trade
        const tradeRes = await client.query(`
            SELECT * FROM escrow_trades 
            WHERE trade_uuid = $1 AND buyer_steam_id = $2 FOR UPDATE
        `, [tradeUuid, buyerSteamId]);

        if (tradeRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'Trade not found' });
        }

        const trade = tradeRes.rows[0];

        // 2. Validate Status (Only allow cancelling if it stuck in error state)
        if (trade.status !== 'error_sending') {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, error: 'Cannot cancel this trade' });
        }

        const price = parseFloat(trade.price);

        // 3. Refund User
        await client.query(
            "UPDATE users SET balance = balance + $1 WHERE steam_id = $2",
            [price, buyerSteamId]
        );

        // 4. Reset Listing to Active
        await client.query(
            "UPDATE listings SET status = 'active', updated_at = NOW() WHERE id = $1",
            [trade.listing_id]
        );

        // 5. Update Trade Status
        await client.query(
            "UPDATE escrow_trades SET status = 'cancelled', updated_at = NOW() WHERE id = $1",
            [trade.id]
        );

        // 6. Record Refund Transaction
        const { v4: uuidv4 } = require('uuid');
        await client.query(`
            INSERT INTO escrow_transactions (
                transaction_uuid, escrow_trade_id, steam_id, type, amount, currency, status, payment_provider
            ) VALUES ($1, $2, $3, 'refund', $4, $5, 'completed', 'internal_wallet')
        `, [uuidv4(), trade.id, buyerSteamId, price, trade.currency]);

        await client.query('COMMIT');

        console.log(`[Escrow] Trade ${tradeUuid} cancelled and refunded $${price} to ${buyerSteamId}`);
        res.json({ success: true, message: 'Trade cancelled and refunded successfully' });

    } catch (err) {
        if (client) await client.query('ROLLBACK');
        console.error('[Escrow] Cancel failed:', err);
        res.status(500).json({ success: false, error: 'Failed to cancel trade' });
    } finally {
        if (client) client.release();
    }
});

module.exports = router;
