/**
 * Bots Routes
 * Handles bot status and monitoring
 */

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

/**
 * GET /api/bots/status
 * Get all bots status
 */
router.get('/status', async (req, res) => {
    try {
        const result = await query(`
            SELECT steam_id, account_name, display_name, status, 
                   inventory_count, active_trades_count, last_online_at, 
                   last_error, created_at
            FROM bots
            ORDER BY created_at ASC
        `);

        res.json({
            success: true,
            data: result.rows,
            total: result.rows.length,
            online: result.rows.filter(b => b.status === 'online').length
        });
    } catch (err) {
        console.error('[Bots] Failed to get status:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch bot status' });
    }
});

/**
 * GET /api/bots/:steamId
 * Get specific bot details
 */
router.get('/:steamId', async (req, res) => {
    try {
        const { steamId } = req.params;
        const result = await query("SELECT * FROM bots WHERE steam_id = $1", [steamId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Bot not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('[Bots] Failed to get bot:', err);
        res.status(500).json({ success: false, error: 'Internal error' });
    }
});

module.exports = router;
