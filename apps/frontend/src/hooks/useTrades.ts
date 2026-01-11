import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { tradeAPI } from '@/lib/api';
import { useTradeStore } from '@/stores/tradeStore';
import toast from 'react-hot-toast';

interface TradeFilters {
  status?: string;
  type?: 'sent' | 'received' | 'all';
  userId?: string;
  gameId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface UseTradesReturn {
  // Data
  trades: any[];
  total: number;
  pages: number;

  // Loading states
  isLoading: boolean;
  isFetching: boolean;
  hasNextPage: boolean;

  // Actions
  fetchNextPage: () => void;
  refetch: () => void;

  // Mutations
  createTradeMutation: {
    mutate: (tradeData: any) => void;
    isLoading: boolean;
  };
  respondTradeMutation: {
    mutate: (tradeId: string, action: 'accept' | 'decline') => void;
    isLoading: boolean;
  };
  cancelTradeMutation: {
    mutate: (tradeId: string) => void;
    isLoading: boolean;
  };
}

export function useTrades(filters: TradeFilters = {}) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Base query key
  const queryKey = ['trades', filters, user?.steamId];

  // Main trades query
  const {
    data,
    isLoading,
    isFetching,
    refetch,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey,
    initialPageParam: 1,
    queryFn: ({ pageParam = 1 }) =>
      tradeAPI.getTrades({
        ...filters,
        page: pageParam,
        limit: filters.limit || 20,
      }),
    enabled: isAuthenticated && !!user?.steamId,
    getNextPageParam: (lastPage: any) => {
      if (lastPage.currentPage < lastPage.totalPages) {
        return lastPage.currentPage + 1;
      }
      return undefined;
    },
  });

  // Extract trades from paginated response
  const trades = data?.pages?.flatMap((page: any) => page.trades) || [];
  const total = (data?.pages?.[0] as any)?.total || 0;
  const pages = (data?.pages?.[0] as any)?.totalPages || 0;

  // Create trade mutation
  const createTradeMutation = useMutation({
    mutationFn: tradeAPI.createTrade,
    onSuccess: (response) => {
      toast.success('Trade offer sent successfully!');
      // Invalidate trades query to refetch
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      // Clear trade store
      useTradeStore.getState().clearSelection();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create trade');
    },
  });

  // Respond to trade mutation
  const respondTradeMutation = useMutation({
    mutationFn: ({ tradeId, action }: { tradeId: string; action: 'accept' | 'decline' }) =>
      tradeAPI.respondToTrade(tradeId, action),
    onSuccess: (response, { action }) => {
      const message = action === 'accept' ? 'Trade accepted!' : 'Trade declined';
      toast.success(message);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any) => {
      const action = error.config?.data?.action || 'respond';
      toast.error(`Failed to ${action} trade: ${error.response?.data?.message}`);
    },
  });

  // Cancel trade mutation
  const cancelTradeMutation = useMutation({
    mutationFn: tradeAPI.cancelTrade,
    onSuccess: (response) => {
      toast.success('Trade cancelled successfully');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel trade');
    },
  });

  // Create trade action
  const createTrade = (tradeData: any) => {
    createTradeMutation.mutate(tradeData);
  };

  // Respond to trade action
  const respondToTrade = (tradeId: string, action: 'accept' | 'decline') => {
    respondTradeMutation.mutate({ tradeId, action });
  };

  // Cancel trade action
  const cancelTrade = (tradeId: string) => {
    cancelTradeMutation.mutate(tradeId);
  };

  return {
    // Data
    trades,
    total,
    pages,

    // Loading states
    isLoading,
    isFetching,
    hasNextPage: hasNextPage || false,

    // Actions
    fetchNextPage,
    refetch,

    // Mutations
    createTradeMutation: {
      mutate: createTrade,
      isLoading: createTradeMutation.isPending,
    },
    respondTradeMutation: {
      mutate: respondToTrade,
      isLoading: respondTradeMutation.isPending,
    },
    cancelTradeMutation: {
      mutate: cancelTrade,
      isLoading: cancelTradeMutation.isPending,
    },
  };
}

// Hook for single trade
export function useTrade(tradeId: string) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['trade', tradeId],
    queryFn: () => tradeAPI.getTrade(tradeId),
    enabled: isAuthenticated && !!tradeId,
  });

  // Update trade in cache optimistically
  const updateTrade = (updates: Partial<any>) => {
    queryClient.setQueryData(['trade', tradeId], (oldData: any) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        data: {
          ...oldData.data,
          ...updates,
        },
      };
    });
  };

  return {
    trade: (data as any)?.data,
    isLoading,
    error,
    updateTrade,
  };
}

// Hook for trade statistics
export function useTradeStatistics(timeRange: '7d' | '30d' | '90d' | '365d' = '30d') {
  const { isAuthenticated } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['trade', 'statistics', timeRange],
    queryFn: () => tradeAPI.getTradeStatistics(timeRange),
    enabled: isAuthenticated,
  });

  return {
    statistics: (data as any)?.data,
    isLoading,
    error,
  };
}