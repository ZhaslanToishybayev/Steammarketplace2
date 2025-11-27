import { Injectable, Logger, Inject, forwardRef, CACHE_MANAGER } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThan, LessThan, QueryBuilder } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { SteamApiService } from './steam-api.service';
import { ItemService, CreateItemDto } from './item.service';
import { Inventory, SyncStatus } from '../entities/inventory.entity';
import { User } from '../../auth/entities/user.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { PrivateInventoryException } from '../exceptions/steam-api.exception';
import { CacheKey, CacheTTL, CacheInvalidate } from '../../../common/decorators/cache-key.decorator';
import { CacheInterceptor } from '../../../common/interceptors/cache.interceptor';

export interface GetInventoryOptions {
  appId?: number;
  tradable?: boolean;
  marketable?: boolean;
  rarity?: string[];
  type?: string[];
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

export interface SyncResult {
  success: boolean;
  itemsAdded: number;
  itemsUpdated: number;
  itemsRemoved: number;
  totalItems: number;
  syncedAt: Date;
  errors: string[];
  warnings: string[];
}

export interface InventoryStatistics {
  totalItems: number;
  byGame: Record<number, { appId: number; name: string; count: number }>;
  byRarity: Record<string, number>;
  byType: Record<string, number>;
  tradableCount: number;
  marketableCount: number;
  lastSyncedAt?: Date;
  syncStatus: Record<number, { appId: number; status: string; lastSyncedAt: Date }>;
}

export interface InventorySyncStatusDto {
  appId: number;
  lastSyncedAt: Date;
  syncStatus: SyncStatus;
  itemCount: number;
  syncError?: string;
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);
  private readonly cacheTtlSeconds: number;

  constructor(
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    @Inject(forwardRef(() => SteamApiService))
    private steamApiService: SteamApiService,
    private itemService: ItemService,
    @CACHE_MANAGER private cacheManager: Cache,
    private configService: ConfigService,
  ) {
    this.cacheTtlSeconds = this.configService.get<number>('INVENTORY_CACHE_TTL_SECONDS', 1800);
  }

  @CacheInvalidate(['inventory:{userId}', 'inventory-stats:{userId}'])
  async syncUserInventory(userId: string, steamId: string, appId: number): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      itemsAdded: 0,
      itemsUpdated: 0,
      itemsRemoved: 0,
      totalItems: 0,
      syncedAt: new Date(),
      errors: [],
      warnings: [],
    };

    try {
      this.logger.debug(`Starting inventory sync for user ${userId}, steamId ${steamId}, app ${appId}`);

      // Mark sync as pending
      await this.markSyncPending(userId, appId);

      // Get inventory from Steam API
      const inventoryData = await this.steamApiService.getUserInventory(steamId, appId);

      if (!inventoryData.assets || !inventoryData.descriptions) {
        throw new Error('Invalid inventory data received from Steam API');
      }

      // Create a map of existing inventory items for comparison
      const existingItems = await this.inventoryRepository.find({
        where: { userId, appId },
        relations: ['user'],
      });

      const existingAssetMap = new Map(existingItems.map(item => [item.assetId, item]));

      // Process items from Steam API
      const processedAssetIds: string[] = [];
      const itemPromises: Promise<void>[] = [];

      for (const asset of inventoryData.assets) {
        const description = inventoryData.descriptions.find(
          desc => desc.classid === asset.classid && desc.instanceid === asset.instanceid
        );

        if (!description) {
          result.warnings.push(`No description found for asset ${asset.assetid}`);
          continue;
        }

        processedAssetIds.push(asset.assetid);

        itemPromises.push(
          this.processInventoryItem(userId, asset, description, appId, existingAssetMap)
        );
      }

      // Wait for all item processing to complete
      await Promise.all(itemPromises);

      // Find items that need to be removed (no longer in Steam inventory)
      const itemsToRemove = existingItems.filter(
        item => !processedAssetIds.includes(item.assetId)
      );

      if (itemsToRemove.length > 0) {
        await this.inventoryRepository.remove(itemsToRemove);
        result.itemsRemoved = itemsToRemove.length;
        this.logger.debug(`Removed ${itemsToRemove.length} items no longer in Steam inventory`);
      }

      // Update sync status
      await this.markSyncCompleted(userId, appId, null);

      // Invalidate cache
      await this.invalidateUserInventoryCache(userId, appId);

      // Get final count
      const finalCount = await this.inventoryRepository.count({
        where: { userId, appId }
      });

      result.success = true;
      result.totalItems = finalCount;
      result.syncedAt = new Date();

      this.logger.debug(`Inventory sync completed for user ${userId}: ${result.itemsAdded} added, ${result.itemsUpdated} updated, ${result.itemsRemoved} removed`);

      return result;
    } catch (error) {
      await this.markSyncFailed(userId, appId, error.message);
      result.errors.push(error.message);

      if (error instanceof PrivateInventoryException) {
        result.warnings.push('User inventory is private');
      }

      this.logger.error(`Failed to sync inventory for user ${userId}:`, error);
      return result;
    }
  }

  private async processInventoryItem(
    userId: string,
    asset: any,
    description: any,
    appId: number,
    existingAssetMap: Map<string, Inventory>
  ): Promise<void> {
    const existingItem = existingAssetMap.get(asset.assetid);

    // Parse item metadata
    const itemMetadata = this.steamApiService.parseItemMetadata(asset, description, appId);

    // Create or update item in MongoDB
    const itemDto: CreateItemDto = {
      classId: itemMetadata.classId,
      instanceId: itemMetadata.instanceId,
      appId: itemMetadata.appId,
      name: itemMetadata.name,
      marketName: itemMetadata.marketName,
      marketHashName: itemMetadata.marketHashName,
      type: itemMetadata.type,
      rarity: itemMetadata.rarity,
      quality: itemMetadata.quality,
      iconUrl: itemMetadata.iconUrl,
      iconUrlLarge: itemMetadata.iconUrlLarge,
      backgroundColor: itemMetadata.backgroundColor,
      wear: itemMetadata.wear,
      floatValue: itemMetadata.floatValue,
      paintSeed: itemMetadata.paintSeed,
      paintIndex: itemMetadata.paintIndex,
      stickers: itemMetadata.stickers,
      hero: itemMetadata.hero,
      slot: itemMetadata.slot,
      gems: itemMetadata.gems,
      craftable: itemMetadata.craftable,
      killstreak: itemMetadata.killstreak,
      condition: itemMetadata.condition,
      tradable: itemMetadata.tradable,
      marketable: itemMetadata.marketable,
      commodity: itemMetadata.commodity,
      descriptions: itemMetadata.descriptions,
      tags: itemMetadata.tags,
      rawData: itemMetadata.rawData,
      lastUpdated: new Date(),
    };

    await this.itemService.createOrUpdateItem(itemDto);

    // Create or update inventory record in PostgreSQL
    const inventoryData = {
      userId,
      itemId: itemMetadata.classId, // Using classId as itemId for simplicity
      assetId: asset.assetid,
      classId: asset.classid,
      instanceId: asset.instanceid,
      appId,
      contextId: '2',
      amount: parseInt(asset.amount || '1'),
      tradable: itemMetadata.tradable,
      marketable: itemMetadata.marketable,
      commodity: itemMetadata.commodity,
      lastSyncedAt: new Date(),
      syncStatus: SyncStatus.SYNCED,
      syncError: null,
    };

    if (existingItem) {
      // Update existing item
      await this.inventoryRepository.update(existingItem.id, inventoryData);
      this.logger.debug(`Updated inventory item ${asset.assetid}`);
    } else {
      // Create new item
      const newInventory = this.inventoryRepository.create(inventoryData);
      await this.inventoryRepository.save(newInventory);
      this.logger.debug(`Created new inventory item ${asset.assetid}`);
    }
  }

  async getUserInventory(
    userId: string,
    appId?: number,
    options: GetInventoryOptions = {}
  ): Promise<PaginatedResponse<any>> {
    try {
      const {
        tradable,
        marketable,
        rarity,
        type,
        search,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
        page = 1,
        limit = 10
      } = options;

      // Build query with optimized QueryBuilder
      const queryBuilder = this.inventoryRepository.createQueryBuilder('inventory')
        .where('inventory.userId = :userId', { userId });

      if (appId) {
        queryBuilder.andWhere('inventory.appId = :appId', { appId });
      }

      if (tradable !== undefined) {
        queryBuilder.andWhere('inventory.tradable = :tradable', { tradable });
      }

      if (marketable !== undefined) {
        queryBuilder.andWhere('inventory.marketable = :marketable', { marketable });
      }

      // Apply sorting with optimized field selection
      const sortField = sortBy === 'name' || sortBy === 'rarity' || sortBy === 'createdAt' || sortBy === 'lastSyncedAt'
        ? `inventory.${sortBy}`
        : 'inventory.createdAt';

      queryBuilder
        .addSelect(['inventory.userId', 'inventory.assetId', 'inventory.classId', 'inventory.instanceId', 'inventory.appId', 'inventory.amount', 'inventory.tradable', 'inventory.marketable', 'inventory.commodity', 'inventory.lastSyncedAt', 'inventory.syncStatus', 'inventory.syncError'])
        .orderBy(sortField, sortOrder);

      // Apply pagination
      const skip = (page - 1) * limit;
      queryBuilder.skip(skip).take(limit);

      // Get total count and items efficiently
      const [inventoryItems, total] = await queryBuilder.getManyAndCount();

      // Get item metadata from MongoDB
      const classIds = inventoryItems.map(item => item.classId);
      const itemMetadataMap = await this.itemService.findByClassIds(classIds);

      // Combine data
      const combinedItems = inventoryItems.map(inventoryItem => {
        const itemMetadata = itemMetadataMap.get(inventoryItem.classId) || {} as any;
        return {
          ...inventoryItem,
          ...itemMetadata,
          // Override with inventory-specific data
          amount: inventoryItem.amount,
          lastSyncedAt: inventoryItem.lastSyncedAt,
          syncStatus: inventoryItem.syncStatus,
          syncError: inventoryItem.syncError,
        };
      });

      // Filter by rarity and type if specified
      let filteredItems = combinedItems;
      if (rarity && rarity.length > 0) {
        filteredItems = filteredItems.filter(item => rarity.includes(item.rarity));
      }

      if (type && type.length > 0) {
        filteredItems = filteredItems.filter(item => type.includes(item.type));
      }

      // Apply search filter
      if (search) {
        filteredItems = filteredItems.filter(item =>
          item.name?.toLowerCase().includes(search.toLowerCase()) ||
          item.marketName?.toLowerCase().includes(search.toLowerCase()) ||
          item.marketHashName?.toLowerCase().includes(search.toLowerCase())
        );
      }

      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      const result = {
        data: filteredItems,
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPrevPage,
      };

      this.logger.debug(`User inventory retrieved for ${userId}: ${filteredItems.length} items`);

      return result;
    } catch (error) {
      this.logger.error(`Failed to get user inventory for ${userId}:`, error);
      throw error;
    }
  }

  async getInventoryItem(userId: string, assetId: string): Promise<any | null> {
    try {
      const inventoryItem = await this.inventoryRepository.findOne({
        where: { userId, assetId },
        relations: ['user'],
      });

      if (!inventoryItem) {
        return null;
      }

      // Get item metadata from MongoDB
      const itemMetadata = await this.itemService.findByClassId(inventoryItem.classId);

      const combinedItem = {
        ...inventoryItem,
        ...itemMetadata,
        // Override with inventory-specific data
        amount: inventoryItem.amount,
        lastSyncedAt: inventoryItem.lastSyncedAt,
        syncStatus: inventoryItem.syncStatus,
        syncError: inventoryItem.syncError,
      };

      return combinedItem;
    } catch (error) {
      this.logger.error(`Failed to get inventory item ${assetId} for user ${userId}:`, error);
      throw error;
    }
  }

  async refreshUserInventory(userId: string, steamId: string, appId: number): Promise<SyncResult> {
    this.logger.debug(`Refreshing inventory for user ${userId} (force sync)`);
    await this.invalidateUserInventoryCache(userId, appId);
    return await this.syncUserInventory(userId, steamId, appId);
  }

  async getInventoryStatistics(userId: string): Promise<InventoryStatistics> {
    try {
      // Get inventory items
      const inventoryItems = await this.inventoryRepository.find({
        where: { userId },
        relations: ['user'],
      });

      const statistics: InventoryStatistics = {
        totalItems: inventoryItems.length,
        byGame: {},
        byRarity: {},
        byType: {},
        tradableCount: 0,
        marketableCount: 0,
        syncStatus: {},
      };

      // Get item metadata for detailed statistics
      const classIds = inventoryItems.map(item => item.classId);
      const itemMetadataMap = await this.itemService.findByClassIds(classIds);

      // Group by game (appId)
      const byAppId = inventoryItems.reduce((acc, item) => {
        acc[item.appId] = (acc[item.appId] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      // Get game names and build byGame object
      const gameNames = {
        730: 'CS:GO/CS2',
        570: 'Dota 2',
        440: 'Team Fortress 2',
        252490: 'Rust',
      };

      Object.entries(byAppId).forEach(([appId, count]) => {
        const numAppId = parseInt(appId);
        statistics.byGame[numAppId] = {
          appId: numAppId,
          name: gameNames[numAppId] || `Game ${numAppId}`,
          count,
        };
      });

      // Group by rarity and type
      inventoryItems.forEach(item => {
        const itemMetadata = itemMetadataMap.get(item.classId);
        if (itemMetadata) {
          if (itemMetadata.rarity) {
            statistics.byRarity[itemMetadata.rarity] = (statistics.byRarity[itemMetadata.rarity] || 0) + 1;
          }
          if (itemMetadata.type) {
            statistics.byType[itemMetadata.type] = (statistics.byType[itemMetadata.type] || 0) + 1;
          }
        }

        if (item.tradable) {
          statistics.tradableCount++;
        }
        if (item.marketable) {
          statistics.marketableCount++;
        }
      });

      // Get sync status
      const syncStatuses = inventoryItems.reduce((acc, item) => {
        if (!acc[item.appId] || acc[item.appId].lastSyncedAt < item.lastSyncedAt) {
          acc[item.appId] = {
            appId: item.appId,
            status: item.syncStatus,
            lastSyncedAt: item.lastSyncedAt,
          };
        }
        return acc;
      }, {} as Record<number, any>);

      statistics.syncStatus = syncStatuses;

      // Get last sync time
      const lastSynced = inventoryItems.reduce((latest, item) => {
        return item.lastSyncedAt > latest ? item.lastSyncedAt : latest;
      }, new Date(0));

      if (lastSynced > new Date(0)) {
        statistics.lastSyncedAt = lastSynced;
      }

      this.logger.debug(`Inventory statistics calculated for user ${userId}`);
      return statistics;
    } catch (error) {
      this.logger.error(`Failed to get inventory statistics for user ${userId}:`, error);
      throw error;
    }
  }

  async checkInventoryAccess(steamId: string): Promise<boolean> {
    try {
      return await this.steamApiService.validateInventoryAccess(steamId);
    } catch (error) {
      this.logger.error(`Failed to check inventory access for ${steamId}:`, error);
      return false;
    }
  }

  async getSyncStatus(userId: string, appId?: number): Promise<InventorySyncStatusDto[]> {
    try {
      const where: any = { userId };
      if (appId) {
        where.appId = appId;
      }

      const inventoryItems = await this.inventoryRepository.find({
        where,
        select: ['appId', 'lastSyncedAt', 'syncStatus', 'syncError'],
        order: { lastSyncedAt: 'DESC' },
      });

      // Group by appId
      const groupedByAppId = inventoryItems.reduce((acc, item) => {
        if (!acc[item.appId] || acc[item.appId].lastSyncedAt < item.lastSyncedAt) {
          acc[item.appId] = {
            appId: item.appId,
            lastSyncedAt: item.lastSyncedAt,
            syncStatus: item.syncStatus,
            itemCount: inventoryItems.filter(i => i.appId === item.appId).length,
            syncError: item.syncError,
          };
        }
        return acc;
      }, {} as Record<number, InventorySyncStatusDto>);

      return Object.values(groupedByAppId);
    } catch (error) {
      this.logger.error(`Failed to get sync status for user ${userId}:`, error);
      throw error;
    }
  }

  async markSyncFailed(userId: string, appId: number, error: string): Promise<void> {
    try {
      await this.inventoryRepository.update(
        { userId, appId },
        {
          syncStatus: SyncStatus.FAILED,
          syncError: error,
          updatedAt: new Date(),
        }
      );
      this.logger.warn(`Marked sync as failed for user ${userId}, app ${appId}: ${error}`);
    } catch (error) {
      this.logger.error(`Failed to mark sync as failed for user ${userId}, app ${appId}:`, error);
    }
  }

  async getUsersForSync(batchSize: number): Promise<User[]> {
    try {
      const syncIntervalMinutes = this.configService.get<number>('INVENTORY_SYNC_INTERVAL_MINUTES', 30);
      const cutoffTime = new Date(Date.now() - syncIntervalMinutes * 60 * 1000);

      const users = await this.inventoryRepository
        .createQueryBuilder('inventory')
        .leftJoinAndSelect('inventory.user', 'user')
        .where('inventory.lastSyncedAt < :cutoffTime', { cutoffTime })
        .andWhere('inventory.syncStatus != :pendingStatus', { pendingStatus: SyncStatus.PENDING })
        .andWhere('user.isActive = true')
        .andWhere('user.isBanned = false')
        .groupBy('inventory.userId')
        .addGroupBy('user.id')
        .orderBy('inventory.lastSyncedAt', 'ASC')
        .limit(batchSize)
        .getMany();

      // Extract unique users
      const uniqueUsers = Array.from(new Map(users.map(u => [u.user.id, u.user])).values());

      this.logger.debug(`Found ${uniqueUsers.length} users for sync`);
      return uniqueUsers;
    } catch (error) {
      this.logger.error('Failed to get users for sync:', error);
      throw error;
    }
  }

  async markSyncPending(userId: string, appId: number): Promise<void> {
    try {
      await this.inventoryRepository.update(
        { userId, appId },
        {
          syncStatus: SyncStatus.PENDING,
          updatedAt: new Date(),
        }
      );
      this.logger.debug(`Marked sync as pending for user ${userId}, app ${appId}`);
    } catch (error) {
      this.logger.error(`Failed to mark sync as pending for user ${userId}, app ${appId}:`, error);
    }
  }

  async markSyncCompleted(userId: string, appId: number, error: string | null): Promise<void> {
    try {
      await this.inventoryRepository.update(
        { userId, appId },
        {
          syncStatus: error ? SyncStatus.FAILED : SyncStatus.SYNCED,
          syncError: error,
          updatedAt: new Date(),
        }
      );
      this.logger.debug(`Marked sync as ${error ? 'failed' : 'completed'} for user ${userId}, app ${appId}`);
    } catch (error) {
      this.logger.error(`Failed to mark sync as completed for user ${userId}, app ${appId}:`, error);
    }
  }

  async invalidateUserInventoryCache(userId: string, appId?: number): Promise<void> {
    try {
      const pattern = `inventory:${userId}:${appId || '*'}`;

      // For simplicity, we'll use a more direct approach
      // In production, consider using Redis SCAN with patterns or cache tags
      const keysToInvalidate = [
        `inventory:${userId}:*`,
        `inventory_stats:${userId}`,
      ];

      // Clear related cache entries using Redis client
      if (this.cacheManager.store && this.cacheManager.store.getClient()) {
        const redisClient = this.cacheManager.store.getClient();

        for (const keyPattern of keysToInvalidate) {
          try {
            // Use SCAN to find all keys matching the pattern
            const stream = redisClient.scanStream({
              match: keyPattern,
              count: 100
            });

            const keysToDelete: string[] = [];
            for await (const key of stream) {
              keysToDelete.push(key);
            }

            if (keysToDelete.length > 0) {
              await redisClient.del(...keysToDelete);
              this.logger.debug(`Invalidated ${keysToDelete.length} cache keys for pattern: ${keyPattern}`);
            }
          } catch (scanError) {
            this.logger.warn(`Failed to scan cache keys for pattern ${keyPattern}:`, scanError);
          }
        }
      } else {
        // Fallback to manual cache clearing approach
        for (const keyPattern of keysToInvalidate) {
          this.logger.debug(`Invalidating cache pattern: ${keyPattern}`);
        }
      }

      this.logger.debug(`User inventory cache invalidated for ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate user inventory cache for ${userId}:`, error);
    }
  }
}