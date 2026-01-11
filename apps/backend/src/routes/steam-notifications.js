/**
 * Steam Notification Routes
 * API endpoints for Steam notifications
 */

const express = require('express');
const router = express.Router();
const { steamNotificationService } = require('../services/steam-notification.service');

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    next();
};

/**
 * GET /api/steam-notifications
 * Get user's Steam notifications
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        const steamId = req.user.steamId;

        const notifications = await steamNotificationService.getUserNotifications(steamId, parseInt(limit));

        res.json({
            success: true,
            data: notifications,
            message: `Found ${notifications.length} Steam notifications`
        });
    } catch (err) {
        console.error('[SteamNotifications] Failed to get notifications:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch Steam notifications'
        });
    }
});

/**
 * POST /api/steam-notifications/send
 * Send Steam notification (admin/test only)
 */
router.post('/send', requireAuth, async (req, res) => {
    try {
        // Check if user is admin (simple check)
        const isAdmin = req.user.isAdmin || req.user.steamId === process.env.ADMIN_STEAM_ID;

        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        const { steamId, message, tradeOfferId } = req.body;

        if (!steamId || !message) {
            return res.status(400).json({
                success: false,
                error: 'steamId and message are required'
            });
        }

        const sent = await steamNotificationService.sendSteamNotification(steamId, message, tradeOfferId);

        if (sent) {
            res.json({
                success: true,
                message: 'Steam notification sent successfully'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to send Steam notification'
            });
        }
    } catch (err) {
        console.error('[SteamNotifications] Failed to send notification:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to send Steam notification'
        });
    }
});

/**
 * POST /api/steam-notifications/test
 * Test Steam notification system
 */
router.post('/test', requireAuth, async (req, res) => {
    try {
        const steamId = req.user.steamId;
        const testMessage = `🧪 Test notification from Steam Marketplace at ${new Date().toLocaleString()}`;
        const testTradeId = `TEST-${Date.now()}`;

        const sent = await steamNotificationService.sendTradeCompletionNotification(
            steamId,
            testTradeId,
            'Test Item',
            'completed'
        );

        if (sent) {
            res.json({
                success: true,
                message: 'Test Steam notification sent successfully',
                data: {
                    steamId,
                    message: testMessage,
                    tradeOfferId: testTradeId
                }
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to send test Steam notification'
            });
        }
    } catch (err) {
        console.error('[SteamNotifications] Test failed:', err);
        res.status(500).json({
            success: false,
            error: 'Test Steam notification failed'
        });
    }
});

/**
 * GET /api/steam-notifications/stats
 * Get notification statistics (admin only)
 */
router.get('/stats', requireAuth, async (req, res) => {
    try {
        // Check if user is admin
        const isAdmin = req.user.isAdmin || req.user.steamId === process.env.ADMIN_STEAM_ID;

        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        const stats = await steamNotificationService.getNotificationStats();

        res.json({
            success: true,
            data: stats
        });
    } catch (err) {
        console.error('[SteamNotifications] Failed to get stats:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to get Steam notification stats'
        });
    }
});

/**
 * POST /api/steam-notifications/cleanup
 * Cleanup old notifications (admin only)
 */
router.post('/cleanup', requireAuth, async (req, res) => {
    try {
        // Check if user is admin
        const isAdmin = req.user.isAdmin || req.user.steamId === process.env.ADMIN_STEAM_ID;

        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        // Delete old notifications (older than 7 days)
        const { query } = require('../config/database');
        const result = await query(`
            DELETE FROM steam_notifications
            WHERE created_at < NOW() - INTERVAL '7 days'
        `);

        res.json({
            success: true,
            message: `Cleaned up ${result.rowCount} old Steam notifications`
        });
    } catch (err) {
        console.error('[SteamNotifications] Failed to cleanup:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to cleanup Steam notifications'
        });
    }
});

module.exports = router;