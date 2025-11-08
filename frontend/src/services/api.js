import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  // Get current user
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Login with Steam (redirect to Steam OAuth)
  loginWithSteam: () => {
    window.location.href = `${API_BASE_URL}/auth/steam`;
  },

  // Logout
  logout: async () => {
    await api.post('/auth/logout');
    localStorage.removeItem('token');
  },
};

export const marketplaceService = {
  // Get all listings
  getListings: async (params = {}) => {
    const response = await api.get('/mvp/listings', { params });
    return response.data.data || response.data;
  },

  // Get single listing
  getListing: async (id) => {
    const response = await api.get(`/mvp/listings/${id}`);
    return response.data;
  },

  // Create listing
  createListing: async (listingData) => {
    const response = await api.post('/mvp/listings', listingData);
    return response.data;
  },

  // Purchase item
  purchaseItem: async (id) => {
    const response = await api.post(`/mvp/listings/${id}/purchase`);
    return response.data;
  },

  // Get my listings
  getMyListings: async (params = {}) => {
    const response = await api.get('/mvp/my-listings', { params });
    return response.data;
  },

  // Update listing
  updateListing: async (id, data) => {
    const response = await api.put(`/mvp/listings/${id}`, data);
    return response.data;
  },

  // Cancel listing
  cancelListing: async (id) => {
    const response = await api.delete(`/mvp/listings/${id}`);
    return response.data;
  },
};

export const steamService = {
  // Get Steam inventory (old endpoint - may not work)
  getInventory: async (game = 'cs2') => {
    const response = await api.get(`/steam/inventory?game=${game}`);
    return response.data.items || response.data;
  },

  // NEW: Get user inventory with diagnostics
  getUserInventoryWithDiagnostics: async (game = 'cs2') => {
    const response = await api.get(`/steam/user-inventory-diagnostic?game=${game}`);
    return response.data;
  },

  // Get bot inventory
  getBotInventory: async (game = 'cs2') => {
    const response = await api.get(`/steam/bot-inventory?game=${game}`);
    return response.data.items || response.data;
  },

  // NEW: Get inventory status
  getInventoryStatus: async (steamId, game = 'cs2') => {
    const response = await api.get(`/steam/inventory-status/${steamId}?game=${game}`);
    return response.data;
  },

  // NEW: Get user profile
  getUserProfile: async (steamId) => {
    const response = await api.get(`/steam/user-profile/${steamId}`);
    return response.data;
  },

  // NEW: Get owned games
  getOwnedGames: async (steamId) => {
    const response = await api.get(`/steam/owned-games/${steamId}`);
    return response.data;
  },

  // NEW: Check game ownership
  checkGameOwnership: async (steamId, appId) => {
    const response = await api.get(`/steam/game-ownership/${steamId}/${appId}`);
    return response.data;
  },

  // NEW: Get user level
  getUserLevel: async (steamId) => {
    const response = await api.get(`/steam/user-level/${steamId}`);
    return response.data;
  },

  // Set trade URL
  setTradeUrl: async (tradeUrl) => {
    const response = await api.post('/steam/trade-url', { tradeUrl });
    return response.data;
  },

  // Get trade URL
  getTradeUrl: async () => {
    const response = await api.get('/steam/trade-url');
    return response.data;
  },

  // Verify item ownership
  verifyItem: async (assetId) => {
    const response = await api.get(`/steam/verify-item/${assetId}`);
    return response.data;
  },

  // Get market price
  getMarketPrice: async (marketName) => {
    const response = await api.get(`/steam/price/${encodeURIComponent(marketName)}`);
    return response.data;
  },

  // Test trade
  testTrade: async (testData) => {
    const response = await api.post('/steam/test-trade', testData);
    return response.data;
  },
};

export const botService = {
  // Get bots status
  getBotsStatus: async () => {
    const response = await api.get('/marketplace/bots/status');
    return response.data;
  },

  // Get trade status
  getTradeStatus: async (offerId) => {
    const response = await api.get(`/marketplace/trades/${offerId}/status`);
    return response.data;
  },
};

export const tradeService = {
  // Create trade offer
  createTradeOffer: async (tradeData) => {
    const response = await api.post('/trade/create', tradeData);
    return response.data;
  },

  // Cancel trade offer
  cancelTradeOffer: async (offerId) => {
    const response = await api.post(`/trade/cancel/${offerId}`);
    return response.data;
  },

  // Get active trade offers
  getActiveOffers: async () => {
    const response = await api.get('/trade/active');
    return response.data;
  },

  // Get trade offer details
  getTradeOffer: async (offerId) => {
    const response = await api.get(`/trade/offer/${offerId}`);
    return response.data;
  },

  // Get trade history
  getTradeHistory: async (filter = 'all') => {
    const response = await api.get(`/trade/history?filter=${filter}`);
    return response.data;
  },

  // Validate asset IDs
  validateAssetIds: async (assetIds) => {
    const response = await api.post('/trade/validate', { assetIds });
    return response.data;
  },

  // Accept trade offer (for testing)
  acceptTradeOffer: async (offerId) => {
    const response = await api.post(`/trade/accept/${offerId}`);
    return response.data;
  },
};

export default api;
