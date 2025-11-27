import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
  ServiceUnavailableException,
  TooManyRequestsException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { BotManagerService } from '../services/bot-manager.service';
import { SteamTradeService } from '../services/steam-trade.service';
import { TradeService } from '../services/trade.service';
import { CreateBotDto } from '../dto/create-bot.dto';
import { UpdateBotDto } from '../dto/update-bot.dto';
import { GetTradesDto } from '../dto/get-trades.dto';
import { BotResponseDto } from '../dto/bot-response.dto';
import { TradeResponseDto } from '../dto/trade-response.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { User } from '../../auth/entities/user.entity';
import { BotStatus } from '../entities/bot.entity';
import { TradeStatus } from '../entities/trade.entity';

@ApiTags('Bots (Admin)')
@Controller('bots')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class BotController {
  constructor(
    private readonly botManagerService: BotManagerService,
    private readonly steamTradeService: SteamTradeService,
    private readonly tradeService: TradeService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Create new bot (Admin)',
    description: 'Add a new Steam bot account to the trading system. Requires admin privileges.'
  })
  @ApiBody({ type: CreateBotDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Bot created successfully',
    type: BotResponseDto
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required'
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Bot with this account name already exists'
  })
  async createBot(
    @CurrentUser() user: User,
    @Body() createBotDto: CreateBotDto
  ): Promise<BotResponseDto> {
    // Admin check would be handled by AdminGuard
    return this.botManagerService.createBot(createBotDto);
  }

  @Get()
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Get all bots (Admin)',
    description: 'Retrieve all bot accounts with optional filtering by status, online status, and activity.'
  })
  @ApiQuery({
    name: 'isActive',
    type: 'boolean',
    description: 'Filter by active bots',
    required: false
  })
  @ApiQuery({
    name: 'isOnline',
    type: 'boolean',
    description: 'Filter by online bots',
    required: false
  })
  @ApiQuery({
    name: 'status',
    enum: BotStatus,
    description: 'Filter by bot status',
    required: false
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bots retrieved successfully',
    type: [BotResponseDto]
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required'
  })
  async getAllBots(
    @CurrentUser() user: User,
    @Query('isActive') isActiveString?: string,
    @Query('isOnline') isOnlineString?: string,
    @Query('status') status?: BotStatus
  ): Promise<BotResponseDto[]> {
    // Admin check would be handled by AdminGuard
    const filters = {};
    if (isActiveString !== undefined) filters.isActive = isActiveString === 'true';
    if (isOnlineString !== undefined) filters.isOnline = isOnlineString === 'true';
    if (status) filters.status = status;

    return this.botManagerService.getAllBots(filters);
  }

  @Get(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Get bot by ID (Admin)',
    description: 'Retrieve detailed information about a specific bot account.'
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Bot ID (UUID)'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bot found',
    type: BotResponseDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Bot not found'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required'
  })
  async getBotById(
    @CurrentUser() user: User,
    @Param('id') botId: string
  ): Promise<BotResponseDto> {
    // Admin check would be handled by AdminGuard
    return this.botManagerService.getBotById(botId);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Update bot (Admin)',
    description: 'Update bot account information including credentials and settings.'
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Bot ID (UUID)'
  })
  @ApiBody({ type: UpdateBotDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bot updated successfully',
    type: BotResponseDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Bot not found'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required'
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid bot credentials or settings'
  })
  async updateBot(
    @CurrentUser() user: User,
    @Param('id') botId: string,
    @Body() updateBotDto: UpdateBotDto
  ): Promise<BotResponseDto> {
    // Admin check would be handled by AdminGuard
    try {
      return this.botManagerService.updateBot(botId, updateBotDto);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      } else if (error instanceof BadRequestException) {
        throw error;
      } else {
        throw new InternalServerErrorException('Failed to update bot');
      }
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Delete bot (Admin)',
    description: 'Remove a bot account from the trading system. This action cannot be undone.'
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Bot ID (UUID)'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bot deleted successfully'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Bot not found'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required'
  })
  async deleteBot(
    @CurrentUser() user: User,
    @Param('id') botId: string
  ): Promise<{ success: boolean }> {
    // Admin check would be handled by AdminGuard
    try {
      await this.botManagerService.deleteBot(botId);
      return { success: true };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      } else {
        throw new InternalServerErrorException('Failed to delete bot');
      }
    }
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Activate bot (Admin)',
    description: 'Activate a previously deactivated bot account.'
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Bot ID (UUID)'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bot activated successfully',
    type: BotResponseDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Bot not found'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required'
  })
  async activateBot(
    @CurrentUser() user: User,
    @Param('id') botId: string
  ): Promise<BotResponseDto> {
    // Admin check would be handled by AdminGuard
    try {
      return this.botManagerService.activateBot(botId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      } else {
        throw new InternalServerErrorException('Failed to activate bot');
      }
    }
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Deactivate bot (Admin)',
    description: 'Deactivate a bot account to prevent it from processing trades.'
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Bot ID (UUID)'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bot deactivated successfully',
    type: BotResponseDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Bot not found'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required'
  })
  async deactivateBot(
    @CurrentUser() user: User,
    @Param('id') botId: string
  ): Promise<BotResponseDto> {
    // Admin check would be handled by AdminGuard
    try {
      return this.botManagerService.deactivateBot(botId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      } else {
        throw new InternalServerErrorException('Failed to deactivate bot');
      }
    }
  }

  @Post(':id/login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Force bot login (Admin)',
    description: 'Manually trigger bot login to Steam. Useful for reconnecting offline bots.'
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Bot ID (UUID)'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bot login initiated successfully',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          description: 'Login operation started successfully'
        },
        isOnline: {
          type: 'boolean',
          description: 'Current online status of the bot'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Bot not found'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required'
  })
  async forceLoginBot(
    @CurrentUser() user: User,
    @Param('id') botId: string
  ): Promise<{ success: boolean; isOnline: boolean }> {
    try {
      // Get bot details
      const bot = await this.botManagerService.getBotById(botId);

      // Trigger forced login via SteamTradeService
      await this.steamTradeService.forceLoginBot(botId);

      // Get the latest bot state after login attempt
      const refreshedBot = await this.botManagerService.getBotById(botId);

      return {
        success: true,
        isOnline: refreshedBot.isOnline
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      } else {
        throw new InternalServerErrorException('Failed to force bot login');
      }
    }
  }

  @Get(':id/statistics')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Get bot statistics (Admin)',
    description: 'Retrieve detailed statistics for a specific bot including trade counts, uptime, and success rates.'
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Bot ID (UUID)'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bot statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalTradesCompleted: {
          type: 'number',
          description: 'Total number of completed trades'
        },
        currentTradeCount: {
          type: 'number',
          description: 'Current number of active trades'
        },
        maxConcurrentTrades: {
          type: 'number',
          description: 'Maximum concurrent trades allowed'
        },
        uptime: {
          type: 'number',
          description: 'Uptime in milliseconds'
        },
        successRate: {
          type: 'number',
          description: 'Success rate percentage'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Bot not found'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required'
  })
  async getBotStatistics(
    @CurrentUser() user: User,
    @Param('id') botId: string
  ): Promise<{
    totalTradesCompleted: number;
    currentTradeCount: number;
    maxConcurrentTrades: number;
    uptime: number;
    successRate: number;
  }> {
    // Admin check would be handled by AdminGuard
    try {
      return this.botManagerService.getBotStatistics(botId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      } else {
        throw new InternalServerErrorException('Failed to retrieve bot statistics');
      }
    }
  }

  @Get(':id/trades')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Get bot trades (Admin)',
    description: 'Retrieve all trades processed by a specific bot with optional filtering.'
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Bot ID (UUID)'
  })
  @ApiQuery({ type: GetTradesDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bot trades retrieved successfully',
    type: PaginatedResponse<TradeResponseDto>
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required'
  })
  async getBotTrades(
    @CurrentUser() user: User,
    @Param('id') botId: string,
    @Query() getTradesDto: GetTradesDto
  ): Promise<PaginatedResponse<TradeResponseDto>> {
    try {
      // Call tradeService.getBotTrades(botId, filters, pagination)
      const filters = {};
      if (getTradesDto.status) filters.status = getTradesDto.status;
      if (getTradesDto.type) filters.type = getTradesDto.type;
      if (getTradesDto.dateFrom) filters.dateFrom = getTradesDto.dateFrom;
      if (getTradesDto.dateTo) filters.dateTo = getTradesDto.dateTo;

      const pagination = {};
      if (getTradesDto.page) pagination.page = getTradesDto.page;
      if (getTradesDto.limit) pagination.limit = getTradesDto.limit;

      const extraFilters = {};
      if (getTradesDto.hasEscrow !== undefined) extraFilters.hasEscrow = getTradesDto.hasEscrow;
      if (getTradesDto.sortBy) extraFilters.sortBy = getTradesDto.sortBy;
      if (getTradesDto.sortOrder) extraFilters.sortOrder = getTradesDto.sortOrder;

      // Use getBotTrades with proper bot filtering
      const botTrades = await this.tradeService.getBotTrades(botId, filters, pagination, extraFilters);
      return botTrades;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      } else {
        throw new InternalServerErrorException('Failed to retrieve bot trades');
      }
    }
  }
}