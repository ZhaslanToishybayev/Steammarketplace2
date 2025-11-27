import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Trade, TradeStatus, TradeType } from './trade.entity';
import { User } from '../user/user.entity';
import { Inventory } from '../inventory/inventory.entity';
import { SteamTradeService } from './steam-trade.service';

interface CreateTradeDto {
  senderSteamId: string;
  recipientSteamId: string;
  type: TradeType;
  offeredAmount?: number;
  requestedAmount?: number;
  offeredItemId?: number;
  requestedItemId?: number;
  message?: string;
}

interface TradeOffer {
  tradeId: string;
  senderSteamId: string;
  recipientSteamId: string;
  items: any[];
  message: string;
}

@Injectable()
export class TradeService {
  constructor(
    @InjectRepository(Trade)
    private tradeRepository: Repository<Trade>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    private steamTradeService: SteamTradeService
  ) {}

  async createTrade(createTradeDto: CreateTradeDto): Promise<Trade> {
    try {
      const { senderSteamId, recipientSteamId, type, offeredAmount, requestedAmount, offeredItemId, requestedItemId } = createTradeDto;

      // Validate users exist
      const sender = await this.userRepository.findOne({ where: { steamId: senderSteamId } });
      const recipient = await this.userRepository.findOne({ where: { steamId: recipientSteamId } });

      if (!sender || !recipient) {
        throw new Error('Sender or recipient not found');
      }

      // Validate items if provided
      let offeredItem: Inventory | null = null;
      let requestedItem: Inventory | null = null;

      if (offeredItemId) {
        offeredItem = await this.inventoryRepository.findOne({
          where: { id: offeredItemId, steamId: senderSteamId, active: true }
        });
        if (!offeredItem) {
          throw new Error('Offered item not found or not owned by sender');
        }
      }

      if (requestedItemId) {
        requestedItem = await this.inventoryRepository.findOne({
          where: { id: requestedItemId, steamId: recipientSteamId, active: true }
        });
        if (!requestedItem) {
          throw new Error('Requested item not found or not owned by recipient');
        }
      }

      // Create trade
      const trade = this.tradeRepository.create({
        tradeId: this.generateTradeId(),
        senderSteamId,
        recipientSteamId,
        type,
        status: TradeStatus.PENDING,
        offeredAmount,
        requestedAmount,
        offeredItemId: offeredItemId || null,
        requestedItemId: requestedItemId || null,
        message: createTradeDto.message || '',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        senderConfirmed: false,
        recipientConfirmed: false
      });

      const savedTrade = await this.tradeRepository.save(trade);

      // Create Steam trade offer if both users have valid trade URLs
      try {
        const steamOfferId = await this.createSteamTradeOffer(savedTrade);
        savedTrade.steamTradeOfferId = steamOfferId;
        await this.tradeRepository.save(savedTrade);
      } catch (error) {
        console.warn('Failed to create Steam trade offer:', error.message);
      }

      return savedTrade;
    } catch (error) {
      console.error('Error creating trade:', error);
      throw new Error('Failed to create trade');
    }
  }

  async getTradeById(tradeId: string, steamId: string): Promise<Trade | null> {
    try {
      return await this.tradeRepository.findOne({
        where: [
          { tradeId, senderSteamId: steamId },
          { tradeId, recipientSteamId: steamId }
        ],
        relations: ['sender', 'recipient', 'offeredItem', 'requestedItem']
      });
    } catch (error) {
      console.error('Error getting trade by ID:', error);
      return null;
    }
  }

  async getUserTrades(steamId: string, status?: TradeStatus, limit = 20, offset = 0): Promise<{ trades: Trade[]; total: number }> {
    try {
      const query = this.tradeRepository.createQueryBuilder('trade')
        .leftJoinAndSelect('trade.sender', 'sender')
        .leftJoinAndSelect('trade.recipient', 'recipient')
        .leftJoinAndSelect('trade.offeredItem', 'offeredItem')
        .leftJoinAndSelect('trade.requestedItem', 'requestedItem')
        .where('(trade.senderSteamId = :steamId OR trade.recipientSteamId = :steamId)', { steamId });

      if (status) {
        query.andWhere('trade.status = :status', { status });
      }

      query.orderBy('trade.createdAt', 'DESC');

      const [trades, total] = await query.skip(offset).take(limit).getManyAndCount();

      return { trades, total };
    } catch (error) {
      console.error('Error getting user trades:', error);
      return { trades: [], total: 0 };
    }
  }

  async acceptTrade(tradeId: string, steamId: string): Promise<Trade> {
    try {
      const trade = await this.getTradeById(tradeId, steamId);
      if (!trade) {
        throw new Error('Trade not found');
      }

      if (trade.status !== TradeStatus.PENDING) {
        throw new Error('Trade is not pending');
      }

      if (trade.recipientSteamId !== steamId) {
        throw new Error('Only the recipient can accept this trade');
      }

      trade.status = TradeStatus.ACCEPTED;
      trade.recipientConfirmed = true;
      trade.updatedAt = new Date();

      const updatedTrade = await this.tradeRepository.save(trade);

      // Process the trade
      try {
        await this.processTrade(updatedTrade);
      } catch (error) {
        console.error('Failed to process trade:', error);
        trade.status = TradeStatus.FAILED;
        trade.errorMessage = error.message;
        await this.tradeRepository.save(trade);
      }

      return updatedTrade;
    } catch (error) {
      console.error('Error accepting trade:', error);
      throw new Error('Failed to accept trade');
    }
  }

  async declineTrade(tradeId: string, steamId: string): Promise<Trade> {
    try {
      const trade = await this.getTradeById(tradeId, steamId);
      if (!trade) {
        throw new Error('Trade not found');
      }

      if (trade.status !== TradeStatus.PENDING) {
        throw new Error('Trade is not pending');
      }

      // Check if user is allowed to decline
      const canDecline = trade.senderSteamId === steamId || trade.recipientSteamId === steamId;
      if (!canDecline) {
        throw new Error('You are not authorized to decline this trade');
      }

      trade.status = TradeStatus.DECLINED;
      trade.updatedAt = new Date();

      return await this.tradeRepository.save(trade);
    } catch (error) {
      console.error('Error declining trade:', error);
      throw new Error('Failed to decline trade');
    }
  }

  async cancelTrade(tradeId: string, steamId: string): Promise<Trade> {
    try {
      const trade = await this.getTradeById(tradeId, steamId);
      if (!trade) {
        throw new Error('Trade not found');
      }

      if (trade.status !== TradeStatus.PENDING) {
        throw new Error('Only pending trades can be cancelled');
      }

      if (trade.senderSteamId !== steamId) {
        throw new Error('Only the sender can cancel this trade');
      }

      trade.status = TradeStatus.CANCELLED;
      trade.cancelledAt = new Date();
      trade.cancelledBy = steamId;
      trade.updatedAt = new Date();

      return await this.tradeRepository.save(trade);
    } catch (error) {
      console.error('Error cancelling trade:', error);
      throw new Error('Failed to cancel trade');
    }
  }

  async processTrade(trade: Trade): Promise<void> {
    try {
      // Update inventory ownership
      if (trade.offeredItemId && trade.requestedItemId) {
        const offeredItem = await this.inventoryRepository.findOne({ where: { id: trade.offeredItemId } });
        const requestedItem = await this.inventoryRepository.findOne({ where: { id: trade.requestedItemId } });

        if (offeredItem && requestedItem) {
          // Swap ownership
          offeredItem.steamId = trade.recipientSteamId;
          requestedItem.steamId = trade.senderSteamId;

          await this.inventoryRepository.save([offeredItem, requestedItem]);
        }
      }

      // Update trade status to completed
      trade.status = TradeStatus.COMPLETED;
      trade.completedAt = new Date();
      await this.tradeRepository.save(trade);
    } catch (error) {
      console.error('Error processing trade:', error);
      throw error;
    }
  }

  async checkTradeStatus(steamTradeId: string): Promise<TradeStatus> {
    try {
      const trade = await this.tradeRepository.findOne({
        where: { steamTradeOfferId: steamTradeId },
        order: { createdAt: 'DESC' }
      });

      if (!trade) {
        return TradeStatus.EXPIRED;
      }

      // Check with Steam API for updated status
      const steamStatus = await this.steamTradeService.getTradeOfferStatus(steamTradeId);

      if (steamStatus !== trade.status) {
        trade.status = steamStatus;
        await this.tradeRepository.save(trade);
      }

      return trade.status;
    } catch (error) {
      console.error('Error checking trade status:', error);
      return TradeStatus.FAILED;
    }
  }

  async createSteamTradeOffer(trade: Trade): Promise<string> {
    try {
      const sender = await this.userRepository.findOne({ where: { steamId: trade.senderSteamId } });
      const recipient = await this.userRepository.findOne({ where: { steamId: trade.recipientSteamId } });

      if (!sender || !recipient) {
        throw new Error('Sender or recipient not found');
      }

      // Prepare trade offer data
      const tradeOffer: TradeOffer = {
        tradeId: trade.tradeId,
        senderSteamId: trade.senderSteamId,
        recipientSteamId: trade.recipientSteamId,
        items: [],
        message: trade.message || 'Trade offer'
      };

      // Add items to trade offer
      if (trade.offeredItemId) {
        const offeredItem = await this.inventoryRepository.findOne({ where: { id: trade.offeredItemId } });
        if (offeredItem) {
          tradeOffer.items.push({
            assetid: offeredItem.assetId,
            appid: offeredItem.appId,
            contextid: offeredItem.contextId,
            amount: offeredItem.amount
          });
        }
      }

      // Create the trade offer via Steam
      return await this.steamTradeService.createTradeOffer(tradeOffer);
    } catch (error) {
      console.error('Error creating Steam trade offer:', error);
      throw new Error('Failed to create Steam trade offer');
    }
  }

  private generateTradeId(): string {
    return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getTradeStatistics(steamId: string): Promise<{
    totalTrades: number;
    pendingTrades: number;
    completedTrades: number;
    failedTrades: number;
    successRate: number;
  }> {
    try {
      const totalTrades = await this.tradeRepository.count({
        where: [
          { senderSteamId: steamId },
          { recipientSteamId: steamId }
        ]
      });

      const pendingTrades = await this.tradeRepository.count({
        where: [
          { senderSteamId: steamId, status: TradeStatus.PENDING },
          { recipientSteamId: steamId, status: TradeStatus.PENDING }
        ]
      });

      const completedTrades = await this.tradeRepository.count({
        where: [
          { senderSteamId: steamId, status: TradeStatus.COMPLETED },
          { recipientSteamId: steamId, status: TradeStatus.COMPLETED }
        ]
      });

      const failedTrades = await this.tradeRepository.count({
        where: [
          { senderSteamId: steamId, status: In([TradeStatus.DECLINED, TradeStatus.EXPIRED, TradeStatus.FAILED]) },
          { recipientSteamId: steamId, status: In([TradeStatus.DECLINED, TradeStatus.EXPIRED, TradeStatus.FAILED]) }
        ]
      });

      const successRate = totalTrades > 0 ? (completedTrades / totalTrades) * 100 : 0;

      return {
        totalTrades,
        pendingTrades,
        completedTrades,
        failedTrades,
        successRate: Math.round(successRate * 100) / 100
      };
    } catch (error) {
      console.error('Error getting trade statistics:', error);
      return {
        totalTrades: 0,
        pendingTrades: 0,
        completedTrades: 0,
        failedTrades: 0,
        successRate: 0
      };
    }
  }
}