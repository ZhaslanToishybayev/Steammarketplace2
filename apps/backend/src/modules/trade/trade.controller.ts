import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SteamAuthGuard } from '../../auth/guards/steam-auth.guard';
import { TradeService } from '../services/trade.service';
import { CreateTradeOfferDto, AcceptTradeOfferDto, DeclineTradeOfferDto, CancelTradeOfferDto, GetTradeOffersDto } from '../dto/create-trade-offer.dto';

@ApiTags('Trade')
@Controller('trades')
export class TradeController {
  constructor(private tradeService: TradeService) {}

  @ApiOperation({ summary: 'Create a new trade offer' })
  @ApiResponse({ status: 201, description: 'Trade offer created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiBearerAuth()
  @Post()
  @UseGuards(SteamAuthGuard)
  async createTradeOffer(@Body() createTradeDto: CreateTradeOfferDto, @Request() req) {
    try {
      const userId = req.user.id;
      const trade = await this.tradeService.createTradeOffer(userId, createTradeDto);

      return {
        success: true,
        message: 'Trade offer created successfully',
        data: trade,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.constructor.name,
      };
    }
  }

  @ApiOperation({ summary: 'Get trade offer by ID' })
  @ApiResponse({ status: 200, description: 'Trade offer retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Trade offer not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiBearerAuth()
  @Get(':tradeId')
  @UseGuards(SteamAuthGuard)
  async getTradeOffer(@Param('tradeId') tradeId: string, @Request() req) {
    try {
      const userId = req.user.id;
      const trade = await this.tradeService.getTradeOffer(tradeId, userId);

      return {
        success: true,
        data: trade,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.constructor.name,
      };
    }
  }

  @ApiOperation({ summary: 'Get user trade offers' })
  @ApiResponse({ status: 200, description: 'Trade offers retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiBearerAuth()
  @ApiQuery({ name: 'status', required: false, description: 'Filter by trade status' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by type (sent/received)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results per page' })
  @ApiQuery({ name: 'offset', required: false, description: 'Pagination offset' })
  @Get()
  @UseGuards(SteamAuthGuard)
  async getUserTrades(
    @Query() query: GetTradeOffersDto,
    @Request() req,
  ) {
    try {
      const userId = req.user.id;
      const {
        status,
        type,
        limit = 50,
        offset = 0,
      } = query;

      const result = await this.tradeService.getUserTrades(
        userId,
        status as any,
        type,
        parseInt(limit as any, 10),
        parseInt(offset as any, 10),
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.constructor.name,
      };
    }
  }

  @ApiOperation({ summary: 'Accept a trade offer' })
  @ApiResponse({ status: 200, description: 'Trade offer accepted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 404, description: 'Trade offer not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiBearerAuth()
  @Put(':tradeId/accept')
  @UseGuards(SteamAuthGuard)
  async acceptTradeOffer(
    @Param('tradeId') tradeId: string,
    @Body() acceptDto: AcceptTradeOfferDto,
    @Request() req,
  ) {
    try {
      const userId = req.user.id;
      const trade = await this.tradeService.acceptTradeOffer(tradeId, userId);

      return {
        success: true,
        message: 'Trade offer accepted successfully',
        data: trade,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.constructor.name,
      };
    }
  }

  @ApiOperation({ summary: 'Decline a trade offer' })
  @ApiResponse({ status: 200, description: 'Trade offer declined successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 404, description: 'Trade offer not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiBearerAuth()
  @Put(':tradeId/decline')
  @UseGuards(SteamAuthGuard)
  async declineTradeOffer(
    @Param('tradeId') tradeId: string,
    @Body() declineDto: DeclineTradeOfferDto,
    @Request() req,
  ) {
    try {
      const userId = req.user.id;
      const trade = await this.tradeService.declineTradeOffer(tradeId, userId);

      return {
        success: true,
        message: 'Trade offer declined successfully',
        data: trade,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.constructor.name,
      };
    }
  }

  @ApiOperation({ summary: 'Cancel a trade offer' })
  @ApiResponse({ status: 200, description: 'Trade offer cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 404, description: 'Trade offer not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiBearerAuth()
  @Delete(':tradeId')
  @UseGuards(SteamAuthGuard)
  async cancelTradeOffer(
    @Param('tradeId') tradeId: string,
    @Body() cancelDto: CancelTradeOfferDto,
    @Request() req,
  ) {
    try {
      const userId = req.user.id;
      const trade = await this.tradeService.cancelTradeOffer(tradeId, userId);

      return {
        success: true,
        message: 'Trade offer cancelled successfully',
        data: trade,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.constructor.name,
      };
    }
  }

  @ApiOperation({ summary: 'Get trade statistics' })
  @ApiResponse({ status: 200, description: 'Trade statistics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiBearerAuth()
  @Get('stats')
  @UseGuards(SteamAuthGuard)
  async getTradeStatistics(@Request() req) {
    try {
      const userId = req.user.id;
      const trades = await this.tradeService.getUserTrades(userId);

      const stats = {
        totalTrades: trades.total,
        activeTrades: trades.stats.active,
        completedTrades: trades.stats.completed,
        successRate: trades.stats.completed > 0
          ? ((trades.stats.completed / trades.total) * 100).toFixed(2) + '%'
          : '0.00%',
        byStatus: {
          pending: trades.stats.pending,
          accepted: 0, // Would need to count from database
          declined: 0,
          cancelled: 0,
        },
        recentActivity: trades.trades.slice(0, 5), // Last 5 trades
      };

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.constructor.name,
      };
    }
  }

  @ApiOperation({ summary: 'Create counter offer' })
  @ApiResponse({ status: 201, description: 'Counter offer created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 404, description: 'Trade offer not found' })
  @ApiBearerAuth()
  @Post(':tradeId/counter')
  @UseGuards(SteamAuthGuard)
  async createCounterOffer(
    @Param('tradeId') tradeId: string,
    @Body() createTradeDto: CreateTradeOfferDto,
    @Request() req,
  ) {
    try {
      const userId = req.user.id;

      // First get the original trade to validate
      const originalTrade = await this.tradeService.getTradeOffer(tradeId, userId);

      // Create counter offer
      const counterOffer = await this.tradeService.createTradeOffer(userId, {
        ...createTradeDto,
        targetSteamId: originalTrade.senderId === userId ? originalTrade.targetSteamId : originalTrade.senderId,
        type: 'counter_offer',
        parentTradeId: tradeId,
      });

      return {
        success: true,
        message: 'Counter offer created successfully',
        data: counterOffer,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.constructor.name,
      };
    }
  }

  @ApiOperation({ summary: 'Get trade history' })
  @ApiResponse({ status: 200, description: 'Trade history retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiBearerAuth()
  @Get('history/:steamId')
  @UseGuards(SteamAuthGuard)
  async getTradeHistory(
    @Param('steamId') targetSteamId: string,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
    @Request() req,
  ) {
    try {
      const userId = req.user.id;

      // Only allow users to view their own trade history or public trade history
      if (req.user.steamId !== targetSteamId) {
        // Could implement privacy settings here
        return {
          success: false,
          message: 'Access denied to trade history',
        };
      }

      const result = await this.tradeService.getUserTrades(
        userId,
        undefined,
        undefined,
        parseInt(limit as any, 10),
        parseInt(offset as any, 10),
      );

      return {
        success: true,
        data: {
          trades: result.trades,
          total: result.total,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.constructor.name,
      };
    }
  }
}