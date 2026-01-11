const express = require('express');
const optimizedSteamApiService = require('../services/steam-api-optimized.service');

const router = express.Router();

// Получение инвентаря с оптимизированным кэшированием
router.get('/inventory/:steamId', async (req, res) => {
    try {
        const { steamId } = req.params;
        const { appId = 730, contextId = 2 } = req.query;

        if (!steamId || !/^\d{17}$/.test(steamId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Steam ID format'
            });
        }

        const startTime = Date.now();
        const inventory = await optimizedSteamApiService.getInventory(steamId, parseInt(appId), parseInt(contextId));
        const responseTime = Date.now() - startTime;

        res.json({
            success: true,
            data: {
                steamId,
                appId: parseInt(appId),
                contextId: parseInt(contextId),
                inventory,
                cached: inventory.length > 0 ? true : false,
                responseTime,
                timestamp: new Date().toISOString()
            },
            meta: {
                performance: {
                    responseTime,
                    cached: inventory.length > 0
                }
            }
        });

    } catch (error) {
        console.error('[SteamAPI] Inventory error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to fetch inventory',
                details: error.message
            }
        });
    }
});

// Получение информации об игроке
router.get('/player/:steamId', async (req, res) => {
    try {
        const { steamId } = req.params;

        if (!steamId || !/^\d{17}$/.test(steamId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Steam ID format'
            });
        }

        const startTime = Date.now();
        const playerInfo = await optimizedSteamApiService.getPlayerInfo(steamId);
        const responseTime = Date.now() - startTime;

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
                responseTime,
                timestamp: new Date().toISOString()
            },
            meta: {
                performance: {
                    responseTime
                }
            }
        });

    } catch (error) {
        console.error('[SteamAPI] Player info error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to fetch player info',
                details: error.message
            }
        });
    }
});

// Получение статистики кэширования
router.get('/cache/stats', async (req, res) => {
    try {
        const stats = await optimizedSteamApiService.getCacheStats();

        res.json({
            success: true,
            data: {
                cache: stats,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('[SteamAPI] Cache stats error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to get cache stats',
                details: error.message
            }
        });
    }
});

// Инвалидация кэша пользователя
router.post('/cache/invalidate/:steamId', async (req, res) => {
    try {
        const { steamId } = req.params;

        if (!steamId || !/^\d{17}$/.test(steamId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Steam ID format'
            });
        }

        const invalidatedCount = await optimizedSteamApiService.invalidateUserCache(steamId);

        res.json({
            success: true,
            data: {
                steamId,
                invalidatedKeys: invalidatedCount,
                message: `${invalidatedCount} cache entries invalidated`,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('[SteamAPI] Cache invalidation error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to invalidate cache',
                details: error.message
            }
        });
    }
});

// Health check для Steam API
router.get('/health', async (req, res) => {
    try {
        const stats = await optimizedSteamApiService.getCacheStats();

        res.json({
            success: true,
            data: {
                status: 'healthy',
                steamApi: {
                    rateLimit: {
                        current: stats.apiCalls,
                        limit: 30,
                        window: '1 minute'
                    }
                },
                cache: {
                    hitRate: stats.cacheHitRate.toFixed(2) + '%',
                    memorySize: stats.memoryCacheSize,
                    redisMemory: stats.redisMemory
                },
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('[SteamAPI] Health check error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Steam API health check failed',
                details: error.message
            }
        });
    }
});

module.exports = router;