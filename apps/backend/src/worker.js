require('dotenv').config();
const { botManager } = require('./services/bot-manager.service');
const { tradeQueueService } = require('./services/trade-queue.service');
require('./services/escrow-listener.service');
const { pool, query, testConnection } = require('./config/database');
const { testRedisConnection, closeRedisConnections, redisClient } = require('./config/redis');
const { logger } = require('./utils/logger');
const { calculateItemValue } = require('./services/external-pricing.service');
const telegram = require('./services/telegram-bot.service');
const metrics = require('./services/metrics.service');
const rateLimiter = require('./utils/steam-rate-limiter');
const { runMigrations } = require('./utils/migrate');
const { p2pFlowService } = require('./services/p2p-flow.service');

process.on('unhandledRejection', (reason) => {
    logger.error(`[Worker] Unhandled Rejection: ${reason?.stack || reason}`);
});

process.on('uncaughtException', (error) => {
    logger.error(`[Worker] Uncaught Exception: ${error?.stack || error}`);
    process.exit(1);
});

/**
 * Detect item exterior from market hash name
 */
function detectExterior(name) {
    if (!name) return 'Unknown';
    if (name.includes('(Factory New)')) return 'Factory New';
    if (name.includes('(Minimal Wear)')) return 'Minimal Wear';
    if (name.includes('(Field-Tested)')) return 'Field-Tested';
    if (name.includes('(Well-Worn)')) return 'Well-Worn';
    if (name.includes('(Battle-Scarred)')) return 'Battle-Scarred';
    return 'Not Painted';
}

/**
 * Detect item rarity from name
 */
function detectRarity(name) {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('dragon lore') || lowerName.includes('howl')) return 'Contraband';
    if (lowerName.includes('fade') || lowerName.includes('asiimov')) return 'Covert';
    return 'Common';
}

let isSyncing = false;

async function startWorker() {
    logger.info('🔧 Starting Worker Process...');

    try {
        const redisConnected = await testRedisConnection();
        if (!redisConnected) {
            logger.error('❌ [Worker] Redis connection failed.');
            process.exit(1);
        }

        const dbConnected = await testConnection();
        if (!dbConnected) {
            logger.error('❌ [Worker] Database connection failed.');
            process.exit(1);
        }

        await runMigrations();
        await metrics.initializeMetrics();

        logger.info('🤖 [Worker] Initializing Steam bots...');
        const { initializeBots } = require('./config/bots.config');
        await initializeBots();
        
        await telegram.sendStartupNotification(process.env.NODE_ENV || 'development');

        // Initial Sync
        await tradeQueueService.addTradeJob({ type: 'system-sync-inventory', triggeredBy: 'startup' }, { priority: 1 });

        logger.info('📬 [Worker] Starting Trade Queue Processor...');

        tradeQueueService.processTradeQueue(1, async (job) => {
            const { type, tradeUrl, itemsToReceive, itemsToGive, message, tradeUuid, listingId } = job.data;
            logger.info(`[Worker Queue] Processing job ${job.id} type: ${type}`);

            try {
                if (type === 'system-sync-inventory') {
                    if (isSyncing) {
                        logger.info('[Worker Queue] Sync already in progress. Skipping.');
                        return { status: 'skipped' };
                    }
                    isSyncing = true;
                    try {
                        const bot = botManager.getAvailableBot();
                        if (!bot) throw new Error('No bot available for sync');

                        const inventory = await rateLimiter.execute(async () => bot.getInventory(730, 2));
                        metrics.updateBotInventoryMetrics(bot.config.accountName, inventory.length);

                        const client = await pool.connect();
                        try {
                            await client.query('BEGIN');
                            const { rows: currentItems } = await client.query('SELECT item_asset_id FROM listings WHERE seller_steam_id = $1', [bot.config.steamId]);
                            const currentAssetIds = new Set(currentItems.map(i => i.item_asset_id));
                            const syncedAssetIds = new Set();

                            for (const item of inventory) {
                                let price = 10.00;
                                try {
                                    const val = await calculateItemValue({ marketHashName: item.market_hash_name });
                                    if (val?.totalValue > 0) price = val.totalValue * 1.05;
                                } catch (e) {}

                                await client.query(`
                                    INSERT INTO listings (
                                        seller_steam_id, seller_trade_url, status, item_asset_id, 
                                        item_name, item_market_hash_name, item_app_id, item_icon_url, 
                                        item_rarity, item_exterior, item_float, item_stickers, price, 
                                        created_at, updated_at
                                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
                                    ON CONFLICT (item_asset_id) DO UPDATE SET
                                        price = EXCLUDED.price,
                                        updated_at = NOW()
                                    WHERE listings.status != 'sold'
                                `, [
                                    bot.config.steamId, bot.config.tradeUrl || '', 'active', item.assetid,
                                    item.market_hash_name || item.name, item.market_hash_name, 730,
                                    `https://community.cloudflare.steamstatic.com/economy/image/${item.icon_url}`,
                                    detectRarity(item.market_hash_name || item.name),
                                    detectExterior(item.market_hash_name || item.name),
                                    item.float_value || 0, JSON.stringify(item.stickers || []), price
                                ]);
                                syncedAssetIds.add(item.assetid);
                            }

                            const missing = [...currentAssetIds].filter(id => !syncedAssetIds.has(id));
                            if (missing.length > 0) {
                                await client.query("UPDATE listings SET status = 'unavailable' WHERE item_asset_id = ANY($1) AND status = 'active'", [missing]);
                            }

                            await client.query('COMMIT');
                            await redisClient.del('marketplace:listings:cache');
                            logger.info(`[Worker Queue] Synced ${syncedAssetIds.size} items.`);
                            return { synced: syncedAssetIds.size };
                        } finally {
                            client.release();
                        }
                    } finally {
                        isSyncing = false;
                    }
                }

                // Handle trades
                if (type === 'send-offer' || type === 'escrow-request-item') {
                    const result = await botManager.sendTradeOffer({
                        partnerTradeUrl: tradeUrl,
                        itemsToReceive: itemsToReceive || [],
                        itemsToGive: itemsToGive || [],
                        message: message || 'Steam Marketplace Trade',
                    });

                    const { offerId } = result;
                    if (tradeUuid) {
                        await query("UPDATE escrow_trades SET buyer_trade_offer_id = $1, status = 'awaiting_buyer' WHERE trade_uuid = $2", [offerId, tradeUuid]);
                    }
                    logger.info(`[Worker Queue] Trade offer sent: ${offerId}`);
                    return { offerId };
                }

            } catch (err) {
                logger.error(`[Worker Queue] Job ${job.id} failed: ${err.message}`);
                throw err;
            }
        });

        // Fallback Scanner
        setInterval(async () => {
            try {
                const pending = await query("SELECT t.*, l.item_asset_id, l.item_app_id, l.item_name, u.trade_url as buyer_trade_url FROM escrow_trades t JOIN listings l ON t.listing_id = l.id JOIN users u ON t.buyer_steam_id = u.steam_id WHERE t.status = 'payment_received' LIMIT 5");
                for (const trade of pending.rows) {
                    await tradeQueueService.addTradeJob({
                        type: 'send-offer',
                        tradeUuid: trade.trade_uuid,
                        tradeUrl: trade.buyer_trade_url,
                        itemsToGive: [{ assetId: trade.item_asset_id, appId: trade.item_app_id, contextId: '2' }]
                    });
                }
            } catch (e) {
                logger.warn(`[Worker] Fallback scanner error: ${e.message}`);
            }
        }, 60000);

        setInterval(async () => {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                const released = await p2pFlowService.releaseDueSettlements(client);
                await client.query('COMMIT');
                if (released > 0) {
                    logger.info(`[Worker] Released ${released} due P2P settlement(s).`);
                }
            } catch (e) {
                await client.query('ROLLBACK');
                logger.warn(`[Worker] Settlement release skipped: ${e.message}`);
            } finally {
                client.release();
            }
        }, 5 * 60 * 1000);

    } catch (err) {
        logger.error('❌ [Worker] Fatal error:', err);
        process.exit(1);
    }
}

async function gracefulShutdown(signal) {
    logger.info(`[Worker] Received ${signal}, shutting down gracefully...`);
    try {
        await botManager.stopAll();
        await closeRedisConnections();
        await pool.end();
        logger.info('[Worker] Graceful shutdown complete');
    } catch (err) {
        logger.error(`[Worker] Shutdown error: ${err.message}`);
    }
    process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startWorker();
