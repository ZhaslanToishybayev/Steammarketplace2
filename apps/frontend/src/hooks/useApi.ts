import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { User, InventoryItem, Listing, Trade } from '../services/api';

// Auth hooks
export const useSteamAuth = () => {
  return useMutation({
    mutationFn: () => apiService.steamAuth(),
  });
};

export const useGetMe = () => {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => apiService.getMe(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiService.logout(),
    onSuccess: () => {
      queryClient.clear();
    },
  });
};

export const useUpdateTradeUrl = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tradeUrl: string) => apiService.updateTradeUrl(tradeUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
};

// User hooks
export const useSearchUsers = (query: string) => {
  return useQuery({
    queryKey: ['users', 'search', query],
    queryFn: () => apiService.searchUsers(query),
    enabled: query.length > 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useGetUserById = (id: string) => {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => apiService.getUserById(id),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useGetUserStats = (id: string) => {
  return useQuery({
    queryKey: ['users', id, 'stats'],
    queryFn: () => apiService.getUserStats(id),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useGetUserInventory = (id: string) => {
  return useQuery({
    queryKey: ['users', id, 'inventory'],
    queryFn: () => apiService.getUserInventory(id),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

// Inventory hooks
export const useSyncInventory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { appId?: number; contextId?: string }) =>
      apiService.syncInventory(params.appId, params.contextId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'value'] });
    },
  });
};

export const useGetUserInventoryItems = (appId = 730, limit = 100, offset = 0) => {
  return useQuery({
    queryKey: ['inventory', 'items', appId, limit, offset],
    queryFn: () => apiService.getUserInventoryItems(appId, limit, offset),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

export const useGetInventoryValue = () => {
  return useQuery({
    queryKey: ['inventory', 'value'],
    queryFn: () => apiService.getInventoryValue(),
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useUpdateItemPrices = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiService.updateItemPrices(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'value'] });
    },
  });
};

export const useGetSteamInventory = (steamId?: string, appId = 730, contextId = '2') => {
  return useQuery({
    queryKey: ['inventory', 'steam', steamId, appId, contextId],
    queryFn: () => apiService.getSteamInventory(steamId, appId, contextId),
    enabled: !!steamId || true, // Always enabled for current user
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useRemoveInventoryItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: number) => apiService.removeInventoryItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
};

export const useGetInventoryStats = () => {
  return useQuery({
    queryKey: ['inventory', 'stats'],
    queryFn: () => apiService.getInventoryStats(),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

export const useBulkSync = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (appIds: number[]) => apiService.bulkSync(appIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
};

// Marketplace hooks
export const useCreateListing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listingData: any) => apiService.createListing(listingData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
};

export const useGetListingById = (listingId: string) => {
  return useQuery({
    queryKey: ['listings', listingId],
    queryFn: () => apiService.getListingById(listingId),
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useSearchListings = (params: any) => {
  return useQuery({
    queryKey: ['listings', 'search', params],
    queryFn: () => apiService.searchListings(params),
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useGetUserListings = (steamId: string, status?: string, limit = 20, offset = 0) => {
  return useQuery({
    queryKey: ['listings', 'user', steamId, status, limit, offset],
    queryFn: () => apiService.getUserListings(steamId, status, limit, offset),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

export const usePurchaseListing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listingId: string) => apiService.purchaseListing(listingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
};

export const useCancelListing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listingId: string) => apiService.cancelListing(listingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
};

export const usePlaceBid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listingId, amount }: { listingId: string; amount: number }) =>
      apiService.placeBid(listingId, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
};

export const useGetFeaturedListings = (limit = 10) => {
  return useQuery({
    queryKey: ['listings', 'featured', limit],
    queryFn: () => apiService.getFeaturedListings(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useGetTopSellingItems = (appId?: number, limit = 10) => {
  return useQuery({
    queryKey: ['listings', 'top-selling', appId, limit],
    queryFn: () => apiService.getTopSellingItems(appId, limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useGetListingStatistics = () => {
  return useQuery({
    queryKey: ['listings', 'stats'],
    queryFn: () => apiService.getListingStatistics(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Trade hooks
export const useCreateTrade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tradeData: any) => apiService.createTrade(tradeData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
    },
  });
};

export const useGetTradeById = (tradeId: string) => {
  return useQuery({
    queryKey: ['trades', tradeId],
    queryFn: () => apiService.getTradeById(tradeId),
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useGetUserTrades = (status?: string, limit = 20, offset = 0) => {
  return useQuery({
    queryKey: ['trades', 'user', status, limit, offset],
    queryFn: () => apiService.getUserTrades(status, limit, offset),
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useAcceptTrade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tradeId: string) => apiService.acceptTrade(tradeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
    },
  });
};

export const useDeclineTrade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tradeId: string) => apiService.declineTrade(tradeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
    },
  });
};

export const useCancelTrade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tradeId: string) => apiService.cancelTrade(tradeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
    },
  });
};

export const useGetTradeStatus = (tradeId: string) => {
  return useQuery({
    queryKey: ['trades', tradeId, 'status'],
    queryFn: () => apiService.getTradeStatus(tradeId),
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useGetTradeStatistics = () => {
  return useQuery({
    queryKey: ['trades', 'stats'],
    queryFn: () => apiService.getTradeStatistics(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useGetActiveTradesCount = () => {
  return useQuery({
    queryKey: ['trades', 'active', 'count'],
    queryFn: () => apiService.getActiveTradesCount(),
    staleTime: 30 * 1000, // 30 seconds
  });
};