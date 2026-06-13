// Intelligent Cache for Inventory Data
// Implements TTL-based caching with automatic invalidation

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time To Live in milliseconds
}

export interface InventoryCacheConfig {
  defaultTTL: number; // Default TTL: 5 minutes
  maxCacheSize: number; // Max cache entries
  cleanupInterval: number; // Auto cleanup interval
}

// Default configuration
const DEFAULT_CONFIG: InventoryCacheConfig = {
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxCacheSize: 50, // Max 50 cached inventories
  cleanupInterval: 60 * 1000, // Cleanup every minute
};

class InventoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private config: InventoryCacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<InventoryCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanupTimer();
  }

  /**
   * Generate cache key for inventory
   * Format: inventory:{steamId}:{appId}:{queryParams}
   */
  private generateKey(steamId: string, appId: number, queryParams?: string): string {
    const params = queryParams ? `:${queryParams}` : '';
    return `inventory:${steamId}:${appId}${params}`;
  }

  /**
   * Check if cache entry is valid
   */
  private isEntryValid(entry: CacheEntry<any>): boolean {
    const now = Date.now();
    return now - entry.timestamp < entry.ttl;
  }

  /**
   * Get cached inventory data
   */
  getInventory<T>(
    steamId: string,
    appId: number,
    queryParams?: string
  ): T | null {
    const key = this.generateKey(steamId, appId, queryParams);
    const entry = this.cache.get(key);

    if (!entry) {
      console.log(`📦 Cache MISS for ${key}`);
      return null;
    }

    if (!this.isEntryValid(entry)) {
      console.log(`📦 Cache EXPIRED for ${key}`);
      this.cache.delete(key);
      return null;
    }

    console.log(`📦 Cache HIT for ${key}`);
    return entry.data;
  }

  /**
   * Set cached inventory data
   */
  setInventory<T>(
    steamId: string,
    appId: number,
    data: T,
    customTTL?: number,
    queryParams?: string
  ): void {
    const key = this.generateKey(steamId, appId, queryParams);
    const ttl = customTTL || this.config.defaultTTL;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    // Check cache size limit
    if (this.cache.size >= this.config.maxCacheSize) {
      this.evictOldest();
    }

    this.cache.set(key, entry);
    console.log(`📦 Cache SET for ${key} (TTL: ${ttl}ms)`);
  }

  /**
   * Evict oldest cache entries
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`📦 Evicted oldest cache entry: ${oldestKey}`);
    }
  }

  /**
   * Invalidate cache for specific inventory
   */
  invalidateInventory(steamId: string, appId: number, queryParams?: string): void {
    const key = this.generateKey(steamId, appId, queryParams);
    if (this.cache.has(key)) {
      this.cache.delete(key);
      console.log(`📦 Cache INVALIDATED for ${key}`);
    }
  }

  /**
   * Invalidate all caches for specific user
   */
  invalidateUser(steamId: string): void {
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (key.startsWith(`inventory:${steamId}:`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`📦 Invalidated ${keysToDelete.length} cache entries for user ${steamId}`);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    console.log(`📦 Cache CLEARED`);
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    entries: Array<{
      key: string;
      age: number;
      ttl: number;
      valid: boolean;
    }>;
  } {
    const stats = {
      size: this.cache.size,
      maxSize: this.config.maxCacheSize,
      entries: [] as Array<{
        key: string;
        age: number;
        ttl: number;
        valid: boolean;
      }>,
    };

    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      stats.entries.push({
        key,
        age: now - entry.timestamp,
        ttl: entry.ttl,
        valid: this.isEntryValid(entry),
      });
    }

    return stats;
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);

    console.log(`🧹 Cleanup timer started (interval: ${this.config.cleanupInterval}ms)`);
  }

  /**
   * Stop cleanup timer
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      console.log(`🧹 Cleanup timer stopped`);
    }
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const initialSize = this.cache.size;
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= entry.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));

    if (expiredKeys.length > 0) {
      console.log(`🧹 Cleaned up ${expiredKeys.length} expired cache entries`);
    }

    // Cleanup old entries if cache is still too large
    if (this.cache.size > this.config.maxCacheSize) {
      const excess = this.cache.size - this.config.maxCacheSize;
      for (let i = 0; i < excess; i++) {
        this.evictOldest();
      }
      console.log(`🧹 Evicted ${excess} oldest entries due to size limit`);
    }
  }

  /**
   * Save cache to localStorage for persistence
   */
  saveToStorage(): void {
    try {
      const serialized = JSON.stringify({
        cache: Array.from(this.cache.entries()),
        timestamp: Date.now(),
      });
      localStorage.setItem('inventory_cache', serialized);
      console.log(`💾 Cache saved to localStorage (${this.cache.size} entries)`);
    } catch (error) {
      console.error(`💾 Failed to save cache to localStorage:`, error);
    }
  }

  /**
   * Load cache from localStorage
   */
  loadFromStorage(): void {
    try {
      const serialized = localStorage.getItem('inventory_cache');
      if (!serialized) return;

      const data = JSON.parse(serialized);
      const entries = data.cache as Array<[string, CacheEntry<any>]>;

      // Validate entries and filter expired ones
      const now = Date.now();
      let loadedCount = 0;

      for (const [key, entry] of entries) {
        if (now - entry.timestamp < entry.ttl) {
          this.cache.set(key, entry);
          loadedCount++;
        }
      }

      console.log(`💾 Loaded ${loadedCount} valid cache entries from localStorage`);
    } catch (error) {
      console.error(`💾 Failed to load cache from localStorage:`, error);
    }
  }

  /**
   * Check if we have recent cache for this inventory
   */
  hasRecentCache(steamId: string, appId: number, queryParams?: string): boolean {
    const key = this.generateKey(steamId, appId, queryParams);
    const entry = this.cache.get(key);

    if (!entry) return false;
    return this.isEntryValid(entry);
  }

  /**
   * Get cache age in milliseconds
   */
  getCacheAge(steamId: string, appId: number, queryParams?: string): number {
    const key = this.generateKey(steamId, appId, queryParams);
    const entry = this.cache.get(key);

    if (!entry) return -1;
    return Date.now() - entry.timestamp;
  }

  /**
   * Cleanup on page unload
   */
  initPageUnloadHandler(): void {
    // Only run on client-side
    if (typeof window === 'undefined') return;

    window.addEventListener('beforeunload', () => {
      this.saveToStorage();
      this.stopCleanupTimer();
    });

    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.loadFromStorage();
      }
    });

    // Load cache on init
    this.loadFromStorage();
  }
}

// Create singleton instance
export const inventoryCache = new InventoryCache({
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxCacheSize: 50,
  cleanupInterval: 60 * 1000, // 1 minute
});

// Initialize persistence
inventoryCache.initPageUnloadHandler();

// Export class
export { InventoryCache };