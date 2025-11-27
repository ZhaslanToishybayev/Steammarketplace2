import { Injectable, Logger } from '@nestjs/common';
import { register, Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  // HTTP request metrics
  private httpRequestTotal: Counter<string>;
  private httpRequestDuration: Histogram<string>;
  private httpRequestSize: Histogram<string>;
  private httpResponseSize: Histogram<string>;

  // Business metrics
  private usersTotal: Gauge<string>;
  private inventoriesTotal: Gauge<string>;
  private tradesTotal: Gauge<string>;
  private walletBalanceTotal: Gauge<string>;
  private pricesTotal: Gauge<string>;

  // Bot metrics
  private botsTotal: Gauge<string>;
  private botsOnline: Gauge<string>;
  private botsActive: Gauge<string>;
  private botsBusy: Gauge<string>;
  private botsIdle: Gauge<string>;
  private botTradeCount: Gauge<string>;
  private botUptime: Gauge<string>;
  private botErrors: Counter<string>;
  private botTradesCompleted: Counter<string>;

  // Queue metrics
  private queueJobsTotal: Counter<string>;
  private queueJobsActive: Gauge<string>;
  private queueJobsCompleted: Counter<string>;
  private queueJobsFailed: Counter<string>;
  private queueJobsRetried: Counter<string>;
  private queueFailureRate: Gauge<string>;
  private queueProcessingDuration: Histogram<string>;

  // Cache metrics
  private cacheHits: Counter<string>;
  private cacheMisses: Counter<string>;
  private cacheOperations: Counter<string>;
  private cacheSize: Gauge<string>;

  // Database metrics
  private dbConnectionPool: Gauge<string>;
  private dbQueryDuration: Histogram<string>;
  private dbActiveConnections: Gauge<string>;

  // System metrics
  private systemCpuUsage: Gauge<string>;
  private systemMemoryUsage: Gauge<string>;
  private systemUptime: Gauge<string>;

  constructor() {
    this.initializeMetrics();
  }

  private initializeMetrics() {
    // HTTP metrics
    this.httpRequestTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
    });

    this.httpRequestSize = new Histogram({
      name: 'http_request_size_bytes',
      help: 'Size of HTTP requests in bytes',
      labelNames: ['method', 'route'],
      buckets: [100, 1000, 10000, 100000, 1000000],
    });

    this.httpResponseSize = new Histogram({
      name: 'http_response_size_bytes',
      help: 'Size of HTTP responses in bytes',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [100, 1000, 10000, 100000, 1000000],
    });

    // Business metrics
    this.usersTotal = new Gauge({
      name: 'users_total',
      help: 'Total number of users',
      labelNames: ['status'],
    });

    this.inventoriesTotal = new Gauge({
      name: 'inventories_total',
      help: 'Total number of inventories',
      labelNames: ['app_id'],
    });

    this.tradesTotal = new Gauge({
      name: 'trades_total',
      help: 'Total number of trades',
      labelNames: ['status'],
    });

    this.walletBalanceTotal = new Gauge({
      name: 'wallet_balance_total',
      help: 'Total wallet balance',
      labelNames: ['currency'],
    });

    this.pricesTotal = new Gauge({
      name: 'prices_total',
      help: 'Total number of price entries',
      labelNames: ['app_id'],
    });

    // Bot metrics
    this.botsTotal = new Gauge({
      name: 'bots_total',
      help: 'Total number of bots',
      labelNames: ['status'],
    });

    this.botsOnline = new Gauge({
      name: 'bots_online',
      help: 'Number of online bots',
      labelNames: ['bot_id'],
    });

    this.botsActive = new Gauge({
      name: 'bots_active',
      help: 'Number of active bots',
      labelNames: ['bot_id'],
    });

    this.botsBusy = new Gauge({
      name: 'bots_busy',
      help: 'Number of busy bots',
      labelNames: ['bot_id'],
    });

    this.botsIdle = new Gauge({
      name: 'bots_idle',
      help: 'Number of idle bots',
      labelNames: ['bot_id'],
    });

    this.botTradeCount = new Gauge({
      name: 'bot_trade_count',
      help: 'Current trade count per bot',
      labelNames: ['bot_id'],
    });

    this.botUptime = new Gauge({
      name: 'bot_uptime_seconds',
      help: 'Bot uptime in seconds',
      labelNames: ['bot_id'],
    });

    this.botErrors = new Counter({
      name: 'bot_errors_total',
      help: 'Total number of bot errors',
      labelNames: ['bot_id', 'error_type'],
    });

    this.botTradesCompleted = new Counter({
      name: 'bot_trades_completed_total',
      help: 'Total number of completed trades per bot',
      labelNames: ['bot_id'],
    });

    // Queue metrics
    this.queueJobsTotal = new Counter({
      name: 'queue_jobs_total',
      help: 'Total number of queue jobs',
      labelNames: ['queue_name', 'status'],
    });

    this.queueJobsActive = new Gauge({
      name: 'queue_jobs_active',
      help: 'Number of active queue jobs',
      labelNames: ['queue_name'],
    });

    this.queueJobsCompleted = new Counter({
      name: 'queue_jobs_completed',
      help: 'Total number of completed queue jobs',
      labelNames: ['queue_name'],
    });

    this.queueJobsFailed = new Counter({
      name: 'queue_jobs_failed',
      help: 'Total number of failed queue jobs',
      labelNames: ['queue_name'],
    });

    this.queueJobsRetried = new Counter({
      name: 'queue_jobs_retried',
      help: 'Total number of retried queue jobs',
      labelNames: ['queue_name'],
    });

    this.queueFailureRate = new Gauge({
      name: 'queue_failure_rate',
      help: 'Current queue failure rate percentage',
      labelNames: ['queue_name'],
    });

    this.queueProcessingDuration = new Histogram({
      name: 'queue_processing_duration_seconds',
      help: 'Duration of queue job processing in seconds',
      labelNames: ['queue_name'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 300],
    });

    // Cache metrics
    this.cacheHits = new Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_type'],
    });

    this.cacheMisses = new Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_type'],
    });

    this.cacheOperations = new Counter({
      name: 'cache_operations_total',
      help: 'Total number of cache operations',
      labelNames: ['operation', 'cache_type'],
    });

    this.cacheSize = new Gauge({
      name: 'cache_size_bytes',
      help: 'Current cache size in bytes',
      labelNames: ['cache_type'],
    });

    // Database metrics
    this.dbConnectionPool = new Gauge({
      name: 'db_connection_pool_size',
      help: 'Database connection pool size',
      labelNames: ['db_type'],
    });

    this.dbQueryDuration = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['db_type', 'query_type'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
    });

    this.dbActiveConnections = new Gauge({
      name: 'db_active_connections',
      help: 'Number of active database connections',
      labelNames: ['db_type'],
    });

    // System metrics
    this.systemCpuUsage = new Gauge({
      name: 'system_cpu_usage_percent',
      help: 'System CPU usage percentage',
    });

    this.systemMemoryUsage = new Gauge({
      name: 'system_memory_usage_bytes',
      help: 'System memory usage in bytes',
      labelNames: ['type'],
    });

    this.systemUptime = new Gauge({
      name: 'system_uptime_seconds',
      help: 'System uptime in seconds',
    });

    // Register all metrics
    register.registerMetric(this.httpRequestTotal);
    register.registerMetric(this.httpRequestDuration);
    register.registerMetric(this.httpRequestSize);
    register.registerMetric(this.httpResponseSize);
    register.registerMetric(this.usersTotal);
    register.registerMetric(this.inventoriesTotal);
    register.registerMetric(this.tradesTotal);
    register.registerMetric(this.walletBalanceTotal);
    register.registerMetric(this.pricesTotal);
    register.registerMetric(this.botsTotal);
    register.registerMetric(this.botsOnline);
    register.registerMetric(this.botsActive);
    register.registerMetric(this.botsBusy);
    register.registerMetric(this.botsIdle);
    register.registerMetric(this.botTradeCount);
    register.registerMetric(this.botUptime);
    register.registerMetric(this.botErrors);
    register.registerMetric(this.botTradesCompleted);
    register.registerMetric(this.queueJobsTotal);
    register.registerMetric(this.queueJobsActive);
    register.registerMetric(this.queueJobsCompleted);
    register.registerMetric(this.queueJobsFailed);
    register.registerMetric(this.queueJobsRetried);
    register.registerMetric(this.queueFailureRate);
    register.registerMetric(this.queueProcessingDuration);
    register.registerMetric(this.cacheHits);
    register.registerMetric(this.cacheMisses);
    register.registerMetric(this.cacheOperations);
    register.registerMetric(this.cacheSize);
    register.registerMetric(this.dbConnectionPool);
    register.registerMetric(this.dbQueryDuration);
    register.registerMetric(this.dbActiveConnections);
    register.registerMetric(this.systemCpuUsage);
    register.registerMetric(this.systemMemoryUsage);
    register.registerMetric(this.systemUptime);
  }

  // HTTP metrics methods
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number, requestSize?: number, responseSize?: number) {
    this.httpRequestTotal.inc({ method, route, status_code: statusCode });
    this.httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
    if (requestSize) {
      this.httpRequestSize.observe({ method, route }, requestSize);
    }
    if (responseSize) {
      this.httpResponseSize.observe({ method, route, status_code: statusCode }, responseSize);
    }
  }

  // Business metrics methods
  setUsersTotal(status: string, count: number) {
    this.usersTotal.set({ status }, count);
  }

  setInventoriesTotal(appId: string, count: number) {
    this.inventoriesTotal.set({ app_id: appId }, count);
  }

  setTradesTotal(status: string, count: number) {
    this.tradesTotal.set({ status }, count);
  }

  setWalletBalanceTotal(currency: string, balance: number) {
    this.walletBalanceTotal.set({ currency }, balance);
  }

  setPricesTotal(appId: string, count: number) {
    this.pricesTotal.set({ app_id: appId }, count);
  }

  // Bot metrics methods
  setBotsTotal(status: string, count: number) {
    this.botsTotal.set({ status }, count);
  }

  setBotOnline(botId: string, isOnline: boolean) {
    this.botsOnline.set({ bot_id: botId }, isOnline ? 1 : 0);
  }

  setBotActive(botId: string, isActive: boolean) {
    this.botsActive.set({ bot_id: botId }, isActive ? 1 : 0);
  }

  setBotBusy(botId: string, isBusy: boolean) {
    this.botsBusy.set({ bot_id: botId }, isBusy ? 1 : 0);
  }

  setBotIdle(botId: string, isIdle: boolean) {
    this.botsIdle.set({ bot_id: botId }, isIdle ? 1 : 0);
  }

  setBotTradeCount(botId: string, count: number) {
    this.botTradeCount.set({ bot_id: botId }, count);
  }

  setBotUptime(botId: string, uptime: number) {
    this.botUptime.set({ bot_id: botId }, uptime);
  }

  recordBotError(botId: string, errorType: string) {
    this.botErrors.inc({ bot_id: botId, error_type: errorType });
  }

  recordBotTradeCompleted(botId: string) {
    this.botTradesCompleted.inc({ bot_id: botId });
  }

  // Queue metrics methods
  recordQueueJob(queueName: string, status: string) {
    this.queueJobsTotal.inc({ queue_name: queueName, status });
  }

  setQueueJobsActive(queueName: string, count: number) {
    this.queueJobsActive.set({ queue_name: queueName }, count);
  }

  recordQueueJobCompleted(queueName: string) {
    this.queueJobsCompleted.inc({ queue_name: queueName });
  }

  recordQueueJobFailed(queueName: string) {
    this.queueJobsFailed.inc({ queue_name: queueName });
  }

  recordQueueJobRetried(queueName: string) {
    this.queueJobsRetried.inc({ queue_name: queueName });
  }

  setQueueFailureRate(queueName: string, rate: number) {
    this.queueFailureRate.set({ queue_name: queueName }, rate);
  }

  recordQueueProcessingDuration(queueName: string, duration: number) {
    this.queueProcessingDuration.observe({ queue_name: queueName }, duration);
  }

  // Cache metrics methods
  recordCacheHit(cacheType: string) {
    this.cacheHits.inc({ cache_type: cacheType });
    this.cacheOperations.inc({ operation: 'hit', cache_type: cacheType });
  }

  recordCacheMiss(cacheType: string) {
    this.cacheMisses.inc({ cache_type: cacheType });
    this.cacheOperations.inc({ operation: 'miss', cache_type: cacheType });
  }

  setCacheSize(cacheType: string, size: number) {
    this.cacheSize.set({ cache_type: cacheType }, size);
  }

  // Database metrics methods
  setDbConnectionPoolSize(dbType: string, size: number) {
    this.dbConnectionPool.set({ db_type: dbType }, size);
  }

  recordDbQuery(dbType: string, queryType: string, duration: number) {
    this.dbQueryDuration.observe({ db_type: dbType, query_type: queryType }, duration);
  }

  setDbActiveConnections(dbType: string, count: number) {
    this.dbActiveConnections.set({ db_type: dbType }, count);
  }

  // System metrics methods
  setSystemCpuUsage(usage: number) {
    this.systemCpuUsage.set(usage);
  }

  setSystemMemoryUsage(type: string, usage: number) {
    this.systemMemoryUsage.set({ type }, usage);
  }

  setSystemUptime(uptime: number) {
    this.systemUptime.set(uptime);
  }

  // Get metrics for Prometheus scraping
  async getMetrics(): Promise<string> {
    const metrics = await register.metrics();
    return metrics;
  }

  // Get metric registry for advanced usage
  getRegistry() {
    return register;
  }

  // Update system metrics periodically
  updateSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    this.setSystemMemoryUsage('rss', memUsage.rss);
    this.setSystemMemoryUsage('heapTotal', memUsage.heapTotal);
    this.setSystemMemoryUsage('heapUsed', memUsage.heapUsed);
    this.setSystemMemoryUsage('external', memUsage.external);
    this.setSystemCpuUsage(cpuUsage.user / 1000000); // Convert to seconds
    this.setSystemUptime(process.uptime());
  }
}