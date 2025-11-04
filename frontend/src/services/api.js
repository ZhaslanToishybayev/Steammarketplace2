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
    const response = await api.get('/marketplace/listings', { params });
    return response.data;
  },

  // Get single listing
  getListing: async (id) => {
    const response = await api.get(`/marketplace/listings/${id}`);
    return response.data;
  },

  // Create listing
  createListing: async (listingData) => {
    const response = await api.post('/marketplace/listings', listingData);
    return response.data;
  },

  // Purchase item
  purchaseItem: async (id) => {
    const response = await api.post(`/marketplace/listings/${id}/purchase`);
    return response.data;
  },

  // Get my listings
  getMyListings: async (params = {}) => {
    const response = await api.get('/marketplace/my-listings', { params });
    return response.data;
  },

  // Update listing
  updateListing: async (id, data) => {
    const response = await api.put(`/marketplace/listings/${id}`, data);
    return response.data;
  },

  // Cancel listing
  cancelListing: async (id) => {
    const response = await api.delete(`/marketplace/listings/${id}`);
    return response.data;
  },
};

export const steamService = {
  // Get Steam inventory
  getInventory: async () => {
    const response = await api.get('/steam/inventory');
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

export default api;
