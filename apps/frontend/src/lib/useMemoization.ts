// React hooks for memoization of expensive calculations
// Provides caching for inventory filtering, sorting, and metadata computation

import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { memoizationCache } from './memoizationCache';
import type { InventoryItem } from './api';

export interface FilterCriteria {
  search?: string;
  tradable?: boolean;
  marketable?: boolean;
  type?: string[];
  rarity?: string[];
  exterior?: string[];
}

export interface SortCriteria {
  field: 'name' | 'type' | 'rarity' | 'tradable' | 'marketable';
  direction: 'asc' | 'desc';
}

/**
 * Hook for memoized inventory filtering
 */
export function useMemoizedInventoryFilter(items: InventoryItem[], criteria: FilterCriteria) {
  return useMemo(() => {
    const cacheKey = `filter:${JSON.stringify(criteria)}`;
    const cachedResult = memoizationCache.get<InventoryItem[]>('filterInventory', [items, criteria]);

    if (cachedResult) {
      return cachedResult;
    }

    const result = items.filter(item => {
      // Search filter
      if (criteria.search) {
        const searchLower = criteria.search.toLowerCase();
        const matchesSearch =
          item.name.toLowerCase().includes(searchLower) ||
          item.market_hash_name.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Tradable filter
      if (criteria.tradable !== undefined) {
        if (item.tradable !== criteria.tradable) return false;
      }

      // Marketable filter
      if (criteria.marketable !== undefined) {
        if (item.marketable !== criteria.marketable) return false;
      }

      // Type filter
      if (criteria.type && criteria.type.length > 0) {
        const itemType = getInventoryType(item).toLowerCase();
        if (!criteria.type.some(t => itemType.includes(t.toLowerCase()))) {
          return false;
        }
      }

      // Rarity filter
      if (criteria.rarity && criteria.rarity.length > 0) {
        const rarity = getInventoryRarity(item).toLowerCase();
        if (!criteria.rarity.some(r => rarity.includes(r.toLowerCase()))) {
          return false;
        }
      }

      // Exterior filter
      if (criteria.exterior && criteria.exterior.length > 0) {
        const exterior = getInventoryExterior(item).toLowerCase();
        if (!criteria.exterior.some(e => exterior.includes(e.toLowerCase()))) {
          return false;
        }
      }

      return true;
    });

    memoizationCache.set('filterInventory', [items, criteria], result);
    return result;
  }, [items, criteria]);
}

/**
 * Hook for memoized inventory sorting
 */
export function useMemoizedInventorySort(items: InventoryItem[], sortCriteria: SortCriteria) {
  return useMemo(() => {
    const cacheKey = `sort:${JSON.stringify(sortCriteria)}`;
    const cachedResult = memoizationCache.get<InventoryItem[]>('sortInventory', [items, sortCriteria]);

    if (cachedResult) {
      return cachedResult;
    }

    const result = [...items].sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortCriteria.field) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'type':
          aValue = getInventoryType(a).toLowerCase();
          bValue = getInventoryType(b).toLowerCase();
          break;
        case 'rarity':
          aValue = getInventoryRarity(a).toLowerCase();
          bValue = getInventoryRarity(b).toLowerCase();
          break;
        case 'tradable':
          aValue = a.tradable ? 1 : 0;
          bValue = b.tradable ? 1 : 0;
          break;
        case 'marketable':
          aValue = a.marketable ? 1 : 0;
          bValue = b.marketable ? 1 : 0;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (aValue < bValue) return sortCriteria.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortCriteria.direction === 'asc' ? 1 : -1;
      return 0;
    });

    memoizationCache.set('sortInventory', [items, sortCriteria], result);
    return result;
  }, [items, sortCriteria]);
}

/**
 * Hook for memoized metadata computation
 */
export function useMemoizedMetadata(items: InventoryItem[]) {
  return useMemo(() => {
    const cacheKey = `metadata:${items.length}`;
    const cachedResult = memoizationCache.get<any>('computeMetadata', [items]);

    if (cachedResult) {
      return cachedResult;
    }

    const stats = {
      total: items.length,
      tradable: items.filter(i => i.tradable).length,
      marketable: items.filter(i => i.marketable).length,
      types: new Set<string>(),
      rarities: new Set<string>(),
      exteriors: new Set<string>(),
    };

    items.forEach(item => {
      const type = getInventoryType(item);
      const rarity = getInventoryRarity(item);
      const exterior = getInventoryExterior(item);

      if (type) stats.types.add(type);
      if (rarity) stats.rarities.add(rarity);
      if (exterior) stats.exteriors.add(exterior);
    });

    const result = {
      ...stats,
      types: Array.from(stats.types),
      rarities: Array.from(stats.rarities),
      exteriors: Array.from(stats.exteriors),
    };

    memoizationCache.set('computeMetadata', [items], result);
    return result;
  }, [items]);
}

/**
 * Hook for memoized search suggestions
 */
export function useMemoizedSearchSuggestions(items: InventoryItem[], query: string) {
  return useMemo(() => {
    if (!query || query.length < 2) return [];

    const cacheKey = `suggestions:${query}`;
    const cachedResult = memoizationCache.get<string[]>('searchSuggestions', [items, query]);

    if (cachedResult) {
      return cachedResult;
    }

    const suggestions = new Set<string>();
    const queryLower = query.toLowerCase();

    items.forEach(item => {
      if (item.name.toLowerCase().includes(queryLower)) {
        suggestions.add(item.name);
      }
      if (item.market_hash_name.toLowerCase().includes(queryLower)) {
        suggestions.add(item.market_hash_name);
      }
    });

    const result = Array.from(suggestions).slice(0, 10);
    memoizationCache.set('searchSuggestions', [items, query], result, 60 * 1000); // 1 minute TTL
    return result;
  }, [items, query]);
}

/**
 * Hook for memoized statistics calculation
 */
export function useMemoizedStatistics(items: InventoryItem[]) {
  return useMemo(() => {
    const cacheKey = `statistics:${items.length}`;
    const cachedResult = memoizationCache.get<any>('calculateStatistics', [items]);

    if (cachedResult) {
      return cachedResult;
    }

    const groupedByType = items.reduce((acc, item) => {
      const type = getInventoryType(item) || 'Unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const groupedByRarity = items.reduce((acc, item) => {
      const rarity = getInventoryRarity(item) || 'Unknown';
      acc[rarity] = (acc[rarity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const result = {
      groupedByType,
      groupedByRarity,
      mostCommonType: Object.entries(groupedByType).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None',
      mostCommonRarity: Object.entries(groupedByRarity).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None',
    };

    memoizationCache.set('calculateStatistics', [items], result, 5 * 60 * 1000); // 5 minutes TTL
    return result;
  }, [items]);
}

/**
 * Hook for managing memoization cache
 */
export function useMemoizationManager() {
  const [stats, setStats] = useState(memoizationCache.getStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(memoizationCache.getStats());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const clearCache = useCallback(() => {
    memoizationCache.clear();
    setStats(memoizationCache.getStats());
  }, []);

  const refreshStats = useCallback(() => {
    setStats(memoizationCache.getStats());
  }, []);

  return {
    stats,
    clearCache,
    refreshStats,
  };
}

// Helper functions for metadata extraction
function getInventoryType(item: InventoryItem): string {
  // Extract type from descriptions or item.type
  const tags = item?.descriptions || [];
  const typeTag = tags.find((t: any) =>
    String(t.type || '').toLowerCase().includes('type')
  )?.value;

  return typeTag || item.type || '';
}

function getInventoryRarity(item: InventoryItem): string {
  const tags = item?.descriptions || [];
  const rarityTag = tags.find((t: any) =>
    String(t.type || '').toLowerCase().includes('rarity')
  )?.value;

  return rarityTag || '';
}

function getInventoryExterior(item: InventoryItem): string {
  const tags = item?.descriptions || [];
  const exteriorTag = tags.find((t: any) =>
    String(t.type || '').toLowerCase().includes('exterior')
  )?.value;

  return exteriorTag || '';
}