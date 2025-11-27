import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Redis } from 'ioredis';
import { MetricsService } from '../modules/metrics.service';

@Injectable()
export class MetricsScheduler {
  private readonly logger = new Logger(MetricsScheduler.name);

  constructor(
    private readonly metricsService: MetricsService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async updateBusinessMetrics() {
    this.logger.debug('Updating business metrics...');

    try {
      // Simplified metrics - just system metrics for now
      await this.updateSystemMetrics();
      this.logger.debug('Business metrics updated successfully');
    } catch (error) {
      this.logger.error('Failed to update business metrics:', error);
    }
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async updateSystemMetrics() {
    this.logger.debug('Updating system metrics...');

    try {
      // Update system metrics (CPU, memory, uptime)
      this.metricsService.updateSystemMetrics();

      // Update cache metrics
      await this.updateCacheMetrics();

      this.logger.debug('System metrics updated successfully');
    } catch (error) {
      this.logger.error('Failed to update system metrics:', error);
    }
  }

  private async updateCacheMetrics() {
    // Redis cache metrics
    try {
      // Try to get Redis client from cache manager
      const store: any = this.cacheManager.store;

      if (store && store.getClient) {
        const redisClient: Redis = store.getClient();
        if (redisClient) {
          // Get Redis info
          const info = await redisClient.info('memory');
          const memoryLines = info.split('\r\n').filter(line => line.includes('used_memory'));
          const usedMemory = memoryLines.length > 0
            ? parseInt(memoryLines[0].split(':')[1])
            : 0;

          this.metricsService.setCacheSize('redis', usedMemory);
        }
      }
    } catch (error) {
      this.logger.warn('Could not get Redis cache metrics:', error);
    }
  }
}