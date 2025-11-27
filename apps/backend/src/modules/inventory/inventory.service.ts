import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventory } from './inventory.entity';
import { SteamApiService } from '../auth/steam.service';
import { SteamApiException, PrivateInventoryException, RateLimitException, InvalidSteamIdException, SteamApiTimeoutException } from '../exceptions/steam-api.exception';
import { User } from '../user/user.entity';

interface SteamInventoryItem {
  assetid: string;
  classid: string;
  instanceid: string;
  amount: string;
  market_name: string;
  market_hash_name: string;
  icon_url: string;
  tradable?: number;
  marketable?: number;
}

interface SteamInventoryResponse {
  success: number;
  rgInventory: Record<string, SteamInventoryItem>;
  rgDescriptions: Record<string, any>;
  total_inventory_count: number;
}

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    private steamApiService: SteamApiService
  ) {}

  async syncUserInventory(user: User, appId = 730, contextId = 2): Promise<Inventory[]> {
    try {
      const steamInventory = await this.steamApiService.getUserInventory(
        user.steamId,
        appId,
        contextId
      );

      if (!steamInventory || !steamInventory.rgInventory) {
        return [];
      }

      const existingItems = await this.inventoryRepository.find({
        where: { steamId: user.steamId, appId, contextId, active: true }
      });

      const existingItemMap = new Map(
        existingItems.map(item => [`${item.assetId}-${item.classId}-${item.instanceId}`, item])
      );

      const newItems: Inventory[] = [];
      const updatedItems: Inventory[] = [];

      // Process new inventory items
      for (const assetId of Object.keys(steamInventory.rgInventory)) {
        const item = steamInventory.rgInventory[assetId];
        const description = steamInventory.rgDescriptions[item.classid + '_' + (item.instanceid || '0')];

        const inventoryItem: Partial<Inventory> = {
          steamId: user.steamId,
          appId,
          contextId,
          assetId,
          classId: item.classid,
          instanceId: item.instanceid || '0',
          amount: parseInt(item.amount || '1'),
          marketName: description?.name || item.market_name,
          marketHashName: description?.market_hash_name || item.market_hash_name,
          iconUrl: description?.icon_url,
          tradable: !!(item.tradable || description?.tradable),
          marketable: !!(item.marketable || description?.marketable),
          active: true
        };

        const key = `${assetId}-${item.classid}-${item.instanceid || '0'}`;
        const existingItem = existingItemMap.get(key);

        if (existingItem) {
          // Update existing item
          Object.assign(existingItem, inventoryItem);
          updatedItems.push(existingItem);
        } else {
          // Create new item
          newItems.push(this.inventoryRepository.create(inventoryItem));
        }

        existingItemMap.delete(key);
      }

      // Deactivate items that are no longer in inventory
      const itemsToDeactivate = Array.from(existingItemMap.values());
      for (const item of itemsToDeactivate) {
        item.active = false;
        updatedItems.push(item);
      }

      // Save all changes
      const savedNewItems = await this.inventoryRepository.save(newItems);
      const savedUpdatedItems = await this.inventoryRepository.save(updatedItems);

      return [...savedNewItems, ...savedUpdatedItems];
    } catch (error) {
      console.error('Error syncing user inventory:', error);
      throw new Error('Failed to sync inventory');
    }
  }

  async getUserInventory(steamId: string, appId = 730): Promise<Inventory[]> {
    try {
      return await this.inventoryRepository.find({
        where: { steamId, appId, active: true },
        order: { createdAt: 'DESC' }
      });
    } catch (error) {
      console.error('Error getting user inventory:', error);
      return [];
    }
  }

  async getInventoryValue(steamId: string): Promise<{ totalValue: number; itemCount: number }> {
    try {
      const items = await this.inventoryRepository.find({
        where: { steamId, active: true }
      });

      const totalValue = items.reduce((sum, item) => sum + (item.steamPrice || 0), 0);
      const itemCount = items.length;

      return { totalValue, itemCount };
    } catch (error) {
      console.error('Error calculating inventory value:', error);
      return { totalValue: 0, itemCount: 0 };
    }
  }

  async updateItemPrices(steamId: string): Promise<void> {
    try {
      const items = await this.inventoryRepository.find({
        where: { steamId, active: true, marketable: true }
      });

      for (const item of items) {
        if (item.marketHashName) {
          try {
            const priceData = await this.steamApiService.getItemPrices(item.marketHashName);
            if (priceData && priceData.lowest_price) {
              // Convert price from string like "2,59€" to number
              const priceString = priceData.lowest_price.replace(/[^\d,]/g, '').replace(',', '.');
              item.steamPrice = parseFloat(priceString);

              // Set suggested price with 5% margin
              item.suggestedPrice = item.steamPrice * 1.05;
            }
          } catch (error) {
            console.warn(`Failed to update price for ${item.marketHashName}:`, error);
          }
        }
      }

      await this.inventoryRepository.save(items);
    } catch (error) {
      console.error('Error updating item prices:', error);
    }
  }

  async deleteInactiveItems(steamId: string, daysOld = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await this.inventoryRepository.delete({
        steamId,
        active: false,
        updatedAt: { $lt: cutoffDate }
      });

      return result.affected || 0;
    } catch (error) {
      console.error('Error deleting inactive items:', error);
      return 0;
    }
  }

  async findItemById(itemId: number, steamId: string): Promise<Inventory | null> {
    try {
      return await this.inventoryRepository.findOne({
        where: { id: itemId, steamId }
      });
    } catch (error) {
      console.error('Error finding inventory item:', error);
      return null;
    }
  }
}