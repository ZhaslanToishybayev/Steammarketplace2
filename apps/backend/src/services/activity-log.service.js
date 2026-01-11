/**
 * Activity Log Service
 * Tracks and logs all system events for admin monitoring
 */

const { query } = require('../config/database');
const { notificationService } = require('./notification.service');

// In-memory activity buffer (last 100 events)
const activityBuffer = [];
const MAX_BUFFER_SIZE = 100;

class ActivityLogService {
    /**
     * Log an activity event
     */
    log(type, data, level = 'info') {
        const event = {
            id: Date.now(),
            type,
            level, // info, warning, error, success
            data,
            timestamp: new Date().toISOString()
        };

        // Add to buffer
        activityBuffer.unshift(event);
        if (activityBuffer.length > MAX_BUFFER_SIZE) {
            activityBuffer.pop();
        }

        // Emit via WebSocket for real-time updates
        if (notificationService.io) {
            notificationService.io.to('admin').emit('activity:new', event);
        }

        // Console log with color
        const colors = {
            info: '\x1b[36m',    // Cyan
            success: '\x1b[32m', // Green
            warning: '\x1b[33m', // Yellow
            error: '\x1b[31m',   // Red
        };
        const reset = '\x1b[0m';
        console.log(`${colors[level] || ''}[Activity] ${type}: ${JSON.stringify(data)}${reset}`);

        return event;
    }

    // Convenience methods
    info(type, data) { return this.log(type, data, 'info'); }
    success(type, data) { return this.log(type, data, 'success'); }
    warning(type, data) { return this.log(type, data, 'warning'); }
    error(type, data) { return this.log(type, data, 'error'); }

    /**
     * Get recent activity from buffer
     */
    getRecent(limit = 50) {
        return activityBuffer.slice(0, limit);
    }

    /**
     * Log trade event
     */
    logTrade(action, trade) {
        const level = action === 'completed' ? 'success' :
            action === 'error' ? 'error' :
                action === 'refunded' ? 'warning' : 'info';

        return this.log('trade', {
            action,
            tradeId: trade.id,
            tradeUuid: trade.trade_uuid,
            item: trade.item_name,
            price: trade.price,
            buyer: trade.buyer_steam_id,
            seller: trade.seller_steam_id,
            type: trade.trade_type
        }, level);
    }

    /**
     * Log bot event
     */
    logBot(action, botName, details = {}) {
        const level = action === 'error' ? 'error' :
            action === 'offline' ? 'warning' :
                action === 'online' ? 'success' : 'info';

        return this.log('bot', {
            action,
            botName,
            ...details
        }, level);
    }

    /**
     * Log user event
     */
    logUser(action, steamId, details = {}) {
        return this.log('user', {
            action,
            steamId,
            ...details
        }, 'info');
    }

    /**
     * Log system event
     */
    logSystem(action, details = {}) {
        const level = action.includes('error') ? 'error' :
            action.includes('warn') ? 'warning' : 'info';

        return this.log('system', {
            action,
            ...details
        }, level);
    }

    /**
     * Get activity stats
     */
    getStats() {
        const now = Date.now();
        const hourAgo = now - 3600000;

        const recentEvents = activityBuffer.filter(e => new Date(e.timestamp).getTime() > hourAgo);

        return {
            total: activityBuffer.length,
            lastHour: recentEvents.length,
            byType: this.groupBy(recentEvents, 'type'),
            byLevel: this.groupBy(recentEvents, 'level'),
            errors: recentEvents.filter(e => e.level === 'error').length,
            warnings: recentEvents.filter(e => e.level === 'warning').length
        };
    }

    /**
     * Group array by key
     */
    groupBy(arr, key) {
        return arr.reduce((acc, item) => {
            acc[item[key]] = (acc[item[key]] || 0) + 1;
            return acc;
        }, {});
    }
}

const activityLogService = new ActivityLogService();

module.exports = { activityLogService };
