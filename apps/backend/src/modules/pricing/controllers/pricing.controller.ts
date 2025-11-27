import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  NotFoundException,
  BadRequestException,
  TooManyRequestsException,
  ServiceUnavailableException,
  InternalServerErrorException,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { Throttle } from '@nestjs/throttler';
import { CacheKey, CacheTTL, CacheInvalidate } from '../../common/decorators/cache-key.decorator';
import { CacheInterceptor } from '../../common/interceptors/cache.interceptor';
import { PriceService } from '../services/price.service';
import { TrendAnalysisService } from '../services/trend-analysis.service';
import { PriceCalculationService } from '../services/price-calculation.service';
import { ItemPriceResponse, ProfitMarginResult } from '../services/price.service';
import { CalculateProfitDto } from '../dto/calculate-profit.dto';
import { ProfitMarginResponseDto } from '../dto/calculate-profit.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { PriceHistoryDto } from '../dto/price-history.dto';
import { PriceHistoryQueryDto } from '../dto/price-history.dto';
import { MarketTrendDto } from '../dto/market-trend.dto';
import { VolatileItemDto } from '../dto/volatile-item.dto';
import { PopularItemDto } from '../dto/popular-item.dto';
import { PriceAnomalyDto } from '../dto/price-anomaly.dto';
import { MarketReportDto } from '../dto/market-report.dto';
import {
  PriceNotFoundException,
  PricingApiException,
  InvalidItemException,
  PriceCalculationException,
} from '../exceptions/pricing.exception';

@ApiTags('Pricing')
@Controller('pricing')
@UseGuards(JwtAuthGuard)
export class PricingController {
  constructor(
    private readonly priceService: PriceService,
    private readonly trendAnalysisService: TrendAnalysisService,
    private readonly priceCalculationService: PriceCalculationService,
  ) {}

  /**
   * Get current price for a specific item
   */
  @Get('item/:itemId')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('item-price')
  @CacheTTL(900) // 15 minutes
  @Throttle({ default: { limit: 10, window: 60000 } }) // 10 requests per minute for regular users
  @ApiOperation({ summary: 'Get current price for an item' })
  @ApiBearerAuth()
  @ApiParam({ name: 'itemId', type: 'string', description: 'Item ID (classId)' })
  @ApiResponse({ status: 200, description: 'Item price retrieved successfully', type: ItemPriceResponse })
  @ApiResponse({ status: 404, description: 'Item not found' })
  @ApiResponse({ status: 500, description: 'Failed to retrieve price' })
  async getItemPrice(
    @Param('itemId') itemId: string,
    @Query('useCache') useCache?: boolean,
  ): Promise<ItemPriceResponse> {
    try {
      const price = await this.priceService.getItemPrice(itemId, useCache !== 'false');
      return price;
    } catch (error) {
      if (error instanceof PriceNotFoundException) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof PricingApiException) {
        throw new ServiceUnavailableException('Failed to retrieve price from external APIs');
      }
      throw new InternalServerErrorException('Failed to retrieve item price');
    }
  }

  /**
   * Get price by market hash name (for items not in inventory)
   */
  @Get('item/by-name/:marketHashName')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('item-price-by-name')
  @CacheTTL(900) // 15 minutes
  @Throttle({ default: { limit: 10, window: 60000 } })
  @ApiOperation({ summary: 'Get price by market hash name' })
  @ApiBearerAuth()
  @ApiParam({ name: 'marketHashName', type: 'string', description: 'Market hash name' })
  @ApiQuery({ name: 'appId', type: 'number', description: 'Application ID', required: true })
  @ApiResponse({ status: 200, description: 'Item price retrieved successfully', type: ItemPriceResponse })
  @ApiResponse({ status: 400, description: 'Missing required appId parameter' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async getItemPriceByMarketHashName(
    @Param('marketHashName') marketHashName: string,
    @Query('appId') appId: number,
  ): Promise<ItemPriceResponse> {
    if (!appId) {
      throw new BadRequestException('appId parameter is required');
    }

    try {
      const price = await this.priceService.getItemPriceByMarketHashName(marketHashName, appId);
      return price;
    } catch (error) {
      if (error instanceof PriceNotFoundException) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof PricingApiException) {
        throw new ServiceUnavailableException('Failed to retrieve price from external APIs');
      }
      throw new InternalServerErrorException('Failed to retrieve item price');
    }
  }

  /**
   * Get price history for an item
   */
  @Get('history/:itemId')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('price-history')
  @CacheTTL(3600) // 1 hour
  @Throttle({ default: { limit: 20, window: 60000 } })
  @ApiOperation({ summary: 'Get price history for an item' })
  @ApiBearerAuth()
  @ApiParam({ name: 'itemId', type: 'string', description: 'Item ID (classId)' })
  @ApiQuery({ name: 'startDate', type: 'string', description: 'Start date (ISO format)', required: false })
  @ApiQuery({ name: 'endDate', type: 'string', description: 'End date (ISO format)', required: false })
  @ApiQuery({
    name: 'interval',
    enum: ['hour', 'day', 'week'],
    description: 'Time interval for aggregation',
    required: false,
    example: 'day'
  })
  @ApiResponse({ status: 200, description: 'Price history retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async getPriceHistory(
    @Param('itemId') itemId: string,
    @Query() query: PriceHistoryQueryDto,
  ): Promise<PriceHistoryDto[]> {
    try {
      const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = query.endDate ? new Date(query.endDate) : new Date();
      const interval = query.interval || 'day';

      const history = await this.priceService.getPriceHistory(itemId, startDate, endDate, interval);
      return history;
    } catch (error) {
      if (error instanceof PriceNotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw new InternalServerErrorException('Failed to retrieve price history');
    }
  }

  /**
   * Get market trends (top gainers/losers)
   */
  @Get('trends')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('market-trends')
  @CacheTTL(900) // 15 minutes
  @Throttle({ default: { limit: 15, window: 60000 } })
  @ApiOperation({ summary: 'Get market trends for an app' })
  @ApiBearerAuth()
  @ApiQuery({ name: 'appId', type: 'number', description: 'Application ID', required: true })
  @ApiResponse({ status: 200, description: 'Market trends retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Missing required appId parameter' })
  async getMarketTrends(
    @Query('appId') appId: number,
    @Query('limit') limit?: number,
  ): Promise<MarketTrendDto[]> {
    if (!appId) {
      throw new BadRequestException('appId parameter is required');
    }

    try {
      const trends = await this.priceService.getMarketTrends(appId, limit || 10);
      return trends;
    } catch (error) {
      throw new InternalServerErrorException('Failed to retrieve market trends');
    }
  }

  /**
   * Get volatile items for an app
   */
  @Get('volatile')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('volatile-items')
  @CacheTTL(900) // 15 minutes
  @Throttle({ default: { limit: 15, window: 60000 } })
  @ApiOperation({ summary: 'Get most volatile items for an app' })
  @ApiBearerAuth()
  @ApiQuery({ name: 'appId', type: 'number', description: 'Application ID', required: true })
  @ApiQuery({ name: 'limit', type: 'number', description: 'Number of items to return', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Volatile items retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Missing required appId parameter' })
  async getVolatileItems(
    @Query('appId') appId: number,
    @Query('limit') limit?: number,
  ): Promise<VolatileItemDto[]> {
    if (!appId) {
      throw new BadRequestException('appId parameter is required');
    }

    try {
      const volatileItems = await this.trendAnalysisService.getVolatileItems(appId, limit || 20);
      return volatileItems;
    } catch (error) {
      throw new InternalServerErrorException('Failed to retrieve volatile items');
    }
  }

  /**
   * Get popular items by trading volume
   */
  @Get('popular')
  @Throttle({ default: { limit: 15, window: 60000 } })
  @ApiOperation({ summary: 'Get most popular items by trading volume' })
  @ApiBearerAuth()
  @ApiQuery({ name: 'appId', type: 'number', description: 'Application ID', required: true })
  @ApiQuery({ name: 'limit', type: 'number', description: 'Number of items to return', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Popular items retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Missing required appId parameter' })
  async getPopularItems(
    @Query('appId') appId: number,
    @Query('limit') limit?: number,
  ): Promise<PopularItemDto[]> {
    if (!appId) {
      throw new BadRequestException('appId parameter is required');
    }

    try {
      const popularItems = await this.trendAnalysisService.getPopularItems(appId, limit || 20);
      return popularItems;
    } catch (error) {
      throw new InternalServerErrorException('Failed to retrieve popular items');
    }
  }

  /**
   * Calculate profit margin for a trade
   */
  @Post('calculate-profit')
  @Throttle({ default: { limit: 30, window: 60000 } })
  @ApiOperation({ summary: 'Calculate profit margin for a trade' })
  @ApiBearerAuth()
  @ApiBody({ type: CalculateProfitDto })
  @ApiResponse({ status: 200, description: 'Profit margin calculated successfully', type: ProfitMarginResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid trade data' })
  async calculateProfit(
    @Body() calculateProfitDto: CalculateProfitDto,
  ): Promise<ProfitMarginResponseDto> {
    try {
      const result = await this.priceCalculationService.calculateProfitMargin(
        calculateProfitDto.itemsToGive,
        calculateProfitDto.itemsToReceive,
      );

      return {
        totalGiveValue: result.totalGiveValue,
        totalReceiveValue: result.totalReceiveValue,
        profitMargin: result.profitMargin,
        profitPercentage: result.profitPercentage,
        itemsToGiveDetails: result.itemsToGiveDetails,
        itemsToReceiveDetails: result.itemsToReceiveDetails,
        calculatedAt: new Date(),
      };
    } catch (error) {
      if (error instanceof PriceCalculationException || error instanceof InvalidItemException) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to calculate profit margin');
    }
  }

  // Admin-only endpoints

  /**
   * Get price anomalies (Admin only)
   */
  @Get('anomalies')
  @Throttle({ default: { limit: 5, window: 60000 } })
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get price anomalies (Admin only)' })
  @ApiBearerAuth()
  @ApiQuery({ name: 'appId', type: 'number', description: 'Application ID', required: true })
  @ApiResponse({ status: 200, description: 'Price anomalies retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Missing required appId parameter' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getPriceAnomalies(
    @Query('appId') appId: number,
  ): Promise<PriceAnomalyDto[]> {
    if (!appId) {
      throw new BadRequestException('appId parameter is required');
    }

    try {
      const anomalies = await this.trendAnalysisService.detectPriceAnomalies(appId);
      return anomalies;
    } catch (error) {
      throw new InternalServerErrorException('Failed to detect price anomalies');
    }
  }

  /**
   * Generate market report (Admin only)
   */
  @Get('market-report')
  @Throttle({ default: { limit: 5, window: 60000 } })
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Generate comprehensive market report (Admin only)' })
  @ApiBearerAuth()
  @ApiQuery({ name: 'appId', type: 'number', description: 'Application ID', required: true })
  @ApiResponse({ status: 200, description: 'Market report generated successfully', type: MarketReportDto })
  @ApiResponse({ status: 400, description: 'Missing required appId parameter' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getMarketReport(
    @Query('appId') appId: number,
  ): Promise<MarketReportDto> {
    if (!appId) {
      throw new BadRequestException('appId parameter is required');
    }

    try {
      const report = await this.trendAnalysisService.generateMarketReport(appId);
      return report;
    } catch (error) {
      throw new InternalServerErrorException('Failed to generate market report');
    }
  }

  /**
   * Force refresh price for an item (Admin only)
   */
  @Post('refresh/:itemId')
  @CacheInvalidate(['item-price:{0.itemId}', 'item-price-by-name:*'])
  @Throttle({ default: { limit: 20, window: 60000 } })
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Force refresh price for an item (Admin only)' })
  @ApiBearerAuth()
  @ApiParam({ name: 'itemId', type: 'string', description: 'Item ID (classId)' })
  @ApiResponse({ status: 200, description: 'Price refresh initiated successfully' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async refreshItemPrice(
    @Param('itemId') itemId: string,
  ): Promise<{ success: true; message: string; itemId: string }> {
    try {
      // This would queue a job to update the price
      // For now, we'll call the service directly
      await this.priceService.updateItemPrice(itemId);
      return {
        success: true,
        message: 'Price refresh completed',
        itemId,
      };
    } catch (error) {
      if (error instanceof PriceNotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw new InternalServerErrorException('Failed to refresh item price');
    }
  }
}