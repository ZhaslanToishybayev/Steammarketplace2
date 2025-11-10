const client = require('prom-client');
const logger = require('../utils/logger');

/**
 * Metrics Service
 * Собирает и экспортирует метрики для Prometheus
 */
class MetricsService {
  constructor() {
    this.register = new client.Registry();

    // Add default metrics
    client.collectDefaultMetrics(this.register);

    // Сustom metrics для Steam Marketplace
    this.initCustomMetrics();

    // Start metrics collection
    this.startMetricsCollection();

    logger.info('Metrics service initialized');
  }

  /**
   * Инициализация кастомных метрик
   */
  initCustomMetrics() {
    // ========================================================================
    // 📊 HTTP REQUESTS METRICS
    // ========================================================================
    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
    });

    this.httpRequestsTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status', 'service']
    });

    this.httpRequestsInFlight = new client.Gauge({
      name: 'http_requests_in_flight',
      help: 'Current number of HTTP requests being processed',
      labelNames: ['service']
    });

    this.httpConnections = new client.Gauge({
      name: 'http_connections_active',
      help: 'Current number of active HTTP connections',
      labelNames: ['service']
    });

    // ========================================================================
    // 🗄️ DATABASE METRICS
    // ========================================================================
    this.dbQueryDuration = new client.Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'collection', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5]
    });

    this.dbQueriesTotal = new client.Counter({
      name: 'db_queries_total',
      help: 'Total number of database queries',
      labelNames: ['operation', 'collection', 'status']
    });

    this.dbConnections = new client.Gauge({
      name: 'mongodb_connections',
      help: 'Number of MongoDB connections',
      labelNames: ['state', 'instance']
    });

    // ========================================================================
    // ⚡ CACHE METRICS
    // ========================================================================
    this.cacheOperations = new client.Counter({
      name: 'redis_operations_total',
      help: 'Total number of cache operations',
      labelNames: ['operation', 'status']
    });

    this.cacheHitRate = new client.Gauge({
      name: 'cache_hit_rate',
      help: 'Cache hit rate percentage'
    });

    this.cacheMemoryUsage = new client.Gauge({
      name: 'redis_memory_used_bytes',
      help: 'Redis memory usage in bytes',
      labelNames: ['instance']
    });

    // ========================================================================
    // 🔑 AUTHENTICATION METRICS
    // ========================================================================
    this.authAttempts = new client.Counter({
      name: 'auth_attempts_total',
      help: 'Total number of authentication attempts',
      labelNames: ['method', 'result']
    });

    this.activeSessions = new client.Gauge({
      name: 'auth_active_sessions',
      help: 'Number of active user sessions'
    });

    this.tokenRefreshTotal = new client.Counter({
      name: 'token_refresh_total',
      help: 'Total number of token refreshes',
      labelNames: ['result']
    });

    this.activeUsers = new client.Gauge({
      name: 'auth_active_users',
      help: 'Number of active users in the last hour'
    });

    // ========================================================================
    // 💼 BUSINESS METRICS
    // ========================================================================
    this.marketplaceTransactions = new client.Counter({
      name: 'marketplace_transactions_total',
      help: 'Total number of marketplace transactions',
      labelNames: ['type', 'status']
    });

    this.tradeOffers = new client.Counter({
      name: 'trade_offers_total',
      help: 'Total number of trade offers',
      labelNames: ['type', 'status']
    });

    this.tradeOffersFailed = new client.Counter({
      name: 'trade_offers_failed_total',
      help: 'Total number of failed trade offers',
      labelNames: ['reason']
    });

    // ========================================================================
    // 🔥 STEAM API METRICS
    // ========================================================================
    this.steamApiRequests = new client.Counter({
      name: 'steam_api_requests_total',
      help: 'Total number of Steam API requests',
      labelNames: ['endpoint', 'status']
    });

    this.steamApiDuration = new client.Histogram({
      name: 'steam_api_request_duration_seconds',
      help: 'Duration of Steam API requests in seconds',
      labelNames: ['endpoint', 'status'],
      buckets: [0.5, 1, 2, 3, 5, 10, 15, 30]
    });

    // ========================================================================
    // 🔄 SYSTEM METRICS
    // ========================================================================
    this.appVersion = new client.Gauge({
      name: 'app_version',
      help: 'Application version',
      labelNames: ['version']
    });

    this.appInfo = new client.Gauge({
      name: 'app_info',
      help: 'Application information',
      labelNames: ['name', 'version', 'environment']
    });

    this.queueSize = new client.Gauge({
      name: 'http_queue_size',
      help: 'HTTP request queue size'
    });

    // ========================================================================
    // 📊 CUSTOM APPLICATION METRICS
    // ========================================================================
    this.marketplaceListings = new client.Gauge({
      name: 'marketplace_listings_active',
      help: 'Number of active marketplace listings'
    });

    this.userInventoryUpdates = new client.Counter({
      name: 'user_inventory_updates_total',
      help: 'Total number of user inventory updates',
      labelNames: ['source']
    });

    this.securityEvents = new client.Counter({
      name: 'security_events_total',
      help: 'Total number of security events',
      labelNames: ['type', 'severity', 'source']
    });

    this.apiRateLimitHits = new client.Counter({
      name: 'api_rate_limit_hits_total',
      help: 'Total number of API rate limit hits',
      labelNames: ['endpoint', 'user_type']
    });

    // Register all metrics
    const metrics = [
      this.httpRequestDuration,
      this.httpRequestsTotal,
      this.httpRequestsInFlight,
      this.httpConnections,
      this.dbQueryDuration,
      this.dbQueriesTotal,
      this.dbConnections,
      this.cacheOperations,
      this.cacheHitRate,
      this.cacheMemoryUsage,
      this.authAttempts,
      this.activeSessions,
      this.tokenRefreshTotal,
      this.activeUsers,
      this.marketplaceTransactions,
      this.tradeOffers,
      this.tradeOffersFailed,
      this.steamApiRequests,
      this.steamApiDuration,
      this.appVersion,
      this.appInfo,
      this.queueSize,
      this.marketplaceListings,
      this.userInventoryUpdates,
      this.securityEvents,
      this.apiRateLimitHits
    ];

    metrics.forEach(metric => {
      this.register.registerMetric(metric);
    });

    // Set static labels
    this.register.setDefaultLabels({
      app: 'steam-marketplace',
      environment: process.env.NODE_ENV || 'development'
    });
  }

  /**
   * Начинает сбор системных метрик
   */
  startMetricsCollection() {
    // Collect process metrics
    this.register.registerMetric(
      new client.Gauge({
        name: 'process_uptime_seconds',
        help: 'Process uptime in seconds',
        collect: () => {
          metricsService.setUptime(process.uptime());
        }
      })
    );

    this.register.registerMetric(
      new client.Gauge({
        name: 'process_memory_usage_bytes',
        help: 'Process memory usage in bytes',
        collect: () => {
          metricsService.setMemoryUsage(process.memoryUsage());
        }
      })
    );

    // Set app version
    try {
      const packageJson = require('../package.json');
      this.appVersion.set(1);
      this.appVersion.set({ version: packageJson.version }, 1);
      this.appInfo.set({ name: 'steam-marketplace', version: packageJson.version, environment: process.env.NODE_ENV }, 1);
    } catch (error) {
      logger.warn('Could not load package.json for metrics');
    }
  }

  /**
   * Записывает HTTP запрос
   */
  recordHttpRequest(method, route, status, duration) {
    const routeLabel = route || 'unknown';
    const service = 'api';

    this.httpRequestDuration
      .labels(method, routeLabel, status.toString())
      .observe(duration);

    this.httpRequestsTotal
      .labels(method, routeLabel, status.toString(), service)
      .inc();

    this.httpConnections
      .labels(service)
      .inc();

    // Reset connection counter after a short delay
    setTimeout(() => {
      this.httpConnections.labels(service).dec();
    }, 1000);
  }

  /**
   * Записывает database запрос
   */
  recordDbQuery(operation, collection, duration, status = 'success') {
    this.dbQueryDuration
      .labels(operation, collection, status)
      .observe(duration);

    this.dbQueriesTotal
      .labels(operation, collection, status)
      .inc();
  }

  /**
   * Записывает cache операцию
   */
  recordCacheOperation(operation, status = 'success') {
    this.cacheOperations
      .labels(operation, status)
      .inc();
  }

  /**
   * Устанавливает cache hit rate
   */
  setCacheHitRate(hitRate) {
    this.cacheHitRate.set(hitRate);
  }

  /**
   * Устанавливает cache memory usage
   */
  setCacheMemoryUsage(bytes, instance = 'default') {
    this.cacheMemoryUsage.labels(instance).set(bytes);
  }

  /**
   * Записывает authentication попытку
   */
  recordAuthAttempt(method, result) {
    this.authAttempts
      .labels(method, result)
      .inc();

    if (result === 'success') {
      this.activeSessions.inc();
    }
  }

  /**
   * Устанавливает количество active sessions
   */
  setActiveSessions(count) {
    this.activeSessions.set(count);
  }

  /**
   * Записывает token refresh
   */
  recordTokenRefresh(result = 'success') {
    this.tokenRefreshTotal.labels(result).inc();
  }

  /**
   * Устанавливает количество active users
   */
  setActiveUsers(count) {
    this.activeUsers.set(count);
  }

  /**
   * Записывает marketplace transaction
   */
  recordMarketplaceTransaction(type, status = 'success') {
    this.marketplaceTransactions
      .labels(type, status)
      .inc();
  }

  /**
   * Записывает trade offer
   */
  recordTradeOffer(type, status = 'success') {
    this.tradeOffers
      .labels(type, status)
      .inc();

    if (status === 'failed') {
      this.tradeOffersFailed.labels('unknown').inc();
    }
  }

  /**
   * Записывает Steam API request
   */
  recordSteamApiRequest(endpoint, status = 'success', duration = 0) {
    this.steamApiRequests
      .labels(endpoint, status)
      .inc();

    if (duration > 0) {
      this.steamApiDuration
        .labels(endpoint, status)
        .observe(duration);
    }
  }

  /**
   * Устанавливает queue size
   */
  setQueueSize(size) {
    this.queueSize.set(size);
  }

  /**
   * Устанавливает количество marketplace listings
   */
  setMarketplaceListings(count) {
    this.marketplaceListings.set(count);
  }

  /**
   * Записывает inventory update
   */
  recordInventoryUpdate(source) {
    this.userInventoryUpdates.labels(source).inc();
  }

  /**
   * Записывает security event
   */
  recordSecurityEvent(type, severity, source = 'api') {
    this.securityEvents
      .labels(type, severity, source)
      .inc();
  }

  /**
   * Записывает rate limit hit
   */
  recordRateLimitHit(endpoint, userType = 'anonymous') {
    this.apiRateLimitHits
      .labels(endpoint, userType)
      .inc();
  }

  /**
   * Устанавливает uptime
   */
  setUptime(uptime) {
    this.register
      .getSingleMetric('process_uptime_seconds')
      .set(uptime);
  }

  /**
   * Устанавливает memory usage
   */
  setMemoryUsage(memoryUsage) {
    this.register
      .getSingleMetric('process_memory_usage_bytes')
      .set(memoryUsage.heapUsed);
  }

  /**
   * Middleware для автоматического сбора HTTP метрик
   */
  httpMiddleware() {
    return (req, res, next) => {
      const startTime = process.hrtime.bigint();

      // Increment in-flight requests
      this.httpRequestsInFlight.labels('api').inc();

      // Extract route pattern
      const route = req.route ? req.route.path : req.path;

      // Override res.end to capture response
      const originalEnd = res.end;
      res.end = (...args) => {
        // Calculate duration
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to seconds

        // Get status code
        const status = res.statusCode || 500;

        // Record metrics
        this.recordHttpRequest(
          req.method,
          route,
          status,
          duration
        );

        // Decrement in-flight requests
        this.httpRequestsInFlight.labels('api').dec();

        // Call original end
        originalEnd.apply(res, args);
      };

      next();
    };
  }

  /**
   * Получает все метрики в формате Prometheus
   */
  async getMetrics() {
    return await this.register.metrics();
  }

  /**
   * Получает registry
   */
  getRegistry() {
    return this.register;
  }
}

// Create singleton instance
const metricsService = new MetricsService();

module.exports = metricsService;
