import { BullModuleOptions } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';

export function getBullQueueConfig(queueName: string): Partial<BullModuleOptions> {
  const configService = new ConfigService();

  const baseConfig: Partial<BullModuleOptions> = {
    defaultJobOptions: {
      removeOnComplete: { count: 100, age: 3600 }, // Keep completed jobs for 1 hour
      removeOnFail: { count: 50, age: 86400 }, // Keep failed jobs for 24 hours
      attempts: configService.get<number>('QUEUE_MAX_RETRIES', 3),
      backoff: {
        type: 'exponential',
        delay: configService.get<number>('QUEUE_BACKOFF_DELAY_MS', 2000), // Use dedicated backoff delay
      },
      // Use separate environment variable for job TTL (maximum job lifetime)
      timeout: configService.get<number>('QUEUE_DEFAULT_JOB_TTL', 3600000), // 1 hour default
    },
    redis: {
      host: configService.get<string>('REDIS_HOST', 'localhost'),
      port: configService.get<number>('REDIS_PORT', 6379),
      password: configService.get<string>('REDIS_PASSWORD'),
      db: configService.get<number>('REDIS_QUEUES_DB', 2),
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
      commandTimeout: 10000,
      connectTimeout: 5000,
      keepAlive: 30000,
      family: 4,
    },
  };

  // Queue-specific configurations
  switch (queueName) {
    case 'trade':
      return {
        ...baseConfig,
        defaultJobOptions: {
          ...baseConfig.defaultJobOptions,
          // Steam API rate limiting handled at service level
        },
      };

    case 'inventory-sync':
      return {
        ...baseConfig,
        defaultJobOptions: {
          ...baseConfig.defaultJobOptions,
          // Inventory sync rate limiting handled at service level
        },
      };

    case 'price-update':
      return {
        ...baseConfig,
        defaultJobOptions: {
          ...baseConfig.defaultJobOptions,
          // Price update rate limiting handled at service level
        },
      };

    case 'trade-polling':
      return {
        ...baseConfig,
        defaultJobOptions: {
          ...baseConfig.defaultJobOptions,
          // Trade polling rate limiting handled at service level
        },
      };

    case 'webhook-delivery':
      return {
        ...baseConfig,
        defaultJobOptions: {
          ...baseConfig.defaultJobOptions,
          // Webhook delivery rate limiting handled at service level
        },
      };

    case 'bot-management':
      return {
        ...baseConfig,
        defaultJobOptions: {
          ...baseConfig.defaultJobOptions,
          // Bot management rate limiting handled at service level
        },
      };

    default:
      return baseConfig;
  }
}