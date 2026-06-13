import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { walletAPI } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

interface TransactionFilters {
  type?: 'deposit' | 'withdrawal' | 'trade' | 'bonus' | 'fee' | 'all';
  status?: 'pending' | 'completed' | 'failed' | 'all';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

interface UseWalletReturn {
  // Balance
  balance: number;
  availableBalance: number;
  pendingBalance: number;

  // Transactions
  transactions: any[];
  total: number;
  pages: number;

  // Loading states
  isLoading: boolean;
  isFetching: boolean;
  hasNextPage: boolean;

  // Actions
  refetchBalance: () => void;
  fetchNextPage: () => void;

  // Mutations
  depositMutation: {
    mutate: (amount: number) => void;
    isLoading: boolean;
  };
  withdrawMutation: {
    mutate: (amount: number, method: string) => void;
    isLoading: boolean;
  };
  transferMutation: {
    mutate: (data: { toUserId: string; amount: number; message?: string }) => void;
    isLoading: boolean;
  };
}

export function useWallet() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Balance query
  const {
    data: balanceData,
    isLoading: balanceLoading,
    refetch: refetchBalance,
  } = useQuery({
    queryKey: ['wallet', 'balance'],
    queryFn: walletAPI.getBalance,
    enabled: isAuthenticated,
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Real-time balance updates from auth store
  const userBalance = useAuthStore((state) => state.user?.balance);

  // Transactions query
  const {
    data: transactionsData,
    isLoading: transactionsLoading,
    isFetching: transactionsFetching,
    refetch: refetchTransactions,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['wallet', 'transactions'],
    queryFn: ({ pageParam }) =>
      walletAPI.getTransactions({
        page: pageParam,
        limit: 20,
      }),
    enabled: isAuthenticated,
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) => {
      if (lastPage.currentPage < lastPage.totalPages) {
        return lastPage.currentPage + 1;
      }
      return undefined;
    },
  });

  // Deposit mutation
  const depositMutation = useMutation({
    mutationFn: walletAPI.deposit,
    onSuccess: (response) => {
      toast.success('Deposit initiated successfully!');
      // Update balance optimistically
      if (response.new_balance !== undefined) {
        useAuthStore.getState().updateBalance(parseFloat(response.new_balance));
      }
      queryClient.invalidateQueries({ queryKey: ['wallet', 'balance'] });
      queryClient.invalidateQueries({ queryKey: ['wallet', 'transactions'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Deposit failed');
    },
  });

  // Withdraw mutation
  const withdrawMutation = useMutation({
    mutationFn: walletAPI.withdraw,
    onSuccess: (response: any) => {
      toast.success('Withdrawal requested successfully!');
      // Update balance optimistically
      if (response.balance !== undefined) {
        useAuthStore.getState().updateBalance(response.balance);
      }
      queryClient.invalidateQueries({ queryKey: ['wallet', 'balance'] });
      queryClient.invalidateQueries({ queryKey: ['wallet', 'transactions'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Withdrawal failed');
    },
  });

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: walletAPI.transfer,
    onSuccess: (response: any) => {
      toast.success('Transfer completed successfully!');
      // Update balance optimistically
      if (response.balance !== undefined) {
        useAuthStore.getState().updateBalance(response.balance);
      }
      queryClient.invalidateQueries({ queryKey: ['wallet', 'balance'] });
      queryClient.invalidateQueries({ queryKey: ['wallet', 'transactions'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Transfer failed');
    },
  });

  // Get transactions with filters
  const useTransactions = (filters: TransactionFilters = {}) => {
    return useInfiniteQuery({
      queryKey: ['wallet', 'transactions', filters],
      queryFn: ({ pageParam }) =>
        walletAPI.getTransactions({
          ...filters,
          page: pageParam,
          limit: 20,
        }),
      enabled: isAuthenticated,
      initialPageParam: 1,
      getNextPageParam: (lastPage: any) => {
        if (lastPage.currentPage < lastPage.totalPages) {
          return lastPage.currentPage + 1;
        }
        return undefined;
      },
    });
  };

  // Get wallet statistics
  const useWalletStatistics = (timeRange: '7d' | '30d' | '90d' | '365d' = '30d') => {
    return useQuery({
      queryKey: ['wallet', 'statistics', timeRange],
      queryFn: () => walletAPI.getStatistics(timeRange),
      enabled: isAuthenticated,
    });
  };

  // Get supported payment methods
  const usePaymentMethods = () => {
    return useQuery({
      queryKey: ['wallet', 'payment-methods'],
      queryFn: walletAPI.getPaymentMethods,
      enabled: isAuthenticated,
    });
  };

  // Get withdrawal limits
  const useWithdrawalLimits = () => {
    return useQuery({
      queryKey: ['wallet', 'withdrawal-limits'],
      queryFn: walletAPI.getWithdrawalLimits,
      enabled: isAuthenticated,
    });
  };

  // Transactions data
  const transactions = transactionsData?.pages?.flatMap((page: any) => page.transactions) || [];
  const total = (transactionsData?.pages?.[0] as any)?.total || 0;
  const pages = (transactionsData?.pages?.[0] as any)?.totalPages || 0;

  // Current balance (prefer real-time from auth store, fallback to API)
  const balance = userBalance !== undefined ? userBalance : (balanceData?.balance || 0);
  const availableBalance = balance;
  const pendingBalance = 0;

  return {
    // Balance
    balance,
    availableBalance,
    pendingBalance,

    // Transactions
    transactions,
    total,
    pages,

    // Loading states
    isLoading: balanceLoading || transactionsLoading,
    isFetching: transactionsFetching,
    hasNextPage: hasNextPage || false,

    // Actions
    refetchBalance,
    fetchNextPage,

    // Mutations
    depositMutation: {
      mutate: depositMutation.mutate,
      isLoading: depositMutation.isPending,
    },
    withdrawMutation: {
      mutate: withdrawMutation.mutate,
      isLoading: withdrawMutation.isPending,
    },
    transferMutation: {
      mutate: transferMutation.mutate,
      isLoading: transferMutation.isPending,
    },

    // Helper hooks
    useTransactions,
    useWalletStatistics,
    usePaymentMethods,
    useWithdrawalLimits,
  };
}

// Hook for specific transaction
export function useTransaction(transactionId: string) {
  const { isAuthenticated } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['wallet', 'transaction', transactionId],
    queryFn: () => walletAPI.getTransaction(transactionId),
    enabled: isAuthenticated && !!transactionId,
  });

  return {
    transaction: data as any,
    isLoading,
    error,
  };
}

// Hook for pending withdrawals
export function usePendingWithdrawals() {
  const { isAuthenticated } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['wallet', 'pending-withdrawals'],
    queryFn: walletAPI.getPendingWithdrawals,
    enabled: isAuthenticated,
  });

  return {
    withdrawals: (data as any) || [],
    isLoading,
    error,
  };
}