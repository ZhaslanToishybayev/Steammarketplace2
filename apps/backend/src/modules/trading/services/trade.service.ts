import { Injectable, Logger, Inject, forwardRef, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between, IsNull, Not } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { SteamTradeService } from './steam-trade.service';
import { BotManagerService } from './bot-manager.service';
import { TradeValidationService } from './trade-validation.service';
import { TradeWebhookService } from './trade-webhook.service';
import { EventsGateway } from '../../events/events.gateway';
import { InventoryService } from '../../inventory/services/inventory.service';
import { PriceService } from '../../pricing/services/price.service';
import { PriceCalculationService } from '../../pricing/services/price-calculation.service';
import { Trade, TradeStatus, TradeType, TradeDirection } from '../entities/trade.entity';
import { TradeItem } from '../entities/trade-item.entity';
import { Bot } from '../entities/bot.entity';
import { Inventory } from '../../inventory/entities/inventory.entity';
import { User } from '../../auth/entities/user.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import {
  TradeException,
  TradeOfferException,
  BotOfflineException,
  InvalidTradeUrlException,
  EscrowException,
  TradeLimitExceededException,
  UserBannedException,
  TradeNotFoundException,
  TradeStatusException,
  TradeValidationException
} from '../exceptions/trade.exception';
import { CreateTradeDto } from '../dto/create-trade.dto';

export interface TradeItemDto {
  assetId: string;
  appId: number;
  contextId?: string;
  amount?: number;
  classId?: string;
  instanceId?: string;
  metadata?: any;
}

export interface TradeStatistics {
  totalTrades: number;
  completedTrades: number;
  failedTrades: number;
  pendingTrades: number;
  totalValue: number;
  averageTradeValue: number;
}

@Injectable()
export class TradeService {
  private readonly logger = new Logger(TradeService.name);
  private readonly tradeExpiryHours: number;
  private readonly tradeStalledHours: number;
  private readonly cacheTTL = 60; // 1 minute

  constructor(
    @InjectRepository(Trade)
    private readonly tradeRepository: Repository<Trade>,
    @InjectRepository(TradeItem)
    private readonly tradeItemRepository: Repository<TradeItem>,
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => SteamTradeService))
    private readonly steamTradeService: SteamTradeService,
    @Inject(forwardRef(() => BotManagerService))
    private readonly botManagerService: BotManagerService,
    @Inject(forwardRef(() => TradeValidationService))
    private readonly tradeValidationService: TradeValidationService,
    @Inject(forwardRef(() => TradeWebhookService))
    private readonly tradeWebhookService: TradeWebhookService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
    @Inject(forwardRef(() => InventoryService))
    private readonly inventoryService: InventoryService,
    @Inject(forwardRef(() => PriceService))
    private readonly priceService: PriceService,
    @Inject(forwardRef(() => PriceCalculationService))
    private readonly priceCalculationService: PriceCalculationService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @InjectQueue('trade-processing') private readonly tradeQueue: Queue,
    @InjectQueue('trade-polling') private readonly pollingQueue: Queue,
  ) {
    this.tradeExpiryHours = this.configService.get<number>('TRADE_EXPIRY_HOURS', 336); // 14 days
    this.tradeStalledHours = this.configService.get<number>('TRADE_STALLED_HOURS', 24);
  }

  /**
   * Creates a new trade for a user.
   * @param userId - User's UUID (string)
   * @param createTradeDto - Trade creation data
   * @returns Created trade entity
   */
  async createTrade(
    userId: string,
    createTradeDto: CreateTradeDto
  ): Promise<Trade> {
    const { type, itemsToGive, itemsToReceive, message, userTradeUrl } = createTradeDto;

    // Validate user
    const user = await this.getUserById(userId);
    if (!user) {
      throw new TradeNotFoundException(`User with ID ${userId} not found`);
    }

    // Check user ban status
    await this.tradeValidationService.checkUserBanStatus(userId);

    // Validate trade limits
    await this.tradeValidationService.validateTradeLimits(userId);

    // Validate trade type requirements
    this.tradeValidationService.validateTradeType(type, itemsToGive, itemsToReceive);

    // Validate trade URL if provided
    if (userTradeUrl) {
      this.tradeValidationService.validateTradeUrl(userTradeUrl);
    } else if (user.tradeUrl) {
      // Use user's saved trade URL
      this.tradeValidationService.validateTradeUrl(user.tradeUrl);
    } else {
      throw new TradeValidationException('Trade URL is required');
    }

    // Validate trade items
    const validatedItemsToGive = itemsToGive || [];
    const validatedItemsToReceive = itemsToReceive || [];
    this.tradeValidationService.validateTradeItems(validatedItemsToGive, validatedItemsToReceive);

    // Validate item ownership
    const assetIds = validatedItemsToGive.map(item => item.assetId);
    if (assetIds.length > 0) {
      await this.tradeValidationService.validateItemOwnership(userId, assetIds);
    }

    try {
      // Wrap the critical parts in a transaction
      const savedTrade = await this.tradeRepository.manager.transaction(async (transactionalEntityManager) => {
        try {
          // Get available bot
          const bot = await this.botManagerService.getAvailableBot();

          // Reserve bot
          await this.botManagerService.reserveBot(bot.id);

          // Check for trade hold/escrow
          const escrowDays = await this.tradeValidationService.checkTradeHold(userId, bot.id);
          const hasEscrow = escrowDays > 0;

          // Create trade in database
          const trade = this.tradeRepository.create({
            userId,
            botId: bot.id,
            type,
            status: TradeStatus.PENDING,
            direction: type === TradeType.DEPOSIT ? TradeDirection.INCOMING : TradeDirection.OUTGOING,
            message: message || '',
            userTradeUrl: userTradeUrl || user.tradeUrl,
            hasEscrow,
            escrowDays,
            itemsToGive: validatedItemsToGive.map(item => ({
              assetId: item.assetId,
              appId: item.appId,
              contextId: item.contextId || '2',
              amount: item.amount || 1,
              classId: item.classId,
              instanceId: item.instanceId,
              metadata: item.metadata
            })),
            itemsToReceive: validatedItemsToReceive.map(item => ({
              assetId: item.assetId,
              appId: item.appId,
              contextId: item.contextId || '2',
              amount: item.amount || 1,
              classId: item.classId,
              instanceId: item.instanceId,
              metadata: item.metadata
            })),
            totalItemsToGive: validatedItemsToGive.length,
            totalItemsToReceive: validatedItemsToReceive.length,
            expiresAt: new Date(Date.now() + this.tradeExpiryHours * 60 * 60 * 1000),
            metadata: {
              createTradeDto,
              validationResults: {}
            }
          });

          const savedTrade = await transactionalEntityManager.save(trade);

          // Create trade items
          const tradeItems = [];
          for (const item of [...validatedItemsToGive, ...validatedItemsToReceive]) {
            const inventoryItem = await this.inventoryRepository.findOne({
              where: { userId, assetId: item.assetId }
            });

            // Get current price for the item
            let estimatedValue = 0;
            try {
              const priceResponse = await this.priceService.getItemPrice(item.classId, false); // Don't use cache to get fresh price
              estimatedValue = priceResponse.adjustedPrice;
            } catch (error) {
              this.logger.warn(`Failed to get price for item ${item.classId}: ${error.message}`);
              // Set estimatedValue to 0 if pricing fails - trade can still proceed
            }

            const tradeItem = this.tradeItemRepository.create({
              tradeId: savedTrade.id,
              inventoryId: inventoryItem?.id || null,
              assetId: item.assetId,
              classId: item.classId || '',
              instanceId: item.instanceId || '',
              appId: item.appId,
              contextId: item.contextId || '2',
              amount: item.amount || 1,
              direction: validatedItemsToGive.includes(item) ? 'give' : 'receive',
              itemName: inventoryItem?.itemId || 'Unknown Item',
              itemMarketName: inventoryItem?.itemId || 'Unknown Item',
              estimatedValue, // Set the estimated value from pricing service
              metadata: item.metadata
            });

            tradeItems.push(tradeItem);
          }

          await transactionalEntityManager.save(tradeItems);

          return savedTrade;
        } catch (error) {
          this.logger.error(`Transaction failed during trade creation:`, error);
          throw error;
        }
      });

      // Add to processing queue
      await this.tradeQueue.add('process-trade', {
        tradeId: savedTrade.id,
        userId,
        botId: savedTrade.botId
      }, {
        delay: 1000, // Process after 1 second
        removeOnComplete: true,
        removeOnFail: true
      });

      this.logger.log(`Created trade ${savedTrade.id} for user ${userId} with bot ${savedTrade.botId}`);
      return savedTrade;
    } catch (error) {
      this.logger.error(`Trade creation failed:`, error);
      // Note: If the transaction failed, the bot reservation would have been rolled back automatically
      // If the error occurred after the transaction but before queue job was added,
      // the bot should still be reserved, but we need to release it manually
      // This is handled by the bot manager service's cleanup logic
      throw error;
    }
  }

  /**
   * Send trade offer
   */
  async sendTrade(tradeId: string): Promise<Trade> {
    const trade = await this.getTradeById(tradeId);
    if (!trade) {
      throw new TradeNotFoundException(`Trade with ID ${tradeId} not found`);
    }

    if (trade.status !== TradeStatus.PENDING) {
      throw new BadRequestException(`Trade ${tradeId} is not in pending status`);
    }

    const bot = await this.botManagerService.getBotById(trade.botId);
    if (!bot) {
      throw new NotFoundException(`Bot with ID ${trade.botId} not found`);
    }

    // Get user's Steam ID
    const user = await this.getUserById(trade.userId);
    if (!user.steamId) {
      throw new BadRequestException('User does not have a Steam ID');
    }

    try {
      // Create trade offer via Steam API
      const tradeOfferId = await this.steamTradeService.createTradeOffer(
        bot.id,
        user.steamId,
        trade.itemsToGive,
        trade.itemsToReceive,
        trade.message
      );

      // Update trade status
      trade.tradeOfferId = tradeOfferId;
      trade.status = TradeStatus.SENT;
      trade.sentAt = new Date();
      trade.metadata = {
        ...trade.metadata,
        tradeOfferId,
        sentAt: trade.sentAt
      };

      const updatedTrade = await this.tradeRepository.save(trade);

      // Send webhook notification
      await this.sendWebhookNotification(tradeId, 'trade.sent', {
        tradeId,
        status: TradeStatus.SENT,
        tradeOfferId
      });

      // Emit WebSocket event for real-time updates
      try {
        this.eventsGateway.emitTradeSent(tradeId, {
          tradeId,
          status: TradeStatus.SENT,
          userId: trade.userId,
          offerId: tradeOfferId
        });
      } catch (error) {
        this.logger.error(`Failed to emit WebSocket trade sent event for trade ${tradeId}:`, error);
      }

      // Add to polling queue
      await this.pollingQueue.add('poll-trade-status', {
        tradeId,
        tradeOfferId
      }, {
        delay: 5000, // Start polling after 5 seconds
        repeat: { every: 2 * 60 * 1000 }, // Repeat every 2 minutes
        removeOnComplete: true,
        removeOnFail: true
      });

      this.logger.log(`Sent trade offer ${tradeOfferId} for trade ${tradeId}`);
      return updatedTrade;

    } catch (error) {
      this.logger.error(`Failed to send trade ${tradeId}:`, error);

      // Mark trade as failed
      trade.status = TradeStatus.FAILED;
      trade.errorMessage = error.message;
      trade.failedAt = new Date();
      trade.retryCount += 1;

      await this.tradeRepository.save(trade);

      // Release bot
      await this.botManagerService.releaseBot(trade.botId);

      // Send webhook notification for failed trade
      await this.sendWebhookNotification(tradeId, 'trade.failed', {
        tradeId,
        status: TradeStatus.FAILED,
        errorMessage: error.message
      });

      throw new TradeOfferException(`Failed to send trade offer: ${error.message}`, error);
    }
  }

  /**
   * Accept trade
   */
  async acceptTrade(tradeId: string): Promise<Trade> {
    const trade = await this.getTradeById(tradeId);
    if (!trade) {
      throw new TradeNotFoundException(`Trade with ID ${tradeId} not found`);
    }

    if (trade.status !== TradeStatus.SENT) {
      throw new BadRequestException(`Trade ${tradeId} is not in sent status`);
    }

    if (!trade.tradeOfferId) {
      throw new BadRequestException(`Trade ${tradeId} has no trade offer ID`);
    }

    try {
      // Accept trade offer via Steam API
      await this.steamTradeService.acceptTradeOffer(trade.botId, trade.tradeOfferId);

      // Update trade status
      trade.status = TradeStatus.ACCEPTED;
      trade.acceptedAt = new Date();
      trade.metadata = {
        ...trade.metadata,
        acceptedAt: trade.acceptedAt
      };

      const updatedTrade = await this.tradeRepository.save(trade);

      // Send webhook notification
      await this.sendWebhookNotification(tradeId, 'trade.accepted', {
        tradeId,
        status: TradeStatus.ACCEPTED
      });

      // Emit WebSocket event for real-time updates
      try {
        this.eventsGateway.emitTradeAccepted(tradeId, {
          tradeId,
          status: TradeStatus.ACCEPTED,
          userId: trade.userId
        });
      } catch (error) {
        this.logger.error(`Failed to emit WebSocket trade accepted event for trade ${tradeId}:`, error);
      }

      this.logger.log(`Accepted trade ${tradeId}`);
      return updatedTrade;

    } catch (error) {
      this.logger.error(`Failed to accept trade ${tradeId}:`, error);
      throw new TradeOfferException(`Failed to accept trade offer: ${error.message}`, error);
    }
  }

  /**
   * Complete trade
   */
  async completeTrade(tradeId: string): Promise<Trade> {
    const trade = await this.getTradeById(tradeId);
    if (!trade) {
      throw new TradeNotFoundException(`Trade with ID ${tradeId} not found`);
    }

    if (trade.status !== TradeStatus.ACCEPTED) {
      throw new BadRequestException(`Trade ${tradeId} is not in accepted status`);
    }

    try {
      // Update trade status
      trade.status = TradeStatus.COMPLETED;
      trade.completedAt = new Date();
      trade.metadata = {
        ...trade.metadata,
        completedAt: trade.completedAt
      };

      const updatedTrade = await this.tradeRepository.save(trade);

      // Update bot statistics
      if (trade.botId) {
        await this.botManagerService.incrementCompletedTrades(trade.botId);
        await this.botManagerService.releaseBot(trade.botId);
      }

      // Invalidate user inventory cache
      await this.inventoryService.invalidateUserInventoryCache(trade.userId);

      // Send webhook notification
      await this.sendWebhookNotification(tradeId, 'trade.completed', {
        tradeId,
        status: TradeStatus.COMPLETED
      });

      // Emit WebSocket event for real-time updates
      try {
        this.eventsGateway.emitTradeCompleted(tradeId, {
          tradeId,
          status: TradeStatus.COMPLETED,
          userId: trade.userId
        });
      } catch (error) {
        this.logger.error(`Failed to emit WebSocket trade completed event for trade ${tradeId}:`, error);
      }

      this.logger.log(`Completed trade ${tradeId}`);
      return updatedTrade;

    } catch (error) {
      this.logger.error(`Failed to complete trade ${tradeId}:`, error);
      throw new TradeException(`Failed to complete trade: ${error.message}`, 500);
    }
  }

  /**
   * Decline trade
   */
  async declineTrade(tradeId: string, reason?: string): Promise<Trade> {
    const trade = await this.getTradeById(tradeId);
    if (!trade) {
      throw new TradeNotFoundException(`Trade with ID ${tradeId} not found`);
    }

    if (![TradeStatus.PENDING, TradeStatus.SENT].includes(trade.status)) {
      throw new BadRequestException(`Trade ${tradeId} cannot be declined in current status: ${trade.status}`);
    }

    try {
      // Decline trade offer if it has been sent
      if (trade.tradeOfferId && trade.status === TradeStatus.SENT) {
        await this.steamTradeService.declineTradeOffer(trade.botId, trade.tradeOfferId);
      }

      // Update trade status
      trade.status = TradeStatus.DECLINED;
      trade.cancelledAt = new Date();
      trade.errorMessage = reason;
      trade.metadata = {
        ...trade.metadata,
        declinedAt: trade.cancelledAt,
        declineReason: reason
      };

      const updatedTrade = await this.tradeRepository.save(trade);

      // Release bot
      if (trade.botId) {
        await this.botManagerService.releaseBot(trade.botId);
      }

      // Send webhook notification
      await this.sendWebhookNotification(tradeId, 'trade.declined', {
        tradeId,
        status: TradeStatus.DECLINED,
        reason
      });

      // Emit WebSocket event for real-time updates
      try {
        this.eventsGateway.emitTradeDeclined(tradeId, {
          tradeId,
          status: TradeStatus.DECLINED,
          userId: trade.userId,
          reason
        });
      } catch (error) {
        this.logger.error(`Failed to emit WebSocket trade declined event for trade ${tradeId}:`, error);
      }

      this.logger.log(`Declined trade ${tradeId} with reason: ${reason}`);
      return updatedTrade;

    } catch (error) {
      this.logger.error(`Failed to decline trade ${tradeId}:`, error);
      throw new TradeOfferException(`Failed to decline trade offer: ${error.message}`, error);
    }
  }

  /**
   * Cancel trade
   */
  async cancelTrade(tradeId: string, userId: string): Promise<Trade> {
    const trade = await this.getTradeById(tradeId);
    if (!trade) {
      throw new TradeNotFoundException(`Trade with ID ${tradeId} not found`);
    }

    // Check if user can cancel this trade
    if (trade.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own trades');
    }

    if (![TradeStatus.PENDING, TradeStatus.SENT].includes(trade.status)) {
      throw new BadRequestException(`Trade ${tradeId} cannot be cancelled in current status: ${trade.status}`);
    }

    try {
      // Cancel trade offer if it has been sent
      if (trade.tradeOfferId && trade.status === TradeStatus.SENT) {
        await this.steamTradeService.cancelTradeOffer(trade.botId, trade.tradeOfferId);
      }

      // Update trade status
      trade.status = TradeStatus.CANCELLED;
      trade.cancelledAt = new Date();
      trade.metadata = {
        ...trade.metadata,
        cancelledAt: trade.cancelledAt,
        cancelledBy: userId
      };

      const updatedTrade = await this.tradeRepository.save(trade);

      // Release bot
      if (trade.botId) {
        await this.botManagerService.releaseBot(trade.botId);
      }

      // Send webhook notification
      await this.sendWebhookNotification(tradeId, 'trade.cancelled', {
        tradeId,
        status: TradeStatus.CANCELLED
      });

      // Emit WebSocket event for real-time updates
      try {
        this.eventsGateway.emitTradeUpdate(tradeId, {
          tradeId,
          status: TradeStatus.CANCELLED,
          userId: trade.userId,
          reason: 'User cancelled'
        });
      } catch (error) {
        this.logger.error(`Failed to emit WebSocket trade cancelled event for trade ${tradeId}:`, error);
      }

      this.logger.log(`Cancelled trade ${tradeId} by user ${userId}`);
      return updatedTrade;

    } catch (error) {
      this.logger.error(`Failed to cancel trade ${tradeId}:`, error);
      throw new TradeOfferException(`Failed to cancel trade offer: ${error.message}`, error);
    }
  }

  /**
   * Fail trade
   */
  async failTrade(tradeId: string, errorMessage: string): Promise<Trade> {
    const trade = await this.getTradeById(tradeId);
    if (!trade) {
      throw new TradeNotFoundException(`Trade with ID ${tradeId} not found`);
    }

    trade.status = TradeStatus.FAILED;
    trade.errorMessage = errorMessage;
    trade.failedAt = new Date();
    trade.retryCount += 1;

    const updatedTrade = await this.tradeRepository.save(trade);

    // Release bot
    if (trade.botId) {
      await this.botManagerService.releaseBot(trade.botId);
    }

    // Send webhook notification
    await this.sendWebhookNotification(tradeId, 'trade.failed', {
      tradeId,
      status: TradeStatus.FAILED,
      errorMessage
    });

    // Emit WebSocket event for real-time updates
    try {
      this.eventsGateway.emitTradeFailed(tradeId, {
        tradeId,
        status: TradeStatus.FAILED,
        userId: trade.userId,
        errorMessage
      });
    } catch (error) {
      this.logger.error(`Failed to emit WebSocket trade failed event for trade ${tradeId}:`, error);
    }

    this.logger.log(`Failed trade ${tradeId}: ${errorMessage}`);
    return updatedTrade;
  }

  /**
   * Get trade by ID
   */
  async getTradeById(tradeId: string): Promise<Trade> {
    const trade = await this.tradeRepository.findOne({
      where: { id: tradeId },
      relations: ['user', 'bot', 'items']
    });

    if (!trade) {
      throw new TradeNotFoundException(`Trade with ID ${tradeId} not found`);
    }

    return trade;
  }

  /**
   * Get user trades
   */
  async getUserTrades(
    userId: string,
    filters?: {
      status?: TradeStatus | TradeStatus[];
      type?: TradeType | TradeType[];
      botId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    },
    pagination?: PaginationDto,
    extraFilters?: {
      hasEscrow?: boolean;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    }
  ): Promise<PaginatedResponse<Trade>> {
    const cacheKey = `user_trades:${userId}:${JSON.stringify({ filters, extraFilters, pagination })}`;
    const cached = await this.cacheManager.get<PaginatedResponse<Trade>>(cacheKey);

    if (cached) {
      return cached;
    }

    const query = this.tradeRepository.createQueryBuilder('trade')
      .leftJoinAndSelect('trade.bot', 'bot')
      .where('trade.userId = :userId', { userId });

    // Apply filters
    if (filters) {
      if (filters.status) {
        const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
        query.andWhere('trade.status IN (:...statuses)', { statuses });
      }

      if (filters.type) {
        const types = Array.isArray(filters.type) ? filters.type : [filters.type];
        query.andWhere('trade.type IN (:...types)', { types });
      }

      if (filters.botId) {
        query.andWhere('trade.botId = :botId', { botId: filters.botId });
      }

      if (filters.dateFrom) {
        query.andWhere('trade.createdAt >= :dateFrom', { dateFrom: filters.dateFrom });
      }

      if (filters.dateTo) {
        query.andWhere('trade.createdAt <= :dateTo', { dateTo: filters.dateTo });
      }
    }

    // Apply additional filters from query params
    if (extraFilters) {
      if (extraFilters.hasEscrow !== undefined) {
        query.andWhere('trade.hasEscrow = :hasEscrow', { hasEscrow: extraFilters.hasEscrow });
      }
    }

    // Apply pagination and sorting
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const offset = (page - 1) * limit;

    // Apply sorting
    const sortBy = extraFilters?.sortBy || 'createdAt';
    const sortOrder = extraFilters?.sortOrder || 'DESC';
    const allowedSortFields = ['createdAt', 'updatedAt', 'sentAt', 'completedAt', 'totalItemsToGive', 'totalItemsToReceive'];

    if (allowedSortFields.includes(sortBy)) {
      query.orderBy(`trade.${sortBy}`, sortOrder);
    } else {
      query.orderBy('trade.createdAt', 'DESC');
    }

    query.skip(offset).take(limit);

    const [trades, total] = await query.getManyAndCount();

    const result: PaginatedResponse<Trade> = {
      items: trades,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };

    await this.cacheManager.set(cacheKey, result, this.cacheTTL);
    return result;
  }

  /**
   * Get bot trades
   */
  async getBotTrades(
    botId: string,
    filters?: {
      status?: TradeStatus | TradeStatus[];
      type?: TradeType | TradeType[];
      dateFrom?: Date;
      dateTo?: Date;
    },
    pagination?: PaginationDto,
    extraFilters?: {
      hasEscrow?: boolean;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    }
  ): Promise<PaginatedResponse<Trade>> {
    const cacheKey = `bot_trades:${botId}:${JSON.stringify({ filters, extraFilters, pagination })}`;
    const cached = await this.cacheManager.get<PaginatedResponse<Trade>>(cacheKey);

    if (cached) {
      return cached;
    }

    const query = this.tradeRepository.createQueryBuilder('trade')
      .leftJoinAndSelect('trade.bot', 'bot')
      .leftJoinAndSelect('trade.user', 'user')
      .where('trade.botId = :botId', { botId });

    // Apply filters
    if (filters) {
      if (filters.status) {
        const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
        query.andWhere('trade.status IN (:...statuses)', { statuses });
      }

      if (filters.type) {
        const types = Array.isArray(filters.type) ? filters.type : [filters.type];
        query.andWhere('trade.type IN (:...types)', { types });
      }

      if (filters.dateFrom) {
        query.andWhere('trade.createdAt >= :dateFrom', { dateFrom: filters.dateFrom });
      }

      if (filters.dateTo) {
        query.andWhere('trade.createdAt <= :dateTo', { dateTo: filters.dateTo });
      }
    }

    // Apply escrow filter
    if (extraFilters) {
      if (extraFilters.hasEscrow !== undefined) {
        query.andWhere('trade.hasEscrow = :hasEscrow', { hasEscrow: extraFilters.hasEscrow });
      }
    }

    // Apply pagination and sorting
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const offset = (page - 1) * limit;

    // Apply sorting
    const sortBy = extraFilters?.sortBy || 'createdAt';
    const sortOrder = extraFilters?.sortOrder || 'DESC';
    const allowedSortFields = ['createdAt', 'updatedAt', 'sentAt', 'completedAt', 'totalItemsToGive', 'totalItemsToReceive'];

    if (allowedSortFields.includes(sortBy)) {
      query.orderBy(`trade.${sortBy}`, sortOrder);
    } else {
      query.orderBy('trade.createdAt', 'DESC');
    }

    query.skip(offset).take(limit);

    const [trades, total] = await query.getManyAndCount();

    const result: PaginatedResponse<Trade> = {
      items: trades,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };

    await this.cacheManager.set(cacheKey, result, this.cacheTTL);
    return result;
  }

  /**
   * Get all trades (Admin)
   */
  async getAllTrades(getTradesDto: any): Promise<PaginatedResponse<Trade>> {
    const {
      status,
      type,
      botId,
      hasEscrow,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
      page = 1,
      limit = 10
    } = getTradesDto;

    const cacheKey = `all_trades:${JSON.stringify(getTradesDto)}`;
    const cached = await this.cacheManager.get<PaginatedResponse<Trade>>(cacheKey);
    if (cached) {
      return cached;
    }

    const query = this.tradeRepository.createQueryBuilder('trade')
      .leftJoinAndSelect('trade.bot', 'bot')
      .leftJoinAndSelect('trade.user', 'user');

    // Apply filters (same as getUserTrades but without userId restriction)
    if (status && status.length > 0) {
      query.andWhere('trade.status IN (:...status)', { status });
    }

    if (type && type.length > 0) {
      query.andWhere('trade.type IN (:...type)', { type });
    }

    if (botId) {
      query.andWhere('trade.botId = :botId', { botId });
    }

    if (hasEscrow !== undefined) {
      query.andWhere('trade.hasEscrow = :hasEscrow', { hasEscrow });
    }

    if (dateFrom) {
      query.andWhere('trade.createdAt >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      query.andWhere('trade.createdAt <= :dateTo', { dateTo });
    }

    // Apply pagination and sorting
    const offset = (page - 1) * limit;
    const allowedSortFields = ['createdAt', 'updatedAt', 'sentAt', 'completedAt', 'totalItemsToGive', 'totalItemsToReceive'];

    if (allowedSortFields.includes(sortBy)) {
      query.orderBy(`trade.${sortBy}`, sortOrder || 'DESC');
    } else {
      query.orderBy('trade.createdAt', 'DESC');
    }

    query.skip(offset).take(limit);
    const [trades, total] = await query.getManyAndCount();

    const result: PaginatedResponse<Trade> = {
      items: trades,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };

    await this.cacheManager.set(cacheKey, result, this.cacheTTL);
    return result;
  }

  /**
   * Update trade status
   */
  async updateTradeStatus(tradeId: string, status: TradeStatus, metadata?: any): Promise<Trade> {
    const trade = await this.getTradeById(tradeId);

    const oldStatus = trade.status;
    trade.status = status;
    trade.metadata = {
      ...trade.metadata,
      statusChangedAt: new Date(),
      oldStatus,
      newStatus: status,
      statusChangeMetadata: metadata
    };

    const updatedTrade = await this.tradeRepository.save(trade);

    // Update bot status based on trade status
    if (trade.botId && [TradeStatus.COMPLETED, TradeStatus.FAILED, TradeStatus.CANCELLED].includes(status)) {
      await this.botManagerService.releaseBot(trade.botId);
    }

    this.logger.log(`Updated trade ${tradeId} status from ${oldStatus} to ${status}`);
    return updatedTrade;
  }

  /**
   * Get trade statistics for user
   */
  async getTradeStatistics(userId: string): Promise<TradeStatistics> {
    const totalTrades = await this.tradeRepository.count({
      where: { userId }
    });

    const completedTrades = await this.tradeRepository.count({
      where: { userId, status: TradeStatus.COMPLETED }
    });

    const failedTrades = await this.tradeRepository.count({
      where: { userId, status: TradeStatus.FAILED }
    });

    const pendingTrades = await this.tradeRepository.count({
      where: { userId, status: In([TradeStatus.PENDING, TradeStatus.SENT, TradeStatus.ACCEPTED]) }
    });

    // Calculate total value using real pricing data
    let totalValue = 0;
    const completedTradeItems = await this.tradeItemRepository.find({
      where: { trade: { userId, status: TradeStatus.COMPLETED } }
    });

    // Calculate profit margin for completed trades
    const itemsToGive = completedTradeItems.filter(item => item.direction === 'give');
    const itemsToReceive = completedTradeItems.filter(item => item.direction === 'receive');

    try {
      const profitResult = await this.priceCalculationService.calculateProfitMargin(itemsToGive, itemsToReceive);
      totalValue = profitResult.totalReceiveValue;
    } catch (error) {
      this.logger.warn(`Failed to calculate total value for user ${userId}: ${error.message}`);
      // Calculate using estimated values as fallback
      totalValue = completedTradeItems.reduce((sum, item) => sum + (item.estimatedValue || 0) * item.amount, 0);
    }

    const averageTradeValue = totalValue / (completedTrades || 1);

    return {
      totalTrades,
      completedTrades,
      failedTrades,
      pendingTrades,
      totalValue,
      averageTradeValue
    };
  }

  /**
   * Send webhook notification
   */
  public async sendWebhookNotification(tradeId: string, event: string, payload: any): Promise<void> {
    try {
      await this.tradeWebhookService.sendWebhook(tradeId, event, payload);
      this.logger.log(`Webhook event ${event} sent for trade ${tradeId}`);
    } catch (error) {
      this.logger.error(`Failed to send webhook event ${event} for trade ${tradeId}:`, error);
      // Don't throw error as webhook failures shouldn't block trade processing
    }
  }

  /**
   * Reset and retry a failed trade
   * This method focuses on resetting trade fields and updating botId, but does not schedule queue jobs or reserve bots
   */
  public async resetAndRetryTrade(tradeId: string): Promise<Trade> {
    const trade = await this.getTradeById(tradeId);
    if (!trade) {
      throw new TradeNotFoundException(`Trade with ID ${tradeId} not found`);
    }

    if (trade.retryCount >= trade.maxRetries) {
      throw new BadRequestException(`Trade ${tradeId} has exceeded maximum retries (${trade.maxRetries})`);
    }

    // Reset trade status to pending for retry
    trade.status = TradeStatus.PENDING;
    trade.errorMessage = null;
    trade.sentAt = null;
    trade.tradeOfferId = null;
    trade.retryCount += 1;

    const updatedTrade = await this.tradeRepository.save(trade);

    this.logger.log(`Reset trade ${tradeId} for retry (retry count: ${trade.retryCount})`);
    return updatedTrade;
  }

  /**
   * Update trade bot ID
   */
  public async updateTradeBotId(tradeId: string, botId: string): Promise<Trade> {
    const trade = await this.getTradeById(tradeId);
    if (!trade) {
      throw new TradeNotFoundException(`Trade with ID ${tradeId} not found`);
    }

    trade.botId = botId;
    return await this.tradeRepository.save(trade);
  }

  /**
   * Schedule trade completion
   */
  public async scheduleCompletion(tradeId: string): Promise<void> {
    await this.tradeQueue.add('complete-trade', { tradeId });
  }

  /**
   * Get user by ID
   */
  private async getUserById(userId: string): Promise<User> {
    return await this.tradeRepository.manager.getRepository(User).findOne({
      where: { id: userId },
      select: ['id', 'steamId', 'tradeUrl'] // Only select necessary fields
    });
  }
}