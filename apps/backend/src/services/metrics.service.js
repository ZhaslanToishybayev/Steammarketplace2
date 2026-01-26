/**
 * Prometheus Metrics Service
 * Exposes application metrics for monitoring and alerting.
 * 
 * Metrics exposed:
 * - http_request_duration_seconds: Request latency histogram
 * - http_requests_total: Total requests counter
 * - trade_queue_depth: Current trade queue size
 * - bots_online_total: Number of online bots
 * - bots_total: Total registered bots
 * - active_sessions: Current active user sessions
 * - active_listings_total: Number of active marketplace listings
 * - user_balance_total: Total balance of all users
 * - bot_inventory_size: Number of items in bot inventory
 * - trade_volume_total: Total trade volume in USD
 * - platform_fee_total: Total platform fees collected in USD
 * - steam_api_calls_total: Total Steam API calls
 * - steam_api_duration_seconds: Steam API call duration
 * - steam_api_rate_limit_hits: Number of times rate limiter blocked requests
 * - redis_cache_hits_total: Number of Redis cache hits
 * - redis_cache_misses_total: Number of Redis cache misses
 * - trades_by_status: Number of trades by status
 * - trade_completion_duration_seconds: Time from trade creation to completion
 * - trade_offer_errors_total: Number of trade offer send errors
 * 
 * @module services/metrics
 */

// @ts-check

const client = require('prom-client');
const { query } = require('../config/database');

// Create a Registry to register metrics
const register = new client.Registry();

// Add default metrics (CPU, memory, event loop, etc.)
client.collectDefaultMetrics({ register });

// ============== CUSTOM METRICS ==============

// HTTP Request Duration
const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
});
register.registerMetric(httpRequestDuration);

// HTTP Requests Total
const httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
});
register.registerMetric(httpRequestsTotal);

// Trade Queue Depth
const tradeQueueDepth = new client.Gauge({
    name: 'trade_queue_depth',
    help: 'Current number of trades in queue',
});
register.registerMetric(tradeQueueDepth);

// Bots Online
const botsOnline = new client.Gauge({
    name: 'bots_online_total',
    help: 'Number of Steam bots currently online',
});
register.registerMetric(botsOnline);

// Total Bots
const botsTotal = new client.Gauge({
    name: 'bots_total',
    help: 'Total number of registered Steam bots',
});
register.registerMetric(botsTotal);

// Active Sessions
const activeSessions = new client.Gauge({
    name: 'active_sessions',
    help: 'Number of active user sessions',
});
register.registerMetric(activeSessions);

// Active Listings
const activeListings = new client.Gauge({
    name: 'active_listings_total',
    help: 'Number of active marketplace listings',
});
register.registerMetric(activeListings);

// Trade Success Rate (Counter for calculating rate)
const tradeSuccessTotal = new client.Counter({
    name: 'trade_success_total',
    help: 'Total number of successful trades',
});
register.registerMetric(tradeSuccessTotal);

const tradeFailureTotal = new client.Counter({
    name: 'trade_failure_total',
    help: 'Total number of failed trades',
});
register.registerMetric(tradeFailureTotal);

// ============== NEW BUSINESS METRICS ==============

// 1. User Balances
const userBalanceTotal = new client.Gauge({
    name: 'user_balance_total',
    help: 'Total balance of all users',
});
register.registerMetric(userBalanceTotal);

// 2. Bot Inventory Size
const botInventorySize = new client.Gauge({
    name: 'bot_inventory_size',
    help: 'Number of items in bot inventory',
    labelNames: ['bot_name'],
});
register.registerMetric(botInventorySize);

// 3. Trade Volume (USD)
const tradeVolumeTotal = new client.Counter({
    name: 'trade_volume_total',
    help: 'Total trade volume in USD',
});
register.registerMetric(tradeVolumeTotal);

// 4. Platform Fees
const platformFeeTotal = new client.Counter({
    name: 'platform_fee_total',
    help: 'Total platform fees collected in USD',
});
register.registerMetric(platformFeeTotal);

// ============== STEAM API METRICS ==============

// 5. Steam API Calls
const steamApiCallsTotal = new client.Counter({
    name: 'steam_api_calls_total',
    help: 'Total Steam API calls',
    labelNames: ['endpoint', 'status'],
});
register.registerMetric(steamApiCallsTotal);

// 6. Steam API Latency
const steamApiDuration = new client.Histogram({
    name: 'steam_api_duration_seconds',
    help: 'Steam API call duration',
    labelNames: ['endpoint'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
});
register.registerMetric(steamApiDuration);

// 7. Rate Limit Hits
const steamRateLimitHits = new client.Counter({
    name: 'steam_api_rate_limit_hits',
    help: 'Number of times rate limiter blocked requests',
});
register.registerMetric(steamRateLimitHits);

// 8. Redis Cache
const redisCacheHits = new client.Counter({
    name: 'redis_cache_hits_total',
    help: 'Number of Redis cache hits',
    labelNames: ['cache_key'],
});
register.registerMetric(redisCacheHits);

const redisCacheMisses = new client.Counter({
    name: 'redis_cache_misses_total',
    help: 'Number of Redis cache misses',
    labelNames: ['cache_key'],
});
register.registerMetric(redisCacheMisses);

// ============== ESCROW METRICS ==============

// 9. Trades by Status
const tradesByStatus = new client.Gauge({
    name: 'trades_by_status',
    help: 'Number of trades by status',
    labelNames: ['status'],
});
register.registerMetric(tradesByStatus);

// 10. Trade Completion Time
const tradeCompletionDuration = new client.Histogram({
    name: 'trade_completion_duration_seconds',
    help: 'Time from trade creation to completion',
    buckets: [10, 30, 60, 180, 300, 600, 1800, 3600],
});
register.registerMetric(tradeCompletionDuration);

// 11. Trade Offer Errors
const tradeOfferErrors = new client.Counter({
    name: 'trade_offer_errors_total',
    help: 'Number of trade offer send errors',
    labelNames: ['error_type'],
});
register.registerMetric(tradeOfferErrors);

// ============== INVENTORY FETCH METRICS ==============

// 12. Inventory Fetch Requests
const inventoryFetchTotal = new client.Counter({
    name: 'steam_inventory_fetch_total',
    help: 'Total inventory fetch requests',
    labelNames: ['via', 'status'], // via: 'direct'|'bot', status: 'success'|'rate_limited'|'error'
});
register.registerMetric(inventoryFetchTotal);

// ============== MIDDLEWARE ==============

/**
 * Express middleware to track request metrics
 */
function metricsMiddleware(req, res, next) {
    const start = process.hrtime();

    res.on('finish', () => {
        const duration = process.hrtime(start);
        const durationSeconds = duration[0] + duration[1] / 1e9;

        // Normalize route to avoid high cardinality
        const route = normalizeRoute(req.route?.path || req.path);

        httpRequestDuration
            .labels(req.method, route, res.statusCode.toString())
            .observe(durationSeconds);

        httpRequestsTotal
            .labels(req.method, route, res.statusCode.toString())
            .inc();
    });

    next();
}

/**
 * Normalize routes to reduce cardinality
 * Replace IDs with :id placeholder
 */
function normalizeRoute(path) {
    if (!path) return 'unknown';
    return path
        .replace(/\/[0-9a-f]{24}\//g, '/:id/') // MongoDB ObjectIds
        .replace(/\/\d+\//g, '/:id/') // Numeric IDs
        .replace(/\/\d+$/g, '/:id') // Numeric ID at end
        .replace(/\/[0-9]{17}$/g, '/:steamId'); // Steam IDs
}

// ============== UPDATE FUNCTIONS ==============

/**
 * Update trade queue metrics
 * @param {number} depth - Current queue depth
 */
function updateTradeQueueMetrics(depth) {
    tradeQueueDepth.set(depth);
}

/**
 * Update bot metrics
 * @param {number} online - Online bots count
 * @param {number} total - Total bots count
 */
function updateBotMetrics(online, total) {
    botsOnline.set(online);
    botsTotal.set(total);
}

/**
 * Update session metrics
 * @param {number} count - Active sessions count
 */
function updateSessionMetrics(count) {
    activeSessions.set(count);
}

/**
 * Update listings metrics
 * @param {number} count - Active listings count
 */
function updateListingsMetrics(count) {
    activeListings.set(count);
}

/**
 * Record successful trade
 */
function recordTradeSuccess() {
    tradeSuccessTotal.inc();
}

/**
 * Record failed trade
 */
function recordTradeFailure() {
    tradeFailureTotal.inc();
}

// === NEW UPDATE FUNCTIONS ===

/**
 * Update user balance metrics (runs periodically or on change)
 */
async function updateBalanceMetrics() {
    try {
        const result = await query('SELECT COALESCE(SUM(balance), 0) as total FROM users');
        userBalanceTotal.set(parseFloat(result.rows[0].total));
    } catch (err) {
        console.error('Error updating balance metrics:', err.message);
    }
}

/**
 * Update bot inventory size
 * @param {string} botName 
 * @param {number} itemCount 
 */
function updateBotInventoryMetrics(botName, itemCount) {
    botInventorySize.labels(botName).set(itemCount);
}

/**
 * Record trade volume
 * @param {number} amount USD amount
 */
function recordTradeVolume(amount) {
    tradeVolumeTotal.inc(amount);
}

/**
 * Record platform fee
 * @param {number} amount USD amount
 */
function recordPlatformFee(amount) {
    platformFeeTotal.inc(amount);
}

/**
 * Record Steam API call
 * @param {string} endpoint 
 * @param {string} status 
 * @param {number} durationSeconds 
 */
function recordSteamApiCall(endpoint, status, durationSeconds) {
    steamApiCallsTotal.labels(endpoint, status).inc();
    if (durationSeconds) {
        steamApiDuration.labels(endpoint).observe(durationSeconds);
    }
}

/**
 * Record rate limit hit
 */
function recordRateLimitHit() {
    steamRateLimitHits.inc();
}

/**
 * Record cache hit
 * @param {string} cacheKey 
 */
function recordCacheHit(cacheKey) {
    // Simplify key to avoid high cardinality (remove IDs)
    const simpleKey = cacheKey.split(':')[0] + ':' + (cacheKey.split(':')[1] || 'general');
    redisCacheHits.labels(simpleKey).inc();
}

/**
 * Record cache miss
 * @param {string} cacheKey 
 */
function recordCacheMiss(cacheKey) {
    const simpleKey = cacheKey.split(':')[0] + ':' + (cacheKey.split(':')[1] || 'general');
    redisCacheMisses.labels(simpleKey).inc();
}

/**
 * Record trade status stats
 * @param {string} status 
 * @param {number} count 
 */
function updateTradeStatusMetrics(status, count) {
    tradesByStatus.labels(status).set(count);
}

/**
 * Record trade completion duration
 * @param {number} durationSeconds 
 */
function recordTradeCompletionTime(durationSeconds) {
    tradeCompletionDuration.observe(durationSeconds);
}

/**
 * Record trade error
 * @param {string} type 
 */
function recordTradeError(type) {
    tradeOfferErrors.labels(type).inc();
}

/**
 * Record inventory fetch request
 * @param {string} via - 'direct' | 'bot' | 'cache'
 * @param {string} status - 'success' | 'rate_limited' | 'error'
 */
function recordInventoryFetch(via, status) {
    inventoryFetchTotal.labels(via, status).inc();
}

/**
 * Initialize metrics from database on startup
 */
async function initializeMetrics() {
    try {
        console.log('[Metrics] Initializing historical metrics from database...');
        
        // 1. Trade Volume and Fees
        const tradeStats = await query(`
            SELECT 
                COALESCE(SUM(price), 0) as total_volume,
                COALESCE(SUM(platform_fee), 0) as total_fees,
                COUNT(*) FILTER (WHERE status = 'completed') as total_success,
                COUNT(*) FILTER (WHERE status LIKE 'error_%' OR status = 'failed_send') as total_failure
            FROM escrow_trades
        `);
        
        const stats = tradeStats.rows[0];
        if (parseFloat(stats.total_volume) > 0) tradeVolumeTotal.inc(parseFloat(stats.total_volume));
        if (parseFloat(stats.total_fees) > 0) platformFeeTotal.inc(parseFloat(stats.total_fees));
        if (parseInt(stats.total_success) > 0) tradeSuccessTotal.inc(parseInt(stats.total_success));
        if (parseInt(stats.total_failure) > 0) tradeFailureTotal.inc(parseInt(stats.total_failure));

        // 2. User Balances
        await updateBalanceMetrics();

        // 3. Active Listings
        const listingStats = await query("SELECT COUNT(*) FROM listings WHERE status = 'active'");
        activeListings.set(parseInt(listingStats.rows[0].count));

        // 4. Trades by Status
        const statusStats = await query("SELECT status, COUNT(*) FROM escrow_trades GROUP BY status");
        statusStats.rows.forEach(row => {
            tradesByStatus.labels(row.status).set(parseInt(row.count));
        });

        console.log('[Metrics] Historical metrics initialized successfully.');
    } catch (err) {
        console.error('[Metrics] Failed to initialize historical metrics:', err.message);
    }
}

// ============== EXPORTS ==============

module.exports = {
    register,
    metricsMiddleware,
    updateTradeQueueMetrics,
    updateBotMetrics,
    updateSessionMetrics,
    updateListingsMetrics,
    recordTradeSuccess,
    recordTradeFailure,
    updateBalanceMetrics,
    updateBotInventoryMetrics,
    recordTradeVolume,
    recordPlatformFee,
    recordSteamApiCall,
    recordRateLimitHit,
    recordCacheHit,
    recordCacheMiss,
    updateTradeStatusMetrics,
    recordTradeCompletionTime,
    recordTradeError,
    recordInventoryFetch,
    initializeMetrics,
    // For testing
    metrics: {
        httpRequestDuration,
        httpRequestsTotal,
        tradeQueueDepth,
        botsOnline,
        botsTotal,
        activeSessions,
        activeListings,
        tradeSuccessTotal,
        tradeFailureTotal,
        userBalanceTotal,
        botInventorySize,
        tradeVolumeTotal,
        platformFeeTotal,
        steamApiCallsTotal,
        steamApiDuration,
        steamRateLimitHits,
        redisCacheHits,
        redisCacheMisses,
        tradesByStatus,
        tradeCompletionDuration,
        tradeOfferErrors,
        inventoryFetchTotal
    },
};
