import { Injectable, Logger, Inject, forwardRef, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Between, Not, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { InventoryService } from '../../inventory/services/inventory.service';
import { BotManagerService } from './bot-manager.service';
import { SteamTradeService } from './steam-trade.service';
import { Inventory } from '../../inventory/entities/inventory.entity';
import { Bot } from '../entities/bot.entity';
import { Trade } from '../entities/trade.entity';
import { User } from '../../auth/entities/user.entity';
import { isValidSteamTradeUrl } from '../../auth/validators/trade-url.validator';
import {
  TradeLimitExceededException,
  UserBannedException,
  InvalidTradeUrlException,
  EscrowException,
  ItemNotOwnedException,
  BotOfflineException,
  BotUnavailableException,
  BotCapacityExceededException,
  TradeNotFoundException,
  TradeValidationException
} from '../exceptions/trade.exception';

export interface TradeLimits {
  maxTradesPerHour: number;
  maxTradesPerDay: number;
  currentHourTrades: number;
  currentDayTrades: number;
}

@Injectable()
export class TradeValidationService {
  private readonly logger = new Logger(TradeValidationService.name);
  private readonly maxTradesPerHour: number;
  private readonly maxTradesPerDay: number;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    @InjectRepository(Bot)
    private readonly botRepository: Repository<Bot>,
    @InjectRepository(Trade)
    private readonly tradeRepository: Repository<Trade>,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => InventoryService))
    private readonly inventoryService: InventoryService,
    @Inject(forwardRef(() => BotManagerService))
    private readonly botManagerService: BotManagerService,
    @Inject(forwardRef(() => SteamTradeService))
    private readonly steamTradeService: SteamTradeService,
  ) {
    this.maxTradesPerHour = this.configService.get<number>('MAX_TRADES_PER_HOUR', 10);
    this.maxTradesPerDay = this.configService.get<number>('MAX_TRADES_PER_DAY', 50);
  }

  /**
   * Validate user ownership of items
   */
  async validateItemOwnership(userId: string, assetIds: string[]): Promise<void> {
    if (!assetIds || assetIds.length === 0) {
      return;
    }

    // Get user's inventory items
    const userInventory = await this.inventoryRepository.find({
      where: {
        userId,
        assetId: assetIds[0] // Check first item for user existence
      }
    });

    if (userInventory.length === 0) {
      throw new NotFoundException(`No inventory found for user ${userId}`);
    }

    // Check ownership of all requested items
    for (const assetId of assetIds) {
      const item = await this.inventoryRepository.findOne({
        where: {
          userId,
          assetId,
          tradable: true
        }
      });

      if (!item) {
        throw new ItemNotOwnedException(assetId, userId);
      }
    }

    this.logger.log(`Validated ownership of ${assetIds.length} items for user ${userId}`);
  }

  /**
   * Validate bot availability
   */
  async validateBotAvailability(botId: string): Promise<void> {
    const bot = await this.botRepository.findOne({ where: { id: botId } });
    if (!bot) {
      throw new NotFoundException(`Bot with ID ${botId} not found`);
    }

    if (!bot.isActive) {
      throw new BotOfflineException(`Bot ${bot.accountName} is not active`);
    }

    if (!bot.isOnline) {
      throw new BotOfflineException(`Bot ${bot.accountName} is not online`);
    }

    if (bot.isBusy) {
      throw new BotUnavailableException(`Bot ${bot.accountName} is currently busy`);
    }

    if (bot.currentTradeCount >= bot.maxConcurrentTrades) {
      throw new BotCapacityExceededException(botId, bot.currentTradeCount, bot.maxConcurrentTrades);
    }

    this.logger.log(`Validated availability of bot ${bot.accountName}`);
  }

  /**
   * Validate trade URL format
   */
  validateTradeUrl(tradeUrl: string): void {
    if (!tradeUrl) {
      return; // Optional field
    }

    if (!isValidSteamTradeUrl(tradeUrl)) {
      throw new InvalidTradeUrlException('Invalid Steam trade URL format. Expected: https://steamcommunity.com/tradeoffer/new/?partner=XXXXXXXXX&token=XXXXXXXX');
    }

    this.logger.log(`Validated trade URL format`);
  }

  /**
   * Check trade hold/escrow between user and bot
   */
  async checkTradeHold(userId: string, botSteamId: string): Promise<number> {
    try {
      // Get user's Steam ID
      const user = await this.userRepository.findOne({
        where: { id: userId }
      });

      if (!user || !user.steamId) {
        this.logger.warn(`User ${userId} does not have a Steam ID for escrow check`);
        return 0;
      }

      // Check escrow using SteamTradeService
      const escrowDays = await this.steamTradeService.checkTradeHold(botSteamId, user.steamId);

      this.logger.log(`Checked trade hold between user ${userId} and bot ${botSteamId}: ${escrowDays} days`);
      return escrowDays;
    } catch (error) {
      this.logger.error(`Failed to check trade hold for user ${userId}:`, error);
      // Return 0 on error to not block trade creation
      return 0;
    }
  }

  /**
   * Validate trade items
   */
  validateTradeItems(itemsToGive: any[], itemsToReceive: any[]): void {
    const allItems = [...itemsToGive, ...itemsToReceive];

    if (allItems.length === 0) {
      throw new BadRequestException('At least one item must be specified in trade');
    }

    // Validate each item
    for (const item of allItems) {
      if (!item.assetId) {
        throw new BadRequestException('Item assetId is required');
      }

      if (!item.appId) {
        throw new BadRequestException('Item appId is required');
      }

      // Validate supported app IDs
      const supportedApps = [730, 570, 440, 252490]; // CS:GO, DOTA 2, TF2, Rust
      if (!supportedApps.includes(item.appId)) {
        throw new BadRequestException(`App ID ${item.appId} is not supported`);
      }

      if (!item.amount || item.amount < 1) {
        throw new BadRequestException('Item amount must be at least 1');
      }
    }

    // Check for duplicate asset IDs in the same trade
    const assetIds = allItems.map(item => item.assetId);
    const uniqueAssetIds = new Set(assetIds);
    if (assetIds.length !== uniqueAssetIds.size) {
      throw new BadRequestException('Duplicate asset IDs found in trade items');
    }

    this.logger.log(`Validated ${allItems.length} trade items`);
  }

  /**
   * Validate trade limits for user
   */
  async validateTradeLimits(userId: string): Promise<TradeLimits> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Count trades in the last hour
    const currentHourTrades = await this.countUserTrades(userId, oneHourAgo, now);

    // Count trades in the last day
    const currentDayTrades = await this.countUserTrades(userId, oneDayAgo, now);

    const limits: TradeLimits = {
      maxTradesPerHour: this.maxTradesPerHour,
      maxTradesPerDay: this.maxTradesPerDay,
      currentHourTrades,
      currentDayTrades
    };

    if (currentHourTrades >= this.maxTradesPerHour) {
      throw new TradeLimitExceededException('hour', currentHourTrades, this.maxTradesPerHour);
    }

    if (currentDayTrades >= this.maxTradesPerDay) {
      throw new TradeLimitExceededException('day', currentDayTrades, this.maxTradesPerDay);
    }

    this.logger.log(`Validated trade limits for user ${userId}: ${currentHourTrades}/${this.maxTradesPerHour} per hour, ${currentDayTrades}/${this.maxTradesPerDay} per day`);
    return limits;
  }

  /**
   * Check user ban status
   */
  async checkUserBanStatus(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new TradeNotFoundException(`User with ID ${userId} not found`);
    }

    if (!user.isActive) {
      throw new UserBannedException(userId, 'User account is inactive');
    }

    if (user.isBanned) {
      throw new UserBannedException(userId, user.banReason || 'Account is banned');
    }

    this.logger.log(`Validated user ${userId} is not banned`);
  }

  /**
   * Validate trade type requirements
   */
  validateTradeType(type: string, itemsToGive: any[], itemsToReceive: any[]): void {
    switch (type) {
      case 'deposit':
        if (itemsToGive.length === 0) {
          throw new TradeValidationException('Items to give are required for deposit trades');
        }
        break;

      case 'withdraw':
        if (itemsToReceive.length === 0) {
          throw new TradeValidationException('Items to receive are required for withdraw trades');
        }
        break;

      case 'p2p':
        if (itemsToGive.length === 0 && itemsToReceive.length === 0) {
          throw new TradeValidationException('At least one item must be specified for P2P trades');
        }
        break;

      default:
        throw new TradeValidationException(`Invalid trade type: ${type}. Supported types: deposit, withdraw, p2p`);
    }

    this.logger.log(`Validated trade type: ${type}`);
  }

  /**
   * Validate trade partner (for P2P trades)
   */
  async validateTradePartner(partnerUserId: string): Promise<void> {
    const partner = await this.userRepository.findOne({ where: { id: partnerUserId } });
    if (!partner) {
      throw new TradeNotFoundException(`Trade partner with ID ${partnerUserId} not found`);
    }

    if (!partner.isActive) {
      throw new UserBannedException(partnerUserId, 'Trade partner account is inactive');
    }

    if (partner.isBanned) {
      throw new UserBannedException(partnerUserId, 'Trade partner account is banned');
    }

    this.logger.log(`Validated trade partner ${partnerUserId}`);
  }

  /**
   * Validate inventory item availability
   */
  async validateInventoryItemAvailability(userId: string, assetId: string): Promise<Inventory> {
    const item = await this.inventoryRepository.findOne({
      where: {
        userId,
        assetId,
        tradable: true,
        syncStatus: 'synced' // Only allow synced items
      }
    });

    if (!item) {
      throw new TradeNotFoundException(`Item with assetId ${assetId} not found or not available for trading`);
    }

    return item;
  }

  /**
   * Validate sufficient bot capacity
   */
  async validateBotCapacity(botId: string, tradeCount: number = 1): Promise<void> {
    const bot = await this.botRepository.findOne({ where: { id: botId } });
    if (!bot) {
      throw new NotFoundException(`Bot with ID ${botId} not found`);
    }

    if (bot.currentTradeCount + tradeCount > bot.maxConcurrentTrades) {
      throw new BotCapacityExceededException(botId, bot.currentTradeCount, bot.maxConcurrentTrades);
    }

    this.logger.log(`Validated bot ${botId} capacity for ${tradeCount} trades`);
  }

  /**
   * Helper method to count user trades in time range
   */
  private async countUserTrades(userId: string, startTime: Date, endTime: Date): Promise<number> {
    try {
      // Count trades excluding cancelled, failed, and expired trades to get meaningful limits
      const excludedStatuses = [TradeStatus.CANCELLED, TradeStatus.FAILED, TradeStatus.EXPIRED];
      const count = await this.tradeRepository.count({
        where: {
          userId,
          createdAt: Between(startTime, endTime),
          status: Not(In(excludedStatuses))
        }
      });

      this.logger.debug(`Counted ${count} trades for user ${userId} between ${startTime.toISOString()} and ${endTime.toISOString()}`);
      return count;
    } catch (error) {
      this.logger.error(`Failed to count trades for user ${userId}:`, error);
      // Return 0 on error to not block trade creation
      return 0;
    }
  }

  /**
   * Validate trade value limits (if implemented)
   */
  validateTradeValueLimits(items: any[], maxTradeValue?: number): void {
    if (!maxTradeValue) {
      return;
    }

    // Calculate total trade value
    const totalValue = items.reduce((sum, item) => {
      return sum + (item.estimatedValue || 0) * item.amount;
    }, 0);

    if (totalValue > maxTradeValue) {
      throw new TradeValidationException(`Trade value ${totalValue} exceeds maximum allowed value ${maxTradeValue}`);
    }

    this.logger.log(`Validated trade value: ${totalValue} <= ${maxTradeValue}`);
  }

  /**
   * Validate item conditions (if implemented)
   */
  validateItemConditions(items: any[]): void {
    for (const item of items) {
      // Validate item conditions, wear, etc.
      if (item.wear && (item.wear < 0 || item.wear > 1)) {
        throw new TradeValidationException(`Invalid wear value for item ${item.assetId}: ${item.wear}`);
      }

      if (item.floatValue && (item.floatValue < 0 || item.floatValue > 1)) {
        throw new TradeValidationException(`Invalid float value for item ${item.assetId}: ${item.floatValue}`);
      }
    }

    this.logger.log(`Validated item conditions for ${items.length} items`);
  }
}