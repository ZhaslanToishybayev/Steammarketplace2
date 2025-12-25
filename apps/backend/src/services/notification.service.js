/**
 * Notification Service
 * Real-time notifications via Socket.io
 */

let io = null;

class NotificationService {
    constructor() {
        this.io = null;
    }

    /**
     * Initialize with Socket.io instance
     */
    initialize(socketIo) {
        this.io = socketIo;
        console.log('[NotificationService] Initialized');
    }

    /**
     * Notify a specific user
     * @param {string} steamId - User's Steam ID
     * @param {string} event - Event name
     * @param {object} data - Event data
     */
    notifyUser(steamId, event, data) {
        if (!this.io) {
            console.warn('[NotificationService] Socket.io not initialized');
            return;
        }

        this.io.to(`user:${steamId}`).emit(event, {
            ...data,
            timestamp: new Date().toISOString()
        });

        console.log(`[NotificationService] Sent ${event} to user ${steamId}`);
    }

    /**
     * Notify trade status change
     */
    notifyTradeUpdate(trade) {
        // Notify buyer
        this.notifyUser(trade.buyer_steam_id, 'trade:update', {
            tradeId: trade.id,
            tradeUuid: trade.trade_uuid,
            status: trade.status,
            itemName: trade.item_name,
            price: trade.price
        });

        // Notify seller (for P2P trades)
        if (trade.seller_steam_id && trade.trade_type === 'p2p') {
            this.notifyUser(trade.seller_steam_id, 'trade:update', {
                tradeId: trade.id,
                tradeUuid: trade.trade_uuid,
                status: trade.status,
                itemName: trade.item_name,
                price: trade.seller_payout,
                type: 'sale'
            });
        }
    }

    /**
     * Notify seller that their item was sold
     */
    notifyItemSold(trade) {
        this.notifyUser(trade.seller_steam_id, 'item:sold', {
            tradeId: trade.id,
            itemName: trade.item_name,
            payout: trade.seller_payout,
            buyerSteamId: trade.buyer_steam_id
        });
    }

    /**
     * Notify buyer their item was shipped
     */
    notifyItemShipped(trade) {
        this.notifyUser(trade.buyer_steam_id, 'item:shipped', {
            tradeId: trade.id,
            itemName: trade.item_name,
            tradeOfferId: trade.buyer_trade_offer_id
        });
    }

    /**
     * Notify seller they received payment
     */
    notifyPaymentReceived(trade) {
        this.notifyUser(trade.seller_steam_id, 'payment:received', {
            tradeId: trade.id,
            amount: trade.seller_payout,
            currency: trade.currency,
            itemName: trade.item_name
        });
    }

    /**
     * Notify buyer of refund
     */
    notifyRefund(trade) {
        this.notifyUser(trade.buyer_steam_id, 'refund:completed', {
            tradeId: trade.id,
            amount: trade.price,
            currency: trade.currency,
            reason: 'Trade cancelled or failed'
        });
    }

    /**
     * Broadcast to all connected users
     */
    broadcastAll(event, data) {
        if (!this.io) return;
        this.io.emit(event, {
            ...data,
            timestamp: new Date().toISOString()
        });
    }
}

const notificationService = new NotificationService();

module.exports = { notificationService };
