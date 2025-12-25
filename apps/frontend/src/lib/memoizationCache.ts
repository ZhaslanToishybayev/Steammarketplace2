// Memoization utility for expensive calculations
// Provides caching for heavy computations with TTL and size limits

export interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
}

export interface MemoizationConfig {
  defaultTTL: number; // Default TTL: 30 seconds
  maxSize: number;    // Max cache entries
  cleanupInterval: number; // Cleanup interval
}

const DEFAULT_CONFIG: MemoizationConfig = {
  defaultTTL: 30 * 1000, // 30 seconds
  maxSize: 100, // Max 100 cached calculations
  cleanupInterval: 60 * 1000, // 1 minute
};

class MemoizationCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private config: MemoizationConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<MemoizationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanupTimer();
  }

  /**
   * Generate cache key from function name and arguments
   */
  private generateKey(fnName: string, args: any[]): string {
    const argsStr = JSON.stringify(args);
    return `${fnName}:${argsStr}`;
  }

  /**
   * Check if cache entry is valid
   */
  private isEntryValid(entry: CacheEntry<any>): boolean {
    const now = Date.now();
    return now - entry.timestamp < entry.ttl;
  }

  /**
   * Get cached result
   */
  get<T>(fnName: string, args: any[]): T | null {
    const key = this.generateKey(fnName, args);
    const entry = this.cache.get(key);

    if (!entry) {
      console.log(`🧮 Cache MISS for ${fnName}`);
      return null;
    }

    if (!this.isEntryValid(entry)) {
      console.log(`🧮 Cache EXPIRED for ${fnName}`);
      this.cache.delete(key);
      return null;
    }

    console.log(`🧮 Cache HIT for ${fnName}`);
    return entry.value;
  }

  /**
   * Set cached result
   */
  set<T>(fnName: string, args: any[], value: T, customTTL?: number): void {
    const key = this.generateKey(fnName, args);
    const ttl = customTTL || this.config.defaultTTL;

    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      ttl,
    };

    // Check cache size limit
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, entry);
    console.log(`🧮 Cache SET for ${fnName} (TTL: ${ttl}ms)`);
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
      console.log(`🧮 Evicted oldest cache entry: ${oldestKey}`);
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    console.log(`🧮 Cache CLEARED`);
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
      maxSize: this.config.maxSize,
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

    console.log(`🧹 Memoization cleanup timer started (interval: ${this.config.cleanupInterval}ms)`);
  }

  /**
   * Stop cleanup timer
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
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
      console.log(`🧹 Cleaned up ${expiredKeys.length} expired memoization entries`);
    }

    // Cleanup old entries if cache is still too large
    if (this.cache.size > this.config.maxSize) {
      const excess = this.cache.size - this.config.maxSize;
      for (let i = 0; i < excess; i++) {
        this.evictOldest();
      }
      console.log(`🧹 Evicted ${excess} oldest entries due to size limit`);
    }
  }
}

// Create singleton instance
export const memoizationCache = new MemoizationCache({
  defaultTTL: 30 * 1000, // 30 seconds
  maxSize: 100,
  cleanupInterval: 60 * 1000, // 1 minute
});

// Export class
export { MemoizationCache };