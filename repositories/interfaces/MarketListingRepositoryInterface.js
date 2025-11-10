/**
 * Market Listing Repository Interface
 * Defines specific operations for MarketListing model
 */

const BaseRepositoryInterface = require('./BaseRepositoryInterface');

class MarketListingRepositoryInterface extends BaseRepositoryInterface {
  /**
   * Find listing by ID
   * @param {string} id - Listing ID
   * @returns {Promise<Object|null>} Listing document
   */
  async findById(id) {
    throw new Error('Not implemented');
  }

  /**
   * Get all active listings with pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Paginated result
   */
  async getActiveListings(filters = {}, options = {}, page = 1, limit = 20) {
    throw new Error('Not implemented');
  }

  /**
   * Search listings by text
   * @param {string} searchTerm - Search term
   * @param {Object} filters - Additional filters
   * @param {Object} options - Query options
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Paginated search results
   */
  async searchListings(searchTerm, filters = {}, options = {}, page = 1, limit = 20) {
    throw new Error('Not implemented');
  }

  /**
   * Find listings by price range
   * @param {number} minPrice - Minimum price
   * @param {number} maxPrice - Maximum price
   * @param {Object} filters - Additional filters
   * @param {Object} options - Query options
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Paginated results
   */
  async findByPriceRange(minPrice, maxPrice, filters = {}, options = {}, page = 1, limit = 20) {
    throw new Error('Not implemented');
  }

  /**
   * Get listings by seller
   * @param {string} sellerId - Seller user ID
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Paginated result
   */
  async getListingsBySeller(sellerId, filters = {}, options = {}, page = 1, limit = 20) {
    throw new Error('Not implemented');
  }

  /**
   * Get user's active listings
   * @param {string} sellerId - Seller user ID
   * @returns {Promise<Array>} Array of active listings
   */
  async getUserActiveListings(sellerId) {
    throw new Error('Not implemented');
  }

  /**
   * Find listings by item name
   * @param {string} itemName - Item name
   * @param {Object} filters - Additional filters
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of listings
   */
  async findByItemName(itemName, filters = {}, options = {}) {
    throw new Error('Not implemented');
  }

  /**
   * Get featured listings
   * @param {number} limit - Number of listings
   * @returns {Promise<Array>} Array of featured listings
   */
  async getFeaturedListings(limit = 10) {
    throw new Error('Not implemented');
  }

  /**
   * Increment listing views
   * @param {string} listingId - Listing ID
   * @returns {Promise<Object|null>} Updated listing
   */
  async incrementViews(listingId) {
    throw new Error('Not implemented');
  }

  /**
   * Update listing status
   * @param {string} listingId - Listing ID
   * @param {string} status - New status
   * @param {string} buyerId - Buyer ID (optional)
   * @param {string} tradeOfferId - Trade offer ID (optional)
   * @returns {Promise<Object|null>} Updated listing
   */
  async updateStatus(listingId, status, buyerId = null, tradeOfferId = null) {
    throw new Error('Not implemented');
  }

  /**
   * Mark listing as sold
   * @param {string} listingId - Listing ID
   * @param {string} buyerId - Buyer user ID
   * @param {string} tradeOfferId - Trade offer ID
   * @returns {Promise<Object|null>} Updated listing
   */
  async markAsSold(listingId, buyerId, tradeOfferId) {
    throw new Error('Not implemented');
  }

  /**
   * Cancel listing
   * @param {string} listingId - Listing ID
   * @returns {Promise<Object|null>} Updated listing
   */
  async cancelListing(listingId) {
    throw new Error('Not implemented');
  }

  /**
   * Find expired listings
   * @returns {Promise<Array>} Array of expired listings
   */
  async findExpiredListings() {
    throw new Error('Not implemented');
  }

  /**
   * Auto-expire old listings
   * @returns {Promise<Object>} Update result
   */
  async autoExpireListings() {
    throw new Error('Not implemented');
  }

  /**
   * Get listings with sorting
   * @param {Object} filters - Filter criteria
   * @param {string} sortBy - Sort field
   * @param {string} sortOrder - Sort order (asc/desc)
   * @param {Object} options - Query options
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Paginated sorted results
   */
  async getSortedListings(filters = {}, sortBy = 'createdAt', sortOrder = 'desc', options = {}, page = 1, limit = 20) {
    throw new Error('Not implemented');
  }

  /**
   * Get cheapest listing for an item
   * @param {string} classId - Item class ID
   * @param {string} instanceId - Item instance ID (optional)
   * @returns {Promise<Object|null>} Cheapest listing
   */
  async getCheapestListing(classId, instanceId = null) {
    throw new Error('Not implemented');
  }

  /**
   * Get market statistics
   * @param {string} classId - Item class ID (optional)
   * @returns {Promise<Object>} Market stats
   */
  async getMarketStats(classId = null) {
    throw new Error('Not implemented');
  }

  /**
   * Bulk update listings
   * @param {Object} query - Query to match
   * @param {Object} update - Update data
   * @returns {Promise<Object>} Update result
   */
  async bulkUpdate(query, update) {
    throw new Error('Not implemented');
  }

  /**
   * Get listing analytics
   * @param {string} listingId - Listing ID
   * @returns {Promise<Object>} Listing analytics
   */
  async getListingAnalytics(listingId) {
    throw new Error('Not implemented');
  }

  /**
   * Find similar listings
   * @param {string} listingId - Listing ID
   * @param {number} limit - Number of similar listings
   * @returns {Promise<Array>} Array of similar listings
   */
  async findSimilarListings(listingId, limit = 5) {
    throw new Error('Not implemented');
  }

  /**
   * Get trending items
   * @param {number} limit - Number of items
   * @param {string} timeframe - Timeframe (24h, 7d, 30d)
   * @returns {Promise<Array>} Trending items
   */
  async getTrendingItems(limit = 10, timeframe = '24h') {
    throw new Error('Not implemented');
  }
}

module.exports = MarketListingRepositoryInterface;
