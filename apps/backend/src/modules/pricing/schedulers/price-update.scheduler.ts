import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Queue } from '@nestjs/bull';
import { Inject } from '@nestjs/common';

@Injectable()
export class PriceUpdateScheduler {
  private readonly logger = new Logger(PriceUpdateScheduler.name);
  private readonly supportedAppIds: number[];

  constructor(
    @Inject('PRICE_UPDATE_QUEUE') private priceUpdateQueue: Queue,
    @Inject('TREND_ANALYSIS_QUEUE') private trendAnalysisQueue: Queue,
    private configService: ConfigService,
  ) {
    // Default supported app IDs (CS:GO, Dota 2, TF2, Rust)
    const supportedGames = this.configService.get<string>('STEAM_SUPPORTED_GAMES', '730,570,440,252490');
    this.supportedAppIds = supportedGames.split(',').map(id => parseInt(id.trim()));
  }

  /**
   * Every 15 minutes: Schedule high-priority price updates for popular items
   */
  @Cron('*/15 * * * *')
  async scheduleHighPriorityUpdates() {
    try {
      this.logger.debug('Scheduling high-priority price updates');

      const highPriorityInterval = this.configService.get<number>('PRICE_UPDATE_HIGH_PRIORITY_INTERVAL', 15);
      const limit = this.configService.get<number>('PRICE_UPDATE_HIGH_PRIORITY_LIMIT', 100);

      // Check if enough time has passed since last update
      const now = Date.now();
      const lastUpdateKey = 'last_high_priority_update';
      const lastUpdate = this.configService.get<number>(lastUpdateKey, 0);

      if (now - lastUpdate < highPriorityInterval * 60 * 1000) {
        this.logger.debug(`Skipping high-priority updates, interval not reached (${highPriorityInterval} minutes)`);
        return;
      }

      this.logger.log(`Scheduling high-priority price updates for ${this.supportedAppIds.length} games (limit: ${limit})`);

      for (const appId of this.supportedAppIds) {
        try {
          // Check for existing jobs to avoid duplicates
          const existingJobs = await this.priceUpdateQueue.getWaiting();
          if (existingJobs < 50) { // Only add if queue is not too full
            await this.priceUpdateQueue.add(
              'update-high-priority',
              {
                appId,
                limit,
              },
              {
                priority: 10, // High priority
                removeOnComplete: 100,
                removeOnFail: 500,
              }
            );

            this.logger.debug(`Added high-priority update job for app ${appId}`);
          } else {
            this.logger.warn(`Price update queue is full (${existingJobs} jobs), skipping high-priority updates for app ${appId}`);
          }
        } catch (error) {
          this.logger.error(`Failed to add high-priority update job for app ${appId}:`, error);
        }
      }

      // Update last update timestamp
      this.configService.set(lastUpdateKey, now);

      this.logger.log('High-priority price update scheduling completed');
    } catch (error) {
      this.logger.error('Error in high-priority price update scheduler:', error);
    }
  }

  /**
   * Every hour: Schedule standard price updates for items not updated recently
   */
  @Cron('0 * * * *')
  async scheduleStandardUpdates() {
    try {
      this.logger.debug('Scheduling standard price updates');

      const batchSize = this.configService.get<number>('PRICE_UPDATE_BATCH_SIZE', 100);

      this.logger.log(`Scheduling standard price updates with batch size ${batchSize}`);

      for (const appId of this.supportedAppIds) {
        try {
          // Get items that haven't been updated in the last 2 hours
          const staleItems = await this.getStaleItemIds(appId, 2 * 60 * 60 * 1000); // 2 hours

          if (staleItems.length === 0) {
            this.logger.debug(`No stale items found for app ${appId}`);
            continue;
          }

          this.logger.log(`Found ${staleItems.length} stale items for app ${appId}`);

          // Process in batches
          for (let i = 0; i < staleItems.length; i += batchSize) {
            const batch = staleItems.slice(i, i + batchSize);

            try {
              await this.priceUpdateQueue.add(
                'update-batch',
                {
                  itemIds: batch,
                },
                {
                  priority: 5, // Medium priority
                  removeOnComplete: 50,
                  removeOnFail: 200,
                }
              );

              this.logger.debug(`Added batch update job for app ${appId} (batch ${Math.floor(i / batchSize) + 1})`);
            } catch (error) {
              this.logger.error(`Failed to add batch update job for app ${appId} batch ${Math.floor(i / batchSize) + 1}:`, error);
            }
          }
        } catch (error) {
          this.logger.error(`Failed to schedule standard updates for app ${appId}:`, error);
        }
      }

      this.logger.log('Standard price update scheduling completed');
    } catch (error) {
      this.logger.error('Error in standard price update scheduler:', error);
    }
  }

  /**
   * Daily at 2 AM UTC: Schedule full price updates for all items
   */
  @Cron('0 2 * * *')
  async scheduleFullUpdate() {
    try {
      this.logger.log('Scheduling daily full price updates');

      for (const appId of this.supportedAppIds) {
        try {
          // Check queue length before adding full update
          const queueLength = await this.priceUpdateQueue.getWaiting();
          if (queueLength > 200) {
            this.logger.warn(`Price update queue is very full (${queueLength} jobs), skipping full update for app ${appId}`);
            continue;
          }

          await this.priceUpdateQueue.add(
            'update-all-items',
            {
              appId,
            },
            {
              priority: 8, // High priority for full updates
              removeOnComplete: 50,
              removeOnFail: 100,
            }
          );

          this.logger.log(`Added full update job for app ${appId}`);
        } catch (error) {
          this.logger.error(`Failed to add full update job for app ${appId}:`, error);
        }
      }

      this.logger.log('Daily full price update scheduling completed');
    } catch (error) {
      this.logger.error('Error in daily full price update scheduler:', error);
    }
  }

  /**
   * Every 2 hours: Schedule market trend analysis
   */
  @Cron('0 */2 * * *')
  async scheduleTrendAnalysis() {
    try {
      this.logger.debug('Scheduling trend analysis');

      for (const appId of this.supportedAppIds) {
        try {
          await this.trendAnalysisQueue.add(
            'analyze-market-trends',
            {
              appId,
            },
            {
              priority: 7, // Medium-high priority
              removeOnComplete: 50,
              removeOnFail: 100,
            }
          );

          this.logger.debug(`Added trend analysis job for app ${appId}`);
        } catch (error) {
          this.logger.error(`Failed to add trend analysis job for app ${appId}:`, error);
        }
      }

      this.logger.log('Trend analysis scheduling completed');
    } catch (error) {
      this.logger.error('Error in trend analysis scheduler:', error);
    }
  }

  /**
   * Daily at midnight UTC: Schedule anomaly detection
   */
  @Cron('0 0 * * *')
  async scheduleAnomalyDetection() {
    try {
      this.logger.log('Scheduling daily anomaly detection');

      for (const appId of this.supportedAppIds) {
        try {
          await this.trendAnalysisQueue.add(
            'detect-anomalies',
            {
              appId,
            },
            {
              priority: 6, // Medium priority
              removeOnComplete: 50,
              removeOnFail: 100,
            }
          );

          this.logger.debug(`Added anomaly detection job for app ${appId}`);
        } catch (error) {
          this.logger.error(`Failed to add anomaly detection job for app ${appId}:`, error);
        }
      }

      this.logger.log('Anomaly detection scheduling completed');
    } catch (error) {
      this.logger.error('Error in anomaly detection scheduler:', error);
    }
  }

  /**
   * Daily at 3 AM UTC: Schedule market report generation
   */
  @Cron('0 3 * * *')
  async scheduleMarketReport() {
    try {
      this.logger.log('Scheduling daily market reports');

      for (const appId of this.supportedAppIds) {
        try {
          await this.trendAnalysisQueue.add(
            'generate-market-report',
            {
              appId,
            },
            {
              priority: 9, // High priority for reports
              removeOnComplete: 20,
              removeOnFail: 50,
            }
          );

          this.logger.debug(`Added market report job for app ${appId}`);
        } catch (error) {
          this.logger.error(`Failed to add market report job for app ${appId}:`, error);
        }
      }

      this.logger.log('Market report scheduling completed');
    } catch (error) {
      this.logger.error('Error in market report scheduler:', error);
    }
  }

  /**
   * Monitor pricing queues and log status
   */
  @Cron('*/10 * * * *') // Every 10 minutes
  async monitorQueues() {
    try {
      const priceUpdateWaiting = await this.priceUpdateQueue.getWaiting();
      const priceUpdateActive = await this.priceUpdateQueue.getActive();
      const priceUpdateCompleted = await this.priceUpdateQueue.getCompleted();
      const priceUpdateFailed = await this.priceUpdateQueue.getFailed();

      const trendAnalysisWaiting = await this.trendAnalysisQueue.getWaiting();
      const trendAnalysisActive = await this.trendAnalysisQueue.getActive();
      const trendAnalysisCompleted = await this.trendAnalysisQueue.getCompleted();
      const trendAnalysisFailed = await this.trendAnalysisQueue.getFailed();

      this.logger.debug('Pricing queues status:', {
        priceUpdate: {
          waiting: priceUpdateWaiting,
          active: priceUpdateActive,
          completed: priceUpdateCompleted,
          failed: priceUpdateFailed,
        },
        trendAnalysis: {
          waiting: trendAnalysisWaiting,
          active: trendAnalysisActive,
          completed: trendAnalysisCompleted,
          failed: trendAnalysisFailed,
        },
      });

      // Log warnings for queue issues
      if (priceUpdateWaiting > 500) {
        this.logger.warn(`High price update queue backlog: ${priceUpdateWaiting} jobs waiting`);
      }

      if (trendAnalysisWaiting > 100) {
        this.logger.warn(`High trend analysis queue backlog: ${trendAnalysisWaiting} jobs waiting`);
      }

      if (priceUpdateFailed > 50) {
        this.logger.warn(`High price update failure rate: ${priceUpdateFailed} failed jobs`);
      }

      if (trendAnalysisFailed > 20) {
        this.logger.warn(`High trend analysis failure rate: ${trendAnalysisFailed} failed jobs`);
      }
    } catch (error) {
      this.logger.error('Error monitoring pricing queues:', error);
    }
  }

  /**
   * Get item IDs that haven't been updated within the specified time window
   */
  private async getStaleItemIds(appId: number, staleThresholdMs: number): Promise<string[]> {
    try {
      // This would query the ItemPrice table to find items not updated recently
      // For now, return empty array as placeholder
      // In a real implementation, you'd query:
      // SELECT DISTINCT itemId FROM item_prices
      // WHERE appId = :appId AND priceDate < :cutoffDate

      const cutoffDate = new Date(Date.now() - staleThresholdMs);
      this.logger.debug(`Getting stale items for app ${appId} (cutoff: ${cutoffDate.toISOString()})`);
      return [];
    } catch (error) {
      this.logger.error(`Failed to get stale items for app ${appId}:`, error);
      return [];
    }
  }

  /**
   * Manually trigger price update for specific items
   */
  async triggerPriceUpdate(itemIds: string[], priority: number = 10): Promise<void> {
    try {
      if (itemIds.length === 0) {
        this.logger.warn('No item IDs provided for manual price update');
        return;
      }

      this.logger.log(`Triggering manual price update for ${itemIds.length} items`);

      // Process in batches
      const batchSize = this.configService.get<number>('PRICE_UPDATE_BATCH_SIZE', 100);

      for (let i = 0; i < itemIds.length; i += batchSize) {
        const batch = itemIds.slice(i, i + batchSize);

        try {
          await this.priceUpdateQueue.add(
            'update-batch',
            {
              itemIds: batch,
            },
            {
              priority,
              removeOnComplete: 100,
              removeOnFail: 500,
            }
          );

          this.logger.debug(`Added manual update batch ${Math.floor(i / batchSize) + 1} (${batch.length} items)`);
        } catch (error) {
          this.logger.error(`Failed to add manual update batch ${Math.floor(i / batchSize) + 1}:`, error);
        }
      }

      this.logger.log(`Manual price update triggered for ${itemIds.length} items`);
    } catch (error) {
      this.logger.error('Error triggering manual price update:', error);
      throw error;
    }
  }

  /**
   * Manually trigger trend analysis for an app
   */
  async triggerTrendAnalysis(appId: number): Promise<void> {
    try {
      this.logger.log(`Triggering manual trend analysis for app ${appId}`);

      await this.trendAnalysisQueue.add(
        'analyze-market-trends',
        {
          appId,
        },
        {
          priority: 10, // High priority for manual requests
          removeOnComplete: 50,
          removeOnFail: 100,
        }
      );

      this.logger.log(`Manual trend analysis triggered for app ${appId}`);
    } catch (error) {
      this.logger.error('Error triggering manual trend analysis:', error);
      throw error;
    }
  }
}