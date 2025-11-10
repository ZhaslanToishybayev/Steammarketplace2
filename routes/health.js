const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const cacheService = require('../services/cacheService');

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns application health status
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   example: 2025-11-10T10:00:00.000Z
 *                 uptime:
 *                   type: number
 *                   example: 3600
 *                 version:
 *                   type: string
 *                   example: 2.0.0
 *                 checks:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                         responseTime:
 *                           type: number
 *                     cache:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                         responseTime:
 *                           type: number
 *       503:
 *         description: Service is unhealthy
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: require('../package.json').version,
    checks: {}
  };

  try {
    // Check database connection
    const dbStartTime = Date.now();
    const dbStatus = mongoose.connection.readyState === 1 ? 'up' : 'down';
    const dbResponseTime = Date.now() - dbStartTime;

    healthCheck.checks.database = {
      status: dbStatus,
      responseTime: dbResponseTime,
      readyState: mongoose.connection.readyState
    };

    if (dbStatus === 'down') {
      healthCheck.status = 'unhealthy';
    }

    // Check Redis cache
    try {
      const cacheStartTime = Date.now();
      if (cacheService && cacheService.getStats) {
        const cacheStats = cacheService.getStats();
        const cacheResponseTime = Date.now() - cacheStartTime;

        healthCheck.checks.cache = {
          status: 'up',
          responseTime: cacheResponseTime,
          hitRate: cacheStats.hitRate || 0,
          keys: cacheStats.keys || 0
        };
      } else {
        // Simple Redis ping
        await cacheService.ping();
        const cacheResponseTime = Date.now() - cacheStartTime;

        healthCheck.checks.cache = {
          status: 'up',
          responseTime: cacheResponseTime
        };
      }
    } catch (cacheError) {
      healthCheck.checks.cache = {
        status: 'down',
        error: cacheError.message
      };
      healthCheck.status = 'unhealthy';
    }

    // Overall response time
    healthCheck.responseTime = Date.now() - startTime;

    const statusCode = healthCheck.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthCheck);

  } catch (error) {
    healthCheck.status = 'unhealthy';
    healthCheck.error = error.message;
    healthCheck.responseTime = Date.now() - startTime;

    res.status(503).json(healthCheck);
  }
});

/**
 * @swagger
 * /api/health/ready:
 *   get:
 *     summary: Readiness probe
 *     description: Checks if service is ready to receive traffic
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Service is ready
 *       503:
 *         description: Service is not ready
 */
router.get('/ready', async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        status: 'not_ready',
        reason: 'Database not connected'
      });
    }

    // Check if cache is available
    try {
      await cacheService.ping();
    } catch (cacheError) {
      return res.status(503).json({
        status: 'not_ready',
        reason: 'Cache not available'
      });
    }

    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/health/live:
 *   get:
 *     summary: Liveness probe
 *     description: Checks if service is alive
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Service is alive
 */
router.get('/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * @swagger
 * /api/health/ping:
 *   get:
 *     summary: Simple ping endpoint
 *     description: Returns pong
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Pong response
 */
router.get('/ping', (req, res) => {
  res.json({
    message: 'pong',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
