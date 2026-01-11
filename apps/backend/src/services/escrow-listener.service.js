const { botManager } = require('./bot-manager.service');
const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const SteamTradeOfferManager = require('steam-tradeoffer-manager');
const telegram = require('./telegram-bot.service');

class EscrowListenerService {
    constructor() {
        this.startListening();
    }

    startListening() {
        console.log('[EscrowListener] Listening for trade events...');

        // Listen for SENT offers (bot -> buyer for normal trades)
        botManager.on('sentOfferChanged', async ({ id, newState, stateName }) => {
            console.log(`[EscrowListener] Sent offer ${id} changed to ${stateName} (state ${newState})`);

            // Accepted (3) - Trade completed successfully
            if (newState === SteamTradeOfferManager.ETradeOfferState.Accepted || newState === 3) {
                console.log(`[EscrowListener] ✅ Sent offer ${id} ACCEPTED. Finalizing trade...`);
                await this.handleSentOfferAccepted(id);
            }

            // Failed states - need refund
            const failedStates = [6, 7, 8, 9, 10]; // Canceled, Declined, Expired, InvalidItems, CanceledBySecondFactor
            if (failedStates.includes(newState)) {
                console.log(`[EscrowListener] ❌ Sent offer ${id} FAILED (${stateName}). Auto-refunding...`);
                await this.handleSentOfferDeclined(id, stateName);
            }
        });

        // Listen for RECEIVED offers (seller -> bot for P2P trades)
        botManager.on('receivedOfferChanged', async ({ id, newState, stateName, offer }) => {
            console.log(`[EscrowListener] Received offer ${id} changed to ${stateName} (state ${newState})`);

            // When bot receives an item (from P2P seller accepting our request)
            if (newState === SteamTradeOfferManager.ETradeOfferState.Accepted || newState === 3) {
                console.log(`[EscrowListener] ✅ Received offer ${id} ACCEPTED. Processing P2P...`);
                await this.handleReceivedOfferAccepted(id, offer);
            }
        });
    }

    /**
     * Handle when bot successfully sent item to buyer (normal bot_sale trade)
     */
    async handleSentOfferAccepted(tradeOfferId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Find trade by buyer_trade_offer_id
            const tradeRes = await client.query(
                `SELECT * FROM escrow_trades WHERE buyer_trade_offer_id = $1 FOR UPDATE`,
                [tradeOfferId]
            );

            if (tradeRes.rows.length === 0) {
                console.log(`[EscrowListener] Trade ${tradeOfferId} not found. Skipping.`);
                await client.query('ROLLBACK');
                return;
            }

            const trade = tradeRes.rows[0];

            if (trade.status === 'completed') {
                console.log(`[EscrowListener] Trade ${trade.id} already completed.`);
                await client.query('ROLLBACK');
                return;
            }

            // Update status to completed
            await client.query(
                `UPDATE escrow_trades SET status = 'completed', updated_at = NOW() WHERE id = $1`,
                [trade.id]
            );

            // HANDLE INSTANT SELL / DEPOSIT PAYOUT
            if (trade.trade_type === 'deposit') {
                console.log(`[EscrowListener] processing Instant Sell Payout for trade ${trade.id}...`);

                // Credit seller balance
                const payoutAmount = parseFloat(trade.seller_payout);
                await client.query(
                    `UPDATE users SET balance = balance + $1 WHERE steam_id = $2`,
                    [payoutAmount, trade.seller_steam_id]
                );

                // Record payout transaction
                await client.query(`
                    INSERT INTO escrow_transactions (
                        transaction_uuid, escrow_trade_id, steam_id, type, amount, currency, status, payment_provider
                    ) VALUES ($1, $2, $3, 'seller_payout', $4, $5, 'completed', 'instant_sell')
                `, [uuidv4(), trade.id, trade.seller_steam_id, payoutAmount, trade.currency]);

                console.log(`[EscrowListener] 💰 Instant Sell: Paid user ${trade.seller_steam_id} $${payoutAmount}`);

                // Send Steam notification to seller
                try {
                    const { steamNotificationService } = require('./steam-notification.service');
                    await steamNotificationService.sendTradeCompletionNotification(
                        trade.seller_steam_id,
                        tradeOfferId,
                        `${trade.item_name}`,
                        'completed'
                    );
                    console.log(`[EscrowListener] Steam notification sent to seller ${trade.seller_steam_id}`);
                } catch (err) {
                    console.error(`[EscrowListener] Failed to send Steam notification to seller:`, err.message);
                }
            } else {
                // STANDARD LISTING SOLD LOGIC
                // Mark listing as sold only if it's a listing trade
                await client.query(
                    `UPDATE listings SET status = 'sold', updated_at = NOW() WHERE id = $1`,
                    [trade.listing_id]
                );

                // Credit seller balance
                const payoutAmount = parseFloat(trade.seller_payout);
                await client.query(
                    `UPDATE users SET balance = balance + $1 WHERE steam_id = $2`,
                    [payoutAmount, trade.seller_steam_id]
                );

                // Record payout transaction
                await client.query(`
                    INSERT INTO escrow_transactions (
                        transaction_uuid, escrow_trade_id, steam_id, type, amount, currency, status, payment_provider
                    ) VALUES ($1, $2, $3, 'seller_payout', $4, $5, 'completed', 'listing_sale')
                `, [uuidv4(), trade.id, trade.seller_steam_id, payoutAmount, trade.currency]);

                console.log(`[EscrowListener] 💰 Listing Sold: Paid seller ${trade.seller_steam_id} $${payoutAmount}`);
                
                // Telegram Notification
                await telegram.sendMessage(
                    `**Item Sold** (Bot Sale)\n` +
                    `Item: ${trade.item_name}\n` +
                    `Price: $${trade.price}\n` +
                    `Payout: $${payoutAmount}\n` +
                    `Seller: \`${trade.seller_steam_id}\``, 
                    'money'
                );

                // Send Steam notification to seller
                try {
                    const { steamNotificationService } = require('./steam-notification.service');
                    await steamNotificationService.sendTradeCompletionNotification(
                        trade.seller_steam_id,
                        tradeOfferId,
                        `${trade.item_name}`,
                        'completed'
                    );
                    console.log(`[EscrowListener] Steam notification sent to seller ${trade.seller_steam_id}`);
                } catch (err) {
                    console.error(`[EscrowListener] Failed to send Steam notification to seller:`, err.message);
                }
            }

            console.log(`[EscrowListener] ✅ Trade ${trade.id} COMPLETED.`);

            await client.query('COMMIT');

        } catch (err) {
            await client.query('ROLLBACK');
            console.error(`[EscrowListener] Error processing accepted trade ${tradeOfferId}:`, err);
        } finally {
            client.release();
        }
    }

    /**
     * Handle when P2P seller accepts our trade request - bot received the item
     * Now we need to: 1) Send item to buyer, 2) Pay seller
     */
    async handleReceivedOfferAccepted(tradeOfferId, offer) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Find trade by seller_trade_offer_id (P2P trade)
            const tradeRes = await client.query(
                `SELECT t.*, l.buyer_trade_url 
                 FROM escrow_trades t
                 JOIN listings l ON t.listing_id = l.id
                 WHERE t.seller_trade_offer_id = $1 FOR UPDATE`,
                [tradeOfferId]
            );

            if (tradeRes.rows.length === 0) {
                console.log(`[EscrowListener] P2P trade ${tradeOfferId} not found. Skipping.`);
                await client.query('ROLLBACK');
                return;
            }

            const trade = tradeRes.rows[0];

            if (trade.status === 'completed') {
                console.log(`[EscrowListener] P2P trade ${trade.id} already completed.`);
                await client.query('ROLLBACK');
                return;
            }

            console.log(`[EscrowListener] 📦 Received item from seller for trade ${trade.id}. Forwarding to buyer...`);

            // Mark as received from seller
            await client.query(
                `UPDATE escrow_trades SET seller_received_at = NOW(), status = 'forwarding_to_buyer' WHERE id = $1`,
                [trade.id]
            );

            await client.query('COMMIT');

            // Get the item that was received (from the offer)
            let receivedAssetId = trade.item_asset_id;

            // Try to get new asset ID from offer if available
            if (offer && offer.itemsToReceive && offer.itemsToReceive.length > 0) {
                receivedAssetId = offer.itemsToReceive[0].assetid;
                console.log(`[EscrowListener] Got new asset ID from offer: ${receivedAssetId}`);
            }

            // STEP 2: Send item to buyer
            const bot = botManager.getAvailableBot();
            if (!bot) {
                console.error('[EscrowListener] No bot available to forward item');
                return;
            }

            try {
                const buyerOfferId = await bot.sendTradeOffer({
                    partnerTradeUrl: trade.buyer_trade_url,
                    itemsToGive: [{
                        assetId: receivedAssetId,
                        appId: trade.item_app_id || 730,
                        contextId: '2'
                    }],
                    message: `Your purchase of "${trade.item_name}" from Steam Marketplace!`
                });

                console.log(`[EscrowListener] 📤 Sent item to buyer. Offer ID: ${buyerOfferId}`);

                // Update with buyer offer ID
                await pool.query(
                    `UPDATE escrow_trades SET buyer_trade_offer_id = $1 WHERE id = $2`,
                    [buyerOfferId, trade.id]
                );

                // Note: The actual completion and seller payout will happen when
                // this new offer is accepted (via handleSentOfferAccepted)

            } catch (err) {
                console.error(`[EscrowListener] Failed to send item to buyer:`, err.message);
                await pool.query(
                    `UPDATE escrow_trades SET status = 'error_forwarding', updated_at = NOW() WHERE id = $1`,
                    [trade.id]
                );
            }

            // STEP 3: Pay seller (do this now since we have the item)
            await this.payoutSeller(trade);

        } catch (err) {
            await client.query('ROLLBACK');
            console.error(`[EscrowListener] Error processing P2P trade ${tradeOfferId}:`, err);
        } finally {
            client.release();
        }
    }

    /**
     * Pay the seller after item received
     */
    async payoutSeller(trade) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const sellerPayout = parseFloat(trade.seller_payout);

            // Credit seller balance
            await client.query(
                `UPDATE users SET balance = balance + $1 WHERE steam_id = $2`,
                [sellerPayout, trade.seller_steam_id]
            );

            // Record payout transaction
            await client.query(`
                INSERT INTO escrow_transactions (
                    transaction_uuid, escrow_trade_id, steam_id, type, amount, currency, status, payment_provider
                ) VALUES ($1, $2, $3, 'seller_payout', $4, $5, 'completed', 'p2p_sale')
            `, [uuidv4(), trade.id, trade.seller_steam_id, sellerPayout, trade.currency]);

            console.log(`[EscrowListener] 💰 Paid seller ${trade.seller_steam_id}: $${sellerPayout.toFixed(2)}`);
            await telegram.sendP2PCompletion(trade.id, sellerPayout, trade.seller_steam_id);

            await client.query('COMMIT');

        } catch (err) {
            await client.query('ROLLBACK');
            console.error(`[EscrowListener] Error paying seller for trade ${trade.id}:`, err);
        } finally {
            client.release();
        }
    }

    /**
     * Handle declined/canceled/expired sent offers - refund buyer
     */
    async handleSentOfferDeclined(tradeOfferId, reason) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const tradeRes = await client.query(
                `SELECT * FROM escrow_trades WHERE buyer_trade_offer_id = $1 FOR UPDATE`,
                [tradeOfferId]
            );

            if (tradeRes.rows.length === 0) {
                console.log(`[EscrowListener] Trade ${tradeOfferId} not found for refund. Skipping.`);
                await client.query('ROLLBACK');
                return;
            }

            const trade = tradeRes.rows[0];

            if (['completed', 'cancelled', 'refunded'].includes(trade.status)) {
                console.log(`[EscrowListener] Trade ${trade.id} already in final state (${trade.status}). Skipping.`);
                await client.query('ROLLBACK');
                return;
            }

            const price = parseFloat(trade.price);

            // Refund buyer
            await client.query(
                `UPDATE users SET balance = balance + $1 WHERE steam_id = $2`,
                [price, trade.buyer_steam_id]
            );

            // Release listing
            await client.query(
                `UPDATE listings SET status = 'active', updated_at = NOW() WHERE id = $1`,
                [trade.listing_id]
            );

            // Update trade status
            await client.query(
                `UPDATE escrow_trades SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
                [trade.id]
            );

            // Record refund transaction
            await client.query(`
                INSERT INTO escrow_transactions (
                    transaction_uuid, escrow_trade_id, steam_id, type, amount, currency, status, payment_provider
                ) VALUES ($1, $2, $3, 'refund', $4, $5, 'completed', 'auto_declined')
            `, [uuidv4(), trade.id, trade.buyer_steam_id, price, trade.currency]);

            console.log(`[EscrowListener] 💰 Trade ${trade.id}: Refunded $${price} to ${trade.buyer_steam_id}. Reason: ${reason}`);

            await client.query('COMMIT');

        } catch (err) {
            await client.query('ROLLBACK');
            console.error(`[EscrowListener] Error processing declined trade ${tradeOfferId}:`, err);
        } finally {
            client.release();
        }
    }
}

module.exports = new EscrowListenerService();
