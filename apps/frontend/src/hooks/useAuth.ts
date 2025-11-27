import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authAPI } from '@/lib/api';
import {
  useAuthStore,
  useUser,
  useIsAuthenticated,
  useIsLoading,
  useUserRole,
  useCanTrade,
} from '@/stores/authStore';
import toast from 'react-hot-toast';

export function useAuth() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const logoutAction = useAuthStore((state) => state.logout);
  const checkAuthAction = useAuthStore((state) => state.checkAuth);
  const clearAuthAction = useAuthStore((state) => state.clearAuth);

  const user = useUser();
  const isAuthenticated = useIsAuthenticated();
  const isLoading = useIsLoading();
  const userRole = useUserRole();
  const canTrade = useCanTrade();

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: authAPI.logout,
    onSuccess: () => {
      clearAuthAction();
      queryClient.clear();
      toast.success('You have been logged out');
    },
    onError: (error: any) => {
      console.error('Logout error:', error);
      // Still clear auth state even if backend logout fails
      clearAuthAction();
    },
  });

  // Update trade URL mutation
  const updateTradeUrlMutation = useMutation({
    mutationFn: authAPI.updateTradeUrl,
    onSuccess: (response) => {
      setUser(response.data.user);
      toast.success('Trade URL updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update trade URL');
    },
  });

  // Check authentication status
  const checkAuth = useCallback(async () => {
    try {
      await checkAuthAction();
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  }, [checkAuthAction]);

  // Logout handler
  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      // Error handled by mutation
    }
  }, [logoutMutation]);

  // Update trade URL handler
  const updateTradeUrl = useCallback(async (tradeUrl: string) => {
    try {
      await updateTradeUrlMutation.mutateAsync(tradeUrl);
    } catch (error) {
      // Error handled by mutation
    }
  }, [updateTradeUrlMutation]);

  // Steam OAuth login
  const loginWithSteam = useCallback(() => {
    // Redirect to Steam OAuth
    window.location.href = '/api/auth/steam';
  }, []);

  // Check if user has required role
  const hasRole = useCallback((roles: string | string[]) => {
    if (!userRole) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(userRole);
  }, [userRole]);

  // Check if user has permission for admin actions
  const canAccessAdmin = useCallback(() => {
    return hasRole(['admin', 'moderator']);
  }, [hasRole]);

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    userRole,
    canTrade,

    // Actions
    logout,
    loginWithSteam,
    checkAuth,
    updateTradeUrl,

    // Utilities
    hasRole,
    canAccessAdmin,

    // Loading states
    isLoggingOut: logoutMutation.isLoading,
    isUpdatingTradeUrl: updateTradeUrlMutation.isLoading,
  };
}