/**
 * Steam Notification Service
 * Sends notifications directly to Steam users via Steam API
 */

const SteamCommunity = require('steamcommunity');
const SteamTotp = require('steam-totp');

class SteamNotificationService {
    constructor() {
        this.community = new SteamCommunity();
        this.notifications = new Map(); // steamId -> notifications[]
    }

    /**
     * Send notification to Steam user
     */
    async sendSteamNotification(steamId, message, tradeOfferId = null) {
        console.log(`[SteamNotification] Sending notification to ${steamId}: ${message}`);

        try {
            // Store notification in database
            await this.storeSteamNotification(steamId, message, tradeOfferId);

            // Try to send via Steam API if we have authenticated bots
            const bot = this.getAvailableBot();
            if (bot) {
                await this.sendViaBot(bot, steamId, message, tradeOfferId);
                return true;
            } else {
                console.log(`⚠️ No available bot to send Steam notification to ${steamId}`);
                return false;
            }

        } catch (err) {
            console.error(`❌ Failed to send Steam notification to ${steamId}:`, err.message);
            return false;
        }
    }

    /**
     * Store notification in database
     */
    async storeSteamNotification(steamId, message, tradeOfferId) {
        const { query } = require('../config/database');

        try {
            await query(`
                INSERT INTO steam_notifications (
                    steam_id, type, message, trade_offer_id, status, created_at
                ) VALUES ($1, $2, $3, $4, 'stored', NOW())
            `, [steamId, 'trade_update', message, tradeOfferId]);

            console.log(`📝 Steam notification stored for ${steamId}`);
        } catch (err) {
            console.error(`❌ Failed to store Steam notification:`, err.message);
        }
    }

    /**
     * Send notification via authenticated bot
     */
    async sendViaBot(bot, steamId, message, tradeOfferId) {
        try {
            // Check if bot has session
            if (!bot.isOnline || !bot.isReady) {
                console.log(`⚠️ Bot ${bot.config.accountName} not ready for Steam notification`);
                return false;
            }

            // Send message to user
            await this.sendMessage(bot, steamId, message);

            // Update notification status
            await this.updateNotificationStatus(steamId, 'sent');

            console.log(`✅ Steam notification sent via bot ${bot.config.accountName} to ${steamId}`);
            return true;

        } catch (err) {
            console.error(`❌ Failed to send via bot to ${steamId}:`, err.message);
            await this.updateNotificationStatus(steamId, 'failed');
            return false;
        }
    }

    /**
     * Send message via Steam bot
     */
    async sendMessage(bot, steamId, message) {
        return new Promise((resolve, reject) => {
            bot.community.chatMessage(steamId, message, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Update notification status
     */
    async updateNotificationStatus(steamId, status) {
        const { query } = require('../config/database');

        try {
            await query(`
                UPDATE steam_notifications
                SET status = $1, sent_at = CASE WHEN $1 = 'sent' THEN NOW() ELSE sent_at END
                WHERE steam_id = $2 AND status = 'stored'
            `, [status, steamId]);
        } catch (err) {
            console.error(`❌ Failed to update notification status:`, err.message);
        }
    }

    /**
     * Get available bot for sending notifications
     */
    getAvailableBot() {
        try {
            const { botManager } = require('./bot-manager.service');
            const bots = botManager.getAllBots();

            // Return first online and ready bot
            for (const bot of bots) {
                if (bot.isOnline && bot.isReady) {
                    return bot;
                }
            }

            return null;
        } catch (err) {
            console.error(`❌ Failed to get available bot:`, err.message);
            return null;
        }
    }

    /**
     * Get user's Steam notifications
     */
    async getUserNotifications(steamId, limit = 50) {
        const { query } = require('../config/database');

        try {
            const result = await query(`
                SELECT * FROM steam_notifications
                WHERE steam_id = $1
                ORDER BY created_at DESC
                LIMIT $2
            `, [steamId, limit]);

            return result.rows;
        } catch (err) {
            console.error(`❌ Failed to get Steam notifications:`, err.message);
            return [];
        }
    }

    /**
     * Send trade completion notification
     */
    async sendTradeCompletionNotification(steamId, tradeOfferId, itemDetails, status) {
        let message = '';

        switch (status) {
            case 'completed':
                message = `✅ Trade completed successfully! You received: ${itemDetails}. Trade ID: ${tradeOfferId}`;
                break;
            case 'cancelled':
                message = `❌ Trade was cancelled. Trade ID: ${tradeOfferId}`;
                break;
            case 'declined':
                message = `❌ Trade was declined by the other party. Trade ID: ${tradeOfferId}`;
                break;
            case 'accepted':
                message = `✅ Trade accepted! Your item was sent successfully. Trade ID: ${tradeOfferId}`;
                break;
            default:
                message = `Trade status updated: ${status}. Trade ID: ${tradeOfferId}`;
        }

        return await this.sendSteamNotification(steamId, message, tradeOfferId);
    }

    /**
     * Send bot status notification
     */
    async sendBotStatusNotification(steamId, botStatus) {
        const message = `🤖 Bot Status Update: ${botStatus.status} (${botStatus.accountName})`;

        return await this.sendSteamNotification(steamId, message);
    }

    /**
     * Get notification statistics
     */
    async getNotificationStats() {
        const { query } = require('../config/database');

        try {
            const result = await query(`
                SELECT
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'stored' THEN 1 END) as stored,
                    COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
                    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
                FROM steam_notifications
            `);

            return result.rows[0];
        } catch (err) {
            console.error(`❌ Failed to get notification stats:`, err.message);
            return { total: 0, stored: 0, sent: 0, failed: 0 };
        }
    }
}

// Singleton instance
const steamNotificationService = new SteamNotificationService();

module.exports = {
    SteamNotificationService,
    steamNotificationService
};