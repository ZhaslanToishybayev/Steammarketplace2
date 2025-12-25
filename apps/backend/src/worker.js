/**
 * Worker Process
 * Handles CPU-intensive operations separately from the API server:
 * - Steam Bot initialization and management
 * - Trade Queue processing
 * 
 * Run: node src/worker.js
 */

require('dotenv').config();

const { logger } = require('./utils/logger');
const { testRedisConnection, closeRedisConnections } = require('./config/redis');
const { testConnection, pool, query } = require('./config/database');
const { runMigrations } = require('./utils/migrate');
const { initializeBots } = require('./config/bots.config');
const { tradeQueueService } = require('./services/trade-queue.service');
const { botManager } = require('./services/bot-manager.service');

// Initialize Listeners that depend on bots
require('./services/deposit.service');
require('./services/escrow-listener.service');

async function startWorker() {
    logger.info('🔧 Starting Worker Process...');

    try {
        // Test Redis connection (required for queue)
        logger.info('🔄 [Worker] Connecting to Redis...');
        const redisConnected = await testRedisConnection();
        if (!redisConnected) {
            logger.error('❌ [Worker] Redis connection failed. Worker cannot start without Redis.');
            process.exit(1);
        }

        // Test database connection
        logger.info('🔄 [Worker] Connecting to database...');
        const dbConnected = await testConnection();
        if (!dbConnected) {
            logger.error('❌ [Worker] Database connection failed. Worker cannot start without DB.');
            process.exit(1);
        }

        // Run migrations (idempotent, safe to run in worker too)
        await runMigrations();

        // Initialize Steam bots
        logger.info('🤖 [Worker] Initializing Steam bots...');
        const botResult = await initializeBots();
        if (botResult.success) {
            logger.info(`✅ [Worker] ${botResult.bots?.length || 0} bot(s) initialized successfully.`);
        } else if (botResult.message === 'No bots configured') {
            logger.warn('⚠️ [Worker] No bots configured in environment.');
        } else {
            logger.warn('⚠️ [Worker] Some bots failed to initialize. Check credentials.');
        }

        // Start Trade Queue Processor
        logger.info('📬 [Worker] Starting Trade Queue Processor...');
        tradeQueueService.processTradeQueue(1, async (job) => {
            logger.info(`[Worker Queue] Processing trade job ${job.id}: ${job.data.type}`);
            try {
                const { tradeUrl, itemsToReceive, itemsToGive, message, tradeUuid } = job.data;
                const { offerId } = await botManager.sendTradeOffer({
                    tradeUrl,
                    itemsToReceive,
                    itemsToGive,
                    message,
                });
                logger.info(`[Worker Queue] Trade offer sent: ${offerId} for job ${job.id}`);
                return { offerId, tradeUuid };
            } catch (err) {
                logger.error(`[Worker Queue] Trade job ${job.id} failed: ${err.message}`);
                throw err; // Bull will retry based on config
            }
        });
        logger.info('✅ [Worker] Trade Queue Processor started.');

        logger.info('🚀 [Worker] Worker process is running. Press Ctrl+C to stop.');

    } catch (err) {
        logger.error('❌ [Worker] Failed to start worker:', { error: err.message, stack: err.stack });
        process.exit(1);
    }
}

startWorker();

// ========== GRACEFUL SHUTDOWN ==========
const gracefulShutdown = async (signal) => {
    logger.info(`🛑 [Worker] Received ${signal}. Starting graceful shutdown...`);

    try {
        // Stop all bots
        logger.info('🤖 [Worker] Stopping bots...');
        botManager.stopAll();
        logger.info('✅ [Worker] Bots stopped');

        // Close trade queue
        logger.info('📬 [Worker] Closing trade queue...');
        await tradeQueueService.shutdown();
        logger.info('✅ [Worker] Trade queue closed');

        // Close Redis connections
        logger.info('🔴 [Worker] Closing Redis connections...');
        await closeRedisConnections();

        // Close database pool
        logger.info('📦 [Worker] Closing database connections...');
        await pool.end();
        logger.info('✅ [Worker] Database pool closed');

        logger.info('👋 [Worker] Graceful shutdown completed');
        process.exit(0);
    } catch (err) {
        logger.error('❌ [Worker] Error during shutdown:', { error: err.message });
        process.exit(1);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('❌ [Worker] Unhandled Rejection:', { reason, promise });
});

process.on('uncaughtException', (err) => {
    logger.error('❌ [Worker] Uncaught Exception:', { error: err.message, stack: err.stack });
    process.exit(1);
});
