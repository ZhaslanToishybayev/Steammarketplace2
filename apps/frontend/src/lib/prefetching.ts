// Prefetching utilities for frequently used data
// Implements intelligent prefetching for better user experience

import { apiClient } from './api';
// Note: inventoryCache and imageCache removed - using localStorage directly

export interface PrefetchConfig {
  dotaInventory: boolean;
  cs2Inventory: boolean;
  itemImages: boolean;
  userProfile: boolean;
  marketPrices: boolean;
}

export interface PrefetchResult {
  success: boolean;
  completed: string[];
  failed: string[];
  timing: {
    [key: string]: number;
  };
}

class PrefetchingManager {
  private activePrefetches: Set<string> = new Set();
  private abortControllers: Map<string, AbortController> = new Map();

  /**
   * Prefetch user's inventory and related data
   */
  async prefetchUserData(
    steamId: string,
    config: Partial<PrefetchConfig> = {},
    onProgress?: (progress: number, current: string) => void
  ): Promise<PrefetchResult> {
    const defaultConfig: PrefetchConfig = {
      dotaInventory: true,
      cs2Inventory: true,
      itemImages: true,
      userProfile: true,
      marketPrices: false, // Disabled by default due to API limitations
      ...config,
    };

    const result: PrefetchResult = {
      success: false,
      completed: [],
      failed: [],
      timing: {},
    };

    const tasks = [
      { key: 'dotaInventory', fn: () => this.prefetchDotaInventory(steamId) },
      { key: 'cs2Inventory', fn: () => this.prefetchCs2Inventory(steamId) },
      { key: 'userProfile', fn: () => this.prefetchUserProfile(steamId) },
      { key: 'itemImages', fn: () => this.prefetchPopularItemImages() },
      { key: 'marketPrices', fn: () => this.prefetchMarketPrices() },
    ].filter(task => defaultConfig[task.key as keyof PrefetchConfig]);

    const totalTasks = tasks.length;
    let completedTasks = 0;

    console.log(`🚀 Starting prefetching for ${totalTasks} tasks`);

    // Execute all prefetching tasks concurrently
    const promises = tasks.map(async (task) => {
      const startTime = Date.now();
      const taskId = `${task.key}-${steamId}`;

      try {
        // Check if already prefetching
        if (this.activePrefetches.has(taskId)) {
          console.log(`⏳ ${task.key} already being prefetched`);
          return { key: task.key, success: true, time: 0 };
        }

        this.activePrefetches.add(taskId);
        const controller = new AbortController();
        this.abortControllers.set(taskId, controller);

        console.log(`📦 Starting prefetch: ${task.key}`);

        const item = await task.fn();

        const time = Date.now() - startTime;
        result.timing[task.key] = time;
        result.completed.push(task.key);

        console.log(`✅ Prefetch completed: ${task.key} (${time}ms)`);

        onProgress?.(++completedTasks / totalTasks, task.key);

        return { key: task.key, success: true, time };
      } catch (error) {
        const time = Date.now() - startTime;
        result.timing[task.key] = time;
        result.failed.push(task.key);

        console.warn(`❌ Prefetch failed: ${task.key}`, error);

        onProgress?.(++completedTasks / totalTasks, task.key);

        return { key: task.key, success: false, time };
      } finally {
        this.activePrefetches.delete(`${task.key}-${steamId}`);
        this.abortControllers.delete(taskId);
      }
    });

    await Promise.all(promises);

    const success = result.failed.length === 0;
    result.success = success;

    console.log(
      `🎯 Prefetching completed: ${success ? 'SUCCESS' : 'PARTIAL'}`,
      {
        completed: result.completed,
        failed: result.failed,
        timing: result.timing,
      }
    );

    return result;
  }

  /**
   * Prefetch Dota 2 inventory
   */
  private async prefetchDotaInventory(steamId: string): Promise<void> {
    console.log('📦 Prefetching Dota 2 inventory...');

    try {
      const response = await apiClient.getDotaInventory();

      // Store in localStorage as simple cache
      localStorage.setItem(`inventory_${steamId}_570`, JSON.stringify({
        items: response.items || [],
        cachedAt: Date.now(),
      }));

      console.log(`✅ Dota 2 inventory prefetched: ${response.items?.length || 0} items`);
    } catch (error) {
      console.error('❌ Failed to prefetch Dota 2 inventory:', error);
      throw error;
    }
  }

  /**
   * Prefetch CS2 inventory
   */
  private async prefetchCs2Inventory(steamId: string): Promise<void> {
    console.log('🔫 Prefetching CS2 inventory...');

    try {
      const response = await apiClient.getCs2Inventory();

      // Store in localStorage as simple cache
      localStorage.setItem(`inventory_${steamId}_730`, JSON.stringify({
        items: response.items || [],
        cachedAt: Date.now(),
      }));

      console.log(`✅ CS2 inventory prefetched: ${response.items?.length || 0} items`);
    } catch (error) {
      console.error('❌ Failed to prefetch CS2 inventory:', error);
      throw error;
    }
  }

  /**
   * Prefetch user profile
   */
  private async prefetchUserProfile(steamId: string): Promise<void> {
    console.log('👤 Prefetching user profile...');

    try {
      const profile = await apiClient.getProfile();

      // Cache profile data
      localStorage.setItem(`steam_profile_${steamId}`, JSON.stringify({
        ...profile,
        cachedAt: Date.now(),
      }));

      console.log('✅ User profile prefetched');
    } catch (error) {
      console.error('❌ Failed to prefetch user profile:', error);
      throw error;
    }
  }

  /**
   * Prefetch popular item images
   */
  private async prefetchPopularItemImages(): Promise<void> {
    console.log('🖼️ Prefetching popular item images...');

    // Popular CS2 items
    const popularItems = [
      'AWP | Dragon Lore',
      'AK-47 | Redline',
      'M4A4 | Howl',
      'Desert Eagle | Hypnotic',
      'AK-47 | Case Hardened',
      'M4A1-S | Hyper Beast',
      'AWP | Medusa',
      'AK-47 | Vulcan',
      'M4A4 | Asiimov',
      'AWP | Safari Mesh',
    ];

    let successCount = 0;
    let failCount = 0;

    for (const itemName of popularItems) {
      try {
        // Simulate image URLs for popular items
        const imageUrl = this.generateItemImageUrl(itemName);

        // Preload image by creating new Image
        const img = new Image();
        img.src = imageUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        successCount++;
        console.log(`✅ Prefetched image: ${itemName}`);
      } catch (error) {
        failCount++;
        console.warn(`❌ Failed to prefetch image: ${itemName}`, error);
      }
    }

    console.log(`🖼️ Image prefetching completed: ${successCount} success, ${failCount} failed`);
  }

  /**
   * Prefetch market prices (if available)
   */
  private async prefetchMarketPrices(): Promise<void> {
    console.log('💰 Prefetching market prices...');

    try {
      // This would integrate with Steam Market API or third-party pricing services
      // For now, we'll simulate this with a mock implementation

      const popularItems = [
        'AWP | Dragon Lore',
        'AK-47 | Redline',
        'M4A4 | Howl',
      ];

      const prices: Record<string, number> = {};

      for (const item of popularItems) {
        // Mock price fetching - replace with actual API calls
        prices[item] = Math.random() * 1000 + 100;
      }

      // Cache prices
      localStorage.setItem('market_prices', JSON.stringify({
        prices,
        timestamp: Date.now(),
      }));

      console.log('✅ Market prices prefetched');
    } catch (error) {
      console.error('❌ Failed to prefetch market prices:', error);
      throw error;
    }
  }

  /**
   * Generate item image URL (mock implementation)
   */
  private generateItemImageUrl(itemName: string): string {
    // This would typically map item names to actual Steam CDN URLs
    // For demonstration, we'll use a placeholder URL structure

    const base = 'https://steamcommunity-a.akamaihd.net/economy/image/';

    // Simple mapping for demo purposes
    const itemMap: Record<string, string> = {
      'AWP | Dragon Lore': 'fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcU7l7or8dQZTzC1p2j1T3AetWJZQohNybwxWXVUQH2x8yYQJ2G9uE9vE64xKQp783hRQ9hP9v9eDxjB2Dn-10G9vE8262428',
      'AK-47 | Redline': 'fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcU7l7or8dQZTzC1p2j1T3AetWJZQohNybwxWXVUQH2x8yYQJ2G9uE9vE64xKQp783hRQ9hP9v9eDxjB2Dn-10G9vE8262428',
      'M4A4 | Howl': 'fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcU7l7or8dQZTzC1p2j1T3AetWJZQohNybwxWXVUQH2x8yYQJ2G9uE9vE64xKQp783hRQ9hP9v9eDxjB2Dn-10G9vE8262428',
      'Desert Eagle | Hypnotic': 'fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcU7l7or8dQZTzC1p2j1T3AetWJZQohNybwxWXVUQH2x8yYQJ2G9uE9vE64xKQp783hRQ9hP9v9eDxjB2Dn-10G9vE8262428',
    };

    return base + (itemMap[itemName] || 'placeholder');
  }

  /**
   * Cancel all active prefetches
   */
  cancelAll(): void {
    console.log('🛑 Cancelling all active prefetches');

    for (const [taskId, controller] of this.abortControllers.entries()) {
      controller.abort();
      this.activePrefetches.delete(taskId);
    }

    this.abortControllers.clear();
  }

  /**
   * Get prefetching status
   */
  getStatus(): {
    activePrefetches: number;
    isPrefetching: boolean;
  } {
    return {
      activePrefetches: this.activePrefetches.size,
      isPrefetching: this.activePrefetches.size > 0,
    };
  }

  /**
   * Prefetch specific inventory
   */
  async prefetchInventory(steamId: string, appId: number): Promise<void> {
    const taskId = `inventory-${steamId}-${appId}`;

    if (this.activePrefetches.has(taskId)) {
      console.log(`⏳ Inventory already being prefetched: ${appId}`);
      return;
    }

    try {
      this.activePrefetches.add(taskId);

      // Use appropriate method based on appId
      const response = appId === 730
        ? await apiClient.getCs2Inventory()
        : await apiClient.getDotaInventory();

      // Store in localStorage as simple cache
      localStorage.setItem(`inventory_${steamId}_${appId}`, JSON.stringify({
        items: response.items || [],
        cachedAt: Date.now(),
      }));

      console.log(`✅ Inventory prefetched: ${appId} (${response.items?.length || 0} items)`);
    } catch (error) {
      console.error(`❌ Failed to prefetch inventory: ${appId}`, error);
      throw error;
    } finally {
      this.activePrefetches.delete(taskId);
    }
  }
}

// Create singleton instance
export const prefetchingManager = new PrefetchingManager();

// Export class
export { PrefetchingManager };