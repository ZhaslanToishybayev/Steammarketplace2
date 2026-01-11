/**
 * Batch Trade Routes (Multi-Item Checkout)
 * Handles cart checkout with multiple items
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { advancedTradeQueue } = require('../services/advanced-trade-queue.service');
const cartService = require('../services/cart.service');

// Get user ID helper
const getUserId = (req) => {
    if (req.user?.steamId) return req.user.steamId;
    if (req.session?.passport?.user?.steamId) return req.session.passport.user.steamId;
    return null;
};

// Checkout cart (batch purchase)
router.post('/checkout', async (req, res) => {
    try {
        const steamId = getUserId(req);
        if (!steamId) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }

        // Get and lock cart
        const lockResult = await cartService.lockCartForCheckout(steamId);
        if (!lockResult.success) {
            return res.status(400).json(lockResult);
        }

        const cart = lockResult.cart;
        if (!cart.items || cart.items.length === 0) {
            await cartService.unlockCart(steamId);
            return res.status(400).json({ success: false, error: 'Cart is empty' });
        }

        // Calculate total
        const totalPrice = cart.items.reduce((sum, item) => sum + parseFloat(item.price || 0), 0);

        // Check user balance
        const userResult = await pool.query(
            'SELECT balance FROM users WHERE steam_id = $1',
            [steamId]
        );

        if (userResult.rows.length === 0) {
            await cartService.unlockCart(steamId);
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const userBalance = parseFloat(userResult.rows[0].balance);
        if (userBalance < totalPrice) {
            await cartService.unlockCart(steamId);
            return res.status(400).json({
                success: false,
                error: 'Insufficient balance',
                required: totalPrice,
                available: userBalance
            });
        }

        // Verify all listings are still available
        const listingIds = cart.items.map(i => i.listingId);
        const listingsResult = await pool.query(
            `SELECT id, seller_steam_id, price, status 
             FROM listings 
             WHERE id = ANY($1)`,
            [listingIds]
        );

        const listings = listingsResult.rows;
        const unavailable = cart.items.filter(
            cartItem => !listings.find(l => l.id === cartItem.listingId && l.status === 'active')
        );

        if (unavailable.length > 0) {
            await cartService.unlockCart(steamId);
            return res.status(400).json({
                success: false,
                error: 'Some items are no longer available',
                unavailable: unavailable.map(i => i.name)
            });
        }

        // Create batch trade
        const batchId = `batch_${Date.now()}_${steamId.slice(-6)}`;

        // Start transaction
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Deduct balance
            await client.query(
                'UPDATE users SET balance = balance - $1 WHERE steam_id = $2',
                [totalPrice, steamId]
            );

            // Record transaction
            await client.query(
                `INSERT INTO balance_transactions (steam_id, amount, type, reference_id, description)
                 VALUES ($1, $2, 'purchase', $3, $4)`,
                [steamId, -totalPrice, batchId, `Batch purchase of ${cart.items.length} items`]
            );

            // Mark listings as sold and create trades
            for (const item of cart.items) {
                const listing = listings.find(l => l.id === item.listingId);

                // Update listing status
                await client.query(
                    'UPDATE listings SET status = $1 WHERE id = $2',
                    ['sold', item.listingId]
                );

                // Create escrow trade
                await client.query(
                    `INSERT INTO escrow_trades (listing_id, buyer_id, status, trade_uuid)
                     VALUES ($1, (SELECT steam_id FROM users WHERE steam_id = $2), 'pending', $3)`,
                    [item.listingId, steamId, `${batchId}_${item.listingId}`]
                );
            }

            await client.query('COMMIT');

            // Add to trade queue
            const items = cart.items.map(item => {
                const listing = listings.find(l => l.id === item.listingId);
                return {
                    listingId: item.listingId,
                    name: item.name,
                    price: item.price,
                    sellerSteamId: listing.seller_steam_id
                };
            });

            const queueResult = await advancedTradeQueue.addBatchTrade(
                items,
                steamId,
                { priority: 3 }
            );

            // Clear cart
            await cartService.clearCart(steamId);

            res.json({
                success: true,
                data: {
                    batchId,
                    itemCount: cart.items.length,
                    totalPrice,
                    queue: queueResult
                }
            });

        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Batch checkout error:', error);
        await cartService.unlockCart(getUserId(req));
        res.status(500).json({ success: false, error: 'Checkout failed' });
    }
});

// Get batch trade status
router.get('/status/:batchId', async (req, res) => {
    try {
        const { batchId } = req.params;
        const steamId = getUserId(req);

        const result = await pool.query(`
            SELECT t.trade_uuid, t.status, t.trade_offer_id, l.item_name, l.price
            FROM escrow_trades t
            JOIN listings l ON t.listing_id = l.id
            WHERE t.trade_uuid LIKE $1 AND t.buyer_id = $2
        `, [`${batchId}%`, steamId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Batch not found' });
        }

        const items = result.rows;
        const allComplete = items.every(i => i.status === 'completed');
        const anyFailed = items.some(i => i.status === 'failed' || i.status === 'cancelled');

        res.json({
            success: true,
            data: {
                batchId,
                status: allComplete ? 'completed' : anyFailed ? 'partially_failed' : 'in_progress',
                items
            }
        });
    } catch (error) {
        console.error('Batch status error:', error);
        res.status(500).json({ success: false, error: 'Failed to get status' });
    }
});

module.exports = router;
