const express = require('express');
const metricsService = require('../services/metricsService');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: Prometheus metrics endpoint
 *     description: Returns metrics in Prometheus format
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Metrics in Prometheus format
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */
router.get('/', async (req, res) => {
  try {
    res.set('Content-Type', metricsService.getRegistry().contentType);
    const metrics = await metricsService.getMetrics();
    res.send(metrics);
  } catch (error) {
    logger.error('Error generating metrics:', error);
    res.status(500).json({
      error: 'Failed to generate metrics',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/metrics/summary:
 *   get:
 *     summary: Get metrics summary
 *     description: Returns a summary of current metrics
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Metrics summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 uptime:
 *                   type: number
 *                   description: Process uptime in seconds
 *                 memory:
 *                   type: object
 *                   properties:
 *                     heapUsed:
 *                       type: number
 *                     heapTotal:
 *                       type: number
 *                     external:
 *                       type: number
 *                 timestamp:
 *                   type: string
 */
router.get('/summary', async (req, res) => {
  try {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    res.json({
      uptime: uptime,
      memory: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss
      },
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: require('../package.json').version
    });
  } catch (error) {
    logger.error('Error getting metrics summary:', error);
    res.status(500).json({
      error: 'Failed to get metrics summary',
      message: error.message
    });
  }
});

module.exports = router;
