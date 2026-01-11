import axios from 'axios';

const API_BASE_URL = '';

export interface SteamProfile {
  steamId: string;
  username: string;
  avatar: string;
  profileUrl: string;
  tradeUrl?: string;
}

export interface User {
  id: number;
  steamId: string;
  username: string;
  avatar: string;
  profileUrl: string;
  tradeUrlVerified: boolean;
  createdAt: string;
  stats?: {
    totalTrades: number;
    successfulTrades: number;
    failedTrades: number;
    successRate: number;
    tradeUrlVerified: boolean;
    reputation: string;
  };
}

export interface InventoryItem {
  id: number;
  assetId: string;
  classId: string;
  instanceId: string;
  marketName: string;
  marketHashName: string;
  iconUrl: string;
  steamPrice?: number;
  suggestedPrice?: number;
  tradable: boolean;
  marketable: boolean;
  active: boolean;
  createdAt: string;
  appId: number;
}

export interface Listing {
  id: number;
  listingId: string;
  sellerSteamId: string;
  inventoryItemId: number;
  type: 'fixed_price' | 'auction' | 'offer';
  status: 'active' | 'sold' | 'cancelled' | 'expired' | 'pending';
  price: number;
  startingPrice?: number;
  reservePrice?: number;
  buyoutPrice?: number;
  currentBid?: number;
  highestBidderSteamId?: string;
  serviceFeePercent: number;
  serviceFeeAmount?: number;
  description?: string;
  condition?: string;
  images?: string[];
  expiresAt?: string;
  soldAt?: string;
  cancelledAt?: string;
  viewCount: number;
  bidCount: number;
  featured: boolean;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
  seller: {
    steamId: string;
    username: string;
    avatar: string;
  };
  inventoryItem: InventoryItem;
}

export interface Trade {
  id: number;
  tradeId: string;
  senderSteamId: string;
  recipientSteamId: string;
  type: 'offer' | 'request';
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled' | 'completed' | 'failed';
  offeredAmount?: number;
  requestedAmount?: number;
  offeredItemId?: number;
  requestedItemId?: number;
  message?: string;
  senderConfirmed: boolean;
  recipientConfirmed: boolean;
  expiresAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  sender: {
    steamId: string;
    username: string;
    avatar: string;
  };
  recipient: {
    steamId: string;
    username: string;
    avatar: string;
  };
  offeredItem?: InventoryItem;
  requestedItem?: InventoryItem;
}

class ApiService {
  private axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true,
  });

  // Auth endpoints
  async steamAuth(): Promise<{ url: string }> {
    const response = await this.axiosInstance.get('/auth/steam');
    return response.data;
  }

  async getMe(): Promise<{ success: boolean; data: User }> {
    const response = await this.axiosInstance.get('/auth/me');
    return response.data;
  }

  async logout(): Promise<{ success: boolean }> {
    const response = await this.axiosInstance.post('/auth/logout');
    return response.data;
  }

  async updateTradeUrl(tradeUrl: string): Promise<{ success: boolean; data: User }> {
    const response = await this.axiosInstance.post('/auth/trade-url', { tradeUrl });
    return response.data;
  }

  // User endpoints
  async searchUsers(query: string): Promise<{ success: boolean; data: User[] }> {
    const response = await this.axiosInstance.get('/users/search', { params: { q: query } });
    return response.data;
  }

  async getUserById(id: string): Promise<{ success: boolean; data: User }> {
    const response = await this.axiosInstance.get(`/users/${id}`);
    return response.data;
  }

  async getUserStats(id: string): Promise<{ success: boolean; data: any }> {
    const response = await this.axiosInstance.get(`/users/${id}/stats`);
    return response.data;
  }

  async getUserInventory(id: string): Promise<{ success: boolean; data: InventoryItem[] }> {
    const response = await this.axiosInstance.get(`/users/${id}/inventory`);
    return response.data;
  }

  // Inventory endpoints
  async syncInventory(appId = 730, contextId = '2'): Promise<{ success: boolean; data: any }> {
    const response = await this.axiosInstance.get('/inventory/sync', {
      params: { appId, contextId }
    });
    return response.data;
  }

  async getUserInventoryItems(appId = 730, limit = 100, offset = 0): Promise<{ success: boolean; data: any }> {
    const response = await this.axiosInstance.get('/inventory', {
      params: { appId, limit, offset }
    });
    return response.data;
  }

  async getInventoryValue(): Promise<{ success: boolean; data: any }> {
    const response = await this.axiosInstance.get('/inventory/value');
    return response.data;
  }

  async updateItemPrices(): Promise<{ success: boolean; data: any }> {
    const response = await this.axiosInstance.post('/inventory/update-prices');
    return response.data;
  }

  async getSteamInventory(steamId?: string, appId = 730, contextId = '2'): Promise<{ success: boolean; data: any }> {
    const response = await this.axiosInstance.get('/inventory/steam', {
      params: { steamId, appId, contextId }
    });
    return response.data;
  }

  async removeInventoryItem(itemId: number): Promise<{ success: boolean; data: any }> {
    const response = await this.axiosInstance.delete(`/inventory/${itemId}`);
    return response.data;
  }

  async getInventoryStats(): Promise<{ success: boolean; data: any }> {
    const response = await this.axiosInstance.get('/inventory/stats');
    return response.data;
  }

  async bulkSync(appIds: number[] = [730]): Promise<{ success: boolean; data: any }> {
    const response = await this.axiosInstance.post('/inventory/bulk-sync', { appIds });
    return response.data;
  }

  // Marketplace endpoints
  async createListing(listingData: any): Promise<{ success: boolean; data: Listing }> {
    const response = await this.axiosInstance.post('/listings', listingData);
    return response.data;
  }

  async getListingById(listingId: string): Promise<{ success: boolean; data: Listing }> {
    const response = await this.axiosInstance.get(`/listings/${listingId}`);
    return response.data;
  }

  async searchListings(params: any): Promise<{ success: boolean; data: any }> {
    const response = await this.axiosInstance.get('/listings', { params });
    return response.data;
  }

  async getUserListings(steamId: string, status?: string, limit = 20, offset = 0): Promise<{ success: boolean; data: any }> {
    const response = await this.axiosInstance.get(`/listings/user/${steamId}`, {
      params: { status, limit, offset }
    });
    return response.data;
  }

  async purchaseListing(listingId: string): Promise<{ success: boolean; data: Listing }> {
    const response = await this.axiosInstance.post(`/listings/${listingId}/purchase`);
    return response.data;
  }

  async cancelListing(listingId: string): Promise<{ success: boolean; data: Listing }> {
    const response = await this.axiosInstance.post(`/listings/${listingId}/cancel`);
    return response.data;
  }

  async placeBid(listingId: string, amount: number): Promise<{ success: boolean; data: Listing }> {
    const response = await this.axiosInstance.post(`/listings/${listingId}/bid`, { amount });
    return response.data;
  }

  async getFeaturedListings(limit = 10): Promise<{ success: boolean; data: any }> {
    const response = await this.axiosInstance.get('/listings/featured', { params: { limit } });
    return response.data;
  }

  async getTopSellingItems(appId?: number, limit = 10): Promise<{ success: boolean; data: any }> {
    const response = await this.axiosInstance.get('/listings/top-selling', {
      params: { appId, limit }
    });
    return response.data;
  }

  async getListingStatistics(): Promise<{ success: boolean; data: any }> {
    const response = await this.axiosInstance.get('/listings/stats');
    return response.data;
  }

  // Trade endpoints
  async createTrade(tradeData: any): Promise<{ success: boolean; data: Trade }> {
    const response = await this.axiosInstance.post('/trades', tradeData);
    return response.data;
  }

  async getTradeById(tradeId: string): Promise<{ success: boolean; data: Trade }> {
    const response = await this.axiosInstance.get(`/trades/${tradeId}`);
    return response.data;
  }

  async getUserTrades(status?: string, limit = 20, offset = 0): Promise<{ success: boolean; data: any }> {
    const response = await this.axiosInstance.get('/trades', {
      params: { status, limit, offset }
    });
    return response.data;
  }

  async acceptTrade(tradeId: string): Promise<{ success: boolean; data: Trade }> {
    const response = await this.axiosInstance.post(`/trades/${tradeId}/accept`);
    return response.data;
  }

  async declineTrade(tradeId: string): Promise<{ success: boolean; data: Trade }> {
    const response = await this.axiosInstance.post(`/trades/${tradeId}/decline`);
    return response.data;
  }

  async cancelTrade(tradeId: string): Promise<{ success: boolean; data: Trade }> {
    const response = await this.axiosInstance.post(`/trades/${tradeId}/cancel`);
    return response.data;
  }

  async getTradeStatus(tradeId: string): Promise<{ success: boolean; data: any }> {
    const response = await this.axiosInstance.get(`/trades/${tradeId}/status`);
    return response.data;
  }

  async getTradeStatistics(): Promise<{ success: boolean; data: any }> {
    const response = await this.axiosInstance.get('/trades/stats');
    return response.data;
  }

  async getActiveTradesCount(): Promise<{ success: boolean; data: any }> {
    const response = await this.axiosInstance.get('/trades/active/count');
    return response.data;
  }
}

export const apiService = new ApiService();