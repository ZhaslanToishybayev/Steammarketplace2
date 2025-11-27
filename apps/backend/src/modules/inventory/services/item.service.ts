import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Model, Types } from 'mongoose';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { PriceService } from '../../pricing/services/price.service';
import { Item, ItemDocument, ItemName } from '../schemas/item.schema';

export interface CreateItemDto {
  classId: string;
  instanceId: string;
  appId: number;
  name: string;
  marketName?: string;
  marketHashName?: string;
  type?: string;
  rarity?: string;
  quality?: string;
  iconUrl?: string;
  iconUrlLarge?: string;
  backgroundColor?: string;
  wear?: string;
  floatValue?: number;
  paintSeed?: number;
  paintIndex?: number;
  stickers?: any[];
  hero?: string;
  slot?: string;
  gems?: any[];
  inscribedGem?: any;
  craftable?: boolean;
  killstreak?: string;
  condition?: string;
  tradable?: boolean;
  marketable?: boolean;
  commodity?: boolean;
  tradableAfter?: Date;
  descriptions?: any[];
  tags?: any[];
  rawData?: any;
  lastUpdated?: Date;
}

export interface SearchItemsDto {
  appId?: number;
  name?: string;
  rarity?: string[];
  type?: string[];
  tradable?: boolean;
  marketable?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface ItemStatistics {
  totalItems: number;
  byAppId: Record<number, number>;
  byRarity: Record<string, number>;
  byType: Record<string, number>;
}

@Injectable()
export class ItemService {
  private readonly logger = new Logger(ItemService.name);
  private readonly cacheTtlSeconds: number;

  constructor(
    @InjectModel(Item.name) private itemModel: Model<ItemDocument>,
    private priceService: PriceService,
    @CACHE_MANAGER private cacheManager: Cache,
  ) {
    this.cacheTtlSeconds = 3600; // Default 1 hour
  }

  async createOrUpdateItem(itemData: CreateItemDto): Promise<ItemDocument> {
    try {
      const existingItem = await this.findByClassId(itemData.classId);

      if (existingItem && existingItem.lastUpdated && itemData.lastUpdated) {
        const existingDate = new Date(existingItem.lastUpdated);
        const newDataDate = new Date(itemData.lastUpdated);

        // Only update if data is newer
        if (newDataDate <= existingDate) {
          this.logger.debug(`Item ${itemData.classId} is already up to date`);
          return existingItem;
        }
      }

      const updateData = {
        ...itemData,
        lastUpdated: itemData.lastUpdated || new Date(),
        updatedAt: new Date(),
      };

      const item = await this.itemModel.findOneAndUpdate(
        { classId: itemData.classId },
        updateData,
        { upsert: true, new: true, runValidators: true }
      );

      // Invalidate cache
      await this.invalidateItemCache(itemData.classId);

      this.logger.debug(`Item ${itemData.classId} created/updated successfully`);
      return item;
    } catch (error) {
      this.logger.error(`Failed to create/update item ${itemData.classId}:`, error);
      throw error;
    }
  }

  async findByClassId(classId: string): Promise<ItemDocument | null> {
    try {
      // Check cache first
      const cacheKey = `item:${classId}`;
      const cachedItem = await this.cacheManager.get<ItemDocument>(cacheKey);

      if (cachedItem) {
        this.logger.debug(`Returning cached item ${classId}`);
        return cachedItem;
      }

      // Query database
      const item = await this.itemModel.findOne({ classId });

      if (item) {
        // Cache the result
        await this.cacheManager.set(cacheKey, item, this.cacheTtlSeconds);
        this.logger.debug(`Item ${classId} found in database`);
      }

      return item;
    } catch (error) {
      this.logger.error(`Failed to find item by classId ${classId}:`, error);
      return null;
    }
  }

  async findByClassIds(classIds: string[]): Promise<Map<string, ItemDocument>> {
    try {
      const resultMap = new Map<string, ItemDocument>();
      const notCachedClassIds: string[] = [];

      // Check cache for all items
      for (const classId of classIds) {
        const cacheKey = `item:${classId}`;
        const cachedItem = await this.cacheManager.get<ItemDocument>(cacheKey);

        if (cachedItem) {
          resultMap.set(classId, cachedItem);
        } else {
          notCachedClassIds.push(classId);
        }
      }

      // Query database for non-cached items
      if (notCachedClassIds.length > 0) {
        const dbItems = await this.itemModel.find({
          classId: { $in: notCachedClassIds }
        }).exec();

        // Add to result map and cache
        dbItems.forEach(item => {
          resultMap.set(item.classId, item);
          const cacheKey = `item:${item.classId}`;
          this.cacheManager.set(cacheKey, item, this.cacheTtlSeconds * 1000);
        });

        this.logger.debug(`Found ${dbItems.length} items in database, ${notCachedClassIds.length - dbItems.length} not found`);
      }

      return resultMap;
    } catch (error) {
      this.logger.error('Failed to find items by classIds:', error);
      return new Map();
    }
  }

  async searchItems(query: SearchItemsDto & PaginationDto): Promise<PaginatedResponse<ItemDocument>> {
    try {
      const {
        appId,
        name,
        rarity,
        type,
        tradable,
        marketable,
        minPrice,
        maxPrice,
        sortBy = 'name',
        sortOrder = 'ASC',
        page = 1,
        limit = 10
      } = query;

      // Build query filters
      const filters: any = {};

      if (appId) {
        filters.appId = appId;
      }

      if (name) {
        filters.name = { $regex: name, $options: 'i' };
      }

      if (rarity && rarity.length > 0) {
        filters.rarity = { $in: rarity };
      }

      if (type && type.length > 0) {
        filters.type = { $in: type };
      }

      if (tradable !== undefined) {
        filters.tradable = tradable;
      }

      if (marketable !== undefined) {
        filters.marketable = marketable;
      }

      // Price filtering with caching for performance
      if (minPrice !== undefined || maxPrice !== undefined) {
        try {
          // Get all items matching other filters first
          const baseItems = await this.itemModel.find(filters).exec();

          if (baseItems.length === 0) {
            // If no items match base filters, return empty result
            return {
              data: [],
              total: 0,
              page: 1,
              limit,
              totalPages: 0,
              hasNextPage: false,
              hasPrevPage: false,
            };
          }

          // Batch fetch prices for all items
          const pricePromises = baseItems.map(item => this.priceService.getItemPrice(item.classId, true).catch(error => {
            this.logger.debug(`Failed to get price for item ${item.classId}: ${error.message}`);
            return { adjustedPrice: 0 }; // Return 0 if price fetch fails
          }));

          const priceResults = await Promise.all(pricePromises);

          // Filter items based on price
          const filteredItems = baseItems.filter((item, index) => {
            const price = priceResults[index].adjustedPrice;
            let matches = true;

            if (minPrice !== undefined && price < minPrice) {
              matches = false;
            }

            if (maxPrice !== undefined && price > maxPrice) {
              matches = false;
            }

            return matches;
          });

          // Apply sorting to filtered items
          const sortField = sortBy as keyof ItemDocument;
          const sortedItems = filteredItems.sort((a, b) => {
            const aVal = a[sortField];
            const bVal = b[sortField];

            if (sortOrder === 'ASC') {
              return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            } else {
              return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
            }
          });

          // Apply pagination
          const total = sortedItems.length;
          const totalPages = Math.ceil(total / limit);
          const hasNextPage = page < totalPages;
          const hasPrevPage = page > 1;

          const startIndex = (page - 1) * limit;
          const endIndex = startIndex + limit;
          const paginatedItems = sortedItems.slice(startIndex, endIndex);

          this.logger.debug(`Price-filtered search returned ${paginatedItems.length} items out of ${total} total`);

          return {
            data: paginatedItems,
            total,
            page,
            limit,
            totalPages,
            hasNextPage,
            hasPrevPage,
          };
        } catch (error) {
          this.logger.error('Failed to apply price filtering:', error);
          // Fall back to non-price filtered results
          throw error;
        }
      }

      // Build sort object
      const sort: any = {};
      sort[sortBy] = sortOrder === 'ASC' ? 1 : -1;

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Get total count
      const total = await this.itemModel.countDocuments(filters);

      // Get items with pagination
      const items = await this.itemModel.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec();

      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      this.logger.debug(`Search returned ${items.length} items out of ${total} total`);

      return {
        data: items,
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPrevPage,
      };
    } catch (error) {
      this.logger.error('Failed to search items:', error);
      throw error;
    }
  }

  async getItemsByAppId(appId: number, pagination: PaginationDto): Promise<PaginatedResponse<ItemDocument>> {
    const cacheKey = `items:app:${appId}:page:${pagination.page}:limit:${pagination.limit}`;
    const cachedResult = await this.cacheManager.get<PaginatedResponse<ItemDocument>>(cacheKey);

    if (cachedResult) {
      this.logger.debug(`Returning cached items for app ${appId}, page ${pagination.page}`);
      return cachedResult;
    }

    const result = await this.searchItems({ appId, ...pagination });

    // Cache the result
    await this.cacheManager.set(cacheKey, result, this.cacheTtlSeconds);

    return result;
  }

  async updateItemMetadata(classId: string, metadata: Partial<CreateItemDto>): Promise<ItemDocument | null> {
    try {
      const updatedItem = await this.itemModel.findOneAndUpdate(
        { classId },
        {
          ...metadata,
          lastUpdated: new Date(),
          updatedAt: new Date(),
        },
        { new: true, runValidators: true }
      );

      if (updatedItem) {
        // Invalidate cache
        await this.invalidateItemCache(classId);
        this.logger.debug(`Item ${classId} metadata updated successfully`);
      }

      return updatedItem;
    } catch (error) {
      this.logger.error(`Failed to update item metadata for ${classId}:`, error);
      throw error;
    }
  }

  async deleteItem(classId: string): Promise<boolean> {
    try {
      const result = await this.itemModel.deleteOne({ classId });

      if (result.deletedCount > 0) {
        // Invalidate cache
        await this.invalidateItemCache(classId);
        this.logger.debug(`Item ${classId} deleted successfully`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Failed to delete item ${classId}:`, error);
      throw error;
    }
  }

  async getItemStatistics(appId?: number): Promise<ItemStatistics> {
    try {
      const cacheKey = appId ? `item_stats:app:${appId}` : 'item_stats:all';
      const cachedStats = await this.cacheManager.get<ItemStatistics>(cacheKey);

      if (cachedStats) {
        this.logger.debug(`Returning cached item statistics`);
        return cachedStats;
      }

      const matchStage: any = {};
      if (appId) {
        matchStage.appId = appId;
      }

      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalItems: { $sum: 1 },
            byAppId: {
              $push: {
                k: '$appId',
                v: 1
              }
            },
            byRarity: {
              $push: {
                k: '$rarity',
                v: 1
              }
            },
            byType: {
              $push: {
                k: '$type',
                v: 1
              }
            }
          }
        },
        {
          $addFields: {
            byAppId: { $reduce: { input: '$byAppId', initialValue: {}, in: { $mergeObjects: [{ $arrayToObject: [['$$this']] }, '$$value'] } } },
            byRarity: { $reduce: { input: '$byRarity', initialValue: {}, in: { $mergeObjects: [{ $arrayToObject: [['$$this']] }, '$$value'] } } },
            byType: { $reduce: { input: '$byType', initialValue: {}, in: { $mergeObjects: [{ $arrayToObject: [['$$this']] }, '$$value'] } } }
          }
        }
      ];

      const result = await this.itemModel.aggregate(pipeline).exec();

      let statistics: ItemStatistics;
      if (result.length > 0) {
        const stats = result[0];
        statistics = {
          totalItems: stats.totalItems,
          byAppId: stats.byAppId,
          byRarity: stats.byRarity,
          byType: stats.byType,
        };
      } else {
        statistics = {
          totalItems: 0,
          byAppId: {},
          byRarity: {},
          byType: {},
        };
      }

      // Cache for 1 hour
      await this.cacheManager.set(cacheKey, statistics, 3600);

      this.logger.debug('Item statistics calculated successfully');
      return statistics;
    } catch (error) {
      this.logger.error('Failed to calculate item statistics:', error);
      throw error;
    }
  }

  async invalidateItemCache(classId: string): Promise<void> {
    try {
      const cacheKey = `item:${classId}`;
      await this.cacheManager.del(cacheKey);

      // Also invalidate related cache keys (search results, statistics, etc.)
      // Note: In a production environment, you might want to use cache tags or patterns
      const patternKeys = [
        'item_stats:*',
        'items:app:*',
      ];

      // For simplicity, we'll just invalidate the main item cache
      // A more sophisticated approach would use Redis SCAN with patterns
      this.logger.debug(`Item cache invalidated for ${classId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate item cache for ${classId}:`, error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  async warmUpCache(appId: number): Promise<void> {
    try {
      this.logger.debug(`Warming up cache for app ${appId}`);

      // Get popular items (items with higher marketability and tradability)
      const popularItems = await this.itemModel.find(
        {
          appId,
          marketable: true,
          tradable: true,
        },
        null,
        { limit: 100, sort: { 'lastUpdated': -1 } }
      ).exec();

      // Cache individual items
      for (const item of popularItems) {
        const cacheKey = `item:${item.classId}`;
        await this.cacheManager.set(cacheKey, item, this.cacheTtlSeconds);
      }

      this.logger.debug(`Cache warmed up with ${popularItems.length} items for app ${appId}`);
    } catch (error) {
      this.logger.error(`Failed to warm up cache for app ${appId}:`, error);
    }
  }

  /**
   * Get all item IDs for a specific app (used for bulk price updates)
   */
  async getAllItemIdsByApp(appId: number): Promise<string[]> {
    try {
      const items = await this.itemModel.find(
        { appId },
        { classId: 1 } // Only return classId field
      ).exec();

      return items.map(item => item.classId);
    } catch (error) {
      this.logger.error(`Failed to get item IDs for app ${appId}:`, error);
      return [];
    }
  }

  /**
   * Bulk upsert items (used by seeder)
   * @param items Array of item data to upsert
   * @returns Number of items created/updated
   */
  async bulkUpsertItems(items: Partial<Item>[]): Promise<number> {
    let count = 0;
    for (const itemData of items) {
      try {
        await this.itemModel.updateOne(
          { classId: itemData.classId },
          { $set: itemData },
          { upsert: true }
        ).exec();
        count++;
      } catch (error) {
        this.logger.warn(`Failed to upsert item ${itemData.classId}: ${error.message}`);
      }
    }
    return count;
  }
}