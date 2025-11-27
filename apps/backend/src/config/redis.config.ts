import { BullModuleOptions } from '@nestjs/bull';
import { CacheModuleOptions } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { redisStore } from 'cache-manager-redis-yet';

export const bullConfig = (configService: ConfigService): BullModuleOptions => ({
  redis: {
    host: configService.get<string>('REDIS_HOST', 'localhost'),
    port: configService.get<number>('REDIS_PORT', 6379),
    password: configService.get<string>('REDIS_PASSWORD'),
    db: configService.get<number>('REDIS_QUEUES_DB', 2), // Use separate DB for queues
    keyPrefix: configService.get<string>('REDIS_KEY_PREFIX', 'steam-marketplace:'),
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    enableOfflineQueue: false, // Fail-fast behavior
    reconnectOnError: (err) => err.message.includes('READONLY'), // Auto-reconnect on readonly errors
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    lazyConnect: true,
    commandTimeout: 10000, // Increased for complex operations
    connectTimeout: 5000,
    keepAlive: 30000, // Keep connections alive
    family: 4, // IPv4
  },
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: configService.get<number>('QUEUE_MAX_RETRIES', 3),
    backoff: {
      type: 'exponential',
      delay: configService.get<number>('QUEUE_BACKOFF_DELAY_MS', 2000), // Use dedicated backoff delay
    },
    // Use separate environment variable for job TTL (maximum job lifetime)
    // This is now independent of retry backoff timing
    lifo: false,
    timeout: configService.get<number>('QUEUE_DEFAULT_JOB_TTL', 3600000), // 1 hour default
  },
});

export const cacheConfig = async (configService: ConfigService): Promise<CacheModuleOptions> => ({
  store: await redisStore({
    socket: {
      host: configService.get<string>('REDIS_HOST', 'localhost'),
      port: configService.get<number>('REDIS_PORT', 6379),
    },
    password: configService.get<string>('REDIS_PASSWORD'),
    database: configService.get<number>('REDIS_CACHE_DB', 1), // Use separate DB for cache
    keyPrefix: configService.get<string>('REDIS_KEY_PREFIX', 'steam-marketplace:'),
    ttl: configService.get<number>('CACHE_TTL', 300), // 5 minutes default
    max: configService.get<number>('CACHE_MAX', 100), // maximum number of items in cache
  }),
  showFriendlyErrorStack: configService.get<string>('NODE_ENV') === 'development',
});

export const redisClientFactory = {
  provide: 'REDIS_CLIENT',
  useFactory: (configService: ConfigService) => {
    return new Redis({
      host: configService.get<string>('REDIS_HOST', 'localhost'),
      port: configService.get<number>('REDIS_PORT', 6379),
      password: configService.get<string>('REDIS_PASSWORD'),
      db: configService.get<number>('REDIS_THROTTLE_DB', 0), // Use separate DB for throttling
      keyPrefix: configService.get<string>('REDIS_KEY_PREFIX', 'steam-marketplace:'),
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      enableOfflineQueue: false,
      reconnectOnError: (err) => err.message.includes('READONLY'),
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: true,
      commandTimeout: 5000,
      connectTimeout: 5000,
      keepAlive: 30000,
      family: 4, // IPv4
    });
  },
  inject: [ConfigService],
};