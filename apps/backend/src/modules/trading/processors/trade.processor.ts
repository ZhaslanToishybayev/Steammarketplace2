import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed, OnQueueStalled } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { TradeService } from '../services/trade.service';
import { BotManagerService } from '../services/bot-manager.service';
import { TradeWebhookService } from '../services/trade-webhook.service';
import { Trade, TradeStatus } from '../entities/trade.entity';
import { TradeException, TradeOfferException, BotOfflineException } from '../exceptions/trade.exception';

export interface ProcessTradeJob {
  tradeId: string;
  userId: string;
  botId: string;
}

export interface AcceptTradeJob {
  tradeId: string;
  userId: string;
}

export interface CancelTradeJob {
  tradeId: string;
  userId: string;
  reason?: string;
}

export interface RetryFailedTradeJob {
  tradeId: string;
  userId: string;
}

export interface CompleteTradeJob {
  tradeId: string;
  userId: string;
}

@Processor('trade-processing')
export class TradeProcessor {
  private readonly logger = new Logger(TradeProcessor.name);

  constructor(
    @Inject(forwardRef(() => TradeService))
    private readonly tradeService: TradeService,
    @Inject(forwardRef(() => BotManagerService))
    private readonly botManagerService: BotManagerService,
    @Inject(forwardRef(() => TradeWebhookService))
    private readonly tradeWebhookService: TradeWebhookService,
    @InjectQueue('trade-processing') private readonly tradeQueue: Queue,
  ) {}

  /**
   * Process trade creation and sending
   */
  @Process('process-trade')
  async processTrade(job: Job<ProcessTradeJob>) {
    const { tradeId, userId, botId } = job.data;

    this.logger.debug(`Processing trade ${tradeId} for user ${userId} with bot ${botId}`);

    try {
      // Send the trade offer
      const trade = await this.tradeService.sendTrade(tradeId);

      this.logger.log(`Successfully processed trade ${tradeId}, status: ${trade.status}`);
      return { success: true, tradeId, status: trade.status };

    } catch (error) {
      this.logger.error(`Failed to process trade ${tradeId}:`, error);

      // TradeService.sendTrade already handles failTrade() and bot release
      // Only rethrow the error, don't call failTrade again
      throw error;
    }
  }

  /**
   * Accept trade offer
   */
  @Process('accept-trade')
  async acceptTrade(job: Job<AcceptTradeJob>) {
    const { tradeId, userId } = job.data;

    this.logger.debug(`Accepting trade ${tradeId} for user ${userId}`);

    try {
      const trade = await this.tradeService.acceptTrade(tradeId);

      this.logger.log(`Successfully accepted trade ${tradeId}, status: ${trade.status}`);
      return { success: true, tradeId, status: trade.status };

    } catch (error) {
      this.logger.error(`Failed to accept trade ${tradeId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel trade offer
   */
  @Process('cancel-trade')
  async cancelTrade(job: Job<CancelTradeJob>) {
    const { tradeId, userId, reason } = job.data;

    this.logger.debug(`Cancelling trade ${tradeId} for user ${userId}, reason: ${reason}`);

    try {
      const trade = await this.tradeService.cancelTrade(tradeId, userId);

      this.logger.log(`Successfully cancelled trade ${tradeId}, status: ${trade.status}`);
      return { success: true, tradeId, status: trade.status };

    } catch (error) {
      this.logger.error(`Failed to cancel trade ${tradeId}:`, error);
      throw error;
    }
  }

  /**
   * Retry failed trade
   */
  @Process('retry-failed-trade')
  async retryFailedTrade(job: Job<RetryFailedTradeJob>) {
    const { tradeId, userId } = job.data;

    this.logger.debug(`Retrying failed trade ${tradeId} for user ${userId}`);

    try {
      // Get trade to check retry count
      const trade = await this.tradeService.getTradeById(tradeId);

      if (trade.retryCount >= trade.maxRetries) {
        this.logger.warn(`Trade ${tradeId} has exceeded maximum retries (${trade.maxRetries})`);
        await this.tradeService.failTrade(tradeId, 'Maximum retry attempts exceeded');
        return { success: false, tradeId, reason: 'max_retries_exceeded' };
      }

      // Reset trade status to pending for retry
      await this.tradeService.resetAndRetryTrade(tradeId);

      // Get a new available bot
      const bot = await this.botManagerService.getAvailableBot();
      await this.botManagerService.reserveBot(bot.id);

      // Update trade with new bot
      await this.tradeService.updateTradeBotId(tradeId, bot.id);

      // Add to processing queue for retry
      await this.tradeQueue.add('process-trade', {
        tradeId,
        userId,
        botId: bot.id
      }, {
        delay: 2000, // Process after 2 seconds
        removeOnComplete: true,
        removeOnFail: true
      });

      this.logger.log(`Scheduled retry for trade ${tradeId} with bot ${bot.id}`);
      return { success: true, tradeId, botId: bot.id };

    } catch (error) {
      this.logger.error(`Failed to retry trade ${tradeId}:`, error);

      // Release the bot if reservation failed after successful reservation
      try {
        const trade = await this.tradeService.getTradeById(tradeId);
        if (trade.botId) {
          await this.botManagerService.releaseBot(trade.botId);
        }
      } catch (releaseError) {
        this.logger.error(`Failed to release bot for trade ${tradeId}:`, releaseError);
      }

      throw error;
    }
  }

  /**
   * Complete trade
   */
  @Process('complete-trade')
  async completeTrade(job: Job<CompleteTradeJob>) {
    const { tradeId, userId } = job.data;

    this.logger.debug(`Completing trade ${tradeId} for user ${userId}`);

    try {
      const trade = await this.tradeService.completeTrade(tradeId);

      this.logger.log(`Successfully completed trade ${tradeId}`);
      return { success: true, tradeId, status: trade.status };

    } catch (error) {
      this.logger.error(`Failed to complete trade ${tradeId}:`, error);
      throw error;
    }
  }

  /**
   * Lifecycle hooks for monitoring
   */
  @OnQueueActive()
  onActive(job: Job<any>) {
    this.logger.debug(`Trade job ${job.id} is now active`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job<any>, result: any) {
    this.logger.debug(`Trade job ${job.id} completed successfully:`, result);
  }

  @OnQueueStalled()
  onStalled(jobId: number) {
    this.logger.warn(`Trade job ${jobId} has stalled`);
  }

  /**
   * Handle specific job failures with retry logic
   */
  private shouldRetryJob(error: Error): boolean {
    // Don't retry certain errors
    if (error instanceof TradeException) {
      const errorMessages = [
        'Invalid trade URL',
        'User banned',
        'Item not owned',
        'Bot unavailable'
      ];

      if (errorMessages.some(msg => error.message.includes(msg))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private getRetryDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s (max 30s)
    const delay = Math.min(Math.pow(2, attempt - 1) * 1000, 30000);
    return delay;
  }

  /**
   * Handle job failures and schedule retries when appropriate
   */
  @OnQueueFailed()
  async handleJobFailure(job: Job<any>, error: Error) {
    this.logger.error(`Trade job ${job.id} failed:`, error);

    // Handle job failure - could send notifications, update status, etc.
    const tradeId = job.data?.tradeId;
    const userId = job.data?.userId;

    if (tradeId && this.shouldRetryJob(error)) {
      try {
        // Check if this is a retry job to avoid infinite loops
        const jobName = job.name;
        if (jobName === 'retry-failed-trade') {
          this.logger.warn(`Retry job ${job.id} for trade ${tradeId} failed, not scheduling another retry`);
          return;
        }

        // Get the trade to check retry count
        const trade = await this.tradeService.getTradeById(tradeId);
        if (trade.retryCount >= trade.maxRetries) {
          this.logger.warn(`Trade ${tradeId} has exceeded maximum retries (${trade.maxRetries}), not scheduling more retries`);
          return;
        }

        // Schedule a retry job
        const delay = this.getRetryDelay(trade.retryCount + 1);
        await this.tradeQueue.add('retry-failed-trade', {
          tradeId,
          userId
        }, {
          delay,
          removeOnComplete: true,
          removeOnFail: true
        });

        this.logger.log(`Scheduled retry for failed trade ${tradeId} after ${delay}ms delay`);
      } catch (retryError) {
        this.logger.error(`Failed to schedule retry for trade ${tradeId}:`, retryError);
      }
    }

    if (tradeId) {
      this.logger.warn(`Trade ${tradeId} job failed, trade may need manual intervention`);
    }
  }
}