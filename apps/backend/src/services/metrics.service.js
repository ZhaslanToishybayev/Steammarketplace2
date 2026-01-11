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
 * 
 * @module services/metrics
 */

// @ts-check

const client = require('prom-client');

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
    },
};
