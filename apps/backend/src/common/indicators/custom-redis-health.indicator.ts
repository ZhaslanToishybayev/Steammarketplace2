import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';

@Injectable()
export class CustomRedisHealthIndicator extends HealthIndicator {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Check if Redis client is available
      const store = this.cacheManager.store as any;
      if (!store || !store.client) {
        throw new Error('Redis client is not available in cache manager');
      }

      // Ping Redis to check connectivity
      const result = await store.client.ping();

      // Any successful ping response indicates Redis is healthy
      return this.getStatus(key, true, {
        message: 'Redis is healthy',
        pingResponse: result, // Include the raw response for debugging
      });
    } catch (error) {
      throw new HealthCheckError(
        key,
        error.message || `Redis health check failed for key "${key}"`
      );
    }
  }
}