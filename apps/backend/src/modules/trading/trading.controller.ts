import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  TooManyRequestsException,
  ServiceUnavailableException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { TradeService } from '../services/trade.service';
import { TradeValidationService } from '../services/trade-validation.service';
import { TradeStatus, TradeType } from '../entities/trade.entity';
import { CreateTradeDto, TradeItemDto } from '../dto/create-trade.dto';
import { GetTradesDto } from '../dto/get-trades.dto';
import { TradeResponseDto } from '../dto/trade-response.dto';
import {
  TradeException,
  TradeOfferException,
  BotOfflineException,
  InvalidTradeUrlException,
  EscrowException,
  TradeLimitExceededException,
  UserBannedException,
  TradeNotFoundException,
  TradeAlreadyProcessedException,
  TradeStatusException,
  TradeValidationException,
} from '../exceptions/trade.exception';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { User } from '../../auth/entities/user.entity';
import { TradeStatistics } from '../services/trade.service';

@ApiTags('Trades')
@Controller('trades')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TradingController {
  constructor(private readonly tradeService: TradeService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create new trade',
    description: 'Create a new trade offer with specified items. Supports deposit (items to bot), withdraw (items from bot), and P2P trades.'
  })
  @ApiBody({ type: CreateTradeDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Trade created successfully',
    type: TradeResponseDto
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid trade data, missing required fields, or validation failed'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User banned or insufficient permissions'
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'No bots available or bot offline'
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Trade limit exceeded'
  })
  async createTrade(
    @CurrentUser() user: User,
    @Body() createTradeDto: CreateTradeDto
  ): Promise<TradeResponseDto> {
    try {
      const trade = await this.tradeService.createTrade(user.id, createTradeDto);
      return trade;
    } catch (error) {
      if (error instanceof UserBannedException) {
        throw new ForbiddenException(error.message);
      } else if (error instanceof TradeLimitExceededException) {
        throw new TooManyRequestsException(error.message);
      } else if (error instanceof BotOfflineException) {
        throw new ServiceUnavailableException(error.message);
      } else if (error instanceof InvalidTradeUrlException) {
        throw new BadRequestException(error.message);
      } else if (error instanceof EscrowException) {
        throw new BadRequestException(error.message);
      } else if (error instanceof TradeValidationException) {
        throw new BadRequestException(error.message);
      } else {
        throw new InternalServerErrorException('Failed to create trade');
      }
    }
  }

  @Get()
  @ApiOperation({
    summary: 'Get user trades',
    description: 'Retrieve paginated trades for the authenticated user with optional filtering by status, type, date range, and more.'
  })
  @ApiQuery({ type: GetTradesDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trades retrieved successfully',
    type: PaginatedResponse<TradeResponseDto>
  })
  async getUserTrades(
    @CurrentUser() user: User,
    @Query() getTradesDto: GetTradesDto
  ): Promise<PaginatedResponse<TradeResponseDto>> {
    // Split filter fields from pagination fields
    const { status, type, botId, hasEscrow, dateFrom, dateTo, sortBy, sortOrder, page, limit, ...pagination } = getTradesDto;

    const filters = {
      status,
      type,
      botId,
      dateFrom,
      dateTo
    };

    const paginationParams = {
      page: page || 1,
      limit: limit || 10,
      ...pagination
    };

    return this.tradeService.getUserTrades(user.id, filters, paginationParams, {
      hasEscrow,
      sortBy,
      sortOrder
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get trade by ID',
    description: 'Retrieve detailed information about a specific trade by its ID.'
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Trade ID (UUID)'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trade found',
    type: TradeResponseDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Trade not found'
  })
  async getTradeById(
    @CurrentUser() user: User,
    @Param('id') tradeId: string
  ): Promise<TradeResponseDto> {
    try {
      const trade = await this.tradeService.getTradeById(tradeId);

      // Check if user owns this trade
      if (trade.userId !== user.id) {
        throw new ForbiddenException('You can only view your own trades');
      }

      return trade;
    } catch (error) {
      if (error instanceof TradeNotFoundException) {
        throw new NotFoundException(error.message);
      } else if (error instanceof ForbiddenException) {
        throw error;
      } else {
        throw new InternalServerErrorException('Failed to retrieve trade');
      }
    }
  }

  @Get(':id/status')
  @ApiOperation({
    summary: 'Get trade status',
    description: 'Retrieve current status and last update time for a specific trade.'
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Trade ID (UUID)'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trade status retrieved',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: Object.values(TradeStatus),
          description: 'Current trade status'
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          description: 'Last status update time'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Trade not found'
  })
  async getTradeStatus(
    @CurrentUser() user: User,
    @Param('id') tradeId: string
  ): Promise<{ status: TradeStatus; updatedAt: Date }> {
    try {
      const trade = await this.tradeService.getTradeById(tradeId);

      // Check if user owns this trade
      if (trade.userId !== user.id) {
        throw new ForbiddenException('You can only view your own trades');
      }

      return {
        status: trade.status,
        updatedAt: trade.updatedAt
      };
    } catch (error) {
      if (error instanceof TradeNotFoundException) {
        throw new NotFoundException(error.message);
      } else if (error instanceof ForbiddenException) {
        throw error;
      } else {
        throw new InternalServerErrorException('Failed to retrieve trade status');
      }
    }
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel trade',
    description: 'Cancel a pending or sent trade. Only the trade creator can cancel their trades.'
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Trade ID (UUID)'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trade cancelled successfully',
    type: TradeResponseDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Trade not found'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cannot cancel trade - not the creator or trade already processed'
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Trade already in a final state'
  })
  async cancelTrade(
    @CurrentUser() user: User,
    @Param('id') tradeId: string
  ): Promise<TradeResponseDto> {
    try {
      const trade = await this.tradeService.cancelTrade(tradeId, user.id);
      return trade;
    } catch (error) {
      if (error instanceof TradeNotFoundException) {
        throw new NotFoundException(error.message);
      } else if (error instanceof ForbiddenException) {
        throw error;
      } else if (error instanceof TradeAlreadyProcessedException) {
        throw new ConflictException(error.message);
      } else {
        throw new InternalServerErrorException('Failed to cancel trade');
      }
    }
  }

  @Get('statistics')
  @ApiOperation({
    summary: 'Get trade statistics',
    description: 'Retrieve trading statistics for the authenticated user including total trades, completion rate, and average values.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalTrades: {
          type: 'number',
          description: 'Total number of trades'
        },
        completedTrades: {
          type: 'number',
          description: 'Number of completed trades'
        },
        failedTrades: {
          type: 'number',
          description: 'Number of failed trades'
        },
        pendingTrades: {
          type: 'number',
          description: 'Number of pending trades'
        },
        totalValue: {
          type: 'number',
          description: 'Total value of completed trades'
        },
        averageTradeValue: {
          type: 'number',
          description: 'Average value per completed trade'
        }
      }
    }
  })
  async getTradeStatistics(
    @CurrentUser() user: User
  ): Promise<TradeStatistics> {
    return this.tradeService.getTradeStatistics(user.id);
  }

  @Get('admin/all')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Get all trades (Admin)',
    description: 'Retrieve all trades in the system with filtering options. Admin only endpoint.'
  })
  @ApiQuery({ type: GetTradesDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All trades retrieved successfully',
    type: PaginatedResponse<TradeResponseDto>
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required'
  })
  async getAllTrades(
    @CurrentUser() user: User,
    @Query() getTradesDto: GetTradesDto
  ): Promise<PaginatedResponse<TradeResponseDto>> {
    return this.tradeService.getAllTrades(getTradesDto);
  }

  @Post(':id/accept')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Accept trade (Admin)',
    description: 'Manually accept a trade offer. Admin only endpoint.'
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Trade ID (UUID)'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trade accepted successfully',
    type: TradeResponseDto
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required'
  })
  async acceptTrade(
    @CurrentUser() user: User,
    @Param('id') tradeId: string
  ): Promise<TradeResponseDto> {
    try {
      const trade = await this.tradeService.acceptTrade(tradeId);
      return trade;
    } catch (error) {
      if (error instanceof TradeException) {
        throw error;
      } else if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      } else if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      } else {
        throw new InternalServerErrorException('Failed to accept trade');
      }
    }
  }

  @Post(':id/decline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Decline trade (Admin)',
    description: 'Manually decline a trade offer. Admin only endpoint.'
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Trade ID (UUID)'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Reason for declining the trade'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trade declined successfully',
    type: TradeResponseDto
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required'
  })
  async declineTrade(
    @CurrentUser() user: User,
    @Param('id') tradeId: string,
    @Body('reason') reason?: string
  ): Promise<TradeResponseDto> {
    try {
      const trade = await this.tradeService.declineTrade(tradeId, reason);
      return trade;
    } catch (error) {
      if (error instanceof TradeException) {
        throw error;
      } else if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      } else if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      } else {
        throw new InternalServerErrorException('Failed to decline trade');
      }
    }
  }

  @Post(':id/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retry failed trade (Admin)',
    description: 'Retry a failed trade. Admin only endpoint.'
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Trade ID (UUID)'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trade retry scheduled successfully',
    type: TradeResponseDto
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required'
  })
  async retryTrade(
    @CurrentUser() user: User,
    @Param('id') tradeId: string
  ): Promise<TradeResponseDto> {
    try {
      const trade = await this.tradeService.resetAndRetryTrade(tradeId);
      return trade;
    } catch (error) {
      if (error instanceof TradeException) {
        throw error;
      } else if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      } else if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      } else {
        throw new InternalServerErrorException('Failed to retry trade');
      }
    }
  }
}