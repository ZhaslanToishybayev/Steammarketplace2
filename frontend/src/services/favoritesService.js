import api from './api';

export const favoritesService = {
  // Get user's favorite listings
  getFavorites: async () => {
    const response = await api.get('/marketplace/favorites');
    return response.data;
  },

  // Add item to favorites
  addToFavorites: async (listingId) => {
    const response = await api.post(`/marketplace/favorites/${listingId}`);
    return response.data;
  },

  // Remove item from favorites
  removeFromFavorites: async (listingId) => {
    const response = await api.delete(`/marketplace/favorites/${listingId}`);
    return response.data;
  },

  // Check if item is in favorites
  checkFavorite: async (listingId) => {
    const response = await api.get(`/marketplace/favorites/check/${listingId}`);
    return response.data;
  },

  // Toggle favorite status
  toggleFavorite: async (listingId) => {
    try {
      const isFavorite = await favoritesService.checkFavorite(listingId);
      if (isFavorite) {
        await favoritesService.removeFromFavorites(listingId);
        return { isFavorite: false };
      } else {
        await favoritesService.addToFavorites(listingId);
        return { isFavorite: true };
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    }
  },
};
