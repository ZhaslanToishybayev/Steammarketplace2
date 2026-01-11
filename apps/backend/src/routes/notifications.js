/**
 * Push Notification Routes
 * API endpoints for managing push notification subscriptions.
 * 
 * Endpoints:
 * - GET /vapid-key - Get public VAPID key
 * - POST /subscribe - Subscribe to push notifications
 * - POST /unsubscribe - Unsubscribe from push notifications
 * - POST /test - Send test notification (dev only)
 */

const express = require('express');
const router = express.Router();
const { pushNotificationService } = require('../services/push-notification.service');

// Middleware to ensure user is authenticated
function requireAuth(req, res, next) {
    if (!req.user?.steamId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
}

/**
 * GET /api/notifications/vapid-key
 * Get public VAPID key for push subscription
 */
router.get('/vapid-key', (req, res) => {
    res.json({
        success: true,
        publicKey: pushNotificationService.getPublicKey(),
    });
});

/**
 * POST /api/notifications/subscribe
 * Subscribe to push notifications
 */
router.post('/subscribe', requireAuth, async (req, res) => {
    try {
        const { subscription } = req.body;

        if (!subscription?.endpoint || !subscription?.keys) {
            return res.status(400).json({ error: 'Invalid subscription object' });
        }

        await pushNotificationService.subscribe(req.user.steamId, subscription);

        res.json({ success: true, message: 'Subscribed to push notifications' });
    } catch (err) {
        console.error('Subscribe error:', err);
        res.status(500).json({ error: 'Failed to subscribe' });
    }
});

/**
 * POST /api/notifications/unsubscribe
 * Unsubscribe from push notifications
 */
router.post('/unsubscribe', requireAuth, async (req, res) => {
    try {
        await pushNotificationService.unsubscribe(req.user.steamId);
        res.json({ success: true, message: 'Unsubscribed from push notifications' });
    } catch (err) {
        console.error('Unsubscribe error:', err);
        res.status(500).json({ error: 'Failed to unsubscribe' });
    }
});

/**
 * POST /api/notifications/test
 * Send test notification (development only)
 */
router.post('/test', requireAuth, async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Not available in production' });
    }

    try {
        const result = await pushNotificationService.sendToUser(req.user.steamId, {
            title: '🔔 Test Notification',
            body: 'Push notifications are working!',
            icon: '/icons/notification-icon.png',
            data: { type: 'test' },
        });

        res.json(result);
    } catch (err) {
        console.error('Test notification error:', err);
        res.status(500).json({ error: 'Failed to send test notification' });
    }
});

module.exports = router;
