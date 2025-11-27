import { Injectable, Logger } from '@nestjs/common';
import { HealthCheckService, HttpHealthIndicator, TypeOrmHealthIndicator, MongooseHealthIndicator, MemoryHealthIndicator, DiskHealthIndicator } from '@nestjs/terminus';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

import { CustomRedisHealthIndicator } from '../indicators/custom-redis-health.indicator';
import { CustomBullHealthIndicator } from '../indicators/custom-bull-health.indicator';

import { User } from '../../modules/auth/entities/user.entity';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private db: TypeOrmHealthIndicator,
    private mongoose: MongooseHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private customRedis: CustomRedisHealthIndicator,
    private customBull: CustomBullHealthIndicator,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectConnection() private readonly mongoConnection: Connection,
    @InjectQueue('price-updates') private readonly priceUpdateQueue: Queue,
    @InjectQueue('inventory-sync') private readonly inventorySyncQueue: Queue,
    @InjectQueue('trade-processing') private readonly tradeProcessingQueue: Queue,
  ) {}

  async checkReadiness() {
    return this.health.check([
      // Database health checks
      () => this.db.pingCheck('postgres', { timeout: 3000 }),
      () => this.mongoose.pingCheck('mongodb', { connection: this.mongoConnection, timeout: 3000 }),
      () => this.customRedis.isHealthy('redis'),

      // Queue health checks
      () => this.customBull.isHealthy('price-updates-queue', this.priceUpdateQueue),
      () => this.customBull.isHealthy('inventory-sync-queue', this.inventorySyncQueue),
      () => this.customBull.isHealthy('trade-processing-queue', this.tradeProcessingQueue),

      // System health checks
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024), // 150MB
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024), // 300MB
      () => this.disk.checkStorage('storage', { path: '/', thresholdPercent: 0.9 }), // 90% threshold
    ]);
  }

  async checkLiveness() {
    return this.health.check([
      // Basic connectivity checks
      () => this.http.pingCheck('self', '/api/health/ready', { timeout: 5000 }),

      // Database connectivity
      () => this.db.pingCheck('postgres', { timeout: 3000 }),
      () => this.mongoose.pingCheck('mongodb', { connection: this.mongoConnection, timeout: 3000 }),
      () => this.customRedis.isHealthy('redis'),

      // System health
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
    ]);
  }

  async checkHealth() {
    return this.health.check([
      // Database health
      () => this.db.pingCheck('postgres', { timeout: 3000 }),
      () => this.mongoose.pingCheck('mongodb', { connection: this.mongoConnection, timeout: 3000 }),
      () => this.customRedis.isHealthy('redis'),

      // Queue health
      () => this.customBull.isHealthy('price-updates-queue', this.priceUpdateQueue),
      () => this.customBull.isHealthy('inventory-sync-queue', this.inventorySyncQueue),
      () => this.customBull.isHealthy('trade-processing-queue', this.tradeProcessingQueue),

      // System health
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
      () => this.disk.checkStorage('storage', { path: '/', thresholdPercent: 0.9 }),

      // External service checks (Steam API, etc.)
      () => this.http.pingCheck('steam-api', 'https://api.steampowered.com', { timeout: 5000 }),
    ]);
  }

  async getDetailedHealth() {
    const healthChecks = await Promise.allSettled([
      this.checkDatabaseHealth(),
      this.checkQueueHealth(),
      this.checkSystemHealth(),
      this.checkExternalServices(),
    ]);

    return {
      status: healthChecks.every(result => result.status === 'fulfilled') ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: this.extractResult(healthChecks[0]),
        queues: this.extractResult(healthChecks[1]),
        system: this.extractResult(healthChecks[2]),
        external: this.extractResult(healthChecks[3]),
      },
    };
  }

  async getEndpointStatus() {
    try {
      // Get database connection stats
      const dbStats = await this.getDatabaseStats();
      const queueStats = await this.getQueueStats();
      const systemMetrics = this.getSystemMetrics();

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        databases: {
          postgres: {
            status: 'up',
            connections: dbStats.postgres || { active: 0, idle: 0 },
          },
          mongodb: {
            status: 'up',
            connections: dbStats.mongodb || { active: 0, idle: 0 },
          },
          redis: {
            status: 'up',
            latency: dbStats.redis?.latency || 0,
          },
        },
        queues: queueStats,
        system: systemMetrics,
        configuration: this.getConfigurationStatus(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  private async getDatabaseStats() {
    const stats = {
      postgres: { active: 0, idle: 0 },
      mongodb: { active: 0, idle: 0 },
      redis: { latency: 0 },
    };

    try {
      // Get Postgres connection stats
      const connection = this.db['connection'];
      if (connection) {
        stats.postgres.active = connection.manager.queryRunner?.isReleased ? 0 : 1;
      }

      // Get Redis latency (simplified)
      const redisStart = Date.now();
      await this.customRedis.isHealthy('redis');
      stats.redis.latency = Date.now() - redisStart;

      return stats;
    } catch (error) {
      this.logger.error('Error getting database stats:', error);
      return stats;
    }
  }

  private async getQueueStats() {
    const queueStats = {};

    try {
      const queues = [
        { name: 'price-updates', queue: this.priceUpdateQueue },
        { name: 'inventory-sync', queue: this.inventorySyncQueue },
        { name: 'trade-processing', queue: this.tradeProcessingQueue },
      ];

      for (const { name, queue } of queues) {
        try {
          const stats = {
            active: await queue.getActiveCount(),
            waiting: await queue.getWaitingCount(),
            completed: await queue.getCompletedCount(),
            failed: await queue.getFailedCount(),
            delayed: await queue.getDelayedCount(),
          };
          queueStats[name] = stats;
        } catch (error) {
          queueStats[name] = { error: error.message };
        }
      }

      return queueStats;
    } catch (error) {
      this.logger.error('Error getting queue stats:', error);
      return {};
    }
  }

  private getSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      pid: process.pid,
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    };
  }

  private getConfigurationStatus() {
    const config = {
      steamApiKey: process.env.STEAM_API_KEY ? 'configured' : 'missing',
      jwtSecret: process.env.JWT_SECRET ? 'configured' : 'missing',
      jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ? 'configured' : 'missing',
      botEncryptionKey: process.env.BOT_ENCRYPTION_KEY ? 'configured' : 'missing',
      databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing',
      mongodbUrl: process.env.MONGODB_URL ? 'configured' : 'missing',
      redisUrl: process.env.REDIS_URL ? 'configured' : 'missing',
      corsOrigins: process.env.CORS_ORIGIN?.split(',').length || 0,
      nodeEnv: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 3001,
    };

    return config;
  }

  private async checkDatabaseHealth() {
    const dbChecks = await Promise.allSettled([
      this.db.pingCheck('postgres', { timeout: 3000 }),
      this.mongoose.pingCheck('mongodb', { connection: this.mongoConnection, timeout: 3000 }),
      this.customRedis.isHealthy('redis'),
      this.userRepository.count().then(count => ({ count, status: 'ok' })),
    ]);

    return {
      status: dbChecks.every(result => result.status === 'fulfilled') ? 'healthy' : 'unhealthy',
      details: {
        postgres: this.extractResult(dbChecks[0]),
        mongodb: this.extractResult(dbChecks[1]),
        redis: this.extractResult(dbChecks[2]),
        user_count: this.extractResult(dbChecks[3]),
      },
    };
  }

  private async checkQueueHealth() {
    const queueChecks = await Promise.allSettled([
      this.customBull.isHealthy('price-updates-queue', this.priceUpdateQueue),
      this.customBull.isHealthy('inventory-sync-queue', this.inventorySyncQueue),
      this.customBull.isHealthy('trade-processing-queue', this.tradeProcessingQueue),
    ]);

    return {
      status: queueChecks.every(result => result.status === 'fulfilled') ? 'healthy' : 'unhealthy',
      details: {
        'price-updates': this.extractResult(queueChecks[0]),
        'inventory-sync': this.extractResult(queueChecks[1]),
        'trade-processing': this.extractResult(queueChecks[2]),
      },
    };
  }

  private async checkSystemHealth() {
    const systemChecks = await Promise.allSettled([
      this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
      this.disk.checkStorage('storage', { path: '/', thresholdPercent: 0.9 }),
    ]);

    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      status: systemChecks.every(result => result.status === 'fulfilled') ? 'healthy' : 'unhealthy',
      details: {
        memory: {
          heap: this.extractResult(systemChecks[0]),
          rss: this.extractResult(systemChecks[1]),
          usage: memUsage,
        },
        storage: this.extractResult(systemChecks[2]),
        cpu: {
          usage: cpuUsage,
        },
      },
    };
  }

  private async checkExternalServices() {
    const externalChecks = await Promise.allSettled([
      this.http.pingCheck('steam-api', 'https://api.steampowered.com', { timeout: 5000 }),
    ]);

    return {
      status: externalChecks.every(result => result.status === 'fulfilled') ? 'healthy' : 'unhealthy',
      details: {
        'steam-api': this.extractResult(externalChecks[0]),
      },
    };
  }

  private extractResult(result: PromiseSettledResult<any>) {
    if (result.status === 'fulfilled') {
      return { status: 'ok', data: result.value };
    } else {
      return { status: 'error', error: result.reason?.message || 'Unknown error' };
    }
  }
}