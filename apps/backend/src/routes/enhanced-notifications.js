/**
 * Enhanced Notification Routes
 * API endpoints for reliable notification system
 */

const express = require('express');
const router = express.Router();
const { enhancedNotificationService } = require('../services/enhanced-notification.service');

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
 * GET /api/notifications
 * Get user's notifications
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const steamId = req.user.steamId;

        const notifications = await enhancedNotificationService.getUserNotifications(steamId, parseInt(limit));

        res.json({
            success: true,
            data: notifications,
            message: `Found ${notifications.length} notifications`
        });
    } catch (err) {
        console.error('[Notifications] Failed to get notifications:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch notifications'
        });
    }
});

/**
 * POST /api/notifications/:notificationId/read
 * Mark notification as read
 */
router.post('/:notificationId/read', requireAuth, async (req, res) => {
    try {
        const { notificationId } = req.params;
        const steamId = req.user.steamId;

        // Verify user owns the notification
        const { query } = require('../config/database');
        const result = await query(
            'SELECT * FROM notifications WHERE id = $1 AND steam_id = $2',
            [notificationId, steamId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found'
            });
        }

        const marked = await enhancedNotificationService.markNotificationAsRead(notificationId);

        if (marked) {
            res.json({
                success: true,
                message: 'Notification marked as read'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to mark notification as read'
            });
        }
    } catch (err) {
        console.error('[Notifications] Failed to mark as read:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to mark notification as read'
        });
    }
});

/**
 * DELETE /api/notifications/:notificationId
 * Delete notification
 */
router.delete('/:notificationId', requireAuth, async (req, res) => {
    try {
        const { notificationId } = req.params;
        const steamId = req.user.steamId;

        // Verify user owns the notification
        const { query } = require('../config/database');
        const result = await query(
            'DELETE FROM notifications WHERE id = $1 AND steam_id = $2',
            [notificationId, steamId]
        );

        if (result.rowCount > 0) {
            res.json({
                success: true,
                message: 'Notification deleted'
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Notification not found'
            });
        }
    } catch (err) {
        console.error('[Notifications] Failed to delete notification:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to delete notification'
        });
    }
});

/**
 * GET /api/notifications/stats
 * Get notification statistics (admin only)
 */
router.get('/stats', requireAuth, async (req, res) => {
    try {
        // Check if user is admin (you would implement your own admin check)
        const isAdmin = req.user.isAdmin || req.user.steamId === process.env.ADMIN_STEAM_ID;

        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        const stats = await enhancedNotificationService.getNotificationStats();

        res.json({
            success: true,
            data: stats
        });
    } catch (err) {
        console.error('[Notifications] Failed to get stats:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to get notification stats'
        });
    }
});

/**
 * POST /api/notifications/cleanup
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

        const deletedCount = await enhancedNotificationService.cleanupOldNotifications();

        res.json({
            success: true,
            message: `Cleaned up ${deletedCount} old notifications`
        });
    } catch (err) {
        console.error('[Notifications] Failed to cleanup:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to cleanup notifications'
        });
    }
});

/**
 * POST /api/notifications/test
 * Test notification system
 */
router.post('/test', requireAuth, async (req, res) => {
    try {
        const steamId = req.user.steamId;
        const testNotification = {
            type: 'test',
            message: 'This is a test notification',
            timestamp: new Date().toISOString()
        };

        // Try to send notification
        const sent = await enhancedNotificationService.sendTradeUpdate(steamId, testNotification);

        if (sent) {
            res.json({
                success: true,
                message: 'Test notification sent successfully',
                data: testNotification
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to send test notification'
            });
        }
    } catch (err) {
        console.error('[Notifications] Test failed:', err);
        res.status(500).json({
            success: false,
            error: 'Test notification failed'
        });
    }
});

module.exports = router;