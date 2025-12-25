// React hook for prefetching data
// Provides easy-to-use prefetching capabilities with progress tracking

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  prefetchingManager,
  type PrefetchConfig,
  type PrefetchResult,
} from '@/lib/prefetching';
import { sessionManager } from './session';
import { inventoryCache } from './inventoryCache';

export interface UsePrefetchingOptions {
  enabled?: boolean;
  onProgress?: (progress: number, current: string) => void;
  onSuccess?: (result: PrefetchResult) => void;
  onError?: (error: Error) => void;
}

export interface UsePrefetchingReturn {
  // State
  isPrefetching: boolean;
  progress: number;
  currentTask: string;
  result: PrefetchResult | null;
  error: Error | null;

  // Actions
  prefetchUserData: (config?: Partial<PrefetchConfig>) => Promise<PrefetchResult>;
  prefetchInventory: (appId: number) => Promise<void>;
  cancelAll: () => void;
  getStatus: () => { activePrefetches: number; isPrefetching: boolean };
  clearError: () => void;

  // Auto-prefetching
  startAutoPrefetch: (config?: Partial<PrefetchConfig>) => void;
  stopAutoPrefetch: () => void;
  isAutoPrefetching: boolean;
}

/**
 * Hook for managing data prefetching
 */
export function usePrefetching(options: UsePrefetchingOptions = {}): UsePrefetchingReturn {
  const {
    enabled = true,
    onProgress,
    onSuccess,
    onError,
  } = options;

  const [isPrefetching, setIsPrefetching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState('');
  const [result, setResult] = useState<PrefetchResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const [isAutoPrefetching, setIsAutoPrefetching] = useState(false);
  const autoPrefetchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const user = sessionManager.getUser();
  const steamId = user?.steamId;

  /**
   * Prefetch user data with progress tracking
   */
  const prefetchUserData = useCallback(async (config?: Partial<PrefetchConfig>): Promise<PrefetchResult> => {
    if (!enabled || !steamId) {
      throw new Error('Prefetching not enabled or user not authenticated');
    }

    setIsPrefetching(true);
    setProgress(0);
    setCurrentTask('');
    setError(null);

    try {
      const result = await prefetchingManager.prefetchUserData(steamId, config, (progress, task) => {
        setProgress(progress);
        setCurrentTask(task);
        onProgress?.(progress, task);
      });

      setResult(result);
      setIsPrefetching(false);

      if (result.success) {
        onSuccess?.(result);
      } else {
        const error = new Error(`Prefetching completed with ${result.failed.length} failures`);
        setError(error);
        onError?.(error);
      }

      return result;
    } catch (err) {
      const prefetchError = err instanceof Error ? err : new Error('Failed to prefetch user data');
      setError(prefetchError);
      setIsPrefetching(false);
      onError?.(prefetchError);
      throw prefetchError;
    }
  }, [enabled, steamId, onProgress, onSuccess, onError]);

  /**
   * Prefetch specific inventory
   */
  const prefetchInventory = useCallback(async (appId: number): Promise<void> => {
    if (!enabled || !steamId) {
      throw new Error('Prefetching not enabled or user not authenticated');
    }

    setIsPrefetching(true);
    setCurrentTask(`inventory-${appId}`);

    try {
      await prefetchingManager.prefetchInventory(steamId, appId);
      setIsPrefetching(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to prefetch inventory');
      setError(error);
      setIsPrefetching(false);
      throw error;
    }
  }, [enabled, steamId]);

  /**
   * Cancel all active prefetches
   */
  const cancelAll = useCallback(() => {
    prefetchingManager.cancelAll();
    setIsPrefetching(false);
    setProgress(0);
    setCurrentTask('');
  }, []);

  /**
   * Get prefetching status
   */
  const getStatus = useCallback(() => {
    return prefetchingManager.getStatus();
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Start automatic prefetching
   */
  const startAutoPrefetch = useCallback((config?: Partial<PrefetchConfig>) => {
    if (!enabled || !steamId) {
      console.warn('Auto-prefetching not enabled or user not authenticated');
      return;
    }

    if (isAutoPrefetching) {
      console.warn('Auto-prefetching already running');
      return;
    }

    setIsAutoPrefetching(true);

    // Initial prefetch
    prefetchUserData(config).catch(console.error);

    // Set up periodic prefetching (every 10 minutes)
    autoPrefetchTimerRef.current = setInterval(() => {
      if (isAutoPrefetching) {
        console.log('🔄 Running periodic prefetch...');
        prefetchUserData(config).catch(err => {
          console.error('Periodic prefetch failed:', err);
        });
      }
    }, 10 * 60 * 1000); // 10 minutes

    console.log('🚀 Auto-prefetching started');
  }, [enabled, steamId, isAutoPrefetching, prefetchUserData]);

  /**
   * Stop automatic prefetching
   */
  const stopAutoPrefetch = useCallback(() => {
    if (autoPrefetchTimerRef.current) {
      clearInterval(autoPrefetchTimerRef.current);
      autoPrefetchTimerRef.current = null;
    }

    setIsAutoPrefetching(false);
    cancelAll();

    console.log('🛑 Auto-prefetching stopped');
  }, [cancelAll]);

  /**
   * Clean up on unmount
   */
  useEffect(() => {
    return () => {
      stopAutoPrefetch();
    };
  }, [stopAutoPrefetch]);

  /**
   * Smart prefetching based on user behavior
   */
  const smartPrefetch = useCallback(async () => {
    if (!enabled || !steamId) return;

    console.log('🧠 Starting smart prefetching...');

    // Check what the user has recently accessed
    const recentGames = getRecentlyAccessedGames();

    // Prefetch based on recent activity
    const prefetchConfig: Partial<PrefetchConfig> = {
      dotaInventory: recentGames.includes(570),
      cs2Inventory: recentGames.includes(730),
      itemImages: true,
      userProfile: true,
    };

    try {
      await prefetchUserData(prefetchConfig);
    } catch (error) {
      console.error('Smart prefetching failed:', error);
    }
  }, [enabled, steamId, prefetchUserData]);

  /**
   * Get recently accessed games from cache
   */
  const getRecentlyAccessedGames = useCallback((): number[] => {
    const games: number[] = [];
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000); // 1 hour

    try {
      // Check inventory cache for recently accessed games
      const cacheEntries = inventoryCache.getStats();

      for (const entry of cacheEntries.entries) {
        if (entry.age < 3600000) { // 1 hour in ms
          // Extract app ID from cache key
          const match = entry.key.match(/inventory:(\d+):(\d+)/);
          if (match) {
            const appId = parseInt(match[2]);
            if (!games.includes(appId)) {
              games.push(appId);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to get recently accessed games:', error);
    }

    return games;
  }, []);

  /**
   * Prefetch on user login
   */
  useEffect(() => {
    if (enabled && steamId) {
      // Start smart prefetching when user logs in
      smartPrefetch().catch(console.error);
    }
  }, [enabled, steamId, smartPrefetch]);

  return {
    // State
    isPrefetching,
    progress,
    currentTask,
    result,
    error,

    // Actions
    prefetchUserData,
    prefetchInventory,
    cancelAll,
    getStatus,
    clearError,

    // Auto-prefetching
    startAutoPrefetch,
    stopAutoPrefetch,
    isAutoPrefetching,
  };
}

/**
 * Hook for background prefetching of specific data
 */
export function useBackgroundPrefetch() {
  const prefetch = usePrefetching();

  /**
   * Prefetch inventory in background
   */
  const prefetchInventoryInBackground = useCallback(async (appId: number) => {
    try {
      await prefetch.prefetchInventory(appId);
      console.log(`✅ Background prefetch completed for app ${appId}`);
    } catch (error) {
      console.error(`❌ Background prefetch failed for app ${appId}:`, error);
    }
  }, [prefetch]);

  /**
   * Prefetch user profile in background
   */
  const prefetchProfileInBackground = useCallback(async () => {
    try {
      await prefetch.prefetchUserData({
        userProfile: true,
        dotaInventory: false,
        cs2Inventory: false,
        itemImages: false,
      });
      console.log('✅ Background profile prefetch completed');
    } catch (error) {
      console.error('❌ Background profile prefetch failed:', error);
    }
  }, [prefetch]);

  return {
    prefetchInventoryInBackground,
    prefetchProfileInBackground,
  };
}

/**
 * Hook for prefetching on hover/focus
 */
export function useHoverPrefetch(config?: Partial<PrefetchConfig>) {
  const prefetch = usePrefetching();

  const handleMouseEnter = useCallback(async () => {
    try {
      await prefetch.prefetchUserData(config);
    } catch (error) {
      console.error('Hover prefetch failed:', error);
    }
  }, [prefetch, config]);

  return {
    onMouseEnter: handleMouseEnter,
    isPrefetching: prefetch.isPrefetching,
  };
}

/**
 * Hook for prefetching based on visibility
 */
export function useVisibilityPrefetch(config?: Partial<PrefetchConfig>) {
  const prefetch = usePrefetching();

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && !prefetch.isPrefetching) {
        try {
          await prefetch.prefetchUserData(config);
        } catch (error) {
          console.error('Visibility prefetch failed:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [prefetch, config]);
}