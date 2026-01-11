// Image Cache for browser-side image caching
// Uses IndexedDB for efficient image storage with TTL

export interface ImageCacheEntry {
  url: string;
  data: string; // Base64 encoded image
  timestamp: number;
  ttl: number;
}

export interface ImageCacheConfig {
  defaultTTL: number; // Default TTL: 24 hours
  maxSize: number;    // Max cache size in MB
  cleanupInterval: number; // Cleanup interval
}

const DEFAULT_CONFIG: ImageCacheConfig = {
  defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
  maxSize: 100, // 100 MB
  cleanupInterval: 60 * 60 * 1000, // 1 hour
};

class ImageCache {
  private dbName = 'steam-images';
  private storeName = 'images';
  private version = 1;
  private config: ImageCacheConfig;
  private dbPromise: Promise<IDBDatabase> | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private isClient: boolean = false;

  constructor(config: Partial<ImageCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.isClient = typeof window !== 'undefined';

    if (this.isClient) {
      this.initDB();
      this.startCleanupTimer();
    }
  }

  /**
   * Initialize IndexedDB
   */
  private initDB(): void {
    if (!this.isClient) return;

    this.dbPromise = new Promise((resolve, reject) => {
      // Safety check for SSR environment
      if (typeof indexedDB === 'undefined') {
        return;
      }

      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'url' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Check if image is cached and valid
   */
  async hasImage(url: string): Promise<boolean> {
    if (!this.dbPromise) return false;
    try {
      const entry = await this.getImageEntry(url);
      if (!entry) return false;
      return Date.now() - entry.timestamp < entry.ttl;
    } catch {
      return false;
    }
  }

  /**
   * Get cached image as base64
   */
  async getImage(url: string): Promise<string | null> {
    if (!this.dbPromise) return null;
    try {
      const entry = await this.getImageEntry(url);
      if (!entry) return null;

      const now = Date.now();
      if (now - entry.timestamp >= entry.ttl) {
        await this.removeImage(url);
        return null;
      }

      return entry.data;
    } catch {
      return null;
    }
  }

  /**
   * Store image in cache
   */
  async setImage(url: string, data: string, customTTL?: number): Promise<void> {
    if (!this.dbPromise) return;
    try {
      const entry: ImageCacheEntry = {
        url,
        data,
        timestamp: Date.now(),
        ttl: customTTL || this.config.defaultTTL,
      };

      const db = await this.dbPromise;
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      store.put(entry);

      // Check cache size and cleanup if needed
      await this.checkAndCleanupSize();
    } catch (error) {
      console.error('Failed to cache image:', error);
    }
  }

  /**
   * Remove image from cache
   */
  async removeImage(url: string): Promise<void> {
    if (!this.dbPromise) return;
    try {
      const db = await this.dbPromise;
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      store.delete(url);
    } catch (error) {
      console.error('Failed to remove image from cache:', error);
    }
  }

  /**
   * Clear all cached images
   */
  async clear(): Promise<void> {
    if (!this.dbPromise) return;
    try {
      const db = await this.dbPromise;
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      store.clear();
    } catch (error) {
      console.error('Failed to clear image cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    count: number;
    totalSize: number;
    oldestImage: number;
    newestImage: number;
  }> {
    if (!this.dbPromise) return { count: 0, totalSize: 0, oldestImage: 0, newestImage: 0 };
    try {
      const db = await this.dbPromise;
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      return new Promise((resolve) => {
        request.onsuccess = () => {
          const entries = request.result as ImageCacheEntry[];
          const count = entries.length;
          const totalSize = entries.reduce((sum, entry) => sum + entry.data.length, 0);
          const oldestImage = entries.length ? Math.min(...entries.map(e => e.timestamp)) : 0;
          const newestImage = entries.length ? Math.max(...entries.map(e => e.timestamp)) : 0;

          resolve({
            count,
            totalSize, // in bytes
            oldestImage,
            newestImage,
          });
        };
      });
    } catch {
      return { count: 0, totalSize: 0, oldestImage: 0, newestImage: 0 };
    }
  }

  /**
   * Get image entry from IndexedDB
   */
  private async getImageEntry(url: string): Promise<ImageCacheEntry | null> {
    if (!this.dbPromise) return null;
    const db = await this.dbPromise;
    const transaction = db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);
    const request = store.get(url);

    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  }

  /**
   * Check cache size and cleanup old entries
   */
  private async checkAndCleanupSize(): Promise<void> {
    if (!this.dbPromise) return;
    try {
      const stats = await this.getStats();
      const currentSizeMB = stats.totalSize / (1024 * 1024);

      if (currentSizeMB > this.config.maxSize) {
        // Cleanup oldest entries
        await this.cleanupOldestEntries();
      }
    } catch (error) {
      console.error('Failed to check cache size:', error);
    }
  }

  /**
   * Remove oldest entries to free up space
   */
  private async cleanupOldestEntries(): Promise<void> {
    if (!this.dbPromise) return;
    try {
      const db = await this.dbPromise;
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      const request = index.openCursor();

      let removedCount = 0;
      const targetSizeMB = this.config.maxSize * 0.8; // Target 80% of max

      request.onsuccess = async (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (!cursor) return;

        await this.removeImage(cursor.key);
        removedCount++;

        // Continue if still over target
        const stats = await this.getStats();
        const currentSizeMB = stats.totalSize / (1024 * 1024);

        if (currentSizeMB > targetSizeMB && removedCount < 100) {
          cursor.continue();
        }
      };
    } catch (error) {
      console.error('Failed to cleanup oldest entries:', error);
    }
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    if (!this.isClient) return;
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(async () => {
      if (!this.dbPromise) return;
      await this.cleanupExpired();
      await this.checkAndCleanupSize();
    }, this.config.cleanupInterval);

    console.log(`🧹 Image cache cleanup timer started (interval: ${this.config.cleanupInterval}ms)`);
  }

  /**
   * Cleanup expired entries
   */
  private async cleanupExpired(): Promise<void> {
    if (!this.dbPromise) return;
    try {
      const db = await this.dbPromise;
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      const request = index.openCursor();

      let expiredCount = 0;
      const now = Date.now();

      request.onsuccess = async (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (!cursor) return;

        const entry = cursor.value as ImageCacheEntry;
        if (now - entry.timestamp >= entry.ttl) {
          await this.removeImage(entry.url);
          expiredCount++;
          cursor.continue();
        }
      };
    } catch (error) {
      console.error('Failed to cleanup expired entries:', error);
    }
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
}

// Create singleton instance
export const imageCache = new ImageCache({
  defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
  maxSize: 100, // 100 MB
  cleanupInterval: 60 * 60 * 1000, // 1 hour
});

// Export class
export { ImageCache };