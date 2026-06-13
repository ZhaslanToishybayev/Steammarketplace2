/**
 * P2P Scheduler Service
 * Runs periodic jobs:
 *   1. Auto-cancel trades where seller missed deadline (24h)
 *   2. Release due settlements (7-day hold)
 *   3. Auto-sync active trades with Steam
 */

const { pool } = require('../config/database');
const { p2pFlowService, P2P_STATUS } = require('./p2p-flow.service');
const p2pService = require('./p2p.service');
const { logger } = require('../utils/logger');

const SELLER_DEADLINE_CHECK_MS = 5 * 60 * 1000;   // every 5 min
const SETTLEMENT_CHECK_MS      = 15 * 60 * 1000;   // every 15 min
const TRADE_SYNC_MS            = 3 * 60 * 1000;    // every 3 min

let io = null;

function emitTradeUpdate(tradeUuid, status) {
    if (!io) return;
    io.to(`trade:${tradeUuid}`).emit('trade:update', { tradeUuid, status });
}

/**
 * Cancel trades where seller didn't send within deadline.
 */
async function cancelExpiredTrades() {
    const client = await pool.connect();
    try {
        const expired = await client.query(`
            SELECT * FROM escrow_trades
            WHERE status = $1
              AND seller_deadline_at IS NOT NULL
              AND seller_deadline_at < NOW()
            FOR UPDATE SKIP LOCKED
        `, [P2P_STATUS.WAITING_SELLER]);

        if (expired.rows.length === 0) return;

        logger.info(`[P2P-Scheduler] Found ${expired.rows.length} expired trades`);

        for (const trade of expired.rows) {
            await client.query('BEGIN');
            try {
                await p2pFlowService.cancelAndRefund(
                    client, trade,
                    'Auto-cancelled: seller did not send trade within deadline',
                    'system',
                );
                await client.query('COMMIT');
                emitTradeUpdate(trade.trade_uuid, P2P_STATUS.REFUNDED);
                logger.info(`[P2P-Scheduler] Auto-cancelled trade ${trade.trade_uuid}`);
            } catch (err) {
                await client.query('ROLLBACK');
                logger.error(`[P2P-Scheduler] Failed to cancel trade ${trade.trade_uuid}:`, err.message);
            }
        }
    } catch (err) {
        logger.error('[P2P-Scheduler] cancelExpiredTrades error:', err.message);
    } finally {
        client.release();
    }
}

/**
 * Release settlements where the 7-day hold has passed.
 */
async function releaseSettlements() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const count = await p2pFlowService.releaseDueSettlements(client);
        await client.query('COMMIT');
        if (count > 0) {
            logger.info(`[P2P-Scheduler] Released ${count} settlements`);
        }
    } catch (err) {
        await client.query('ROLLBACK');
        logger.error('[P2P-Scheduler] releaseSettlements error:', err.message);
    } finally {
        client.release();
    }
}

/**
 * Sync active P2P trades with Steam to detect status changes.
 * Handles both WAITING_SELLER (auto-detect offer) and TRADE_SENT (check acceptance).
 */
async function syncActiveTrades() {
    try {
        const results = await p2pService.syncPendingTrades(10);
        for (const r of results) {
            if (r.status && r.status !== r.previousStatus) {
                emitTradeUpdate(r.tradeUuid, r.status);
            }
            if (r.error) {
                logger.warn(`[P2P-Scheduler] Sync failed for ${r.tradeUuid}: ${r.error}`);
            }
        }
    } catch (err) {
        logger.error('[P2P-Scheduler] syncActiveTrades error:', err.message);
    }
}

let intervals = [];

function startP2PScheduler(ioInstance) {
    io = ioInstance;
    logger.info('⏰ P2P Scheduler started');

    intervals.push(setInterval(cancelExpiredTrades, SELLER_DEADLINE_CHECK_MS));
    intervals.push(setInterval(releaseSettlements, SETTLEMENT_CHECK_MS));
    intervals.push(setInterval(syncActiveTrades, TRADE_SYNC_MS));

    // Run once on start
    cancelExpiredTrades();
    releaseSettlements();
}

function stopP2PScheduler() {
    intervals.forEach(clearInterval);
    intervals = [];
}

module.exports = { startP2PScheduler, stopP2PScheduler };
