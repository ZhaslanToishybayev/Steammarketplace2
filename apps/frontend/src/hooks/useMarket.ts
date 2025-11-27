import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { marketAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface MarketFilters {
  gameId?: string;
  rarity?: string[];
  wear?: string[];
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  minFloat?: number;
  maxFloat?: number;
  sort?: string;
  page?: number;
  limit?: number;
}

interface BuyItemData {
  listingId: string;
  quantity: number;
  paymentMethod?: string;
  useBalance?: boolean;
}

interface CreateListingData {
  itemId: string;
  price: number;
  quantity: number;
  description?: string;
  duration?: number; // in days
}

export function useMarket(filters: MarketFilters = {}) {
  const queryKey = ['market', filters];

  const {
    data,
    isLoading,
    isFetching,
    refetch,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam = 1 }) =>
      marketAPI.getListings({
        ...filters,
        page: pageParam,
        limit: filters.limit || 20,
      }),
    getNextPageParam: (lastPage) => {
      if (lastPage.currentPage < lastPage.totalPages) {
        return lastPage.currentPage + 1;
      }
      return undefined;
    },
  });

  const listings = data?.pages?.flatMap((page) => page.listings) || [];
  const total = data?.pages?.[0]?.total || 0;
  const pages = data?.pages?.[0]?.totalPages || 0;

  return {
    listings,
    total,
    pages,
    isLoading,
    isFetching,
    hasNextPage,
    fetchNextPage,
    refetch,
  };
}

// Hook for buying items
export function useBuyItem() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: marketAPI.buyItem,
    onSuccess: (response) => {
      toast.success('Item purchased successfully!');
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['market'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to purchase item');
    },
  });

  return {
    buyItem: mutation.mutate,
    isLoading: mutation.isLoading,
  };
}

// Hook for creating listings
export function useCreateListing() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: marketAPI.createListing,
    onSuccess: (response) => {
      toast.success('Item listed successfully!');
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['market'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create listing');
    },
  });

  return {
    createListing: mutation.mutate,
    isLoading: mutation.isLoading,
  };
}

// Hook for canceling listings
export function useCancelListing() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: marketAPI.cancelListing,
    onSuccess: (response) => {
      toast.success('Listing cancelled successfully!');
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['market'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel listing');
    },
  });

  return {
    cancelListing: mutation.mutate,
    isLoading: mutation.isLoading,
  };
}

// Hook for user's own listings
export function useMyListings() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['market', 'my-listings'],
    queryFn: marketAPI.getMyListings,
  });

  return {
    listings: data?.data || [],
    isLoading,
    error,
  };
}

// Hook for listing details
export function useListing(listingId: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['market', 'listing', listingId],
    queryFn: () => marketAPI.getListing(listingId),
    enabled: !!listingId,
  });

  return {
    listing: data?.data,
    isLoading,
    error,
  };
}

// Hook for marketplace statistics
export function useMarketStats(timeRange: '7d' | '30d' | '90d' | '365d' = '30d') {
  const { data, isLoading, error } = useQuery({
    queryKey: ['market', 'stats', timeRange],
    queryFn: () => marketAPI.getStats(timeRange),
  });

  return {
    stats: data?.data,
    isLoading,
    error,
  };
}

// Hook for trending items
export function useTrendingItems(limit: number = 10) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['market', 'trending', limit],
    queryFn: () => marketAPI.getTrendingItems(limit),
  });

  return {
    items: data?.data || [],
    isLoading,
    error,
  };
}

// Hook for recently added items
export function useRecentlyAdded(limit: number = 20) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['market', 'recent', limit],
    queryFn: () => marketAPI.getRecentlyAdded(limit),
  });

  return {
    items: data?.data || [],
    isLoading,
    error,
  };
}

// Hook for price history
export function usePriceHistory(itemId: string, timeRange: '1d' | '7d' | '30d' | '90d' = '30d') {
  const { data, isLoading, error } = useQuery({
    queryKey: ['market', 'price-history', itemId, timeRange],
    queryFn: () => marketAPI.getPriceHistory(itemId, timeRange),
    enabled: !!itemId,
  });

  return {
    history: data?.data || [],
    isLoading,
    error,
  };
}