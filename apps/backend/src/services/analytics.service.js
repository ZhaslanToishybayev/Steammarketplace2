/**
 * Analytics Service
 * Aggregates metrics for admin dashboard
 */

const { pool, query } = require('../config/database');
const { botManager } = require('./bot-manager.service');

class AnalyticsService {
    /**
     * Get comprehensive dashboard stats
     */
    async getDashboardStats() {
        const [
            tradeSummary,
            userStats,
            listingStats,
            revenueStats,
            recentActivity
        ] = await Promise.all([
            this.getTradeSummary(),
            this.getUserStats(),
            this.getListingStats(),
            this.getRevenueStats(),
            this.getRecentActivity(10)
        ]);

        return {
            trades: tradeSummary,
            users: userStats,
            listings: listingStats,
            revenue: revenueStats,
            bots: this.getBotStats(),
            recentActivity,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Get trade summary stats
     */
    async getTradeSummary() {
        const result = await query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'completed') as completed,
                COUNT(*) FILTER (WHERE status = 'awaiting_buyer') as awaiting_buyer,
                COUNT(*) FILTER (WHERE status = 'awaiting_seller') as awaiting_seller,
                COUNT(*) FILTER (WHERE status IN ('cancelled', 'refunded')) as cancelled,
                COUNT(*) FILTER (WHERE status = 'error_sending' OR status = 'error_forwarding') as errors,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as last_hour
            FROM escrow_trades
        `);

        return result.rows[0];
    }

    /**
     * Get user stats
     */
    async getUserStats() {
        const result = await query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as new_24h,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_7d,
                COALESCE(SUM(balance), 0) as total_balance
            FROM users
        `);

        return result.rows[0];
    }

    /**
     * Get listing stats
     */
    async getListingStats() {
        const result = await query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'active') as active,
                COUNT(*) FILTER (WHERE status = 'reserved') as reserved,
                COUNT(*) FILTER (WHERE status = 'sold') as sold,
                COUNT(*) FILTER (WHERE listing_type = 'p2p') as p2p,
                COUNT(*) FILTER (WHERE listing_type = 'bot_sale') as bot_sale,
                COALESCE(AVG(price) FILTER (WHERE status = 'active'), 0) as avg_price
            FROM listings
        `);

        return result.rows[0];
    }

    /**
     * Get revenue stats (from platform fees)
     */
    async getRevenueStats() {
        const result = await query(`
            SELECT 
                COALESCE(SUM(platform_fee), 0) as total_fees,
                COALESCE(SUM(platform_fee) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours'), 0) as fees_24h,
                COALESCE(SUM(platform_fee) FILTER (WHERE created_at > NOW() - INTERVAL '7 days'), 0) as fees_7d,
                COALESCE(SUM(price), 0) as total_volume,
                COALESCE(SUM(price) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours'), 0) as volume_24h
            FROM escrow_trades
            WHERE status = 'completed'
        `);

        return result.rows[0];
    }

    /**
     * Get bot stats from bot manager
     */
    getBotStats() {
        const bots = botManager.getAllBots();
        return {
            total: bots.length,
            online: bots.filter(b => b.isOnline).length,
            ready: bots.filter(b => b.isReady).length,
            activeTrades: bots.reduce((sum, b) => sum + (b.activeTrades || 0), 0),
            bots: bots.map(b => ({
                name: b.accountName,
                steamId: b.steamId,
                isOnline: b.isOnline,
                isReady: b.isReady,
                activeTrades: b.activeTrades || 0,
                lastLoginAt: b.lastLoginAt
            }))
        };
    }

    /**
     * Get recent activity log
     */
    async getRecentActivity(limit = 20) {
        const result = await query(`
            SELECT 
                t.id,
                t.trade_uuid,
                t.status,
                t.item_name,
                t.price,
                t.trade_type,
                t.created_at,
                t.updated_at,
                b.username as buyer_name,
                s.username as seller_name
            FROM escrow_trades t
            LEFT JOIN users b ON t.buyer_steam_id = b.steam_id
            LEFT JOIN users s ON t.seller_steam_id = s.steam_id
            ORDER BY t.updated_at DESC
            LIMIT $1
        `, [limit]);

        return result.rows;
    }

    /**
     * Get hourly trade volume for chart
     */
    async getHourlyVolume(hours = 24) {
        const result = await query(`
            SELECT 
                date_trunc('hour', created_at) as hour,
                COUNT(*) as trades,
                COALESCE(SUM(price), 0) as volume
            FROM escrow_trades
            WHERE created_at > NOW() - INTERVAL '${hours} hours'
            GROUP BY date_trunc('hour', created_at)
            ORDER BY hour
        `);

        return result.rows;
    }

    /**
     * Get top items by sales
     */
    async getTopItems(limit = 10) {
        const result = await query(`
            SELECT 
                item_market_hash_name as name,
                COUNT(*) as sales,
                AVG(price) as avg_price,
                SUM(price) as total_volume
            FROM escrow_trades
            WHERE status = 'completed'
            GROUP BY item_market_hash_name
            ORDER BY sales DESC
            LIMIT $1
        `, [limit]);

        return result.rows;
    }

    /**
     * Get error log
     */
    async getErrorLog(limit = 50) {
        const result = await query(`
            SELECT 
                id,
                trade_uuid,
                status,
                item_name,
                updated_at,
                buyer_steam_id,
                seller_steam_id
            FROM escrow_trades
            WHERE status IN ('error_sending', 'error_forwarding', 'cancelled')
            ORDER BY updated_at DESC
            LIMIT $1
        `, [limit]);

        return result.rows;
    }
}

const analyticsService = new AnalyticsService();

module.exports = { analyticsService };
