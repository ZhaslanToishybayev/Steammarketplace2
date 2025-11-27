import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Queue } from '@nestjs/bull';
import { Inject } from '@nestjs/common';

@Injectable()
export class InventorySyncScheduler {
  private readonly logger = new Logger(InventorySyncScheduler.name);

  constructor(
    @Inject('INVENTORY_SYNC_QUEUE') private inventorySyncQueue: Queue,
    private configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handlePeriodicSync() {
    try {
      this.logger.debug('Starting periodic inventory sync');

      const batchSize = this.configService.get<number>('INVENTORY_SYNC_BATCH_SIZE', 10);
      const supportedGames = this.configService.get<string>('STEAM_SUPPORTED_GAMES', '730,570,440,252490');
      const appIds = supportedGames.split(',').map(id => parseInt(id.trim()));

      this.logger.log(`Scheduling periodic sync for ${appIds.length} games with batch size ${batchSize}`);

      for (const appId of appIds) {
        try {
          await this.inventorySyncQueue.add(
            'batch-sync-inventories',
            {
              batchSize,
              appId,
            },
            {
              priority: 5, // Medium priority for periodic syncs
            }
          );

          this.logger.debug(`Added batch sync job for app ${appId}`);
        } catch (error) {
          this.logger.error(`Failed to add batch sync job for app ${appId}:`, error);
        }
      }

      this.logger.log('Periodic sync scheduling completed');
    } catch (error) {
      this.logger.error('Error in periodic sync scheduler:', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleNightlyFullSync() {
    try {
      this.logger.log('Starting nightly full inventory sync');

      const batchSize = this.configService.get<number>('INVENTORY_SYNC_BATCH_SIZE', 10) * 2; // Double batch size for nightly sync
      const supportedGames = this.configService.get<string>('STEAM_SUPPORTED_GAMES', '730,570,440,252490');
      const appIds = supportedGames.split(',').map(id => parseInt(id.trim()));

      this.logger.log(`Scheduling nightly full sync for ${appIds.length} games with batch size ${batchSize}`);

      for (const appId of appIds) {
        try {
          await this.inventorySyncQueue.add(
            'batch-sync-inventories',
            {
              batchSize,
              appId,
            },
            {
              priority: 8, // Higher priority for nightly syncs
            }
          );

          this.logger.debug(`Added nightly batch sync job for app ${appId}`);
        } catch (error) {
          this.logger.error(`Failed to add nightly batch sync job for app ${appId}:`, error);
        }
      }

      this.logger.log('Nightly full sync scheduling completed');
    } catch (error) {
      this.logger.error('Error in nightly full sync scheduler:', error);
    }
  }

  @Interval(60000) // Every minute
  async monitorQueue() {
    try {
      const waitingCount = await this.inventorySyncQueue.getWaiting();
      const activeCount = await this.inventorySyncQueue.getActive();
      const completedCount = await this.inventorySyncQueue.getCompleted();
      const failedCount = await this.inventorySyncQueue.getFailed();

      this.logger.debug(`Queue status - Waiting: ${waitingCount}, Active: ${activeCount}, Completed: ${completedCount}, Failed: ${failedCount}`);

      // Log warnings if queue is getting backed up
      if (waitingCount > 100) {
        this.logger.warn(`High queue backlog: ${waitingCount} jobs waiting`);
      }

      if (failedCount > 10) {
        this.logger.warn(`High failure rate: ${failedCount} failed jobs`);
      }

      // Note: In a production environment, you might want to:
      // - Send alerts when thresholds are exceeded
      // - Automatically scale workers
      // - Retry failed jobs
    } catch (error) {
      this.logger.error('Error monitoring queue:', error);
    }
  }

  async triggerManualSync(appId?: number, batchSize?: number): Promise<void> {
    try {
      const actualBatchSize = batchSize || this.configService.get<number>('INVENTORY_SYNC_BATCH_SIZE', 10);
      const supportedGames = this.configService.get<string>('STEAM_SUPPORTED_GAMES', '730,570,440,252490');
      const appIds = appId
        ? [appId]
        : supportedGames.split(',').map(id => parseInt(id.trim()));

      this.logger.log(`Triggering manual sync for ${appIds.length} games with batch size ${actualBatchSize}`);

      for (const app of appIds) {
        try {
          await this.inventorySyncQueue.add(
            'batch-sync-inventories',
            {
              batchSize: actualBatchSize,
              appId: app,
            },
            {
              priority: 10, // High priority for manual syncs
              removeOnComplete: 1000,
              removeOnFail: 500,
            }
          );

          this.logger.log(`Added manual sync job for app ${app}`);
        } catch (error) {
          this.logger.error(`Failed to add manual sync job for app ${app}:`, error);
        }
      }
    } catch (error) {
      this.logger.error('Error triggering manual sync:', error);
      throw error;
    }
  }
}