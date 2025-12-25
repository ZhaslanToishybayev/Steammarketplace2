import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { apiClient, InventoryFilters } from '@/lib/api';
import toast from 'react-hot-toast';

interface UseInventoryReturn {
  // Data
  items: any[];
  total: number;
  pages: number;

  // Loading states
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: any;
  isLoadingNextPage: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;

  // Actions
  fetchNextPage: () => void;
  fetchPreviousPage: () => void;
  refetch: () => void;
  syncInventory: () => void;
  clearFilters: () => void;

  // Mutations
  syncMutation: {
    mutate: () => void;
    isPending: boolean;
  };
}

export function useInventory(filters: InventoryFilters = {}) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Base query key
  const queryKey = ['inventory', filters, user?.steamId];

  // Main inventory query
  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    isFetchingNextPage,
    refetch,
    fetchNextPage,
    fetchPreviousPage,
    hasNextPage,
    hasPreviousPage,
  } = useInfiniteQuery({
    queryKey,
    initialPageParam: 1,
    queryFn: ({ pageParam = 1 }: { pageParam: number }) =>
      apiClient.getCs2Inventory({
        ...filters,
        page: pageParam,
        limit: filters.limit || 20,
      }),
    enabled: isAuthenticated && !!user?.steamId,
    getNextPageParam: (lastPage) => {
      const currentPage = lastPage.page || 1;
      const totalPages = lastPage.totalPages || 1;
      if (currentPage < totalPages) {
        return currentPage + 1;
      }
      return undefined;
    },
    getPreviousPageParam: (firstPage) => {
      const currentPage = firstPage.page || 1;
      if (currentPage > 1) {
        return currentPage - 1;
      }
      return undefined;
    },
    retry: 1, // Only retry once to fail fast
  });

  // Extract items from paginated response
  const items = data?.pages?.flatMap((page) => page.items) || [];
  const total = data?.pages?.[0]?.total || 0;
  const pages = data?.pages?.[0]?.totalPages || 0;

  // Sync inventory mutation
  const syncMutation = useMutation({
    mutationFn: () => apiClient.syncInventory(),
    onSuccess: (response) => {
      toast.success(`Synced ${response.data.addedItems} new items`);
      // Invalidate and refetch inventory data
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (error: any) => {
      toast.error(
        error.message || 'Failed to sync inventory'
      );
    },
  });

  // Sync inventory action
  const syncInventory = () => {
    syncMutation.mutate();
  };

  // Clear filters action
  const clearFilters = () => {
    queryClient.invalidateQueries({ queryKey });
  };

  // Optimistic updates for item selection/operations
  const updateItem = (itemId: string, updates: Partial<any>) => {
    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData) return oldData;

      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          items: page.items.map((item: any) =>
            item.id === itemId ? { ...item, ...updates } : item
          ),
        })),
      };
    });
  };

  // Bulk update items
  const updateItems = (updates: { id: string; updates: Partial<any> }[]) => {
    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData) return oldData;

      const updateMap = new Map(
        updates.map((update) => [update.id, update.updates])
      );

      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          items: page.items.map((item: any) =>
            updateMap.has(item.id) ? { ...item, ...updateMap.get(item.id)! } : item
          ),
        })),
      };
    });
  };

  // Real-time updates integration
  const invalidateInventory = () => {
    queryClient.invalidateQueries({ queryKey });
  };

  return {
    // Data
    items,
    total,
    pages,

    // Loading states
    isLoading,
    isFetching,
    isError,
    error,
    isLoadingNextPage: isFetchingNextPage,
    hasNextPage: hasNextPage || false,
    hasPreviousPage: hasPreviousPage || false,

    // Actions
    fetchNextPage,
    fetchPreviousPage,
    refetch,
    syncInventory,
    clearFilters,
    updateItem,
    updateItems,
    invalidateInventory,

    // Mutations
    syncMutation: {
      mutate: syncInventory,
      isPending: syncMutation.isPending,
    },
  };
}

// Hook for single item
export function useItem(itemId: string) {
  const { isAuthenticated } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['item', itemId],
    queryFn: () => apiClient.getItem(itemId),
    enabled: isAuthenticated && !!itemId,
  });

  return {
    item: data?.data,
    isLoading,
    error,
  };
}

// Hook for item pricing history
export function useItemPricing(itemId: string, timeRange: '1d' | '7d' | '30d' | '90d' = '7d') {
  const { isAuthenticated } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['item', 'pricing', itemId, timeRange],
    queryFn: () => apiClient.getItemPricing(itemId, timeRange),
    enabled: isAuthenticated && !!itemId,
  });

  return {
    pricing: data?.data,
    isLoading,
    error,
  };
}