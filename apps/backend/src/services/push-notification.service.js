/**
 * Push Notification Service
 * Web Push API implementation for real-time notifications.
 * 
 * Features:
 * - VAPID key generation and management
 * - Subscription management (subscribe/unsubscribe)
 * - Send notifications for trade updates, price alerts, etc.
 * 
 * @module services/push-notification
 */

// @ts-check

const webpush = require('web-push');

// VAPID keys for Web Push
// Generate once: webpush.generateVAPIDKeys()
// Store in environment variables for production
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BFakePublicKeyForDevelopment1234567890abcdefghijklmnopqrstuvwxyz1234567890';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'fakePrivateKeyForDev1234567890';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@steammarketplace.local';

// Configure webpush with VAPID details
try {
    webpush.setVapidDetails(
        VAPID_SUBJECT,
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    );
    console.log('✅ Web Push VAPID configured');
} catch (err) {
    console.warn('⚠️ Web Push VAPID configuration failed:', err.message);
}

/**
 * @typedef {Object} PushSubscription
 * @property {string} endpoint
 * @property {{p256dh: string, auth: string}} keys
 */

/**
 * @typedef {Object} NotificationPayload
 * @property {string} title
 * @property {string} body
 * @property {string} [icon]
 * @property {string} [badge]
 * @property {string} [tag]
 * @property {Object} [data]
 * @property {Array<{action: string, title: string}>} [actions]
 */

class PushNotificationService {
    constructor() {
        /** @type {Map<string, PushSubscription>} */
        this.subscriptions = new Map(); // In production, store in database
    }

    /**
     * Get public VAPID key for frontend
     * @returns {string}
     */
    getPublicKey() {
        return VAPID_PUBLIC_KEY;
    }

    /**
     * Store a push subscription
     * @param {string} userId - User's Steam ID
     * @param {PushSubscription} subscription
     */
    async subscribe(userId, subscription) {
        // In production, save to database
        this.subscriptions.set(userId, subscription);
        console.log(`📱 User ${userId} subscribed to push notifications`);
        return { success: true };
    }

    /**
     * Remove a push subscription
     * @param {string} userId
     */
    async unsubscribe(userId) {
        this.subscriptions.delete(userId);
        console.log(`📱 User ${userId} unsubscribed from push notifications`);
        return { success: true };
    }

    /**
     * Send notification to a specific user
     * @param {string} userId
     * @param {NotificationPayload} payload
     */
    async sendToUser(userId, payload) {
        const subscription = this.subscriptions.get(userId);
        if (!subscription) {
            console.log(`📱 No subscription found for user ${userId}`);
            return { success: false, reason: 'not_subscribed' };
        }

        try {
            await webpush.sendNotification(
                subscription,
                JSON.stringify(payload)
            );
            console.log(`📱 Notification sent to user ${userId}: ${payload.title}`);
            return { success: true };
        } catch (err) {
            console.error(`📱 Failed to send notification to ${userId}:`, err.message);

            // Remove invalid subscription
            if (err.statusCode === 410 || err.statusCode === 404) {
                this.subscriptions.delete(userId);
            }

            return { success: false, reason: err.message };
        }
    }

    /**
     * Send notification to multiple users
     * @param {string[]} userIds
     * @param {NotificationPayload} payload
     */
    async sendToUsers(userIds, payload) {
        const results = await Promise.all(
            userIds.map(userId => this.sendToUser(userId, payload))
        );

        const successCount = results.filter(r => r.success).length;
        console.log(`📱 Broadcast sent: ${successCount}/${userIds.length} delivered`);

        return { success: true, delivered: successCount, total: userIds.length };
    }

    // ============== NOTIFICATION TEMPLATES ==============

    /**
     * Notify about trade status change
     * @param {string} userId
     * @param {string} tradeId
     * @param {'pending'|'accepted'|'declined'|'completed'|'failed'} status
     * @param {string} itemName
     */
    async notifyTradeStatus(userId, tradeId, status, itemName) {
        const statusMessages = {
            pending: '⏳ Trade offer sent',
            accepted: '✅ Trade accepted!',
            declined: '❌ Trade declined',
            completed: '🎉 Trade completed!',
            failed: '⚠️ Trade failed',
        };

        return this.sendToUser(userId, {
            title: statusMessages[status] || 'Trade Update',
            body: itemName,
            icon: '/icons/trade-icon.png',
            badge: '/icons/badge.png',
            tag: `trade-${tradeId}`,
            data: {
                type: 'trade_update',
                tradeId,
                status,
            },
            actions: status === 'pending' ? [
                { action: 'view', title: 'View Trade' },
                { action: 'dismiss', title: 'Dismiss' },
            ] : undefined,
        });
    }

    /**
     * Notify about item sold
     * @param {string} userId
     * @param {string} itemName
     * @param {number} price
     */
    async notifyItemSold(userId, itemName, price) {
        return this.sendToUser(userId, {
            title: '💰 Item Sold!',
            body: `${itemName} sold for $${price.toFixed(2)}`,
            icon: '/icons/sold-icon.png',
            badge: '/icons/badge.png',
            tag: 'item-sold',
            data: {
                type: 'item_sold',
                itemName,
                price,
            },
        });
    }

    /**
     * Notify about price drop on watchlist item
     * @param {string} userId
     * @param {string} itemName
     * @param {number} oldPrice
     * @param {number} newPrice
     */
    async notifyPriceDrop(userId, itemName, oldPrice, newPrice) {
        const dropPercent = ((oldPrice - newPrice) / oldPrice * 100).toFixed(1);

        return this.sendToUser(userId, {
            title: '📉 Price Drop Alert!',
            body: `${itemName}: -${dropPercent}% ($${newPrice.toFixed(2)})`,
            icon: '/icons/price-icon.png',
            badge: '/icons/badge.png',
            tag: 'price-drop',
            data: {
                type: 'price_drop',
                itemName,
                oldPrice,
                newPrice,
            },
            actions: [
                { action: 'buy', title: 'Buy Now' },
                { action: 'view', title: 'View' },
            ],
        });
    }

    /**
     * Notify about new message in trade chat
     * @param {string} userId
     * @param {string} senderName
     * @param {string} message
     */
    async notifyNewMessage(userId, senderName, message) {
        return this.sendToUser(userId, {
            title: `💬 Message from ${senderName}`,
            body: message.substring(0, 100),
            icon: '/icons/message-icon.png',
            badge: '/icons/badge.png',
            tag: 'new-message',
            data: {
                type: 'new_message',
                senderName,
            },
        });
    }
}

// Create singleton instance
const pushNotificationService = new PushNotificationService();

module.exports = {
    pushNotificationService,
    PushNotificationService,
};
