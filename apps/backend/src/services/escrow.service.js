/**
 * Escrow Trade Service
 * Handles escrow trade logic and state machine
 * 
 * @deprecated This file contains mock data and is not used in production.
 * Real escrow logic is in: escrow-listener.service.js and routes/escrow.js
 * TODO: Remove this file or implement real database queries
 */

const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

// Trade status constants
const TradeStatus = {
    PENDING_PAYMENT: 'pending_payment',
    PAYMENT_RECEIVED: 'payment_received',
    AWAITING_SELLER: 'awaiting_seller',
    SELLER_ACCEPTED: 'seller_accepted',
    AWAITING_BUYER: 'awaiting_buyer',
    BUYER_ACCEPTED: 'buyer_accepted',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded',
    DISPUTED: 'disputed',
    EXPIRED: 'expired',
};

// Trade status transitions
const ValidTransitions = {
    [TradeStatus.PENDING_PAYMENT]: [TradeStatus.PAYMENT_RECEIVED, TradeStatus.CANCELLED, TradeStatus.EXPIRED],
    [TradeStatus.PAYMENT_RECEIVED]: [TradeStatus.AWAITING_SELLER, TradeStatus.REFUNDED, TradeStatus.CANCELLED],
    [TradeStatus.AWAITING_SELLER]: [TradeStatus.SELLER_ACCEPTED, TradeStatus.REFUNDED, TradeStatus.CANCELLED, TradeStatus.EXPIRED],
    [TradeStatus.SELLER_ACCEPTED]: [TradeStatus.AWAITING_BUYER, TradeStatus.REFUNDED, TradeStatus.DISPUTED],
    [TradeStatus.AWAITING_BUYER]: [TradeStatus.BUYER_ACCEPTED, TradeStatus.REFUNDED, TradeStatus.CANCELLED, TradeStatus.EXPIRED],
    [TradeStatus.BUYER_ACCEPTED]: [TradeStatus.COMPLETED, TradeStatus.DISPUTED],
    [TradeStatus.COMPLETED]: [],
    [TradeStatus.CANCELLED]: [],
    [TradeStatus.REFUNDED]: [],
    [TradeStatus.DISPUTED]: [TradeStatus.COMPLETED, TradeStatus.REFUNDED],
    [TradeStatus.EXPIRED]: [],
};

class EscrowService extends EventEmitter {
    constructor(db, botManager) {
        super();
        this.db = db;
        this.botManager = botManager;
        this.platformFeePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT || '5.0');
    }

    /**
     * Create a new listing
     */
    async createListing(sellerSteamId, sellerTradeUrl, itemData, price, currency = 'USD') {
        const listing = {
            seller_steam_id: sellerSteamId,
            seller_trade_url: sellerTradeUrl,
            item_asset_id: itemData.assetId,
            item_class_id: itemData.classId,
            item_instance_id: itemData.instanceId,
            item_name: itemData.name,
            item_market_hash_name: itemData.marketHashName,
            item_app_id: itemData.appId,
            item_context_id: itemData.contextId || '2',
            item_icon_url: itemData.iconUrl,
            item_rarity: itemData.rarity,
            item_exterior: itemData.exterior,
            item_float: itemData.float,
            price: price,
            currency: currency,
            status: 'active',
        };

        // In production, insert into database
        // const result = await this.db.query('INSERT INTO listings ...', listing);

        this.emit('listingCreated', listing);
        return listing;
    }

    /**
     * Initiate escrow purchase
     */
    async initiatePurchase(listingId, buyerSteamId, buyerTradeUrl) {
        // Get listing
        // const listing = await this.db.query('SELECT * FROM listings WHERE id = $1 AND status = $2', [listingId, 'active']);

        // For now, mock listing
        const listing = {
            id: listingId,
            seller_steam_id: '76561198000000000',
            seller_trade_url: 'https://steamcommunity.com/tradeoffer/new/?partner=...',
            item_asset_id: '123456789',
            item_name: 'AWP | Dragon Lore',
            item_app_id: 730,
            price: 1500.00,
            currency: 'USD',
        };

        if (!listing) {
            throw new Error('Listing not found or not available');
        }

        // Calculate fees
        const platformFee = listing.price * (this.platformFeePercent / 100);
        const sellerPayout = listing.price - platformFee;

        // Create escrow trade
        const trade = {
            trade_uuid: uuidv4(),
            listing_id: listing.id,
            buyer_steam_id: buyerSteamId,
            buyer_trade_url: buyerTradeUrl,
            seller_steam_id: listing.seller_steam_id,
            seller_trade_url: listing.seller_trade_url,
            item_asset_id: listing.item_asset_id,
            item_name: listing.item_name,
            item_app_id: listing.item_app_id,
            price: listing.price,
            platform_fee: platformFee,
            platform_fee_percent: this.platformFeePercent,
            seller_payout: sellerPayout,
            currency: listing.currency,
            status: TradeStatus.PENDING_PAYMENT,
            expires_at: new Date(Date.now() + 30 * 60 * 1000), // 30 min to pay
        };

        // In production, insert into database
        // const result = await this.db.query('INSERT INTO escrow_trades ...', trade);

        this.emit('tradeCreated', trade);
        return trade;
    }

    /**
     * Process payment and start trade flow
     */
    async processPayment(tradeUuid, paymentDetails) {
        // Get trade
        // const trade = await this.db.query('SELECT * FROM escrow_trades WHERE trade_uuid = $1', [tradeUuid]);

        // Validate payment
        // In production, verify with Stripe/PayPal

        // Update trade status
        await this._updateTradeStatus(tradeUuid, TradeStatus.PAYMENT_RECEIVED);

        // Create transaction record
        const transaction = {
            transaction_uuid: uuidv4(),
            escrow_trade_id: tradeUuid, // Would be actual ID
            steam_id: 'buyer_steam_id', // From trade
            type: 'payment',
            amount: paymentDetails.amount,
            currency: paymentDetails.currency,
            status: 'completed',
            payment_provider: paymentDetails.provider,
            external_transaction_id: paymentDetails.externalId,
        };

        // Start requesting item from seller
        await this._requestItemFromSeller(tradeUuid);

        this.emit('paymentReceived', { tradeUuid, transaction });
        return { success: true, tradeUuid };
    }

    /**
     * Request item from seller via trade offer
     */
    async _requestItemFromSeller(tradeUuid) {
        // Get trade details
        // const trade = await this.db.query(...);

        // Mock trade data
        const trade = {
            trade_uuid: tradeUuid,
            seller_trade_url: 'https://steamcommunity.com/tradeoffer/new/?partner=...',
            item_asset_id: '123456789',
            item_app_id: 730,
            item_name: 'AWP | Dragon Lore',
        };

        // Get available bot
        const bot = this.botManager.getAvailableBot();
        if (!bot) {
            throw new Error('No available bots to process trade');
        }

        try {
            // Send trade offer requesting item from seller
            const offerId = await bot.sendTradeOffer({
                partnerTradeUrl: trade.seller_trade_url,
                itemsToReceive: [{
                    assetId: trade.item_asset_id,
                    appId: trade.item_app_id,
                    contextId: '2',
                }],
                message: `[Steam Marketplace] Please send your ${trade.item_name} for escrow trade #${tradeUuid.slice(0, 8)}`,
            });

            // Update trade with offer ID and bot assignment
            // await this.db.query('UPDATE escrow_trades SET seller_trade_offer_id = $1, bot_id = $2, status = $3 WHERE trade_uuid = $4', ...);

            await this._updateTradeStatus(tradeUuid, TradeStatus.AWAITING_SELLER);

            this.emit('sellerOfferSent', { tradeUuid, offerId });
            return offerId;
        } catch (err) {
            console.error(`[EscrowService] Failed to send trade offer to seller:`, err.message);
            this.emit('tradeError', { tradeUuid, error: err.message });
            throw err;
        }
    }

    /**
     * Handle seller accepting trade offer
     */
    async handleSellerAccepted(tradeUuid) {
        await this._updateTradeStatus(tradeUuid, TradeStatus.SELLER_ACCEPTED);

        // Now send item to buyer
        await this._sendItemToBuyer(tradeUuid);

        this.emit('sellerAccepted', { tradeUuid });
    }

    /**
     * Send item to buyer via trade offer
     */
    async _sendItemToBuyer(tradeUuid) {
        // Get trade details including bot's new asset ID for the item
        // const trade = await this.db.query(...);

        const trade = {
            trade_uuid: tradeUuid,
            buyer_trade_url: 'https://steamcommunity.com/tradeoffer/new/?partner=...',
            item_asset_id: '987654321', // Bot's asset ID after receiving from seller
            item_app_id: 730,
            item_name: 'AWP | Dragon Lore',
        };

        const bot = this.botManager.getAvailableBot();
        if (!bot) {
            throw new Error('No available bots');
        }

        try {
            const offerId = await bot.sendTradeOffer({
                partnerTradeUrl: trade.buyer_trade_url,
                itemsToGive: [{
                    assetId: trade.item_asset_id,
                    appId: trade.item_app_id,
                    contextId: '2',
                }],
                message: `[Steam Marketplace] Your purchased ${trade.item_name} - Trade #${tradeUuid.slice(0, 8)}`,
            });

            await this._updateTradeStatus(tradeUuid, TradeStatus.AWAITING_BUYER);

            this.emit('buyerOfferSent', { tradeUuid, offerId });
            return offerId;
        } catch (err) {
            console.error(`[EscrowService] Failed to send trade offer to buyer:`, err.message);
            this.emit('tradeError', { tradeUuid, error: err.message });
            throw err;
        }
    }

    /**
     * Handle buyer accepting trade offer
     */
    async handleBuyerAccepted(tradeUuid) {
        await this._updateTradeStatus(tradeUuid, TradeStatus.BUYER_ACCEPTED);

        // Complete the trade - payout to seller
        await this._completeTrade(tradeUuid);
    }

    /**
     * Complete trade and payout seller
     */
    async _completeTrade(tradeUuid) {
        // Get trade details
        // const trade = await this.db.query(...);

        const trade = {
            trade_uuid: tradeUuid,
            seller_steam_id: '76561198000000000',
            seller_payout: 1425.00, // After platform fee
            currency: 'USD',
        };

        // Create payout transaction
        const payoutTransaction = {
            transaction_uuid: uuidv4(),
            escrow_trade_id: tradeUuid,
            steam_id: trade.seller_steam_id,
            type: 'payout',
            amount: trade.seller_payout,
            currency: trade.currency,
            status: 'completed',
        };

        // In production:
        // 1. Credit seller's wallet balance
        // 2. Or initiate external payout (Stripe/PayPal)

        await this._updateTradeStatus(tradeUuid, TradeStatus.COMPLETED);

        this.emit('tradeCompleted', { tradeUuid, payout: payoutTransaction });
        return { success: true };
    }

    /**
     * Cancel trade
     */
    async cancelTrade(tradeUuid, reason, cancelledBy) {
        // Get current trade status
        // Verify transition is valid

        await this._updateTradeStatus(tradeUuid, TradeStatus.CANCELLED);

        // If payment was received, process refund
        // await this._processRefund(tradeUuid);

        this.emit('tradeCancelled', { tradeUuid, reason, cancelledBy });
        return { success: true };
    }

    /**
     * Update trade status with validation
     */
    async _updateTradeStatus(tradeUuid, newStatus) {
        // Get current status
        // const trade = await this.db.query('SELECT status FROM escrow_trades WHERE trade_uuid = $1', [tradeUuid]);
        // const currentStatus = trade.status;

        // Validate transition
        // if (!ValidTransitions[currentStatus]?.includes(newStatus)) {
        //   throw new Error(`Invalid status transition: ${currentStatus} -> ${newStatus}`);
        // }

        // Update status
        // await this.db.query('UPDATE escrow_trades SET status = $1, updated_at = NOW() WHERE trade_uuid = $2', [newStatus, tradeUuid]);

        // Record history
        // await this.db.query('INSERT INTO escrow_trade_history (escrow_trade_id, old_status, new_status) ...', ...)

        console.log(`[EscrowService] Trade ${tradeUuid} status updated to: ${newStatus}`);
        this.emit('statusChanged', { tradeUuid, newStatus });
    }

    /**
     * Get trade by UUID
     */
    async getTradeByUuid(tradeUuid) {
        // return await this.db.query('SELECT * FROM escrow_trades WHERE trade_uuid = $1', [tradeUuid]);
        return null; // Implement with actual DB
    }

    /**
     * Get user's trades
     */
    async getUserTrades(steamId, status = null, limit = 20, offset = 0) {
        // Filter by buyer or seller steam ID
        // return await this.db.query('SELECT * FROM escrow_trades WHERE buyer_steam_id = $1 OR seller_steam_id = $1 ...', [...]);
        return []; // Implement with actual DB
    }
}

module.exports = {
    EscrowService,
    TradeStatus,
    ValidTransitions,
};
