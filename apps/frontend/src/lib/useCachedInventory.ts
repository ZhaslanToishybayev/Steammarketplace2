// Hook for cached inventory operations
// Integrates cache with API calls and provides loading states

import { useState, useEffect, useCallback } from 'react';
import { apiClient, type InventoryResponse } from '@/lib/api';
import { inventoryCache } from '@/lib/inventoryCache';
import { sessionManager } from '@/lib/session';

export interface UseCachedInventoryOptions {
  appId: number;
  enabled?: boolean;
  refetchInterval?: number; // Auto refresh interval
  retryOnFailure?: boolean;
}

export interface UseCachedInventoryReturn {
  // Data
  inventory: InventoryResponse | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  refetch: () => Promise<void>;
  invalidateCache: () => void;
  clearCache: () => void;

  // Cache info
  cacheStatus: {
    hasCache: boolean;
    cacheAge: number; // milliseconds
    isCacheValid: boolean;
  };

  // Stats
  stats: {
    totalItems: number;
    loadingTime: number;
  };
}

/**
 * Hook for cached inventory fetching with smart cache management
 */
export function useCachedInventory(
  options: UseCachedInventoryOptions
): UseCachedInventoryReturn {
  const { appId, enabled = true, refetchInterval, retryOnFailure = true } = options;

  const [inventory, setInventory] = useState<InventoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingTime, setLoadingTime] = useState<number>(0);
  const [steamId, setSteamId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Hydration-safe: only access localStorage after mount
  useEffect(() => {
    setMounted(true);
    const id = sessionManager.getSteamId();
    setSteamId(id);
  }, []);

  // Check cache status (only after mount to avoid hydration mismatch)
  const cacheStatus = mounted ? {
    hasCache: inventoryCache.hasRecentCache(steamId || 'anonymous', appId),
    cacheAge: inventoryCache.getCacheAge(steamId || 'anonymous', appId),
    isCacheValid: inventoryCache.hasRecentCache(steamId || 'anonymous', appId),
  } : {
    hasCache: false,
    cacheAge: 0,
    isCacheValid: false,
  };

  /**
   * Fetch inventory with cache integration
   */
  const fetchInventory = useCallback(async (forceRefresh = false): Promise<void> => {
    if (!enabled || !steamId) {
      setError('Not authenticated');
      return;
    }

    setIsLoading(true);
    const startTime = performance.now();

    try {
      const cacheKey = `${steamId}:${appId}`;
      const queryParams = steamId ? `?steamid=${encodeURIComponent(steamId)}` : '';

      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedData = inventoryCache.getInventory<InventoryResponse>(
          steamId,
          appId,
          queryParams
        );

        if (cachedData) {
          setInventory(cachedData);
          setError(null);
          const endTime = performance.now();
          setLoadingTime(endTime - startTime);
          console.log(`📦 Using cached inventory (${endTime - startTime}ms)`);
          return;
        }
      }

      // Fetch from API
      console.log(`🌐 Fetching fresh inventory for ${cacheKey}`);
      let response: InventoryResponse;

      if (appId === 730) {
        // CS2
        response = await apiClient.getCs2Inventory();
      } else if (appId === 570) {
        // Dota 2
        response = await apiClient.getDotaInventory();
      } else {
        throw new Error(`Unsupported app ID: ${appId}`);
      }

      if (response.success) {
        // Cache the successful response
        inventoryCache.setInventory(
          steamId,
          appId,
          response,
          undefined,
          queryParams
        );

        setInventory(response);
        setError(null);
      } else {
        setError(response.error || 'Failed to fetch inventory');
        // Try to use stale cache if available
        const staleCache = inventoryCache.getInventory<InventoryResponse>(
          steamId,
          appId,
          queryParams
        );
        if (staleCache) {
          setInventory(staleCache);
          console.warn('📦 Using stale cache due to API error');
        }
      }
    } catch (err: any) {
      console.error('❌ Failed to fetch inventory:', err);
      setError(err.message || 'Network error');

      // Try to use cache on error
      if (retryOnFailure) {
        const cachedData = inventoryCache.getInventory<InventoryResponse>(
          steamId,
          appId,
          steamId ? `?steamid=${encodeURIComponent(steamId)}` : ''
        );
        if (cachedData) {
          setInventory(cachedData);
          console.warn('📦 Using cached data due to error');
        }
      }
    } finally {
      const endTime = performance.now();
      setLoadingTime(endTime - startTime);
      setIsLoading(false);
    }
  }, [steamId, appId, enabled, retryOnFailure]);

  /**
   * Manual refetch
   */
  const refetch = useCallback(async (): Promise<void> => {
    await fetchInventory(true);
  }, [fetchInventory]);

  /**
   * Invalidate cache for this inventory
   */
  const invalidateCache = useCallback((): void => {
    if (!steamId) return;
    inventoryCache.invalidateInventory(steamId, appId);
    console.log(`📦 Cache invalidated for ${steamId}:${appId}`);
  }, [steamId, appId]);

  /**
   * Clear all cache
   */
  const clearCache = useCallback((): void => {
    inventoryCache.clear();
    console.log('📦 All cache cleared');
  }, []);

  // Initial fetch (only after mounted and steamId is set)
  useEffect(() => {
    if (enabled && steamId && mounted) {
      fetchInventory();
    }
  }, [fetchInventory, enabled, steamId, mounted]);

  // Auto refresh interval
  useEffect(() => {
    if (!refetchInterval || !enabled || !steamId) return;

    const interval = setInterval(() => {
      console.log(`🔄 Auto-refreshing inventory for app ${appId}`);
      fetchInventory(true);
    }, refetchInterval);

    return () => clearInterval(interval);
  }, [refetchInterval, enabled, steamId, appId, fetchInventory]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Optional: cleanup logic
    };
  }, []);

  return {
    // Data
    inventory,
    isLoading,
    error,

    // Actions
    refetch,
    invalidateCache,
    clearCache,

    // Cache info (safe for SSR)
    cacheStatus: mounted ? {
      hasCache: inventoryCache.hasRecentCache(steamId || 'anonymous', appId),
      cacheAge: inventoryCache.getCacheAge(steamId || 'anonymous', appId),
      isCacheValid: inventoryCache.hasRecentCache(steamId || 'anonymous', appId),
    } : {
      hasCache: false,
      cacheAge: 0,
      isCacheValid: false,
    },

    // Stats
    stats: {
      totalItems: inventory?.items?.length || 0,
      loadingTime,
    },
  };
}

/**
 * Hook for cache management and statistics
 */
export function useCacheManager() {
  const [stats, setStats] = useState(inventoryCache.getStats());

  // Refresh stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(inventoryCache.getStats());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const clearAllCache = useCallback(() => {
    inventoryCache.clear();
    setStats(inventoryCache.getStats());
  }, []);

  const saveCache = useCallback(() => {
    inventoryCache.saveToStorage();
  }, []);

  const loadCache = useCallback(() => {
    inventoryCache.loadFromStorage();
    setStats(inventoryCache.getStats());
  }, []);

  return {
    stats,
    clearAllCache,
    saveCache,
    loadCache,
  };
}