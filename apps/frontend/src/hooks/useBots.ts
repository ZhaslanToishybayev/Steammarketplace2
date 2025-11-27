import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { botAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface BotFilters {
  isActive?: boolean;
  isOnline?: boolean;
  status?: string;
  page?: number;
  limit?: number;
}

// Individual hook exports
export function useBotsList(filters: BotFilters = {}) {
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['bots', filters],
    queryFn: () => botAPI.getAll(filters),
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time status updates
    refetchOnWindowFocus: true,
  });
}

export function useCreateBot(options: any = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => botAPI.create(data),
    onSuccess: (response) => {
      toast.success('Bot created successfully!');
      queryClient.invalidateQueries({ queryKey: ['bots'] });
      if (options.onSuccess) options.onSuccess(response);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to create bot';
      toast.error(message);
      if (options.onError) options.onError(error);
    },
  });
}

export function useUpdateBot(options: any = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => botAPI.update(id, data),
    onSuccess: (response, { id }) => {
      toast.success('Bot updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['bots'] });
      queryClient.invalidateQueries({ queryKey: ['bots', id] });
      if (options.onSuccess) options.onSuccess(response);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to update bot';
      toast.error(message);
      if (options.onError) options.onError(error);
    },
  });
}

export function useDeleteBot(options: any = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => botAPI.delete(id),
    onSuccess: () => {
      toast.success('Bot deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['bots'] });
      if (options.onSuccess) options.onSuccess();
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to delete bot';
      toast.error(message);
      if (options.onError) options.onError(error);
    },
  });
}

export function useBotAction(options: any = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => {
      switch (action) {
        case 'activate':
          return botAPI.activate(id);
        case 'deactivate':
          return botAPI.deactivate(id);
        case 'force-login':
          return botAPI.forceLogin(id);
        case 'refresh':
          return botAPI.refresh(id);
        default:
          throw new Error(`Unknown bot action: ${action}`);
      }
    },
    onSuccess: (response, { action }) => {
      const messages = {
        'activate': 'Bot activated successfully!',
        'deactivate': 'Bot deactivated successfully!',
        'force-login': 'Bot login initiated!',
        'refresh': 'Bot data refreshed!'
      };

      toast.success(messages[action as keyof typeof messages] || 'Action completed!');
      queryClient.invalidateQueries({ queryKey: ['bots'] });
      queryClient.invalidateQueries({ queryKey: ['bots', 'stats'] });
      if (options.onSuccess) options.onSuccess(response);
    },
    onError: (error: any, { action }) => {
      const actionName = action.replace('-', ' ');
      const message = error.response?.data?.message || `Failed to ${actionName}`;
      toast.error(message);
      if (options.onError) options.onError(error);
    },
  });
}

// Convenience hooks for common operations
export function useBot(id: string) {
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['bots', id],
    queryFn: () => botAPI.getById(id),
    enabled: isAuthenticated,
  });
}

export function useBotStatistics(id: string) {
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['bots', id, 'statistics'],
    queryFn: () => botAPI.getStatistics(id),
    enabled: isAuthenticated,
  });
}

export function useBotTrades(id: string, params?: any) {
  const { user, isAuthenticated } = useAuth();

  return useInfiniteQuery({
    queryKey: ['bots', id, 'trades', params],
    queryFn: ({ pageParam = 1 }) =>
      botAPI.getTrades(id, { ...params, page: pageParam }),
    enabled: isAuthenticated,
    getNextPageParam: (lastPage) => {
      if (lastPage.currentPage < lastPage.totalPages) {
        return lastPage.currentPage + 1;
      }
      return undefined;
    },
  });
}

export function useBotLogs(id: string, params?: any) {
  const { user, isAuthenticated } = useAuth();

  return useInfiniteQuery({
    queryKey: ['bots', id, 'logs', params],
    queryFn: ({ pageParam = 1 }) =>
      botAPI.getLogs(id, { ...params, page: pageParam }),
    enabled: isAuthenticated,
    getNextPageParam: (lastPage) => {
      if (lastPage.currentPage < lastPage.totalPages) {
        return lastPage.currentPage + 1;
      }
      return undefined;
    },
  });
}

export function useBotStats() {
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['bots', 'stats'],
    queryFn: () => botAPI.getStats(),
    enabled: isAuthenticated,
    refetchInterval: 60000, // Refetch every minute
  });
}