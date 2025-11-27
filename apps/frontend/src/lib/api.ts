import axios from 'axios';
import { STORAGE_KEYS } from '@/utils/constants';

// Helper function to check if we're running in a browser environment
const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

// Helper function to safely access localStorage
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return isBrowser() ? localStorage.getItem(key) : null;
    } catch (error) {
      console.warn('localStorage access failed:', error);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (isBrowser()) {
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.warn('localStorage setItem failed:', error);
    }
  },
  removeItem: (key: string): void => {
    try {
      if (isBrowser()) {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn('localStorage removeItem failed:', error);
    }
  },
};

// CDN support functions
export const cdnAPI = {
  getCdnUrl: (path: string): string => {
    const cdnEnabled = process.env.NEXT_PUBLIC_CDN_ENABLED === 'true';
    const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL;
    const steamCdn = process.env.NEXT_PUBLIC_STEAM_CDN;

    if (!path) return '';

    // Handle Steam CDN URLs
    if (path.includes('steamstatic.com') || path.includes('steamcdn-a.akamaihd.net')) {
      return path;
    }

    // Use CDN if enabled
    if (cdnEnabled && cdnUrl) {
      try {
        // Ensure proper URL formation
        const baseUrl = cdnUrl.endsWith('/') ? cdnUrl.slice(0, -1) : cdnUrl;
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${baseUrl}${cleanPath}`;
      } catch (error) {
        console.warn('Failed to generate CDN URL, falling back to direct path:', error);
        return path;
      }
    }

    return path;
  },

  // Cache CDN URLs in localStorage for offline support
  cacheCdnUrl: (originalUrl: string, cdnUrl: string) => {
    try {
      if (!isBrowser()) return;

      const cachedUrls = JSON.parse(safeLocalStorage.getItem('cdn_urls') || '{}');
      cachedUrls[originalUrl] = cdnUrl;
      safeLocalStorage.setItem('cdn_urls', JSON.stringify(cachedUrls));
    } catch (error) {
      console.warn('Failed to cache CDN URL:', error);
    }
  },

  // Get cached CDN URL
  getCachedCdnUrl: (originalUrl: string): string | null => {
    try {
      if (!isBrowser()) return null;

      const cachedUrls = JSON.parse(safeLocalStorage.getItem('cdn_urls') || '{}');
      return cachedUrls[originalUrl] || null;
    } catch (error) {
      console.warn('Failed to get cached CDN URL:', error);
      return null;
    }
  },

  // Retry logic for CDN requests
  async fetchWithRetry(url: string, retries: number = 3, delay: number = 1000): Promise<Response> {
    try {
      const response = await fetch(url);
      if (!response.ok && retries > 0) {
        console.warn(`CDN request failed, retrying (${retries} attempts left):`, url);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, retries - 1, delay * 2);
      }
      return response;
    } catch (error) {
      if (retries > 0) {
        console.warn(`CDN fetch failed, retrying (${retries} attempts left):`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, retries - 1, delay * 2);
      }
      throw error;
    }
  },
};

// Create axios instance with CDN support
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = safeLocalStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add CSRF token for state-changing requests
    if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
      const csrfToken = safeLocalStorage.getItem('csrf_token');
      if (csrfToken) {
        config.headers['X-CSRF-TOKEN'] = csrfToken;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const refreshToken = safeLocalStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        if (refreshToken) {
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/auth/refresh`,
            { refreshToken }
          );

          if (response.data.accessToken) {
            safeLocalStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.data.accessToken);
            api.defaults.headers.common.Authorization = `Bearer ${response.data.accessToken}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        safeLocalStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        safeLocalStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        if (isBrowser()) {
          window.location.href = '/auth/login';
        }
        return Promise.reject(refreshError);
      }

      // No refresh token available, redirect to login
      if (isBrowser()) {
        window.location.href = '/auth/login';
      }
      return Promise.reject(error);
    }

    // Handle 403 errors (forbidden)
    if (error.response?.status === 403) {
      console.error('Access forbidden:', error.response.data);
    }

    // Handle 429 errors (rate limiting)
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      console.warn(`Rate limited. Retry after ${retryAfter} seconds.`);
    }

    // Handle 500 errors (server error)
    if (error.response?.status >= 500) {
      console.error('Server error:', error.response.data);
    }

    return Promise.reject(error);
  }
);

// API methods
export const authAPI = {
  // Steam OAuth Authentication
  refreshToken: (data: { refreshToken: string }) =>
    api.post('/auth/refresh', data),

  // User profile
  me: () => api.get('/auth/me'),
  updateTradeUrl: (tradeUrl: string) => api.patch('/auth/trade-url', { tradeUrl }),

  // Steam OAuth helpers
  loginWithSteam: () => {
    // Helper to start Steam OAuth flow
    window.location.href = '/api/auth/steam';
  },
  getSteamCallback: () => api.get('/api/auth/steam/return'),
};

export const userAPI = {
  // User profile (matches backend /user endpoints)
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data: FormData) => api.put('/user/profile', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),

  // User settings
  getSettings: () => api.get('/user/settings'),
  updateSettings: (data: any) => api.put('/user/settings', data),

  // User statistics
  getStatistics: () => api.get('/user/statistics'),

  // Notification preferences
  getNotificationPreferences: () => api.get('/user/notifications/preferences'),
  updateNotificationPreferences: (data: any) => api.put('/user/notifications/preferences', data),
};

export const itemAPI = {
  // Item management - NOTE: Backend only provides inventory access, not full item CRUD
  // getAll: (params?: {
  //   page?: number;
  //   limit?: number;
  //   category?: string;
  //   search?: string;
  //   sortBy?: string;
  //   sortOrder?: 'asc' | 'desc';
  // }) => api.get('/items', { params }),
  // getById: (id: string) => api.get(`/items/${id}`),
  // create: (data: FormData) => api.post('/items', data, {
  //   headers: {
  //     'Content-Type': 'multipart/form-data',
  //   },
  // }),
  // update: (id: string, data: FormData) => api.put(`/items/${id}`, data, {
  //   headers: {
  //     'Content-Type': 'multipart/form-data',
  //   },
  // }),
  // delete: (id: string) => api.delete(`/items/${id}`),
  // search: (query: string) => api.get(`/items/search?q=${query}`),
  // getByCategory: (category: string, params?: any) =>
  //   api.get(`/items/category/${category}`, { params }),

  // Inventory management - AVAILABLE
  getInventory: (params?: {
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
  }) => api.get('/inventory', { params }),
  syncInventory: () => api.post('/inventory/sync'),
  getItem: (id: string) => api.get(`/inventory/${id}`),

  // Item pricing - AVAILABLE through pricing service
  getItemPricing: (id: string, timeRange?: string) => api.get(`/pricing/item/${id}`, {
    params: { timeRange }
  }),
};

export const tradeAPI = {
  // Trade management - AVAILABLE
  getTrades: (params?: { status?: string; page?: number; limit?: number; type?: string; userId?: string; gameId?: string; search?: string }) =>
    api.get('/trades', { params }),
  getTrade: (id: string) => api.get(`/trades/${id}`),
  createTrade: (data: {
    itemsOffered: string[];
    itemsRequested: string[];
    message?: string;
  }) => api.post('/trades', data),

  // NOTE: respondToTrade endpoint not implemented in backend
  // respondToTrade: (tradeId: string, action: 'accept' | 'decline') =>
  //   api.post(`/trades/${tradeId}/respond`, { action }),

  cancelTrade: (tradeId: string) => api.post(`/trades/${tradeId}/cancel`),

  // Statistics - AVAILABLE
  getTradeStatistics: (timeRange?: string) => api.get('/trades/statistics', {
    params: { timeRange }
  }),

  // Legacy methods (for backward compatibility) - NOT IMPLEMENTED
  // getAll: (params?: { status?: string; page?: number; limit?: number }) =>
  //   api.get('/trades', { params }),
  // getById: (id: string) => api.get(`/trades/${id}`),
  // create: (data: {
  //   itemsOffered: string[];
  //   itemsRequested: string[];
  //   message?: string;
  // }) => api.post('/trades', data),
  // respond: (id: string, data: { accept: boolean; message?: string }) =>
  //   api.put(`/trades/${id}/response`, data),
  // cancel: (id: string) => api.put(`/trades/${id}/cancel`),
};

export const walletAPI = {
  // Balance - AVAILABLE
  getBalance: () => api.get('/wallet/balance'),

  // Transactions - AVAILABLE (but under /transactions endpoint)
  getTransactions: (params?: {
    type?: 'deposit' | 'withdrawal' | 'trade' | 'bonus' | 'fee' | 'all';
    status?: 'pending' | 'completed' | 'failed' | 'all';
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => api.get('/transactions', { params }),
  getTransaction: (id: string) => api.get(`/transactions/${id}`),

  // Financial operations - AVAILABLE
  deposit: (amount: number) => api.post('/wallet/deposit', { amount }),
  withdraw: (amount: number, method: string) => api.post('/wallet/withdraw', { amount, method }),
  transfer: (data: { toUserId: string; amount: number; message?: string }) =>
    api.post('/wallet/transfer', data),

  // NOTE: Following wallet utility methods not implemented in backend
  // getStatistics: (timeRange?: string) => api.get('/wallet/statistics', {
  //   params: { timeRange }
  // }),
  // getPaymentMethods: () => api.get('/wallet/payment-methods'),
  // getWithdrawalLimits: () => api.get('/wallet/withdrawal-limits'),
  // getPendingWithdrawals: () => api.get('/wallet/pending-withdrawals'),
};

export const notificationAPI = {
  // NOTE: Full notification system not implemented in backend
  // Only notification preferences are available through userAPI
  // getAll: (params?: { read?: boolean; page?: number; limit?: number }) =>
  //   api.get('/notifications', { params }),
  // markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  // markAllAsRead: () => api.put('/notifications/read-all'),
  // delete: (id: string) => api.delete(`/notifications/${id}`),

  // Use userAPI for notification preferences instead:
  // userAPI.getNotificationPreferences()
  // userAPI.updateNotificationPreferences(data)
};

export const botAPI = {
  // Bot management
  getAll: (params?: {
    isActive?: boolean;
    isOnline?: boolean;
    status?: string;
    page?: number;
    limit?: number;
  }) => api.get('/bots', { params }),

  getById: (id: string) => api.get(`/bots/${id}`),

  create: (data: {
    accountName: string;
    password: string;
    sharedSecret: string;
    identitySecret: string;
    steamGuardCode?: string;
    apiKey?: string;
    maxConcurrentTrades?: number;
  }) => api.post('/bots', data),

  update: (id: string, data: Partial<{
    accountName: string;
    password: string;
    sharedSecret: string;
    identitySecret: string;
    steamGuardCode?: string;
    apiKey?: string;
    maxConcurrentTrades?: number;
    isActive?: boolean;
    tradeUrl?: string;
  }>) => api.patch(`/bots/${id}`, data),

  delete: (id: string) => api.delete(`/bots/${id}`),

  // Bot actions
  activate: (id: string) => api.post(`/bots/${id}/activate`),
  deactivate: (id: string) => api.post(`/bots/${id}/deactivate`),
  forceLogin: (id: string) => api.post(`/bots/${id}/login`),
  refresh: (id: string) => api.post(`/bots/${id}/refresh`),

  // Bot statistics and monitoring
  getStatistics: (id: string) => api.get(`/bots/${id}/statistics`),
  getLogs: (id: string, params?: {
    level?: string;
    page?: number;
    limit?: number;
  }) => api.get(`/bots/${id}/logs`, { params }),
  getTrades: (id: string, params?: {
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  }) => api.get(`/bots/${id}/trades`, { params }),

  // Bulk operations
  getStats: () => api.get('/bots/stats'),
  bulkActivate: (ids: string[]) => api.post('/bots/bulk/activate', { ids }),
  bulkDeactivate: (ids: string[]) => api.post('/bots/bulk/deactivate', { ids }),
};

export default api;