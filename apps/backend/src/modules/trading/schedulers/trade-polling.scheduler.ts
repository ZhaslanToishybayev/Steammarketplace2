import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Trade, TradeStatus } from '../entities/trade.entity';
import { Bot } from '../entities/bot.entity';

@Injectable()
export class TradePollingScheduler {
  private readonly logger = new Logger(TradePollingScheduler.name);
  private readonly tradePollingIntervalMinutes: number;
  private readonly tradeExpiryHours: number;
  private readonly tradeStalledHours: number;

  constructor(
    @InjectQueue('trade-polling') private readonly tradePollingQueue: Queue,
    @InjectQueue('trade-processing') private readonly tradeProcessingQueue: Queue,
    @InjectRepository(Trade)
    private readonly tradeRepository: Repository<Trade>,
    @InjectRepository(Bot)
    private readonly botRepository: Repository<Bot>,
    private readonly configService: ConfigService,
  ) {
    this.tradePollingIntervalMinutes = this.configService.get<number>('TRADE_POLLING_INTERVAL_MINUTES', 2);
    this.tradeExpiryHours = this.configService.get<number>('TRADE_EXPIRY_HOURS', 336); // 14 days
    this.tradeStalledHours = this.configService.get<number>('TRADE_STALLED_HOURS', 24);
  }

  /**
   * Poll all active trades every 2 minutes
   */
  @Cron(CronExpression.EVERY_2_MINUTES)
  async pollActiveTrades() {
    this.logger.debug('Starting scheduled polling of all active trades');

    try {
      // Get all active trades (excluding completed/failed/cancelled)
      const activeTrades = await this.tradeRepository.find({
        where: {
          status: In([
            TradeStatus.PENDING,
            TradeStatus.SENT,
            TradeStatus.ACCEPTED
          ])
        },
        select: ['id', 'tradeOfferId', 'botId', 'status', 'createdAt'],
        take: 1000 // Limit batch size to prevent overwhelming the system
      });

      if (activeTrades.length === 0) {
        this.logger.debug('No active trades found for polling');
        return;
      }

      this.logger.log(`Scheduling polling for ${activeTrades.length} active trades`);

      // Add polling job for all active trades
      await this.tradePollingQueue.add(
        'poll-all-active-trades',
        {
          batchSize: 1000
        },
        {
          priority: 10, // High priority for status polling
          removeOnComplete: true,
          removeOnFail: true
        }
      );

      this.logger.debug('Added poll-all-active-trades job to queue');

    } catch (error) {
      this.logger.error('Error in pollActiveTrades scheduler:', error);
    }
  }

  /**
   * Poll each bot's trades every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async pollBotTrades() {
    this.logger.debug('Starting scheduled polling of bot trades');

    try {
      // Get all online bots
      const onlineBots = await this.botRepository.find({
        where: {
          isOnline: true,
          isActive: true
        },
        select: ['id', 'accountName', 'currentTradeCount']
      });

      if (onlineBots.length === 0) {
        this.logger.debug('No online bots found for polling');
        return;
      }

      this.logger.log(`Scheduling polling for ${onlineBots.length} online bots`);

      // Add polling job for each bot
      for (const bot of onlineBots) {
        if (bot.currentTradeCount > 0) {
          try {
            await this.tradePollingQueue.add(
              'poll-bot-trades',
              {
                botId: bot.id
              },
              {
                priority: 8, // Medium-high priority
                removeOnComplete: true,
                removeOnFail: true
              }
            );

            this.logger.debug(`Added poll-bot-trades job for bot ${bot.accountName}`);
          } catch (error) {
            this.logger.error(`Failed to add poll job for bot ${bot.accountName}:`, error);
          }
        }
      }

    } catch (error) {
      this.logger.error('Error in pollBotTrades scheduler:', error);
    }
  }

  /**
   * Cleanup expired trades every hour
   */
  @Cron('0 * * * *') // Every hour
  async cleanupExpiredTrades() {
    this.logger.debug('Starting scheduled cleanup of expired trades');

    try {
      const now = new Date();

      // Find trades that are SENT and have expired (expiresAt is earlier than now)
      const expiredTrades = await this.tradeRepository.find({
        where: {
          status: TradeStatus.SENT,
          expiresAt: LessThan(now)
        },
        select: ['id', 'tradeOfferId', 'botId', 'expiresAt', 'createdAt']
      });

      if (expiredTrades.length === 0) {
        this.logger.debug('No expired trades found');
        return;
      }

      this.logger.log(`Found ${expiredTrades.length} expired trades to cleanup`);

      // Update expired trades
      for (const trade of expiredTrades) {
        try {
          trade.status = TradeStatus.EXPIRED;
          trade.failedAt = new Date();
          trade.errorMessage = 'Trade offer expired';
          trade.metadata = {
            ...trade.metadata,
            expiredAt: trade.failedAt,
            expiryReason: 'trade_offer_expired'
          };

          await this.tradeRepository.save(trade);

          // Release bot if it's still reserved
          if (trade.botId) {
            try {
              await this.botRepository.update(trade.botId, {
                isBusy: false,
                currentTradeCount: () => 'GREATEST(0, currentTradeCount - 1)'
              });
              this.logger.debug(`Released bot ${trade.botId} from expired trade ${trade.id}`);
            } catch (error) {
              this.logger.error(`Failed to release bot ${trade.botId}:`, error);
            }
          }

          this.logger.log(`Marked trade ${trade.id} as expired`);

        } catch (error) {
          this.logger.error(`Failed to cleanup expired trade ${trade.id}:`, error);
        }
      }

    } catch (error) {
      this.logger.error('Error in cleanupExpiredTrades scheduler:', error);
    }
  }

  /**
   * Cleanup stalled trades every 6 hours
   */
  @Cron('0 */6 * * *') // Every 6 hours
  async cleanupStalledTrades() {
    this.logger.debug('Starting scheduled cleanup of stalled trades');

    try {
      const now = new Date();
      const stalledThreshold = new Date(now.getTime() - this.tradeStalledHours * 60 * 60 * 1000);

      // Find trades that are PENDING and have been stalled for too long
      const stalledTrades = await this.tradeRepository.find({
        where: {
          status: TradeStatus.PENDING,
          createdAt: LessThan(stalledThreshold)
        },
        select: ['id', 'botId', 'createdAt']
      });

      if (stalledTrades.length === 0) {
        this.logger.debug('No stalled trades found');
        return;
      }

      this.logger.log(`Found ${stalledTrades.length} stalled trades to cleanup`);

      // Update stalled trades
      for (const trade of stalledTrades) {
        try {
          trade.status = TradeStatus.FAILED;
          trade.failedAt = new Date();
          trade.errorMessage = 'Trade stalled for too long';
          trade.retryCount += 1;
          trade.metadata = {
            ...trade.metadata,
            failedAt: trade.failedAt,
            failureReason: 'trade_stalled'
          };

          await this.tradeRepository.save(trade);

          // Release bot if it's still reserved
          if (trade.botId) {
            try {
              await this.botRepository.update(trade.botId, {
                isBusy: false,
                currentTradeCount: () => 'GREATEST(0, currentTradeCount - 1)'
              });
              this.logger.debug(`Released bot ${trade.botId} from stalled trade ${trade.id}`);
            } catch (error) {
              this.logger.error(`Failed to release bot ${trade.botId}:`, error);
            }
          }

          this.logger.log(`Marked trade ${trade.id} as failed (stalled)`);

        } catch (error) {
          this.logger.error(`Failed to cleanup stalled trade ${trade.id}:`, error);
        }
      }

    } catch (error) {
      this.logger.error('Error in cleanupStalledTrades scheduler:', error);
    }
  }

  /**
   * Cleanup failed trades older than 7 days daily
   */
  @Cron('0 0 * * *') // Daily at midnight
  async cleanupOldFailedTrades() {
    this.logger.debug('Starting scheduled cleanup of old failed trades');

    try {
      const now = new Date();
      const cleanupThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

      // Find failed trades older than 7 days
      const oldFailedTrades = await this.tradeRepository.find({
        where: {
          status: TradeStatus.FAILED,
          failedAt: LessThan(cleanupThreshold)
        },
        select: ['id']
      });

      if (oldFailedTrades.length === 0) {
        this.logger.debug('No old failed trades found for cleanup');
        return;
      }

      this.logger.log(`Found ${oldFailedTrades.length} old failed trades for cleanup`);

      // Note: In a real implementation, you might want to archive these trades
      // instead of deleting them, or implement a soft delete mechanism
      // For now, we'll just log them

      this.logger.log(`Old failed trades cleanup would remove ${oldFailedTrades.length} records`);

    } catch (error) {
      this.logger.error('Error in cleanupOldFailedTrades scheduler:', error);
    }
  }

  /**
   * Health check for bot sessions every 30 minutes
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async healthCheckBotSessions() {
    this.logger.debug('Starting bot session health check');

    try {
      // Get all online bots
      const onlineBots = await this.botRepository.find({
        where: {
          isOnline: true,
          isActive: true
        },
        select: ['id', 'accountName', 'lastLoginAt', 'status']
      });

      const now = new Date();
      const sessionTimeout = 2 * 60 * 60 * 1000; // 2 hours

      for (const bot of onlineBots) {
        if (bot.lastLoginAt) {
          const timeSinceLogin = now.getTime() - bot.lastLoginAt.getTime();

          if (timeSinceLogin > sessionTimeout) {
            this.logger.warn(`Bot ${bot.accountName} session may have timed out (${timeSinceLogin / (1000 * 60 * 60)} hours)`);

            // Update bot status to indicate potential timeout
            await this.botRepository.update(bot.id, {
              status: 'error',
              statusMessage: 'Session may have timed out, requires manual check'
            });
          }
        }
      }

      this.logger.debug(`Health checked ${onlineBots.length} online bots`);

    } catch (error) {
      this.logger.error('Error in healthCheckBotSessions scheduler:', error);
    }
  }
}