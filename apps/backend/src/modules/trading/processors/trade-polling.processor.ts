import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed, OnQueueStalled } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SteamTradeService } from '../services/steam-trade.service';
import { BotManagerService } from '../services/bot-manager.service';
import { TradeService } from '../services/trade.service';
import { EventsGateway } from '../../events/events.gateway';
import { Trade, TradeStatus } from '../entities/trade.entity';
import { TradeOfferState } from '../services/steam-trade.service';

export interface PollTradeStatusJob {
  tradeId: string;
  tradeOfferId: string;
}

export interface PollBotTradesJob {
  botId: string;
}

export interface PollAllActiveTradesJob {
  batchSize?: number;
}

@Processor('trade-polling')
export class TradePollingProcessor {
  private readonly logger = new Logger(TradePollingProcessor.name);

  constructor(
    @InjectRepository(Trade)
    private readonly tradeRepository: Repository<Trade>,
    @Inject(forwardRef(() => SteamTradeService))
    private readonly steamTradeService: SteamTradeService,
    @Inject(forwardRef(() => BotManagerService))
    private readonly botManagerService: BotManagerService,
    @Inject(forwardRef(() => TradeService))
    private readonly tradeService: TradeService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * Poll individual trade status
   */
  @Process('poll-trade-status')
  async pollTradeStatus(job: Job<PollTradeStatusJob>) {
    const { tradeId, tradeOfferId } = job.data;

    this.logger.debug(`Polling status for trade ${tradeId}, offer ${tradeOfferId}`);

    try {
      // Get trade from database
      const trade = await this.tradeRepository.findOne({
        where: { id: tradeId },
        relations: ['user', 'bot']
      });

      if (!trade) {
        this.logger.warn(`Trade ${tradeId} not found during polling`);
        return { success: false, tradeId, reason: 'trade_not_found' };
      }

      if (!trade.tradeOfferId) {
        this.logger.warn(`Trade ${tradeId} has no trade offer ID`);
        return { success: false, tradeId, reason: 'no_trade_offer_id' };
      }

      // Get current status from Steam API
      const currentStatus = await this.steamTradeService.getTradeOfferStatus(trade.botId, trade.tradeOfferId);

      this.logger.debug(`Current status for trade ${tradeId}: ${currentStatus.state}`);

      // Map Steam Trade Offer state to our status
      const mappedStatus = this.mapTradeOfferStateToTradeStatus(currentStatus.state);

      // Check if status has changed
      if (trade.status !== mappedStatus) {
        this.logger.log(`Trade ${tradeId} status changed from ${trade.status} to ${mappedStatus}`);

        // Update trade status
        await this.updateTradeStatus(trade, mappedStatus, currentStatus);

        // Handle status-specific logic
        await this.handleStatusChange(trade, mappedStatus, currentStatus);
      }

      return {
        success: true,
        tradeId,
        oldStatus: trade.status,
        newStatus: mappedStatus,
        tradeOfferState: currentStatus.state
      };

    } catch (error) {
      this.logger.error(`Failed to poll trade status for ${tradeId}:`, error);
      throw error;
    }
  }

  /**
   * Poll all trades for a specific bot
   */
  @Process('poll-bot-trades')
  async pollBotTrades(job: Job<PollBotTradesJob>) {
    const { botId } = job.data;

    this.logger.debug(`Polling all trades for bot ${botId}`);

    try {
      // Get all active trades for this bot
      const activeTrades = await this.tradeRepository.find({
        where: {
          botId,
          status: In([
            TradeStatus.PENDING,
            TradeStatus.SENT,
            TradeStatus.ACCEPTED,
            TradeStatus.FAILED
          ])
        }
      });

      if (activeTrades.length === 0) {
        this.logger.debug(`No active trades found for bot ${botId}`);
        return { success: true, botId, tradesProcessed: 0 };
      }

      this.logger.log(`Found ${activeTrades.length} active trades for bot ${botId}`);

      // Poll each trade
      const results = [];
      for (const trade of activeTrades) {
        if (trade.tradeOfferId) {
          try {
            const result = await this.pollTradeStatus({
              data: {
                tradeId: trade.id,
                tradeOfferId: trade.tradeOfferId
              }
            } as Job<PollTradeStatusJob>);

            results.push(result);
          } catch (error) {
            this.logger.error(`Failed to poll trade ${trade.id} for bot ${botId}:`, error);
            results.push({
              success: false,
              tradeId: trade.id,
              error: error.message
            });
          }
        }
      }

      return {
        success: true,
        botId,
        tradesProcessed: activeTrades.length,
        results
      };

    } catch (error) {
      this.logger.error(`Failed to poll bot trades for ${botId}:`, error);
      throw error;
    }
  }

  /**
   * Poll all active trades in the system
   */
  @Process('poll-all-active-trades')
  async pollAllActiveTrades(job: Job<PollAllActiveTradesJob>) {
    const { batchSize = 100 } = job.data || {};

    this.logger.debug(`Polling all active trades (batch size: ${batchSize})`);

    try {
      // Get all active trades
      const activeTrades = await this.tradeRepository.find({
        where: {
          status: In([
            TradeStatus.PENDING,
            TradeStatus.SENT,
            TradeStatus.ACCEPTED
          ])
        },
        take: batchSize,
        relations: ['bot']
      });

      if (activeTrades.length === 0) {
        this.logger.debug(`No active trades found for polling`);
        return { success: true, tradesProcessed: 0 };
      }

      this.logger.log(`Found ${activeTrades.length} active trades to poll`);

      // Group trades by bot
      const tradesByBot = new Map<string, Trade[]>();
      for (const trade of activeTrades) {
        if (!tradesByBot.has(trade.botId)) {
          tradesByBot.set(trade.botId, []);
        }
        tradesByBot.get(trade.botId).push(trade);
      }

      // Add polling jobs for each bot
      const results = [];
      for (const [botId, trades] of tradesByBot) {
        try {
          const result = await this.pollBotTrades({
            data: { botId }
          } as Job<PollBotTradesJob>);

          results.push(result);
        } catch (error) {
          this.logger.error(`Failed to poll trades for bot ${botId}:`, error);
          results.push({
            success: false,
            botId,
            error: error.message
          });
        }
      }

      return {
        success: true,
        tradesProcessed: activeTrades.length,
        botsProcessed: tradesByBot.size,
        results
      };

    } catch (error) {
      this.logger.error(`Failed to poll all active trades:`, error);
      throw error;
    }
  }

  /**
   * Map Steam Trade Offer state to our Trade status
   */
  private mapTradeOfferStateToTradeStatus(state: TradeOfferState): TradeStatus {
    switch (state) {
      case TradeOfferState.Invalid:
        return TradeStatus.FAILED;

      case TradeOfferState.Active:
        return TradeStatus.SENT;

      case TradeOfferState.CreatedNeedsConfirmation:
        return TradeStatus.SENT; // Will be handled in handleStatusChange

      case TradeOfferState.Accepted:
        return TradeStatus.ACCEPTED;

      case TradeOfferState.Countered:
        return TradeStatus.SENT; // Still active

      case TradeOfferState.Expired:
        return TradeStatus.EXPIRED;

      case TradeOfferState.Canceled:
      case TradeOfferState.CancelledBySecondFactor:
        return TradeStatus.CANCELLED;

      case TradeOfferState.Declined:
        return TradeStatus.DECLINED;

      case TradeOfferState.InvalidItems:
        return TradeStatus.FAILED;

      case TradeOfferState.InEscrow:
        return TradeStatus.ACCEPTED; // Escrow is still accepted

      default:
        return TradeStatus.FAILED;
    }
  }

  /**
   * Update trade status in database
   */
  private async updateTradeStatus(
    trade: Trade,
    newStatus: TradeStatus,
    currentStatus: any
  ): Promise<void> {
    const oldStatus = trade.status;
    trade.status = newStatus;
    trade.metadata = {
      ...trade.metadata,
      lastPolledAt: new Date(),
      lastPollResult: currentStatus,
      statusHistory: [
        ...(trade.metadata?.statusHistory || []),
        {
          from: oldStatus,
          to: newStatus,
          at: new Date(),
          reason: 'polled_from_steam'
        }
      ]
    };

    // Set specific timestamps
    switch (newStatus) {
      case TradeStatus.ACCEPTED:
        trade.acceptedAt = new Date();
        break;
      case TradeStatus.COMPLETED:
        trade.completedAt = new Date();
        break;
      case TradeStatus.CANCELLED:
        trade.cancelledAt = new Date();
        break;
      case TradeStatus.DECLINED:
        trade.cancelledAt = new Date();
        break;
      case TradeStatus.FAILED:
        trade.failedAt = new Date();
        break;
      case TradeStatus.EXPIRED:
        trade.failedAt = new Date();
        break;
    }

    await this.tradeRepository.save(trade);
  }

  /**
   * Handle status changes with specific logic
   */
  private async handleStatusChange(
    trade: Trade,
    newStatus: TradeStatus,
    currentStatus: any
  ): Promise<void> {
    // Prevent duplicate status change events
    const lastNotifiedStatus = trade.metadata?.lastNotifiedStatus;
    const lastNotifiedAt = trade.metadata?.lastNotifiedAt;

    // Check if this status was already notified recently (within 30 seconds)
    if (lastNotifiedStatus === newStatus && lastNotifiedAt) {
      const timeSinceLastNotification = Date.now() - new Date(lastNotifiedAt).getTime();
      const duplicateWindowMs = 30 * 1000; // 30 seconds

      if (timeSinceLastNotification < duplicateWindowMs) {
        this.logger.debug(`Skipping duplicate WebSocket event for trade ${trade.id}: status ${newStatus} already notified ${timeSinceLastNotification}ms ago`);
        return;
      }
    }

    // Map TradeStatus enum values to webhook event names
    const statusToEventMap: Record<TradeStatus, string> = {
      [TradeStatus.PENDING]: 'trade.created',
      [TradeStatus.SENT]: 'trade.sent',
      [TradeStatus.ACCEPTED]: 'trade.accepted',
      [TradeStatus.DECLINED]: 'trade.declined',
      [TradeStatus.CANCELLED]: 'trade.cancelled',
      [TradeStatus.EXPIRED]: 'trade.expired',
      [TradeStatus.FAILED]: 'trade.failed',
      [TradeStatus.COMPLETED]: 'trade.completed'
    };

    switch (newStatus) {
      case TradeStatus.SENT:
        // Check if trade needs Steam Guard confirmation
        if (currentStatus.state === TradeOfferState.CreatedNeedsConfirmation) {
          this.logger.log(`Trade ${trade.id} needs Steam Guard confirmation, attempting to confirm...`);

          try {
            // Attempt to confirm the trade offer
            await this.steamTradeService.confirmTradeOffer(trade.botId, trade.tradeOfferId);

            this.logger.log(`Successfully confirmed trade ${trade.id}`);

            // Send webhook notification
            await this.tradeService.sendWebhookNotification?.(trade.id, 'trade.confirmation_sent', {
              tradeId: trade.id,
              status: TradeStatus.SENT,
              confirmationAttempted: true
            });

            // Emit WebSocket event for confirmation sent
            try {
              this.eventsGateway.emitTradeUpdate(trade.id, {
                tradeId: trade.id,
                status: TradeStatus.SENT,
                userId: trade.userId,
                metadata: { confirmationAttempted: true }
              });

              // Update last notified status and timestamp
              await this.updateLastNotifiedStatus(trade, newStatus);
            } catch (error) {
              this.logger.error(`Failed to emit WebSocket confirmation sent event for trade ${trade.id}:`, error);
            }
          } catch (error) {
            this.logger.error(`Failed to confirm trade ${trade.id}:`, error);

            // Send webhook notification for failed confirmation
            await this.tradeService.sendWebhookNotification?.(trade.id, 'trade.confirmation_failed', {
              tradeId: trade.id,
              status: TradeStatus.SENT,
              confirmationFailed: true,
              error: error.message
            });

            // Emit WebSocket event for confirmation failed
            try {
              this.eventsGateway.emitTradeUpdate(trade.id, {
                tradeId: trade.id,
                status: TradeStatus.SENT,
                userId: trade.userId,
                metadata: { confirmationFailed: true, error: error.message }
              });

              // Update last notified status and timestamp
              await this.updateLastNotifiedStatus(trade, newStatus);
            } catch (error) {
              this.logger.error(`Failed to emit WebSocket confirmation failed event for trade ${trade.id}:`, error);
            }
          }
        }
        break;

      case TradeStatus.ACCEPTED:
        // Trade was accepted, schedule completion
        await this.tradeService.scheduleCompletion(trade.id);

        // Send webhook notification
        await this.tradeService.sendWebhookNotification?.(trade.id, 'trade.accepted', {
          tradeId: trade.id,
          status: TradeStatus.ACCEPTED,
          tradeOfferId: trade.tradeOfferId
        });

        // Emit WebSocket event for trade accepted
        try {
          this.eventsGateway.emitTradeAccepted(trade.id, {
            tradeId: trade.id,
            status: TradeStatus.ACCEPTED,
            userId: trade.userId,
            tradeOfferId: trade.tradeOfferId
          });

          // Update last notified status and timestamp
          await this.updateLastNotifiedStatus(trade, newStatus);
        } catch (error) {
          this.logger.error(`Failed to emit WebSocket trade accepted event for trade ${trade.id}:`, error);
        }

        break;

      case TradeStatus.CANCELLED:
      case TradeStatus.DECLINED:
      case TradeStatus.EXPIRED:
      case TradeStatus.FAILED:
        // Trade ended, release bot
        if (trade.botId) {
          await this.botManagerService.releaseBot(trade.botId);
        }

        // Send webhook notification using the mapped event name
        const event = statusToEventMap[newStatus] || `trade.${newStatus.toLowerCase()}`;
        await this.tradeService.sendWebhookNotification?.(trade.id, event, {
          tradeId: trade.id,
          status: newStatus,
          reason: currentStatus?.state === TradeOfferState.CancelledBySecondFactor ? 'cancelled_by_user' : 'steam_api'
        });

        // Emit WebSocket event for trade ended
        try {
          this.eventsGateway.emitTradeUpdate(trade.id, {
            tradeId: trade.id,
            status: newStatus,
            userId: trade.userId,
            reason: currentStatus?.state === TradeOfferState.CancelledBySecondFactor ? 'cancelled_by_user' : 'steam_api'
          });

          // Update last notified status and timestamp
          await this.updateLastNotifiedStatus(trade, newStatus);
        } catch (error) {
          this.logger.error(`Failed to emit WebSocket trade ended event for trade ${trade.id}:`, error);
        }

        break;
    }
  }

  /**
   * Update the last notified status and timestamp in trade metadata
   */
  private async updateLastNotifiedStatus(trade: Trade, status: TradeStatus): Promise<void> {
    trade.metadata = {
      ...trade.metadata,
      lastNotifiedStatus: status,
      lastNotifiedAt: new Date().toISOString()
    };

    try {
      await this.tradeRepository.save(trade);
    } catch (error) {
      this.logger.error(`Failed to update last notified status for trade ${trade.id}:`, error);
    }
  }

  /**
   * Lifecycle hooks for monitoring
   */
  @OnQueueActive()
  onActive(job: Job<any>) {
    this.logger.debug(`Trade polling job ${job.id} is now active`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job<any>, result: any) {
    this.logger.debug(`Trade polling job ${job.id} completed successfully:`, result);
  }

  @OnQueueFailed()
  onFailed(job: Job<any>, error: Error) {
    this.logger.error(`Trade polling job ${job.id} failed:`, error);
  }

  @OnQueueStalled()
  onStalled(jobId: number) {
    this.logger.warn(`Trade polling job ${jobId} has stalled`);
  }
}