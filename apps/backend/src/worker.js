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
const { testRedisConnection, closeRedisConnections, redisClient } = require('./config/redis');
const { testConnection, pool, query } = require('./config/database');
const { runMigrations } = require('./utils/migrate');
const { initializeBots } = require('./config/bots.config');
const { tradeQueueService } = require('./services/trade-queue.service');
const { botManager } = require('./services/bot-manager.service');
const p2pService = require('./services/p2p.service');
const { calculateItemValue } = require('./services/external-pricing.service');
const telegram = require('./services/telegram-bot.service');
const { Emitter } = require('@socket.io/redis-emitter');
const rateLimiter = require('./utils/steam-rate-limiter'); // Rate Limiter for Worker
const metrics = require('./services/metrics.service');
const express = require('express');

// Initialize Socket Emitter
let ioEmitter;
try {
    ioEmitter = new Emitter(redisClient);
} catch (e) {
    logger.warn('⚠️ Failed to initialize Redis Emitter for Socket.io');
}

// Initialize Listeners that depend on bots
require('./services/deposit.service');
require('./services/escrow-listener.service');

// Start Metrics Server (for Prometheus)
const app = express();
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', metrics.register.contentType);
    res.end(await metrics.register.metrics());
});
app.listen(3001, () => {
    logger.info('📊 [Worker] Metrics server listening on port 3001');
});

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
        await metrics.initializeMetrics();

        // Initialize Steam bots
        logger.info('🤖 [Worker] Initializing Steam bots...');
        const botResult = await initializeBots();
        
        // Force sync if initialization was successful, regardless of reported online count (race condition fix)
        if (botResult.success) {
            logger.info(`✅ [Worker] Bot initialization completed. Online reported: ${botResult.online}. Starting sync anyway.`);

            // Register bots in DB so they appear in API
            const bots = botManager.getAllBots();
            for (const bot of bots) {
                 if (bot.isReady && bot.config.steamId) {
                     try {
                        await query(`
                            INSERT INTO bots (steam_id, account_name, status, last_online_at, updated_at)
                            VALUES ($1, $2, 'online', NOW(), NOW())
                            ON CONFLICT (steam_id) 
                            DO UPDATE SET status = 'online', last_online_at = NOW(), updated_at = NOW()
                        `, [bot.config.steamId, bot.config.accountName]);
                        logger.info(`[Worker] Registered bot ${bot.config.accountName} in DB.`);
                     } catch (err) {
                        logger.error(`[Worker] Failed to register bot ${bot.config.accountName} in DB: ${err.message}`);
                     }
                 }
            }

            await telegram.sendStartupNotification(process.env.NODE_ENV || 'development');

            // 1. Queue Initial Inventory Sync
            logger.info('🔄 [Worker] Queueing initial inventory sync...');
            await tradeQueueService.addTradeJob({
                type: 'system-sync-inventory',
                triggeredBy: 'bot_startup',
                timestamp: new Date().toISOString()
            }, {
                priority: 1 // High priority
            });

            // 2. Schedule Recurring Inventory Sync (every 6 hours)
            await tradeQueueService.addTradeJob({
                type: 'system-sync-inventory',
                triggeredBy: 'scheduled',
                timestamp: new Date().toISOString()
            }, {
                repeat: {
                    every: 6 * 60 * 60 * 1000 // 6 hours
                }
            });
            logger.info('✅ [Worker] Inventory sync jobs queued');

        } else if (botResult.message === 'No bots configured') {
            logger.warn('⚠️ [Worker] No bots configured in environment.');
        } else {
            logger.warn('⚠️ [Worker] Some bots failed to initialize. Check credentials.');
            await telegram.sendCriticalError('Bot Initialization', 'Some bots failed to start');
        }

        // Start Trade Queue Processor
        logger.info('📬 [Worker] Starting Trade Queue Processor...');
        tradeQueueService.processTradeQueue(1, async (job) => {
            const { type, tradeUrl, itemsToReceive, itemsToGive, message, tradeUuid, listingId } = job.data;
            logger.info(`[Worker Queue] Processing job ${job.id} type: ${type}`);

            try {
                let result;

                // SPECIAL JOB: SYSTEM INVENTORY SYNC
                if (type === 'system-sync-inventory') {
                    logger.info('[Worker Queue] Starting System Inventory Sync...', { triggeredBy: job.data.triggeredBy });
                    const bot = botManager.getAvailableBot();
                    if (!bot) throw new Error('No bot available for sync');

                    logger.info(`[Worker Queue] Fetching inventory for bot ${bot.config.accountName}...`);
                    
                    // Use Rate Limiter for Inventory Fetch
                    const inventory = await rateLimiter.execute(async () => {
                        return bot.getInventory(730, 2);
                    });
                    
                    logger.info(`[Worker Queue] Fetched ${inventory.length} items from Steam.`);
                    
                    // Update Metrics
                    metrics.updateBotInventoryMetrics(bot.config.accountName, inventory.length);

                    const client = await pool.connect();
                    try {
                        await client.query('BEGIN');

                        // Clean up old data
                        await client.query('DELETE FROM escrow_transactions WHERE escrow_trade_id IN (SELECT id FROM escrow_trades WHERE seller_steam_id = $1)', [bot.config.steamId]);
                        await client.query('DELETE FROM escrow_trades WHERE seller_steam_id = $1', [bot.config.steamId]);
                        await client.query('DELETE FROM listings WHERE seller_steam_id = $1', [bot.config.steamId]);

                        let count = 0;
                        for (const item of inventory) {
                            let price = 10.00;
                            try {
                                // Use Rate Limiter for Pricing (if it uses external API)
                                // calculateItemValue usually caches internally, but if it hits Steam Market, it should be rate limited.
                                // Assuming calculateItemValue handles its own rate limiting or is safe.
                                // If it uses Steam Market directly, we should patch it later.
                                const valuation = await calculateItemValue({
                                    marketHashName: item.market_hash_name,
                                    floatValue: item.float_value,
                                    stickers: item.stickers || [],
                                    inspectLink: item.inspect_link
                                });
                                if (valuation && valuation.totalValue > 0) {
                                    price = valuation.totalValue * 1.05;
                                }
                            } catch (e) {}

                            await client.query(
                                'INSERT INTO listings (seller_steam_id, seller_trade_url, status, item_asset_id, item_name, item_market_hash_name, item_app_id, item_icon_url, item_rarity, item_exterior, item_float, item_stickers, price, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)',
                                [
                                    bot.config.steamId,
                                    bot.config.tradeUrl || '',
                                    'active',
                                    item.assetid,
                                    item.market_hash_name || item.name,
                                    item.market_hash_name,
                                    730,
                                    `https://community.cloudflare.steamstatic.com/economy/image/${item.icon_url}`,
                                    'Common', 'Factory New', item.float_value || 0.00, JSON.stringify(item.stickers || []),
                                    price, 'NOW()', 'NOW()'
                                ]
                            );
                            count++;
                        }

                        await client.query('COMMIT');
                        logger.info(`[Worker Queue] Synced ${count} real items to DB.`);
                        
                        // Invalidate cache
                        await redisClient.del('marketplace:listings:cache');
                        
                        await telegram.sendMessage(`Inventory sync completed: ${count} items`, 'success');
                        return { synced: count };

                    } catch (dbErr) {
                        await client.query('ROLLBACK');
                        throw dbErr;
                    } finally {
                        client.release();
                    }
                }

                if (type === 'escrow-request-item') {
                    // DEPOSIT MODE: Bot requests item from user
                    logger.info(`[Worker Queue] Bot is requesting item for listing ${listingId} from user`);
                    result = await botManager.sendTradeOffer({
                        partnerTradeUrl: tradeUrl,
                        itemsToReceive,
                        itemsToGive: [],
                        message: message || 'Deposit for Steam Marketplace',
                    });
                } else if (type === 'send-offer') { // Handle 'send-offer' type explicitly
                     // DEFAULT/WITHDRAW MODE: Bot sends item to user
                    result = await botManager.sendTradeOffer({
                        partnerTradeUrl: tradeUrl,
                        itemsToReceive: itemsToReceive || [],
                        itemsToGive: itemsToGive || [],
                        message: message || 'Your item from Steam Marketplace',
                    });
                } else {
                     // Fallback for generic jobs
                     if (tradeUrl) {
                        result = await botManager.sendTradeOffer({
                            partnerTradeUrl: tradeUrl,
                            itemsToReceive: itemsToReceive || [],
                            itemsToGive: itemsToGive || [],
                            message: message || 'Steam Marketplace Trade',
                        });
                     } else {
                         // Just skip if no trade logic needed (e.g. sync job)
                         return { status: 'skipped' };
                     }
                }

                const { offerId } = result;
                logger.info(`[Worker Queue] Trade offer sent: ${offerId} for job ${job.id}`);

                // Update DB for Deposit (listingId)
                if (listingId && type === 'escrow-request-item') {
                    await query(
                        "UPDATE listings SET status = 'awaiting_deposit_confirmation', updated_at = NOW() WHERE id = $1",
                        [listingId]
                    );
                }

                // Update DB for Purchase (tradeUuid)
                if (tradeUuid) {
                    const updateRes = await query(
                        "UPDATE escrow_trades SET buyer_trade_offer_id = $1, status = 'awaiting_buyer', buyer_offer_sent_at = NOW() WHERE trade_uuid = $2 RETURNING buyer_steam_id",
                        [offerId, tradeUuid]
                    );
                    logger.info(`[Worker Queue] Updated trade ${tradeUuid} to awaiting_buyer`);
                    
                    // Notify User via Socket
                    if (updateRes.rows.length > 0 && ioEmitter) {
                        const buyerId = updateRes.rows[0].buyer_steam_id;
                        ioEmitter.to(`user:${buyerId}`).emit('trade_updated', {
                            tradeUuid,
                            status: 'awaiting_buyer',
                            message: 'Trade offer sent! Please check your Steam Mobile app.'
                        });
                    }
                }

                return { offerId, tradeUuid, listingId };
            } catch (err) {
                logger.error(`[Worker Queue] Job ${job.id} failed: ${err.message}`);
                
                // Record Metric
                metrics.recordTradeError(type || 'unknown');

                // SMART RECONCILIATION: Auto-Refund on Send Failure
                if (tradeUuid) {
                    try {
                        logger.info(`[Worker Smart Refund] Attempting rollback for trade ${tradeUuid}...`);
                        const client = await pool.connect();
                        try {
                            await client.query('BEGIN');
                            
                            // Get trade details
                            const tradeRes = await client.query('SELECT * FROM escrow_trades WHERE trade_uuid = $1 FOR UPDATE', [tradeUuid]);
                            if (tradeRes.rows.length > 0) {
                                const trade = tradeRes.rows[0];
                                
                                // 1. Fail the trade
                                await client.query("UPDATE escrow_trades SET status = 'failed_send', notes = $1, updated_at = NOW() WHERE trade_uuid = $2", [err.message, tradeUuid]);
                                
                                // 2. Refund Buyer (if Bot Sale)
                                if (trade.trade_type === 'bot_sale' && trade.price > 0) {
                                    await client.query("UPDATE users SET balance = balance + $1 WHERE steam_id = $2", [trade.price, trade.buyer_steam_id]);
                                    logger.info(`[Worker Smart Refund] Refunded $${trade.price} to ${trade.buyer_steam_id}`);
                                    await telegram.sendTradeFailure(tradeUuid, err.message, trade.price);
                                    
                                    // Socket Notification
                                    if (ioEmitter) {
                                        ioEmitter.to(`user:${trade.buyer_steam_id}`).emit('trade_failed', {
                                            tradeUuid,
                                            reason: 'Steam Error: Trade could not be sent. Funds refunded.',
                                            refundAmount: trade.price
                                        });
                                        ioEmitter.to(`user:${trade.buyer_steam_id}`).emit('balance_updated', {
                                            // Ideally send new balance, but we don't calculate it here easily without another query
                                            // Frontend should refetch
                                        });
                                    }
                                } else {
                                    await telegram.sendTradeFailure(tradeUuid, err.message, 0);
                                }
                                
                                // 3. Restore Listing (if applicable)
                                if (trade.listing_id) {
                                    await client.query("UPDATE listings SET status = 'active', updated_at = NOW() WHERE id = $1", [trade.listing_id]);
                                    logger.info(`[Worker Smart Refund] Restored listing ${trade.listing_id} to active`);
                                }
                            }
                            
                            await client.query('COMMIT');
                            logger.info(`[Worker Smart Refund] Successfully rolled back trade ${tradeUuid}`);
                        } catch (rollbackErr) {
                            await client.query('ROLLBACK');
                            logger.error(`[Worker Smart Refund] Rollback failed: ${rollbackErr.message}`);
                        } finally {
                            client.release();
                        }
                    } catch (dbErr) {
                        logger.error(`[Worker Smart Refund] DB Error: ${dbErr.message}`);
                    }
                }
                
                throw err;
            }
        });
        logger.info('✅ [Worker] Trade Queue Processor started.');

        // NEW: Periodic Database Scanner (Fallback)
        setInterval(async () => {
            try {
                // 1. Check for new deposits
                const pendingDeposits = await query(
                    "SELECT id, item_name, item_asset_id, item_app_id, seller_trade_url FROM listings WHERE status = 'pending_deposit' AND created_at > NOW() - INTERVAL '1 hour' LIMIT 5"
                );

                for (const listing of pendingDeposits.rows) {
                    logger.info(`[Worker Scanner] Found pending deposit: ${listing.item_name} (ID: ${listing.id})`);
                    // Add to queue if not already there (or just process directly)
                    await tradeQueueService.addTradeJob({
                        type: 'escrow-request-item',
                        listingId: listing.id,
                        tradeUrl: listing.seller_trade_url,
                        itemsToReceive: [{
                            assetId: listing.item_asset_id,
                            appId: listing.item_app_id,
                            contextId: '2'
                        }],
                        message: `[Steam Marketplace] Auto-Scanner: Deposit for ${listing.item_name}`
                    });
                }

                // 2. Check for pending purchases (Bot Sales)
                const pendingPurchases = await query(
                    "SELECT t.*, l.item_asset_id, l.item_app_id, l.item_name, u.trade_url as buyer_trade_url FROM escrow_trades t JOIN listings l ON t.listing_id = l.id JOIN users u ON t.buyer_steam_id = u.steam_id WHERE (t.status = 'payment_received' OR t.status = 'processing') AND t.trade_type = 'bot_sale' AND t.created_at > NOW() - INTERVAL '1 hour' LIMIT 5"
                );

                for (const trade of pendingPurchases.rows) {
                    logger.info(`[Worker Scanner] Found pending bot sale: ${trade.item_name} (Trade: ${trade.trade_uuid})`);
                    await tradeQueueService.addTradeJob({
                        type: 'send-offer',
                        tradeUuid: trade.trade_uuid,
                        tradeUrl: trade.buyer_trade_url,
                        itemsToGive: [{
                            assetId: trade.item_asset_id,
                            appId: trade.item_app_id,
                            contextId: '2'
                        }],
                        message: `[Steam Marketplace] Auto-Scanner: Your item ${trade.item_name}`
                    });
                }

                // 3. Scan P2P Trades (Monitor Status)
                const p2pTrades = await query(
                    "SELECT trade_uuid FROM escrow_trades WHERE trade_type = 'p2p' AND status IN ('awaiting_seller_send', 'awaiting_buyer', 'processing') AND created_at > NOW() - INTERVAL '1 hour'"
                );

                for (const trade of p2pTrades.rows) {
                    try {
                        const result = await p2pService.syncTrade(trade.trade_uuid);
                        if (result.status === 'completed') {
                            logger.info(`[Worker Scanner] P2P Trade ${trade.trade_uuid} COMPLETED!`);
                        }
                    } catch (err) {
                        // Silent fail for monitoring (don't spam logs for API timeouts)
                    }
                }

            } catch (err) {
                logger.error('[Worker Scanner] Error:', { message: err.message, stack: err.stack });
            }
        }, 30000); // Every 30 seconds

        logger.info('🚀 [Worker] Worker process is running with Fallback Scanner.');

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
