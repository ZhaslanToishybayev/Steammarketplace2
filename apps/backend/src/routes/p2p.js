const express = require('express');
const router = express.Router();
const p2pService = require('../services/p2p.service');
const { pool, query } = require('../config/database');
const scamProtection = require('../services/scam-protection.service');
const { p2pFlowService, P2P_STATUS, LISTING_STATUS } = require('../services/p2p-flow.service');
const { writeLimiter, sensitiveOperationsLimiter } = require('../middleware/rate-limiter');

// ── Helpers ────────────────────────────────────────────────────────────
const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ error: 'Not authenticated' });
};

/** Emit a P2P trade status change via Socket.IO */
function emitTradeUpdate(req, tradeUuid, status, extra = {}) {
    const io = req.app.get('io');
    if (!io) return;
    io.to(`trade:${tradeUuid}`).emit('trade:update', { tradeUuid, status, ...extra });
}

// ── API-key management ─────────────────────────────────────────────────

/** POST /api/p2p/register-key — Register / update Steam API Key */
router.post('/register-key', ensureAuthenticated, writeLimiter, async (req, res) => {
    try {
        const { apiKey } = req.body;
        await p2pService.registerApiKey(req.user.steamId, apiKey);
        res.json({ success: true, message: 'API Key registered' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

/** GET /api/p2p/has-key — Check whether the current user has a stored API key */
router.get('/has-key', ensureAuthenticated, async (req, res) => {
    try {
        const apiKey = await p2pService.getApiKey(req.user.steamId);
        res.json({ success: true, hasKey: Boolean(apiKey) });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── Listings (public + seller-own) ─────────────────────────────────────

/** GET /api/p2p/listings — Public P2P marketplace */
router.get('/listings', async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const result = await query(`
            SELECT
                id, seller_steam_id, item_asset_id, item_name,
                item_market_hash_name, item_app_id, item_icon_url,
                item_rarity, item_exterior, item_float,
                price, currency, status,
                last_verified_at, verification_status,
                created_at, updated_at
            FROM listings
            WHERE listing_type = 'p2p' AND status = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `, [LISTING_STATUS.OPEN, Number.parseInt(limit, 10), Number.parseInt(offset, 10)]);

        const count = await query(
            `SELECT COUNT(*) FROM listings WHERE listing_type = 'p2p' AND status = $1`,
            [LISTING_STATUS.OPEN],
        );

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total: Number.parseInt(count.rows[0].count, 10),
                limit: Number.parseInt(limit, 10),
                offset: Number.parseInt(offset, 10),
            },
        });
    } catch (err) {
        console.error('[P2P] Failed to list marketplace items:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch P2P listings' });
    }
});

/** GET /api/p2p/my-listings — Seller's own listings */
router.get('/my-listings', ensureAuthenticated, async (req, res) => {
    try {
        const result = await query(`
            SELECT
                id, seller_steam_id, item_asset_id, item_name,
                item_market_hash_name, item_app_id, item_icon_url,
                price, currency, status,
                last_verified_at, verification_status,
                removed_at, remove_reason,
                created_at, updated_at
            FROM listings
            WHERE listing_type = 'p2p' AND seller_steam_id = $1
            ORDER BY created_at DESC
        `, [req.user.steamId]);

        res.json({ success: true, listings: result.rows, data: result.rows });
    } catch (err) {
        console.error('[P2P] Failed to fetch seller listings:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch P2P listings' });
    }
});

/** POST /api/p2p/list-item — Create P2P Listing */
router.post('/list-item', ensureAuthenticated, writeLimiter, async (req, res) => {
    try {
        const { assetId, price, tradeUrl, appId = 730 } = req.body;
        const steamId = req.user.steamId;
        const sellerTradeUrl = tradeUrl || req.user.tradeUrl || '';
        const amount = Number.parseFloat(price);

        if (!assetId) return res.status(400).json({ success: false, error: 'assetId required' });
        if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ success: false, error: 'Valid price required' });
        if (!sellerTradeUrl) return res.status(400).json({ success: false, error: 'Trade URL is required' });

        let verifiedItem = null;
        if (process.env.P2P_STRICT_VERIFY !== 'false') {
            const ownership = await scamProtection.verifyItemOwnership(steamId, String(assetId), Number(appId));
            if (!ownership.valid) {
                return res.status(409).json({
                    success: false,
                    error: ownership.reason || 'Item ownership could not be verified',
                    retryable: Boolean(ownership.retryable),
                });
            }
            verifiedItem = ownership.item;
        }

        const itemName = verifiedItem?.market_hash_name || verifiedItem?.name || req.body.itemName || 'P2P Item';
        const itemIcon = verifiedItem?.icon_url || req.body.image || null;

        const result = await query(`
            INSERT INTO listings (
                seller_steam_id, seller_trade_url, item_asset_id,
                item_class_id, item_instance_id, item_name, item_market_hash_name,
                item_app_id, item_icon_url, price, status, listing_type,
                last_verified_at, verification_status, created_at, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'p2p',NOW(),'verified',NOW(),NOW())
            RETURNING id
        `, [
            steamId, sellerTradeUrl, String(assetId),
            verifiedItem?.classid || null, verifiedItem?.instanceid || null,
            itemName, verifiedItem?.market_hash_name || itemName,
            Number(appId), itemIcon, amount, LISTING_STATUS.OPEN,
        ]);

        res.json({ success: true, listingId: result.rows[0].id, status: LISTING_STATUS.OPEN });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Failed to list item' });
    }
});

/** DELETE /api/p2p/listings/:listingId — Remove an open listing */
router.delete('/listings/:listingId', ensureAuthenticated, writeLimiter, async (req, res) => {
    try {
        const result = await query(`
            UPDATE listings
            SET status = $1, removed_at = NOW(), remove_reason = 'seller_cancelled', updated_at = NOW()
            WHERE id = $2 AND seller_steam_id = $3 AND listing_type = 'p2p' AND status = $4
            RETURNING id
        `, [LISTING_STATUS.REMOVED, req.params.listingId, req.user.steamId, LISTING_STATUS.OPEN]);

        if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Open listing not found' });
        res.json({ success: true });
    } catch (err) {
        console.error('[P2P] Failed to remove listing:', err);
        res.status(500).json({ success: false, error: 'Failed to remove listing' });
    }
});

// ── Buy flow ───────────────────────────────────────────────────────────

/** POST /api/p2p/buy/:listingId — Buyer purchases a P2P item */
router.post('/buy/:listingId', ensureAuthenticated, sensitiveOperationsLimiter, async (req, res) => {
    const client = await pool.connect();
    try {
        const { listingId } = req.params;
        const buyerId = req.user.steamId;
        const buyerTradeUrl = req.body.tradeUrl || req.user.tradeUrl;
        const buyerProfileUrl = req.user.profileUrl || req.user.profile_url || null;

        if (!buyerTradeUrl) return res.status(400).json({ success: false, error: 'Buyer trade URL is required' });

        await client.query('BEGIN');

        const listRes = await client.query(
            "SELECT * FROM listings WHERE id = $1 AND listing_type = 'p2p' AND status = $2 FOR UPDATE",
            [listingId, LISTING_STATUS.OPEN],
        );
        if (listRes.rows.length === 0) throw new Error('Listing not found or already reserved');
        const listing = listRes.rows[0];
        if (listing.seller_steam_id === buyerId) throw new Error('Cannot buy your own item');

        // Ownership verification
        if (process.env.P2P_STRICT_VERIFY !== 'false') {
            const ownership = await scamProtection.verifyItemOwnership(
                listing.seller_steam_id,
                String(listing.item_asset_id),
                Number(listing.item_app_id || 730),
            );
            if (!ownership.valid && !ownership.retryable) {
                await client.query(
                    "UPDATE listings SET status=$1, removed_at=NOW(), remove_reason=$2, updated_at=NOW() WHERE id=$3",
                    [LISTING_STATUS.REMOVED, ownership.reason || 'Item no longer in seller inventory', listing.id],
                );
                throw new Error('Предмет уже продан.');
            }
            if (!ownership.valid) throw new Error(ownership.reason || 'Could not verify seller inventory');
            await client.query(
                "UPDATE listings SET last_verified_at=NOW(), verification_status='verified', updated_at=NOW() WHERE id=$1",
                [listing.id],
            );
        }

        const trade = await p2pFlowService.createReservedTrade(client, {
            listing,
            buyerSteamId: buyerId,
            buyerTradeUrl,
            buyerProfileUrl,
        });

        // Set 24-hour seller deadline
        const deadlineHours = Number.parseInt(process.env.P2P_SELLER_DEADLINE_HOURS || '24', 10);
        await client.query(
            `UPDATE escrow_trades SET seller_deadline_at = NOW() + ($1 || ' hours')::interval WHERE id = $2`,
            [String(deadlineHours), trade.id],
        );

        await client.query(
            "UPDATE listings SET status=$1, updated_at=NOW() WHERE id=$2",
            [LISTING_STATUS.RESERVED, listingId],
        );

        await client.query('COMMIT');

        // Notify seller via Socket.IO
        const io = req.app.get('io');
        if (io) {
            io.to(`user:${listing.seller_steam_id}`).emit('p2p:incoming_trade', {
                tradeUuid: trade.trade_uuid,
                itemName: listing.item_name,
                price: listing.price,
                buyerTradeUrl,
            });
        }

        res.json({
            success: true,
            tradeUuid: trade.trade_uuid,
            status: trade.status,
            message: 'Средства зарезервированы. Ожидаем, что продавец отправит Steam trade offer.',
        });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ success: false, error: err.message });
    } finally {
        client.release();
    }
});

// ── Trade management ───────────────────────────────────────────────────

/** GET /api/p2p/trades — List user's P2P trades (as buyer AND seller) */
router.get('/trades', ensureAuthenticated, async (req, res) => {
    try {
        const steamId = req.user.steamId;
        const { status, role, limit = 50, offset = 0 } = req.query;

        let where = `t.trade_type IN ('p2p', 'p2p_direct') AND (t.buyer_steam_id = $1 OR t.seller_steam_id = $1)`;
        const params = [steamId];
        let idx = 2;

        if (status) {
            where += ` AND t.status = $${idx}`;
            params.push(status);
            idx++;
        }
        if (role === 'buyer') {
            where = `t.trade_type IN ('p2p', 'p2p_direct') AND t.buyer_steam_id = $1`;
            if (status) { where += ` AND t.status = $${idx}`; }
        } else if (role === 'seller') {
            where = `t.trade_type IN ('p2p', 'p2p_direct') AND t.seller_steam_id = $1`;
            if (status) { where += ` AND t.status = $${idx}`; }
        }

        const result = await query(`
            SELECT
                t.id, t.trade_uuid, t.listing_id,
                t.buyer_steam_id, t.seller_steam_id,
                t.item_asset_id, t.item_name, t.item_app_id,
                t.price, t.platform_fee, t.platform_fee_percent, t.seller_payout,
                t.status, t.trade_type,
                t.buyer_trade_url, t.seller_trade_url,
                t.seller_trade_offer_id,
                t.payment_reserved_at, t.seller_notified_at,
                t.trade_sent_at, t.trade_accepted_at,
                t.settlement_due_at, t.settlement_released_at,
                t.seller_deadline_at,
                t.cancel_reason, t.cancelled_at, t.completed_at,
                t.created_at, t.updated_at,
                l.item_icon_url,
                CASE WHEN t.buyer_steam_id = $1 THEN 'buyer' ELSE 'seller' END AS role
            FROM escrow_trades t
            LEFT JOIN listings l ON l.id = t.listing_id
            WHERE ${where}
            ORDER BY t.created_at DESC
            LIMIT $${idx} OFFSET $${idx + 1}
        `, [...params, Number.parseInt(limit, 10), Number.parseInt(offset, 10)]);

        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('[P2P] Failed to list trades:', err);
        res.status(500).json({ success: false, error: 'Failed to list trades' });
    }
});

/** GET /api/p2p/trades/:tradeUuid — Single trade detail with history */
router.get('/trades/:tradeUuid', ensureAuthenticated, async (req, res) => {
    try {
        const steamId = req.user.steamId;
        const { tradeUuid } = req.params;

        const tradeRes = await query(`
            SELECT
                t.*,
                l.item_icon_url, l.item_market_hash_name, l.item_rarity, l.item_exterior,
                CASE WHEN t.buyer_steam_id = $2 THEN 'buyer' ELSE 'seller' END AS user_role
            FROM escrow_trades t
            LEFT JOIN listings l ON l.id = t.listing_id
            WHERE t.trade_uuid = $1
              AND (t.buyer_steam_id = $2 OR t.seller_steam_id = $2)
        `, [tradeUuid, steamId]);

        if (tradeRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Trade not found' });
        }

        const trade = tradeRes.rows[0];

        // Fetch status history
        const historyRes = await query(`
            SELECT old_status, new_status, changed_by, notes, created_at AS timestamp
            FROM escrow_trade_history
            WHERE escrow_trade_id = $1
            ORDER BY created_at ASC
        `, [trade.id]);

        trade.status_history = historyRes.rows;

        res.json({ success: true, data: trade });
    } catch (err) {
        console.error('[P2P] Failed to get trade:', err);
        res.status(500).json({ success: false, error: 'Failed to get trade' });
    }
});

/** POST /api/p2p/trades/:tradeUuid/seller-sent — Seller marks Steam trade offer as sent */
router.post('/trades/:tradeUuid/seller-sent', ensureAuthenticated, writeLimiter, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const tradeRes = await client.query(
            'SELECT id, seller_steam_id, status FROM escrow_trades WHERE trade_uuid = $1 FOR UPDATE',
            [req.params.tradeUuid],
        );
        if (tradeRes.rows.length === 0) throw new Error('Trade not found');
        const trade = tradeRes.rows[0];
        if (trade.seller_steam_id !== req.user.steamId) throw new Error('Only seller can mark trade as sent');
        if (trade.status !== P2P_STATUS.WAITING_SELLER) throw new Error(`Cannot mark as sent from status ${trade.status}`);

        await p2pFlowService.markSellerTradeSent(client, req.params.tradeUuid, req.body.tradeOfferId);
        await client.query('COMMIT');

        emitTradeUpdate(req, req.params.tradeUuid, P2P_STATUS.TRADE_SENT);
        res.json({ success: true, status: P2P_STATUS.TRADE_SENT });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ success: false, error: err.message });
    } finally {
        client.release();
    }
});

/** POST /api/p2p/trades/:tradeUuid/cancel — Cancel a P2P trade and refund buyer */
router.post('/trades/:tradeUuid/cancel', ensureAuthenticated, sensitiveOperationsLimiter, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const tradeRes = await client.query(
            'SELECT * FROM escrow_trades WHERE trade_uuid = $1 FOR UPDATE',
            [req.params.tradeUuid],
        );
        if (tradeRes.rows.length === 0) throw new Error('Trade not found');
        const trade = tradeRes.rows[0];
        const steamId = req.user.steamId;

        // Only buyer or seller can cancel
        if (trade.buyer_steam_id !== steamId && trade.seller_steam_id !== steamId) {
            throw new Error('Unauthorized');
        }

        // Can only cancel if trade hasn't been accepted yet
        const cancellable = [P2P_STATUS.PAYMENT_RESERVED, P2P_STATUS.WAITING_SELLER, P2P_STATUS.TRADE_SENT];
        if (!cancellable.includes(trade.status)) {
            throw new Error(`Cannot cancel trade in status: ${trade.status}`);
        }

        const reason = req.body.reason || (trade.buyer_steam_id === steamId ? 'Cancelled by buyer' : 'Cancelled by seller');
        const changedBy = trade.buyer_steam_id === steamId ? 'buyer' : 'seller';

        await p2pFlowService.cancelAndRefund(client, trade, reason, changedBy);

        await client.query('COMMIT');

        emitTradeUpdate(req, req.params.tradeUuid, P2P_STATUS.REFUNDED);
        res.json({ success: true, status: P2P_STATUS.REFUNDED, message: 'Trade cancelled and funds refunded.' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ success: false, error: err.message });
    } finally {
        client.release();
    }
});

/** POST /api/p2p/trades/:tradeUuid/sync — Manually sync trade status from Steam */
router.post('/trades/:tradeUuid/sync', ensureAuthenticated, writeLimiter, async (req, res) => {
    try {
        const steamId = req.user.steamId;

        // Make sure user is part of the trade
        const check = await query(
            'SELECT id FROM escrow_trades WHERE trade_uuid = $1 AND (buyer_steam_id = $2 OR seller_steam_id = $2)',
            [req.params.tradeUuid, steamId],
        );
        if (check.rows.length === 0) return res.status(404).json({ success: false, error: 'Trade not found' });

        const result = await p2pService.syncTrade(req.params.tradeUuid);

        if (result.status !== result.previousStatus) {
            emitTradeUpdate(req, req.params.tradeUuid, result.status);
        }

        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── Settlement & housekeeping ──────────────────────────────────────────

/** POST /api/p2p/settlements/release-due — Release 7-day settlement holds */
router.post('/settlements/release-due', ensureAuthenticated, sensitiveOperationsLimiter, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const released = await p2pFlowService.releaseDueSettlements(client);
        await client.query('COMMIT');
        res.json({ success: true, released });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
