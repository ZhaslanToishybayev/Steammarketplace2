import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TradeService } from './trade.service';
import { CreateTradeDto } from './dto/create-trade.dto';
import { User } from '../user/user.entity';

@Controller('trades')
@UseGuards(AuthGuard('steam'))
export class TradeController {
  constructor(private readonly tradeService: TradeService) {}

  @Post()
  async createTrade(
    @Body() createTradeDto: CreateTradeDto,
    @Query('user') user: User
  ) {
    try {
      const trade = await this.tradeService.createTrade({
        ...createTradeDto,
        senderSteamId: user.steamId
      });

      return {
        success: true,
        data: {
          id: trade.id,
          tradeId: trade.tradeId,
          senderSteamId: trade.senderSteamId,
          recipientSteamId: trade.recipientSteamId,
          type: trade.type,
          status: trade.status,
          offeredAmount: trade.offeredAmount,
          requestedAmount: trade.requestedAmount,
          offeredItemId: trade.offeredItemId,
          requestedItemId: trade.requestedItemId,
          message: trade.message,
          expiresAt: trade.expiresAt,
          createdAt: trade.createdAt
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get(':tradeId')
  async getTrade(
    @Param('tradeId') tradeId: string,
    @Query('user') user: User
  ) {
    try {
      const trade = await this.tradeService.getTradeById(tradeId, user.steamId);

      if (!trade) {
        return {
          success: false,
          error: 'Trade not found'
        };
      }

      return {
        success: true,
        data: {
          id: trade.id,
          tradeId: trade.tradeId,
          senderSteamId: trade.senderSteamId,
          recipientSteamId: trade.recipientSteamId,
          type: trade.type,
          status: trade.status,
          offeredAmount: trade.offeredAmount,
          requestedAmount: trade.requestedAmount,
          offeredItemId: trade.offeredItemId,
          requestedItemId: trade.requestedItemId,
          message: trade.message,
          senderConfirmed: trade.senderConfirmed,
          recipientConfirmed: trade.recipientConfirmed,
          expiresAt: trade.expiresAt,
          completedAt: trade.completedAt,
          cancelledAt: trade.cancelledAt,
          cancelledBy: trade.cancelledBy,
          errorMessage: trade.errorMessage,
          createdAt: trade.createdAt,
          updatedAt: trade.updatedAt,
          sender: {
            steamId: trade.sender.steamId,
            username: trade.sender.username,
            avatar: trade.sender.avatar
          },
          recipient: {
            steamId: trade.recipient.steamId,
            username: trade.recipient.username,
            avatar: trade.recipient.avatar
          },
          offeredItem: trade.offeredItem ? {
            id: trade.offeredItem.id,
            marketName: trade.offeredItem.marketName,
            marketHashName: trade.offeredItem.marketHashName,
            steamPrice: trade.offeredItem.steamPrice
          } : null,
          requestedItem: trade.requestedItem ? {
            id: trade.requestedItem.id,
            marketName: trade.requestedItem.marketName,
            marketHashName: trade.requestedItem.marketHashName,
            steamPrice: trade.requestedItem.steamPrice
          } : null
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get()
  async getUserTrades(
    @Query('status') status?: string,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
    @Query('user') user: User
  ) {
    try {
      const tradeStatus = status as any;
      const { trades, total } = await this.tradeService.getUserTrades(
        user.steamId,
        tradeStatus,
        limit,
        offset
      );

      return {
        success: true,
        data: {
          trades: trades.map(trade => ({
            id: trade.id,
            tradeId: trade.tradeId,
            senderSteamId: trade.senderSteamId,
            recipientSteamId: trade.recipientSteamId,
            type: trade.type,
            status: trade.status,
            offeredAmount: trade.offeredAmount,
            requestedAmount: trade.requestedAmount,
            offeredItemId: trade.offeredItemId,
            requestedItemId: trade.requestedItemId,
            message: trade.message,
            senderConfirmed: trade.senderConfirmed,
            recipientConfirmed: trade.recipientConfirmed,
            expiresAt: trade.expiresAt,
            completedAt: trade.completedAt,
            cancelledAt: trade.cancelledAt,
            errorMessage: trade.errorMessage,
            createdAt: trade.createdAt,
            updatedAt: trade.updatedAt,
            sender: {
              steamId: trade.sender.steamId,
              username: trade.sender.username,
              avatar: trade.sender.avatar
            },
            recipient: {
              steamId: trade.recipient.steamId,
              username: trade.recipient.username,
              avatar: trade.recipient.avatar
            },
            offeredItem: trade.offeredItem ? {
              id: trade.offeredItem.id,
              marketName: trade.offeredItem.marketName,
              marketHashName: trade.offeredItem.marketHashName,
              steamPrice: trade.offeredItem.steamPrice
            } : null,
            requestedItem: trade.requestedItem ? {
              id: trade.requestedItem.id,
              marketName: trade.requestedItem.marketName,
              marketHashName: trade.requestedItem.marketHashName,
              steamPrice: trade.requestedItem.steamPrice
            } : null
          })),
          total,
          hasMore: offset + limit < total
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Post(':tradeId/accept')
  async acceptTrade(
    @Param('tradeId') tradeId: string,
    @Query('user') user: User
  ) {
    try {
      const trade = await this.tradeService.acceptTrade(tradeId, user.steamId);

      return {
        success: true,
        data: {
          id: trade.id,
          tradeId: trade.tradeId,
          status: trade.status,
          recipientConfirmed: trade.recipientConfirmed,
          completedAt: trade.completedAt,
          updatedAt: trade.updatedAt
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Post(':tradeId/decline')
  async declineTrade(
    @Param('tradeId') tradeId: string,
    @Query('user') user: User
  ) {
    try {
      const trade = await this.tradeService.declineTrade(tradeId, user.steamId);

      return {
        success: true,
        data: {
          id: trade.id,
          tradeId: trade.tradeId,
          status: trade.status,
          updatedAt: trade.updatedAt
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Post(':tradeId/cancel')
  async cancelTrade(
    @Param('tradeId') tradeId: string,
    @Query('user') user: User
  ) {
    try {
      const trade = await this.tradeService.cancelTrade(tradeId, user.steamId);

      return {
        success: true,
        data: {
          id: trade.id,
          tradeId: trade.tradeId,
          status: trade.status,
          cancelledAt: trade.cancelledAt,
          cancelledBy: trade.cancelledBy,
          updatedAt: trade.updatedAt
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get(':tradeId/status')
  async getTradeStatus(
    @Param('tradeId') tradeId: string,
    @Query('user') user: User
  ) {
    try {
      const trade = await this.tradeService.getTradeById(tradeId, user.steamId);

      if (!trade) {
        return {
          success: false,
          error: 'Trade not found'
        };
      }

      let status = trade.status;

      // Check Steam API for updated status if it's a Steam trade offer
      if (trade.steamTradeOfferId) {
        status = await this.tradeService.checkTradeStatus(trade.steamTradeOfferId);
      }

      return {
        success: true,
        data: {
          tradeId: tradeId,
          status: status,
          steamTradeOfferId: trade.steamTradeOfferId,
          updatedAt: trade.updatedAt
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get('stats')
  async getTradeStatistics(
    @Query('user') user: User
  ) {
    try {
      const stats = await this.tradeService.getTradeStatistics(user.steamId);

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get('active/count')
  async getActiveTradesCount(
    @Query('user') user: User
  ) {
    try {
      const { trades } = await this.tradeService.getUserTrades(
        user.steamId,
        undefined,
        1000 // Large limit to get all active trades
      );

      const activeTrades = trades.filter(trade =>
        trade.status === 'pending' ||
        trade.status === 'accepted' ||
        trade.status === 'completed'
      );

      return {
        success: true,
        data: {
          activeTradesCount: activeTrades.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}