import { Injectable, Logger, InjectRepository } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Item, ItemDocument } from '../../inventory/schemas/item.schema';
import { ItemPrice, PriceSource } from '../entities/item-price.entity';
import { PricingApiService } from './services/pricing-api.service';
import { PriceCalculationService } from './services/price-calculation.service';
import {
  PriceNotFoundException,
  PricingApiException
} from './exceptions/pricing.exception';
import { CacheKey, CacheTTL, CacheInvalidate } from '../../../common/decorators/cache-key.decorator';

export interface ItemPriceResponse {
  itemId: string;
  marketHashName: string;
  appId: number;
  basePrice: number;
  adjustedPrice: number;
  currency: string;
  source: string;
  volume?: number;
  lastUpdated: Date;
}

export interface PriceHistoryPoint {
  timestamp: Date;
  price: number;
  volume?: number;
}

@Injectable()
export class PriceService {
  private readonly logger = new Logger(PriceService.name);
  private readonly priceCacheTtl: number;
  private readonly priceHistoryCacheTtl: number;

  constructor(
    @InjectRepository(ItemPrice)
    private readonly itemPriceRepository: Repository<ItemPrice>,
    @InjectModel(Item.name)
    private readonly itemModel: Model<ItemDocument>,
    private readonly pricingApiService: PricingApiService,
    private readonly priceCalculationService: PriceCalculationService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.priceCacheTtl = parseInt(process.env.PRICING_CACHE_TTL_SECONDS || '1800'); // 30 minutes
    this.priceHistoryCacheTtl = parseInt(process.env.PRICE_HISTORY_CACHE_TTL_SECONDS || '3600'); // 1 hour
  }

  /**
   * Get current price for an item with caching and automatic updates
   */
  async getItemPrice(itemId: string, useCache: boolean = true): Promise<ItemPriceResponse> {
    try {
      // Find the item in MongoDB
      const item = await this.itemModel.findOne({ classId: itemId }).exec();
      if (!item) {
        throw new PriceNotFoundException(itemId, 0);
      }

      // Get latest price from database
      const latestPriceRecord = await this.itemPriceRepository.findOne({
        where: { itemId },
        order: { priceDate: 'DESC' },
      });

      let shouldUpdate = true;
      if (latestPriceRecord) {
        const timeSinceLastUpdate = Date.now() - latestPriceRecord.priceDate.getTime();
        shouldUpdate = timeSinceLastUpdate > staleThreshold;
      }

      let priceResponse: ItemPriceResponse;

      if (shouldUpdate || !latestPriceRecord) {
        // Fetch fresh price from external APIs
        priceResponse = await this.updateItemPriceFromApis(item);
        this.logger.debug(`Updated price for ${itemId}: $${priceResponse.adjustedPrice}`);
      } else {
        // Use cached database price
        priceResponse = {
          itemId,
          marketHashName: item.marketHashName,
          appId: item.appId,
          basePrice: latestPriceRecord.price,
          adjustedPrice: latestPriceRecord.price, // Will be recalculated below
          currency: latestPriceRecord.currency || 'USD',
          source: latestPriceRecord.source,
          volume: latestPriceRecord.volume,
          lastUpdated: latestPriceRecord.priceDate instanceof Date
            ? latestPriceRecord.priceDate
            : new Date(latestPriceRecord.priceDate),
        };

        // Apply current adjustments even if using cached base price
        try {
          priceResponse.adjustedPrice = await this.priceCalculationService.calculateItemPrice(itemId, priceResponse.basePrice);
        } catch (calcError) {
          this.logger.warn(`Price calculation failed for ${itemId}, using base price: ${calcError.message}`);
        }
      }

      return priceResponse;
    } catch (error) {
      if (error instanceof PriceNotFoundException) {
        throw error;
      }
      throw new PricingApiException(`Failed to get item price: ${error.message}`, 500, { itemId });
    }
  }

  /**
   * Get price by market hash name (for items not in inventory yet)
   */
  async getItemPriceByMarketHashName(marketHashName: string, appId: number): Promise<ItemPriceResponse> {
    try {
      // Try to find existing item first
      const item = await this.itemModel.findOne({ marketHashName }).exec();

      // Get aggregated price from APIs
      const aggregatedPrice = await this.pricingApiService.getAggregatedPrice(marketHashName, appId);

      // Calculate adjusted price if we have the item
      let adjustedPrice = aggregatedPrice.basePrice;
      if (item) {
        try {
          adjustedPrice = await this.priceCalculationService.calculateItemPrice(item.classId, aggregatedPrice.basePrice);
        } catch (calcError) {
          this.logger.warn(`Price calculation failed for ${marketHashName}, using base price: ${calcError.message}`);
        }
      }

      const priceResponse: ItemPriceResponse = {
        itemId: item?.classId || marketHashName,
        marketHashName,
        appId,
        basePrice: aggregatedPrice.basePrice,
        adjustedPrice,
        currency: 'USD',
        source: aggregatedPrice.source,
        volume: aggregatedPrice.volume,
        lastUpdated: new Date(),
      };

      // Save price record to database
      await this.savePriceRecord({
        itemId: item?.classId || marketHashName,
        marketHashName,
        appId,
        price: aggregatedPrice.basePrice,
        source: aggregatedPrice.source,
        volume: aggregatedPrice.volume,
        lowestPrice: aggregatedPrice.lowestPrice,
        medianPrice: aggregatedPrice.medianPrice,
        highestPrice: aggregatedPrice.highestPrice,
        metadata: aggregatedPrice.metadata,
      });

      return priceResponse;
    } catch (error) {
      if (error instanceof PriceNotFoundException) {
        throw error;
      }
      throw new PricingApiException(`Failed to get price by market hash name: ${error.message}`, 500, { marketHashName, appId });
    }
  }

  /**
   * Get price history for an item
   */
  async getPriceHistory(
    itemId: string,
    startDate: Date,
    endDate: Date,
    interval: 'hour' | 'day' | 'week' = 'day'
  ): Promise<PriceHistoryPoint[]> {
    try {
      // Query price history from database
      let groupByClause: string;
      switch (interval) {
        case 'hour':
          groupByClause = 'DATE_TRUNC(\'hour\', "priceDate")';
          break;
        case 'week':
          groupByClause = 'DATE_TRUNC(\'week\', "priceDate")';
          break;
        case 'day':
        default:
          groupByClause = 'DATE_TRUNC(\'day\', "priceDate")';
          break;
      }

      const history = await this.itemPriceRepository
        .createQueryBuilder('ip')
        .select(`${groupByClause}, AVG(ip.price), MAX(ip.priceDate)`)
        .addSelect('SUM(ip.volume)', 'totalVolume')
        .where('ip.itemId = :itemId', { itemId })
        .andWhere('ip.priceDate >= :startDate', { startDate })
        .andWhere('ip.priceDate <= :endDate', { endDate })
        .groupBy(groupByClause)
        .orderBy(`${groupByClause}`, 'ASC')
        .getRawMany();

      const priceHistory: PriceHistoryPoint[] = history.map(row => ({
        timestamp: new Date(row.date_trunc),
        price: parseFloat(row.avg),
        volume: parseInt(row.totalvolume) || undefined,
      }));

      return priceHistory;
    } catch (error) {
      throw new PricingApiException(`Failed to get price history: ${error.message}`, 500, { itemId, startDate, endDate, interval });
    }
  }

  /**
   * Get market trends for an app (top gainers/losers)
   */
  async getMarketTrends(appId: number, limit: number = 10): Promise<any[]> {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get current prices and prices from 24h/7d ago
      const currentPrices = await this.itemPriceRepository
        .createQueryBuilder('ip')
        .select('ip.itemId, ip.marketHashName, MAX(ip.price), MAX(ip.priceDate)')
        .where('ip.appId = :appId', { appId })
        .andWhere('ip.priceDate >= :oneDayAgo', { oneDayAgo })
        .groupBy('ip.itemId, ip.marketHashName')
        .getRawMany();

      const trends = [];

      for (const currentPriceRow of currentPrices) {
        const itemId = currentPriceRow.ip_item_id;
        const marketHashName = currentPriceRow.ip_market_hash_name;
        const currentPrice = parseFloat(currentPriceRow.max);

        // Get price from 24h ago
        const price24hAgo = await this.itemPriceRepository
          .createQueryBuilder('ip')
          .select('ip.price')
          .where('ip.itemId = :itemId', { itemId })
          .andWhere('ip.priceDate <= :oneDayAgo', { oneDayAgo })
          .orderBy('ip.priceDate', 'DESC')
          .getOne();

        // Get price from 7d ago
        const price7dAgo = await this.itemPriceRepository
          .createQueryBuilder('ip')
          .select('ip.price')
          .where('ip.itemId = :itemId', { itemId })
          .andWhere('ip.priceDate <= :sevenDaysAgo', { sevenDaysAgo })
          .orderBy('ip.priceDate', 'DESC')
          .getOne();

        const priceChange24h = price24hAgo ? currentPrice - parseFloat(price24hAgo.price) : 0;
        const priceChangePercent24h = price24hAgo ? (priceChange24h / parseFloat(price24hAgo.price)) * 100 : 0;

        const priceChange7d = price7dAgo ? currentPrice - parseFloat(price7dAgo.price) : 0;
        const priceChangePercent7d = price7dAgo ? (priceChange7d / parseFloat(price7dAgo.price)) * 100 : 0;

        // Get item info
        const item = await this.itemModel.findOne({ classId: itemId }).exec();

        trends.push({
          itemId,
          marketHashName,
          name: item?.name || marketHashName,
          iconUrl: item?.iconUrl,
          currentPrice,
          priceChange24h,
          priceChangePercent24h,
          priceChange7d,
          priceChangePercent7d,
          volume: currentPriceRow.volume || 0,
          trend: priceChange24h >= 0 ? 'rising' : 'falling',
        });
      }

      // Sort by 24h change percentage and limit results
      const sortedTrends = trends
        .sort((a, b) => Math.abs(b.priceChangePercent24h) - Math.abs(a.priceChangePercent24h))
        .slice(0, limit);

      return sortedTrends;
    } catch (error) {
      throw new PricingApiException(`Failed to get market trends: ${error.message}`, 500, { appId, limit });
    }
  }

  /**
   * Force update price for a specific item
   */
  @CacheInvalidate(['item_price:{itemId}', 'market_trends:*'])
  async updateItemPrice(itemId: string): Promise<void> {
    try {
      const item = await this.itemModel.findOne({ classId: itemId }).exec();
      if (!item) {
        throw new PriceNotFoundException(itemId, 0);
      }

      await this.updateItemPriceFromApis(item);
    } catch (error) {
      if (error instanceof PriceNotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update price for ${itemId}: ${error.message}`);
      throw new PricingApiException(`Failed to update item price: ${error.message}`, 500, { itemId });
    }
  }

  /**
   * Bulk update prices for multiple items
   */
  async bulkUpdatePrices(itemIds: string[]): Promise<void> {
    const concurrency = 5; // Process 5 items at a time
    const batches = [];

    // Create batches
    for (let i = 0; i < itemIds.length; i += concurrency) {
      batches.push(itemIds.slice(i, i + concurrency));
    }

    // Process batches sequentially
    for (const batch of batches) {
      await Promise.allSettled(
        batch.map(itemId => this.updateItemPrice(itemId).catch(error => {
          this.logger.error(`Failed to update price for ${itemId}: ${error.message}`);
        }))
      );

      // Wait between batches to avoid overwhelming APIs
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * Update item price from external APIs and save to database
   */
  private async updateItemPriceFromApis(item: Item): Promise<ItemPriceResponse> {
    try {
      // Get aggregated price from external APIs
      const aggregatedPrice = await this.pricingApiService.getAggregatedPrice(item.marketHashName, item.appId);

      // Calculate adjusted price based on item attributes
      const adjustedPrice = await this.priceCalculationService.calculateItemPrice(item.classId, aggregatedPrice.basePrice);

      // Save price record to database
      await this.savePriceRecord({
        itemId: item.classId,
        marketHashName: item.marketHashName,
        appId: item.appId,
        price: aggregatedPrice.basePrice,
        source: aggregatedPrice.source,
        volume: aggregatedPrice.volume,
        lowestPrice: aggregatedPrice.lowestPrice,
        medianPrice: aggregatedPrice.medianPrice,
        highestPrice: aggregatedPrice.highestPrice,
        metadata: aggregatedPrice.metadata,
      });

      return {
        itemId: item.classId,
        marketHashName: item.marketHashName,
        appId: item.appId,
        basePrice: aggregatedPrice.basePrice,
        adjustedPrice,
        currency: 'USD',
        source: aggregatedPrice.source,
        volume: aggregatedPrice.volume,
        lastUpdated: new Date(),
      };
    } catch (error) {
      // If API update fails, try to return the last known price
      const latestPriceRecord = await this.itemPriceRepository.findOne({
        where: { itemId: item.classId },
        order: { priceDate: 'DESC' },
      });

      if (latestPriceRecord) {
        this.logger.warn(`API update failed for ${item.classId}, returning cached price: ${error.message}`);
        return {
          itemId: item.classId,
          marketHashName: item.marketHashName,
          appId: item.appId,
          basePrice: latestPriceRecord.price,
          adjustedPrice: latestPriceRecord.price,
          currency: latestPriceRecord.currency || 'USD',
          source: latestPriceRecord.source,
          volume: latestPriceRecord.volume,
          lastUpdated: latestPriceRecord.priceDate,
        };
      }

      throw error;
    }
  }

  /**
   * Save price record to database
   */
  public async savePriceRecord(data: {
    itemId: string;
    marketHashName: string;
    appId: number;
    price: number;
    source: PriceSource;
    volume?: number;
    lowestPrice?: number;
    medianPrice?: number;
    highestPrice?: number;
    metadata?: any;
  }): Promise<void> {
    const priceRecord = this.itemPriceRepository.create({
      ...data,
      priceDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    try {
      await this.itemPriceRepository.save(priceRecord);
    } catch (error) {
      this.logger.error(`Failed to save price record for ${data.itemId}: ${error.message}`);
    }
  }
}