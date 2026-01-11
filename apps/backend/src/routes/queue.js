/**
 * Queue API Routes
 * Endpoints to check job status and queue stats
 */

const express = require('express');
const router = express.Router();
const { tradeQueueService } = require('../services/trade-queue.service');

/**
 * GET /api/queue/job/:jobId
 * Get status of a queued job
 */
router.get('/job/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const queueName = req.query.queue || 'trade-offers'; // Default to trade queue

        const status = await tradeQueueService.getJobStatus(jobId, queueName);

        if (!status) {
            return res.status(404).json({
                success: false,
                error: 'Job not found',
            });
        }

        res.json({
            success: true,
            data: status,
        });
    } catch (err) {
        console.error('[Queue] Failed to get job status:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to get job status',
        });
    }
});

/**
 * GET /api/queue/stats
 * Get queue statistics (admin only in production)
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await tradeQueueService.getStats();
        res.json({
            success: true,
            data: stats,
        });
    } catch (err) {
        console.error('[Queue] Failed to get stats:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to get queue stats',
        });
    }
});

module.exports = router;
