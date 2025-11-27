import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { SteamService } from '../../auth/services/steam.service';
import { InventoryService } from '../../inventory/services/inventory.service';
import { User } from '../../auth/entities/user.entity';
import { InventoryItem } from '../../inventory/entities/inventory-item.entity';
import { TradeOffer, TradeStatus, TradeType } from '../entities/trade-offer.entity';
import { CreateTradeOfferDto } from '../dto/create-trade-offer.dto';
import { TradeOfferResponse } from '../interfaces/trade-offer-response.interface';

@Injectable()
export class TradeService {
  private readonly logger = new Logger(TradeService.name);
  private readonly STEAM_TRADE_API_BASE = 'https://api.steampowered.com/IEconService';

  constructor(
    @InjectRepository(TradeOffer)
    private tradeOfferRepository: Repository<TradeOffer>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(InventoryItem)
    private inventoryItemRepository: Repository<InventoryItem>,
    private steamService: SteamService,
    private inventoryService: InventoryService,
    private configService: ConfigService,
  ) {}

  /**
   * Create a new trade offer
   */
  async createTradeOffer(
    senderId: string,
    createTradeDto: CreateTradeOfferDto,
  ): Promise<TradeOfferResponse> {
    try {
      this.logger.log(`Creating trade offer from user ${senderId}`);

      // Validate sender
      const sender = await this.userRepository.findOne({ where: { id: senderId } });
      if (!sender) {
        throw new NotFoundException('Sender not found');
      }

      // Validate target user exists (if specified)
      let targetUser: User | null = null;
      if (createTradeDto.targetSteamId) {
        targetUser = await this.userRepository.findOne({
          where: { steamId: createTradeDto.targetSteamId }
        });

        if (targetUser) {
          // Check if users can trade
          await this.validateTradeEligibility(sender);
          await this.validateTradeEligibility(targetUser);
        }
      }

      // Validate offered items
      const offeredItems = await this.validateOfferedItems(
        senderId,
        createTradeDto.offeredAssetIds || []
      );

      // Validate trade URL
      if (!sender.tradeUrl || !sender.isTradeUrlValid) {
        throw new BadRequestException('Valid trade URL required');
      }

      // Calculate values
      const { offeredValue, receivedValue, totalPrice, commissionFee } =
        await this.calculateTradeValues(offeredItems, createTradeDto.receivedItems || []);

      // Create trade offer in database
      const tradeOffer = this.tradeOfferRepository.create({
        senderId,
        targetSteamId: createTradeDto.targetSteamId || '',
        targetUsername: targetUser?.username,
        targetAvatar: targetUser?.avatar,
        offeredItems: offeredItems.map(item => ({
          assetId: item.assetId,
          classId: item.classId,
          instanceId: item.instanceId,
          amount: item.amount,
          name: item.name,
          imageUrl: item.imageUrl,
          steamValue: item.steamValue,
        })),
        receivedItems: createTradeDto.receivedItems || [],
        offeredValue,
        receivedValue,
        totalPrice,
        commissionFee,
        message: createTradeDto.message,
        type: createTradeDto.type || TradeType.OFFER,
        status: TradeStatus.PENDING,
        parentTradeId: createTradeDto.parentTradeId,
        isCounterOffer: !!createTradeDto.parentTradeId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        events: [{
          status: TradeStatus.PENDING,
          timestamp: new Date(),
          actor: 'user',
          details: { type: createTradeDto.type || TradeType.OFFER }
        }]
      });

      const savedTrade = await this.tradeOfferRepository.save(tradeOffer);

      // If target is a registered user, create Steam trade offer
      if (targetUser && createTradeDto.targetSteamId) {
        try {
          const steamTradeResponse = await this.createSteamTradeOffer(
            sender,
            createTradeDto.targetSteamId,
            offeredItems,
            createTradeDto.receivedItems || [],
            createTradeDto.message
          );

          // Update with Steam trade ID
          savedTrade.steamTradeId = steamTradeResponse.tradeofferid;
          savedTrade.status = TradeStatus.SENT;
          savedTrade.events.push({
            status: TradeStatus.SENT,
            timestamp: new Date(),
            actor: 'steam',
            details: { steamTradeId: steamTradeResponse.tradeofferid }
          });

          await this.tradeOfferRepository.save(savedTrade);

          // Mark items as reserved
          await this.reserveTradeItems(senderId, offeredItems);

        } catch (error) {
          this.logger.error(`Failed to create Steam trade offer: ${error.message}`);
          // Continue with database-only trade offer
          savedTrade.error = `Steam trade creation failed: ${error.message}`;
        }
      }

      this.logger.log(`Trade offer created: ${savedTrade.id}`);
      return this.mapToTradeResponse(savedTrade);

    } catch (error) {
      this.logger.error(`Failed to create trade offer: ${error.message}`);
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Failed to create trade offer');
    }
  }

  /**
   * Get trade offer by ID
   */
  async getTradeOffer(tradeId: string, userId: string): Promise<TradeOfferResponse> {
    const trade = await this.tradeOfferRepository.findOne({
      where: { id: tradeId },
      relations: ['sender'],
    });

    if (!trade) {
      throw new NotFoundException('Trade offer not found');
    }

    // Check if user has access to this trade
    if (trade.senderId !== userId && trade.targetSteamId !== userId) {
      throw new ForbiddenException('Access denied to this trade offer');
    }

    return this.mapToTradeResponse(trade);
  }

  /**
   * Get user's trade offers
   */
  async getUserTrades(
    userId: string,
    status?: TradeStatus,
    type?: 'sent' | 'received',
    limit: number = 50,
    offset: number = 0,
  ): Promise<{
    trades: TradeOfferResponse[];
    total: number;
    stats: {
      total: number;
      pending: number;
      active: number;
      completed: number;
    };
  }> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Build query
      const query = this.tradeOfferRepository
        .createQueryBuilder('trade')
        .leftJoinAndSelect('trade.sender', 'sender')
        .where('trade.senderId = :userId', { userId })
        .orWhere('trade.targetSteamId = :steamId', { steamId: user.steamId });

      if (status) {
        query.andWhere('trade.status = :status', { status });
      }

      // Get total count
      const total = await query.getCount();

      // Get trades with pagination
      const trades = await query
        .orderBy('trade.createdAt', 'DESC')
        .skip(offset)
        .take(limit)
        .getMany();

      // Get statistics
      const stats = await this.getTradeStatistics(userId);

      return {
        trades: trades.map(trade => this.mapToTradeResponse(trade)),
        total,
        stats,
      };

    } catch (error) {
      this.logger.error(`Failed to get user trades: ${error.message}`);
      throw new BadRequestException('Failed to get user trades');
    }
  }

  /**
   * Accept trade offer
   */
  async acceptTradeOffer(tradeId: string, userId: string): Promise<TradeOfferResponse> {
    const trade = await this.tradeOfferRepository.findOne({
      where: { id: tradeId },
      relations: ['sender'],
    });

    if (!trade) {
      throw new NotFoundException('Trade offer not found');
    }

    // Validate user can accept
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || (trade.senderId !== userId && trade.targetSteamId !== user.steamId)) {
      throw new ForbiddenException('You cannot accept this trade offer');
    }

    if (trade.status !== TradeStatus.SENT) {
      throw new BadRequestException('Trade offer is not in accepted state');
    }

    try {
      // Accept via Steam API if it's a Steam trade
      if (trade.steamTradeId) {
        await this.acceptSteamTradeOffer(trade.steamTradeId, user);
      }

      // Update trade status
      trade.status = TradeStatus.ACCEPTED;
      trade.acceptedAt = new Date();
      trade.events.push({
        status: TradeStatus.ACCEPTED,
        timestamp: new Date(),
        actor: 'user',
        details: { userId }
      });

      const updatedTrade = await this.tradeOfferRepository.save(trade);

      // Process trade completion
      await this.processTradeCompletion(updatedTrade);

      return this.mapToTradeResponse(updatedTrade);

    } catch (error) {
      this.logger.error(`Failed to accept trade offer: ${error.message}`);
      throw new BadRequestException('Failed to accept trade offer');
    }
  }

  /**
   * Decline trade offer
   */
  async declineTradeOffer(tradeId: string, userId: string): Promise<TradeOfferResponse> {
    const trade = await this.tradeOfferRepository.findOne({
      where: { id: tradeId },
      relations: ['sender'],
    });

    if (!trade) {
      throw new NotFoundException('Trade offer not found');
    }

    // Validate user can decline
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || (trade.senderId !== userId && trade.targetSteamId !== user.steamId)) {
      throw new ForbiddenException('You cannot decline this trade offer');
    }

    if (![TradeStatus.PENDING, TradeStatus.SENT].includes(trade.status)) {
      throw new BadRequestException('Trade offer cannot be declined');
    }

    try {
      // Decline via Steam API if it's a Steam trade
      if (trade.steamTradeId) {
        await this.declineSteamTradeOffer(trade.steamTradeId);
      }

      // Update trade status
      trade.status = TradeStatus.DECLINED;
      trade.declinedAt = new Date();
      trade.events.push({
        status: TradeStatus.DECLINED,
        timestamp: new Date(),
        actor: 'user',
        details: { userId }
      });

      // Release reserved items
      if (trade.offeredItems.length > 0) {
        await this.releaseReservedItems(trade.senderId, trade.offeredItems);
      }

      const updatedTrade = await this.tradeOfferRepository.save(trade);
      return this.mapToTradeResponse(updatedTrade);

    } catch (error) {
      this.logger.error(`Failed to decline trade offer: ${error.message}`);
      throw new BadRequestException('Failed to decline trade offer');
    }
  }

  /**
   * Cancel trade offer
   */
  async cancelTradeOffer(tradeId: string, userId: string): Promise<TradeOfferResponse> {
    const trade = await this.tradeOfferRepository.findOne({
      where: { id: tradeId },
      relations: ['sender'],
    });

    if (!trade) {
      throw new NotFoundException('Trade offer not found');
    }

    // Validate user can cancel
    if (trade.senderId !== userId) {
      throw new ForbiddenException('Only the sender can cancel this trade offer');
    }

    if (!trade.canBeCancelled) {
      throw new BadRequestException('Trade offer cannot be cancelled');
    }

    try {
      // Cancel via Steam API if it's a Steam trade
      if (trade.steamTradeId) {
        await this.cancelSteamTradeOffer(trade.steamTradeId);
        trade.cancelledBy = 'sender';
      }

      // Update trade status
      trade.status = TradeStatus.CANCELLED;
      trade.cancelledAt = new Date();
      trade.events.push({
        status: TradeStatus.CANCELLED,
        timestamp: new Date(),
        actor: 'user',
        details: { userId, reason: 'user_cancelled' }
      });

      // Release reserved items
      if (trade.offeredItems.length > 0) {
        await this.releaseReservedItems(trade.senderId, trade.offeredItems);
      }

      const updatedTrade = await this.tradeOfferRepository.save(trade);
      return this.mapToTradeResponse(updatedTrade);

    } catch (error) {
      this.logger.error(`Failed to cancel trade offer: ${error.message}`);
      throw new BadRequestException('Failed to cancel trade offer');
    }
  }

  /**
   * Update trade status from Steam
   */
  async updateTradeStatusFromSteam(tradeId: string, steamStatus: string): Promise<void> {
    const trade = await this.tradeOfferRepository.findOne({
      where: { steamTradeId: tradeId },
    });

    if (!trade) {
      this.logger.warn(`Trade offer not found for Steam trade ID: ${tradeId}`);
      return;
    }

    const statusMap: Record<string, TradeStatus> = {
      '2': TradeStatus.ACCEPTED,
      '3': TradeStatus.DECLINED,
      '4': TradeStatus.CANCELLED,
      '5': TradeStatus.EXPIRED,
      '6': TradeStatus.CANCELLED_BY_PARTNER,
      '7': TradeStatus.CANCELLED_BY_STEAM,
      '8': TradeStatus.IN_ESCROW,
    };

    const newStatus = statusMap[steamStatus];
    if (newStatus && trade.status !== newStatus) {
      trade.status = newStatus;
      trade.events.push({
        status: newStatus,
        timestamp: new Date(),
        actor: 'steam',
        details: { steamStatus }
      });

      if (newStatus === TradeStatus.ACCEPTED) {
        trade.acceptedAt = new Date();
        trade.isCompleted = true;
      } else if ([TradeStatus.DECLINED, TradeStatus.CANCELLED, TradeStatus.EXPIRED, TradeStatus.CANCELLED_BY_PARTNER, TradeStatus.CANCELLED_BY_STEAM].includes(newStatus)) {
        trade.isCompleted = true;
        await this.releaseReservedItems(trade.senderId, trade.offeredItems);
      } else if (newStatus === TradeStatus.IN_ESCROW) {
        trade.escrowEndsAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
      }

      await this.tradeOfferRepository.save(trade);
    }
  }

  // Private helper methods

  private async validateTradeEligibility(user: User): Promise<void> {
    try {
      const tradeEligibility = await this.steamService.canUserTrade(user.steamId);

      if (!tradeEligibility.canTrade) {
        throw new BadRequestException(
          `User cannot trade: ${tradeEligibility.reasons.join(', ')}`
        );
      }
    } catch (error) {
      this.logger.warn(`Could not validate trade eligibility for user ${user.steamId}: ${error.message}`);
      // Continue anyway, as this might be a temporary Steam API issue
    }
  }

  private async validateOfferedItems(userId: string, assetIds: string[]): Promise<InventoryItem[]> {
    if (assetIds.length === 0) {
      throw new BadRequestException('No items specified for trade');
    }

    const items = await this.inventoryItemRepository.find({
      where: {
        userId,
        assetId: In(assetIds),
        selected: true,
        tradable: true,
      },
    });

    if (items.length !== assetIds.length) {
      const foundIds = items.map(item => item.assetId);
      const missingIds = assetIds.filter(id => !foundIds.includes(id));
      throw new BadRequestException(`Items not found or not tradable: ${missingIds.join(', ')}`);
    }

    return items;
  }

  private async calculateTradeValues(
    offeredItems: InventoryItem[],
    receivedItems: any[],
  ): Promise<{
    offeredValue: number;
    receivedValue: number;
    totalPrice: number;
    commissionFee: number;
  }> {
    const offeredValue = offeredItems.reduce((sum, item) => sum + (item.steamValue * item.amount), 0);
    const receivedValue = receivedItems.reduce((sum, item) => sum + (item.steamValue || item.ourPrice || 0) * item.amount, 0);

    const totalPrice = receivedValue;
    const commissionRate = 0.05; // 5% commission
    const commissionFee = totalPrice * commissionRate;

    return { offeredValue, receivedValue, totalPrice, commissionFee };
  }

  private async createSteamTradeOffer(
    sender: User,
    targetSteamId: string,
    offeredItems: InventoryItem[],
    receivedItems: any[],
    message?: string,
  ): Promise<any> {
    const steamApiKey = this.configService.get<string>('STEAM_API_KEY');
    if (!steamApiKey) {
      throw new Error('STEAM_API_KEY not configured');
    }

    const offerData = {
      key: steamApiKey,
      partner: targetSteamId,
      tradeoffermessage: message || 'Trade offer from marketplace',
      items_from_me: offeredItems.map(item => ({
        assetid: item.assetId,
        appid: item.appId,
        contextid: item.contextId,
        amount: item.amount,
      })),
      items_from_them: receivedItems.map(item => ({
        assetid: item.assetId,
        appid: 730, // CS:GO
        contextid: 2,
        amount: item.amount,
      })),
      token: sender.tradeToken,
    };

    // This would make the actual Steam API call
    // For now, we'll simulate a successful response
    return {
      tradeofferid: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tradeoffer: {
        tradeofferid: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tradeofferstate: 2, // Sent
        items_to_give: offerData.items_from_me,
        items_to_receive: offerData.items_from_them,
        is_our_offer: true,
        time_created: Math.floor(Date.now() / 1000),
        expiration_time: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
        trade_offer_state: 2,
        recipient: { steamid: targetSteamId },
      },
    };
  }

  private async acceptSteamTradeOffer(steamTradeId: string, user: User): Promise<void> {
    // Simulate Steam API call to accept trade
    this.logger.log(`Accepting Steam trade offer ${steamTradeId} for user ${user.steamId}`);
  }

  private async declineSteamTradeOffer(steamTradeId: string): Promise<void> {
    // Simulate Steam API call to decline trade
    this.logger.log(`Declining Steam trade offer ${steamTradeId}`);
  }

  private async cancelSteamTradeOffer(steamTradeId: string): Promise<void> {
    // Simulate Steam API call to cancel trade
    this.logger.log(`Cancelling Steam trade offer ${steamTradeId}`);
  }

  private async reserveTradeItems(userId: string, items: InventoryItem[]): Promise<void> {
    // Mark items as reserved for trade
    await this.inventoryItemRepository.update(
      { userId, assetId: In(items.map(item => item.assetId)) },
      { listed: true }
    );
  }

  private async releaseReservedItems(userId: string, offeredItems: any[]): Promise<void> {
    // Release reserved items
    const assetIds = offeredItems.map((item: any) => item.assetId);
    if (assetIds.length > 0) {
      await this.inventoryItemRepository.update(
        { userId, assetId: In(assetIds) },
        { listed: false }
      );
    }
  }

  private async processTradeCompletion(trade: TradeOffer): Promise<void> {
    // Handle trade completion logic
    this.logger.log(`Processing trade completion for ${trade.id}`);

    // Update inventory ownership
    if (trade.offeredItems.length > 0) {
      // Transfer items from sender to receiver
      await this.transferItems(trade.senderId, trade.targetSteamId, trade.offeredItems);
    }

    if (trade.receivedItems.length > 0) {
      // Transfer items from receiver to sender
      await this.transferItems(trade.targetSteamId, trade.senderId, trade.receivedItems);
    }

    // Mark trade as completed
    trade.isCompleted = true;
    await this.tradeOfferRepository.save(trade);
  }

  private async transferItems(fromUserId: string, toSteamId: string, items: any[]): Promise<void> {
    // Handle item transfer logic
    this.logger.log(`Transferring ${items.length} items from ${fromUserId} to ${toSteamId}`);
    // This would update inventory ownership in a real implementation
  }

  private async getTradeStatistics(userId: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    const stats = {
      total: 0,
      pending: 0,
      active: 0,
      completed: 0,
    };

    const [total, pending, active, completed] = await Promise.all([
      this.tradeOfferRepository.count({
        where: [
          { senderId: userId },
          { targetSteamId: user?.steamId }
        ]
      }),
      this.tradeOfferRepository.count({
        where: [
          { senderId: userId, status: TradeStatus.PENDING },
          { targetSteamId: user?.steamId, status: TradeStatus.PENDING }
        ]
      }),
      this.tradeOfferRepository.count({
        where: [
          { senderId: userId },
          { targetSteamId: user?.steamId }
        ],
        and: [
          { status: In([TradeStatus.PENDING, TradeStatus.SENT]) }
        ]
      }),
      this.tradeOfferRepository.count({
        where: [
          { senderId: userId },
          { targetSteamId: user?.steamId }
        ],
        and: [
          { status: In([TradeStatus.ACCEPTED, TradeStatus.DECLINED, TradeStatus.CANCELLED, TradeStatus.EXPIRED]) }
        ]
      })
    ]);

    stats.total = total;
    stats.pending = pending;
    stats.active = active;
    stats.completed = completed;

    return stats;
  }

  private mapToTradeResponse(trade: TradeOffer): TradeOfferResponse {
    return {
      id: trade.id,
      steamTradeId: trade.steamTradeId,
      senderId: trade.senderId,
      targetSteamId: trade.targetSteamId,
      targetUsername: trade.targetUsername,
      targetAvatar: trade.targetAvatar,
      offeredItems: trade.offeredItems,
      receivedItems: trade.receivedItems,
      offeredValue: trade.offeredValue,
      receivedValue: trade.receivedValue,
      totalPrice: trade.totalPrice,
      commissionFee: trade.commissionFee,
      message: trade.message,
      status: trade.status,
      type: trade.type,
      isCounterOffer: trade.isCounterOffer,
      parentTradeId: trade.parentTradeId,
      expiresAt: trade.expiresAt,
      acceptedAt: trade.acceptedAt,
      declinedAt: trade.declinedAt,
      cancelledAt: trade.cancelledAt,
      cancelledBy: trade.cancelledBy,
      isCompleted: trade.isCompleted,
      isActive: trade.isActive,
      canBeCancelled: trade.canBeCancelled,
      createdAt: trade.createdAt,
      updatedAt: trade.updatedAt,
    };
  }
}