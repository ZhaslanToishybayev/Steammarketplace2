import { sessionManager } from './session';

const API_BASE = '/api';

export interface InventoryItem {
  id: string;
  classid: string;
  instanceid: string;
  amount: number;
  name: string;
  market_hash_name: string;
  icon_url: string;
  type: string;
  tradable: boolean;
  marketable: boolean;
  icon_url_large?: string;
  descriptions?: Array<{
    type: string;
    value: string;
    color?: string;
  }>;
}

export interface InventoryResponse {
  success: boolean;
  steamId: string;
  appId: number;
  count: number;
  items: InventoryItem[];
  // Pagination support
  total?: number;
  page?: number;
  totalPages?: number;
  error?: string;
}

export interface ProfileResponse {
  success: boolean;
  user: {
    steamId: string;
    username: string;
    avatar: string;
    profileUrl: string;
    steamLevel?: number;
    cs2Playtime?: number;
  };
}

export interface InventoryFilters {
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

class ApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let response;
    try {
      response = await fetch(url, {
        ...options,
        credentials: 'include',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Check Auth
  async checkAuth(): Promise<boolean> {
    try {
      const response = await this.request<{ authenticated: boolean }>('/api/auth/check');
      console.log('[ApiClient] checkAuth response:', response);
      return response.authenticated;
    } catch (error) {
      console.error('[ApiClient] checkAuth error:', error);
      return false;
    }
  }

  // Get Profile
  async getProfile(): Promise<ProfileResponse> {
    return this.request<ProfileResponse>('/profile');
  }

  // Update Profile (Settings)
  async updateProfile(data: { tradeUrl: string }): Promise<{ success: boolean; message: string }> {
    return this.request('/profile/update', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Get CS2 Inventory with filters
  async getCs2Inventory(filters: InventoryFilters = {}): Promise<InventoryResponse> {
    const steamId = sessionManager.getSteamId();
    const params = new URLSearchParams();

    if (steamId) params.append('steamid', steamId);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.sort) params.append('sort', filters.sort);

    // Pass other filters if backend supports them

    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.request<InventoryResponse>(`/inventory/cs2${queryString}`);
  }

  // Get Dota Inventory
  async getDotaInventory(): Promise<InventoryResponse> {
    const steamId = sessionManager.getSteamId();
    const qp = steamId ? `?steamid=${encodeURIComponent(steamId)}` : '';
    return this.request<InventoryResponse>(`/inventory/dota${qp}`);
  }

  // Sync Inventory
  async syncInventory(): Promise<{ success: boolean; data: { addedItems: number } }> {
    return this.request<{ success: boolean; data: { addedItems: number } }>('/inventory/sync', {
      method: 'POST'
    });
  }

  // Get user's inventory by steamId (for P2P selling)
  async getInventory(steamId: string, forceRefresh: boolean = false): Promise<{ success: boolean; items: any[] }> {
    const q = forceRefresh ? '?forceRefresh=true' : '';
    return this.request<{ success: boolean; items: any[] }>(`/inventory/cs2/${encodeURIComponent(steamId)}${q}`);
  }

  // Get Item details
  async getItem(itemId: string) {
    return this.request<{ data: any }>(`/inventory/item/${itemId}`);
  }

  // Get Item Pricing
  async getItemPricing(itemId: string, timeRange: string) {
    return this.request<{ data: any }>(`/inventory/item/${itemId}/pricing?timeRange=${timeRange}`);
  }

  // Logout
  async logout(): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/api/auth/logout');
  }

  // Create P2P Listing
  async createListing(data: {
    assetId: string;
    name: string;
    marketHashName: string;
    iconUrl: string;
    price: number;
    tradeUrl: string;
  }): Promise<{ success: boolean; listing?: any }> {
    return this.request<{ success: boolean; listing?: any }>('/escrow/listings', {
      method: 'POST',
      body: JSON.stringify({
        assetId: data.assetId,
        itemName: data.name,
        itemMarketHashName: data.marketHashName, // check if backend expects itemMarketHashName or marketHashName? Backend: itemMarketHashName
        itemIconUrl: data.iconUrl,
        price: data.price,
        tradeUrl: data.tradeUrl,
        appId: 730, // Default to CS2
      }),
    });
  }

  // Get My Listings
  async getMyListings(): Promise<{ success: boolean; listings: any[] }> {
    return this.request<{ success: boolean; listings: any[] }>('/escrow/my-listings');
  }

  // Cancel Listing
  async cancelListing(listingId: number): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/escrow/listings/${listingId}`, {
      method: 'DELETE',
    });
  }

  // Wallet
  async getWalletBalance() {
    return this.request<{ success: boolean; balance: number; currency: string }>('/wallet/balance');
  }

  async debugDeposit(amount: number) {
    return this.request<{ success: boolean; message: string; new_balance: string }>('/wallet/deposit', {
      method: 'POST',
      body: JSON.stringify({ amount })
    });
  }
  // Escrow
  public escrow = {
    getListings: async (filters: any) => {
      const params = new URLSearchParams(filters);
      return this.request<{ success: boolean; data: any[] }>(`/escrow/listings?${params}`);
    },
    buyListing: async (id: string) => {
      return this.request<{ success: boolean; data: any }>(`/escrow/buy/${id}`, {
        method: 'POST'
      });
    },
    // NEW: Buy Cart (Batch)
    buyCart: async (listingIds: number[]) => {
      return this.request<{ success: boolean; message: string }>(`/escrow/buy-cart`, {
        method: 'POST',
        body: JSON.stringify({ listingIds })
      });
    },
    // NEW: Retry Trade
    retryTrade: async (tradeUuid: string) => {
      return this.request<{ success: boolean }>(`/escrow/trades/${tradeUuid}/retry`, {
        method: 'POST'
      });
    },
    // NEW: Cancel Trade (Refund)
    cancelTrade: async (tradeUuid: string) => {
      return this.request<{ success: boolean }>(`/escrow/trades/${tradeUuid}/cancel`, {
        method: 'POST'
      });
    }
  };

  // P2P Trading
  public p2p = {
    getMyListings: async () => {
      return this.request<{ success: boolean; data: any[] }>('/p2p/my-listings');
    },
    createListing: async (data: { assetId: string; price: number; tradeUrl: string }) => {
      return this.request<{ success: boolean; data: any }>('/p2p/list', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    buyListing: async (listingId: number, buyerTradeUrl: string) => {
      return this.request<{ success: boolean; data: any }>(`/p2p/buy/${listingId}`, {
        method: 'POST',
        body: JSON.stringify({ buyerTradeUrl })
      });
    },
    cancelListing: async (listingId: number) => {
      return this.request<{ success: boolean }>(`/p2p/listing/${listingId}`, {
        method: 'DELETE'
      });
    },
    getSales: async () => {
      return this.request<{ success: boolean; data: any[] }>('/p2p/sales');
    }
  };
}


export const tradeAPI = {
  getTrades: async (filters: any) => {
    return apiClient['request'](`/trades?${new URLSearchParams(filters)}`);
  },
  createTrade: async (data: any) => {
    return apiClient['request']('/trades', { method: 'POST', body: JSON.stringify(data) });
  },
  respondToTrade: async (tradeId: string, action: 'accept' | 'decline') => {
    return apiClient['request'](`/trades/${tradeId}/${action}`, { method: 'POST' });
  },
  cancelTrade: async (tradeId: string) => {
    return apiClient['request'](`/trades/${tradeId}/cancel`, { method: 'POST' });
  },
  getTrade: async (tradeId: string) => {
    return apiClient['request'](`/trades/${tradeId}`);
  },
  getTradeStatistics: async (timeRange: string) => {
    return apiClient['request'](`/trades/statistics?timeRange=${timeRange}`);
  }
};

export const walletAPI = {
  getBalance: async () => apiClient.getWalletBalance(),
  getTransactions: async (filters: any) => {
    return apiClient['request'](`/wallet/transactions?${new URLSearchParams(filters)}`);
  },
  deposit: async (amount: number) => apiClient.debugDeposit(amount),
  withdraw: async (data: any) => {
    return apiClient['request']('/wallet/withdraw', { method: 'POST', body: JSON.stringify(data) });
  },
  transfer: async (data: any) => {
    return apiClient['request']('/wallet/transfer', { method: 'POST', body: JSON.stringify(data) });
  },
  getStatistics: async (timeRange: string) => {
    return apiClient['request'](`/wallet/statistics?timeRange=${timeRange}`);
  },
  getPaymentMethods: async () => {
    return apiClient['request']('/wallet/payment-methods');
  },
  getWithdrawalLimits: async () => {
    return apiClient['request']('/wallet/limits');
  },
  getTransaction: async (id: string) => {
    return apiClient['request'](`/wallet/transactions/${id}`);
  },
  getPendingWithdrawals: async () => {
    return apiClient['request']('/wallet/withdrawals/pending');
  }
};

export const apiClient = new ApiClient();

