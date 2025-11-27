import { Controller, Get, Post, Param, Query, UseGuards, Body, Delete } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InventoryService } from './inventory.service';
import { SteamApiService } from '../auth/steam.service';
import { User } from '../user/user.entity';
import { SteamAuthRequest } from '../../types/steam-auth-request.interface';

@Controller('inventory')
@UseGuards(AuthGuard('steam'))
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly steamApiService: SteamApiService
  ) {}

  @Get('sync')
  async syncInventory(
    @Query('appId') appId: number = 730,
    @Query('contextId') contextId: string = '2',
    @Query('user') user: User
  ) {
    try {
      const syncedItems = await this.inventoryService.syncUserInventory(user, appId, parseInt(contextId));

      return {
        success: true,
        data: {
          itemsSynced: syncedItems.length,
          items: syncedItems.map(item => ({
            id: item.id,
            assetId: item.assetId,
            classId: item.classId,
            instanceId: item.instanceId,
            marketName: item.marketName,
            marketHashName: item.marketHashName,
            iconUrl: item.iconUrl,
            steamPrice: item.steamPrice,
            tradable: item.tradable,
            marketable: item.marketable,
            active: item.active,
            createdAt: item.createdAt
          }))
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
  async getUserInventory(
    @Query('appId') appId: number = 730,
    @Query('limit') limit: number = 100,
    @Query('offset') offset: number = 0,
    @Query('user') user: User
  ) {
    try {
      const inventory = await this.inventoryService.getUserInventory(user.steamId, appId);
      const limitedInventory = inventory.slice(offset, offset + limit);

      return {
        success: true,
        data: {
          items: limitedInventory.map(item => ({
            id: item.id,
            assetId: item.assetId,
            classId: item.classId,
            instanceId: item.instanceId,
            marketName: item.marketName,
            marketHashName: item.marketHashName,
            iconUrl: item.iconUrl,
            steamPrice: item.steamPrice,
            suggestedPrice: item.suggestedPrice,
            tradable: item.tradable,
            marketable: item.marketable,
            active: item.active,
            createdAt: item.createdAt
          })),
          total: inventory.length,
          value: await this.getInventoryValue(user.steamId)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get('value')
  async getInventoryValue(
    @Query('user') user: User
  ) {
    try {
      const { totalValue, itemCount } = await this.inventoryService.getInventoryValue(user.steamId);

      return {
        success: true,
        data: {
          totalValue,
          itemCount,
          formattedValue: `$${totalValue.toFixed(2)}`
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Post('update-prices')
  async updatePrices(
    @Query('user') user: User
  ) {
    try {
      await this.inventoryService.updateItemPrices(user.steamId);

      return {
        success: true,
        message: 'Item prices updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get('steam')
  async getSteamInventory(
    @Query('steamId') steamId?: string,
    @Query('appId') appId: number = 730,
    @Query('contextId') contextId: string = '2',
    @Query('user') user: User
  ) {
    try {
      const targetSteamId = steamId || user.steamId;

      const inventory = await this.steamApiService.getUserInventory(
        targetSteamId,
        appId,
        contextId
      );

      return {
        success: true,
        data: {
          steamId: targetSteamId,
          appId,
          contextId,
          totalInventoryCount: inventory.total_inventory_count,
          success: inventory.success,
          inventory: inventory.rgInventory,
          descriptions: inventory.rgDescriptions
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        steamId: steamId || user.steamId
      };
    }
  }

  @Delete(':itemId')
  async removeItem(
    @Param('itemId') itemId: number,
    @Query('user') user: User
  ) {
    try {
      const item = await this.inventoryService.findItemById(itemId, user.steamId);

      if (!item) {
        return {
          success: false,
          error: 'Item not found'
        };
      }

      item.active = false;
      await this.inventoryService['inventoryRepository'].save(item);

      return {
        success: true,
        message: 'Item removed from inventory'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get('stats')
  async getInventoryStats(
    @Query('user') user: User
  ) {
    try {
      const inventory = await this.inventoryService.getUserInventory(user.steamId);

      const stats = {
        totalItems: inventory.length,
        tradableItems: inventory.filter(item => item.tradable).length,
        marketableItems: inventory.filter(item => item.markable).length,
        activeItems: inventory.filter(item => item.active).length,
        inactiveItems: inventory.filter(item => !item.active).length,
        totalValue: 0,
        averageValue: 0,
        mostExpensiveItem: null,
        leastExpensiveItem: null
      };

      const activeItems = inventory.filter(item => item.active && item.steamPrice);

      if (activeItems.length > 0) {
        stats.totalValue = activeItems.reduce((sum, item) => sum + (item.steamPrice || 0), 0);
        stats.averageValue = stats.totalValue / activeItems.length;

        const sortedByPrice = activeItems.sort((a, b) => (b.steamPrice || 0) - (a.steamPrice || 0));
        stats.mostExpensiveItem = sortedByPrice[0];
        stats.leastExpensiveItem = sortedByPrice[sortedByPrice.length - 1];
      }

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

  @Post('bulk-sync')
  async bulkSync(
    @Body('appIds') appIds: number[] = [730],
    @Query('user') user: User
  ) {
    try {
      const results = [];

      for (const appId of appIds) {
        try {
          const syncedItems = await this.inventoryService.syncUserInventory(user, appId);
          results.push({
            appId,
            success: true,
            itemsSynced: syncedItems.length
          });
        } catch (error) {
          results.push({
            appId,
            success: false,
            error: error.message
          });
        }
      }

      return {
        success: true,
        data: results
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}