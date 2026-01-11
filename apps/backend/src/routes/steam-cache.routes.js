const express = require('express');
const EnhancedSteamApiService = require('../services/enhanced-steam-api.service');

const router = express.Router();
const steamApiService = new EnhancedSteamApiService();

// Get user inventory with caching
router.get('/inventory/:steamId', async (req, res) => {
    try {
        const { steamId } = req.params;
        const { appId = 730, contextId = 2 } = req.query;

        if (!steamId || !/^\d{17}$/.test(steamId)) {
            return res.status(400).json({ error: 'Invalid Steam ID' });
        }

        const inventory = await steamApiService.getInventory(steamId, parseInt(appId), parseInt(contextId));

        res.json({
            success: true,
            data: {
                steamId,
                appId: parseInt(appId),
                inventory,
                cached: true,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Steam inventory error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to fetch inventory',
                details: error.message
            }
        });
    }
});

// Get player info with caching
router.get('/player/:steamId', async (req, res) => {
    try {
        const { steamId } = req.params;

        if (!steamId || !/^\d{17}$/.test(steamId)) {
            return res.status(400).json({ error: 'Invalid Steam ID' });
        }

        const playerInfo = await steamApiService.getPlayerInfo(steamId);

        if (!playerInfo) {
            return res.status(404).json({
                success: false,
                error: 'Player not found'
            });
        }

        res.json({
            success: true,
            data: {
                steamId,
                playerInfo,
                cached: true,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Steam player info error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to fetch player info',
                details: error.message
            }
        });
    }
});

// Get cache statistics
router.get('/cache/stats', async (req, res) => {
    try {
        const stats = await steamApiService.getCacheStats();

        res.json({
            success: true,
            data: {
                cache: stats,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Cache stats error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to get cache stats',
                details: error.message
            }
        });
    }
});

// Invalidate user cache
router.post('/cache/invalidate/:steamId', async (req, res) => {
    try {
        const { steamId } = req.params;

        if (!steamId || !/^\d{17}$/.test(steamId)) {
            return res.status(400).json({ error: 'Invalid Steam ID' });
        }

        const invalidatedCount = await steamApiService.invalidateUserCache(steamId);

        res.json({
            success: true,
            data: {
                steamId,
                invalidatedKeys: invalidatedCount,
                message: `${invalidatedCount} cache entries invalidated`
            }
        });

    } catch (error) {
        console.error('Cache invalidation error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to invalidate cache',
                details: error.message
            }
        });
    }
});

module.exports = router;