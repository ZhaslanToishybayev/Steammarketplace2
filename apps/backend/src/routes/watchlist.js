/**
 * Watchlist (Price Alerts) Routes
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/database');

const getUserId = (req) => {
    if (req.user?.steamId) return req.user.steamId;
    if (req.session?.passport?.user?.steamId) return req.session.passport.user.steamId;
    return null;
};

// Get user's watchlist
router.get('/', async (req, res) => {
    try {
        const steamId = getUserId(req);
        if (!steamId) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }

        const result = await pool.query(`
            SELECT id, market_hash_name, app_id, target_price, alert_type, is_active, created_at
            FROM watchlist
            WHERE user_steam_id = $1
            ORDER BY created_at DESC
        `, [steamId]);

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get watchlist error:', error);
        res.status(500).json({ success: false, error: 'Failed to get watchlist' });
    }
});

// Add item to watchlist
router.post('/', async (req, res) => {
    try {
        const steamId = getUserId(req);
        if (!steamId) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }

        const { marketHashName, appId = 730, targetPrice, alertType = 'below' } = req.body;

        if (!marketHashName) {
            return res.status(400).json({ success: false, error: 'marketHashName required' });
        }

        const result = await pool.query(`
            INSERT INTO watchlist (user_steam_id, market_hash_name, app_id, target_price, alert_type)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (user_steam_id, market_hash_name, app_id) 
            DO UPDATE SET target_price = $4, alert_type = $5, is_active = true
            RETURNING *
        `, [steamId, marketHashName, appId, targetPrice, alertType]);

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Add to watchlist error:', error);
        res.status(500).json({ success: false, error: 'Failed to add item' });
    }
});

// Remove from watchlist
router.delete('/:id', async (req, res) => {
    try {
        const steamId = getUserId(req);
        const { id } = req.params;

        await pool.query(
            'DELETE FROM watchlist WHERE id = $1 AND user_steam_id = $2',
            [id, steamId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Remove from watchlist error:', error);
        res.status(500).json({ success: false, error: 'Failed to remove item' });
    }
});

// Toggle watchlist item
router.patch('/:id', async (req, res) => {
    try {
        const steamId = getUserId(req);
        const { id } = req.params;
        const { isActive } = req.body;

        const result = await pool.query(
            'UPDATE watchlist SET is_active = $1 WHERE id = $2 AND user_steam_id = $3 RETURNING *',
            [isActive, id, steamId]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Toggle watchlist error:', error);
        res.status(500).json({ success: false, error: 'Failed to update item' });
    }
});

module.exports = router;
