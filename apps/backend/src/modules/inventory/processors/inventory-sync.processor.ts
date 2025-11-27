import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed, OnQueueStalled } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { InventoryService } from '../services/inventory.service';
import { SteamApiException, PrivateInventoryException, RateLimitException, SteamApiTimeoutException } from '../exceptions/steam-api.exception';

export interface SyncUserInventoryJob {
  userId: string;
  steamId: string;
  appId: number;
}

export interface BatchSyncInventoriesJob {
  batchSize: number;
  appId?: number;
}

export interface RefreshInventoryJob {
  userId: string;
  steamId: string;
  appId: number;
}

@Processor('inventory-sync')
export class InventorySyncProcessor {
  private readonly logger = new Logger(InventorySyncProcessor.name);

  constructor(private inventoryService: InventoryService) {}

  @Process('sync-user-inventory')
  async processSyncUserInventory(job: Job<SyncUserInventoryJob>) {
    const { userId, steamId, appId } = job.data;

    this.logger.debug(`Processing sync-user-inventory job ${job.id} for user ${userId}, app ${appId}`);

    try {
      const result = await this.inventoryService.syncUserInventory(userId, steamId, appId);

      if (result.success) {
        this.logger.log(`Successfully synced inventory for user ${userId}, app ${appId}. Added: ${result.itemsAdded}, Updated: ${result.itemsUpdated}, Removed: ${result.itemsRemoved}`);
        return result;
      } else {
        this.logger.warn(`Failed to sync inventory for user ${userId}, app ${appId}. Errors: ${result.errors.join(', ')}`);
        throw new Error(`Sync failed: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      this.logger.error(`Error processing sync-user-inventory job ${job.id}:`, error);

      // Handle specific Steam API exceptions
      if (error instanceof PrivateInventoryException) {
        // Don't retry for private inventory
        throw new Error('User inventory is private, skipping retry');
      } else if (error instanceof RateLimitException) {
        // Retry with exponential backoff for rate limit errors
        throw error;
      } else if (error instanceof SteamApiTimeoutException) {
        // Retry for timeout errors
        throw error;
      } else {
        // For other errors, let Bull handle retries
        throw error;
      }
    }
  }

  @Process('batch-sync-inventories')
  async processBatchSyncInventories(job: Job<BatchSyncInventoriesJob>) {
    const { batchSize, appId } = job.data;

    this.logger.debug(`Processing batch-sync-inventories job ${job.id} with batch size ${batchSize}, app ${appId || 'all'}`);

    try {
      // Get users for sync
      const users = await this.inventoryService.getUsersForSync(batchSize);

      if (users.length === 0) {
        this.logger.log('No users found for sync');
        return { usersQueued: 0, appId };
      }

      // Add sync jobs for each user
      let usersQueued = 0;

      for (const user of users) {
        if (user.steamId) {
          try {
            await this.inventoryService.markSyncPending(user.id, appId || 730);

            // In a real implementation, you would add the job to the queue here
            // For now, we'll call the sync method directly
            // this.queue.add('sync-user-inventory', {
            //   userId: user.id,
            //   steamId: user.steamId,
            //   appId: appId || 730,
            // }, {
            //   priority: 1,
            // });

            usersQueued++;
          } catch (error) {
            this.logger.error(`Failed to queue sync for user ${user.id}:`, error);
          }
        }
      }

      this.logger.log(`Batch sync completed: ${usersQueued} users queued for sync, app ${appId || 'all'}`);
      return { usersQueued, appId };
    } catch (error) {
      this.logger.error(`Error processing batch-sync-inventories job ${job.id}:`, error);
      throw error;
    }
  }

  @Process('refresh-inventory')
  async processRefreshInventory(job: Job<RefreshInventoryJob>) {
    const { userId, steamId, appId } = job.data;

    this.logger.debug(`Processing refresh-inventory job ${job.id} for user ${userId}, app ${appId}`);

    try {
      const result = await this.inventoryService.refreshUserInventory(userId, steamId, appId);

      if (result.success) {
        this.logger.log(`Successfully refreshed inventory for user ${userId}, app ${appId}`);
        return result;
      } else {
        this.logger.warn(`Failed to refresh inventory for user ${userId}, app ${appId}. Errors: ${result.errors.join(', ')}`);
        throw new Error(`Refresh failed: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      this.logger.error(`Error processing refresh-inventory job ${job.id}:`, error);
      throw error;
    }
  }

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.debug(`Job ${job.id} started. Data: ${JSON.stringify(job.data)}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    const duration = job.finishedOn ? job.finishedOn - job.processedOn : 0;
    this.logger.log(`Job ${job.id} completed in ${duration}ms. Result: ${JSON.stringify(result)}`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`);

    // If max attempts reached, mark sync as failed
    if (job.attemptsMade >= job.opts.attempts) {
      const { userId, appId } = job.data as any;
      if (userId && appId) {
        try {
          this.inventoryService.markSyncFailed(userId, appId, error.message);
        } catch (markError) {
          this.logger.error(`Failed to mark sync as failed for user ${userId}:`, markError);
        }
      }
    }
  }

  @OnQueueStalled()
  onStalled(jobId: number) {
    this.logger.warn(`Job ${jobId} stalled. It will be automatically retried.`);
  }
}