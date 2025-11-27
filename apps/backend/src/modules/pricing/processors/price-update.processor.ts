import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed, OnQueueStalled } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { forwardRef } from '@nestjs/common';
import { PriceService } from '../services/price.service';
import { ItemService } from '../../inventory/services/item.service';

export interface UpdateSingleItemJob {
  itemId: string;
}

export interface UpdateBatchJob {
  itemIds: string[];
}

export interface UpdateHighPriorityJob {
  appId: number;
  limit: number;
}

export interface UpdateAllItemsJob {
  appId: number;
}

@Processor('price-update')
export class PriceUpdateProcessor {
  private readonly logger = new Logger(PriceUpdateProcessor.name);

  constructor(
    @Inject(forwardRef(() => PriceService))
    private readonly priceService: PriceService,
    @Inject(forwardRef(() => ItemService))
    private readonly itemService: ItemService,
  ) {}

  /**
   * Update price for a single item
   */
  @Process({
    name: 'update-single-item',
    options: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  })
  async updateSingleItem(job: Job<UpdateSingleItemJob>) {
    const { itemId } = job.data;

    this.logger.debug(`Updating price for single item: ${itemId}`);

    try {
      await this.priceService.updateItemPrice(itemId);

      this.logger.log(`Successfully updated price for item: ${itemId}`);
      return { success: true, itemId };
    } catch (error) {
      this.logger.error(`Failed to update price for item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Update prices for a batch of items
   */
  @Process({
    name: 'update-batch',
    options: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  })
  async updateBatch(job: Job<UpdateBatchJob>) {
    const { itemIds } = job.data;

    this.logger.debug(`Updating prices for batch of ${itemIds.length} items`);

    let successCount = 0;
    let failureCount = 0;
    const failures: string[] = [];

    for (const itemId of itemIds) {
      try {
        await this.priceService.updateItemPrice(itemId);
        successCount++;
      } catch (error) {
        this.logger.error(`Failed to update price for item ${itemId}:`, error);
        failureCount++;
        failures.push(itemId);
      }

      // Add small delay between items to avoid overwhelming APIs
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const result = {
      success: true,
      batchId: job.id,
      totalItems: itemIds.length,
      successCount,
      failureCount,
      failures: failures.slice(0, 10), // Limit failure list in logs
    };

    if (failureCount > 0) {
      this.logger.warn(`Batch update completed with ${failureCount} failures out of ${itemIds.length} items`, result);
    } else {
      this.logger.log(`Successfully updated prices for ${itemIds.length} items`, result);
    }

    return result;
  }

  /**
   * Update high-priority items (most traded/popular items)
   */
  @Process({
    name: 'update-high-priority',
    options: {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
      removeOnComplete: 50,
      removeOnFail: 200,
    },
  })
  async updateHighPriority(job: Job<UpdateHighPriorityJob>) {
    const { appId, limit } = job.data;

    this.logger.debug(`Updating high-priority items for app ${appId} (limit: ${limit})`);

    try {
      // Get most traded items from recent trade history
      const popularItems = await this.getPopularItemIds(appId, limit);

      if (popularItems.length === 0) {
        this.logger.warn(`No popular items found for app ${appId}`);
        return { success: true, appId, updatedCount: 0 };
      }

      // Update prices for popular items
      let updatedCount = 0;
      for (const itemId of popularItems) {
        try {
          await this.priceService.updateItemPrice(itemId);
          updatedCount++;
        } catch (error) {
          this.logger.debug(`Failed to update high-priority item ${itemId}: ${error.message}`);
          // Don't throw here, continue with other items
        }

        // Small delay between updates
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      this.logger.log(`Updated ${updatedCount} out of ${popularItems.length} high-priority items for app ${appId}`);
      return {
        success: true,
        appId,
        requestedLimit: limit,
        foundItems: popularItems.length,
        updatedCount,
      };
    } catch (error) {
      this.logger.error(`Failed to update high-priority items for app ${appId}:`, error);
      throw error;
    }
  }

  /**
   * Update all items for a specific app
   */
  @Process({
    name: 'update-all-items',
    options: {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 10000,
      },
      removeOnComplete: 50,
      removeOnFail: 100,
    },
  })
  async updateAllItems(job: Job<UpdateAllItemsJob>) {
    const { appId } = job.data;

    this.logger.debug(`Updating all items for app ${appId}`);

    try {
      // Get all items for the app
      const allItems = await this.itemService.getAllItemIdsByApp(appId);

      if (allItems.length === 0) {
        this.logger.warn(`No items found for app ${appId}`);
        return { success: true, appId, totalItems: 0 };
      }

      this.logger.log(`Found ${allItems.length} items for app ${appId}, processing in batches`);

      // Process items in batches of 100
      const batchSize = 100;
      let processedCount = 0;
      let successCount = 0;

      for (let i = 0; i < allItems.length; i += batchSize) {
        const batch = allItems.slice(i, i + batchSize);
        processedCount += batch.length;

        try {
          await this.priceService.bulkUpdatePrices(batch);
          successCount += batch.length;

          this.logger.debug(`Processed batch ${Math.floor(i / batchSize) + 1}, ${batch.length} items updated`);

          // Wait between batches to avoid overwhelming APIs
          if (i + batchSize < allItems.length) {
            await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
          }
        } catch (error) {
          this.logger.error(`Failed to process batch starting at index ${i}:`, error);
          // Continue with next batch
        }
      }

      this.logger.log(`Completed full update for app ${appId}: ${successCount}/${processedCount} items updated`);
      return {
        success: true,
        appId,
        totalItems: allItems.length,
        updatedCount: successCount,
        processedCount,
      };
    } catch (error) {
      this.logger.error(`Failed to update all items for app ${appId}:`, error);
      throw error;
    }
  }

  /**
   * Get popular item IDs based on recent trade activity
   */
  private async getPopularItemIds(appId: number, limit: number): Promise<string[]> {
    try {
      // This would query the TradeItem table to find most traded items recently
      // For now, return empty array as placeholder
      // In a real implementation, you'd query:
      // SELECT itemId, COUNT(*) as tradeCount FROM trade_items
      // WHERE appId = :appId AND createdAt >= :recentDate
      // GROUP BY itemId ORDER BY tradeCount DESC LIMIT :limit

      this.logger.debug(`Getting popular items for app ${appId} (placeholder implementation)`);
      return [];
    } catch (error) {
      this.logger.error(`Failed to get popular items for app ${appId}:`, error);
      return [];
    }
  }

  /**
   * Lifecycle hooks for monitoring
   */
  @OnQueueActive()
  onActive(job: Job<any>) {
    this.logger.debug(`Price update job ${job.id} (${job.name}) is now active`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job<any>, result: any) {
    this.logger.debug(`Price update job ${job.id} (${job.name}) completed:`, result);
  }

  @OnQueueStalled()
  onStalled(jobId: number) {
    this.logger.warn(`Price update job ${jobId} has stalled`);
  }

  @OnQueueFailed()
  onFailed(job: Job<any>, error: Error) {
    this.logger.error(`Price update job ${job.id} (${job.name}) failed:`, error);

    // Log specific job failures for monitoring
    const jobData = job.data;
    if (job.name === 'update-single-item' && jobData.itemId) {
      this.logger.error(`Single item price update failed for ${jobData.itemId}: ${error.message}`);
    } else if (job.name === 'update-batch' && jobData.itemIds) {
      this.logger.error(`Batch price update failed for ${jobData.itemIds.length} items: ${error.message}`);
    }
  }
}