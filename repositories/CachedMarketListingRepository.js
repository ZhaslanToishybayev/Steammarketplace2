/**
 * Cached Market Listing Repository
 * MarketListingRepository with Redis caching
 */

const MarketListingRepository = require('./implementations/MarketListingRepository');
const cacheService = require('../services/cache/RedisCacheService');

class CachedMarketListingRepository extends MarketListingRepository {
  constructor() {
    super();
    this.cacheNamespace = 'listings';
    this.defaultCacheTTL = 300; // 5 minutes
  }

  /**
   * Get all active listings with caching
   */
  async getActiveListings(filters = {}, options = {}, page = 1, limit = 20) {
    const cacheKey = cacheService.generateKey(
      this.cacheNamespace,
      `active:${JSON.stringify({ filters, options, page, limit })}`
    );

    // Try to get from cache
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const result = await super.getActiveListings(filters, options, page, limit);

    // Cache the result
    await cacheService.set(cacheKey, result, this.defaultCacheTTL);

    return result;
  }

  /**
   * Search listings with caching
   */
  async searchListings(searchTerm, filters = {}, options = {}, page = 1, limit = 20) {
    const cacheKey = cacheService.generateKey(
      this.cacheNamespace,
      `search:${searchTerm}:${JSON.stringify({ filters, options, page, limit })}`
    );

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await super.searchListings(searchTerm, filters, options, page, limit);
    await cacheService.set(cacheKey, result, 600); // 10 minutes for search results

    return result;
  }

  /**
   * Find by price range with caching
   */
  async findByPriceRange(minPrice, maxPrice, filters = {}, options = {}, page = 1, limit = 20) {
    const cacheKey = cacheService.generateKey(
      this.cacheNamespace,
      `price:${minPrice}-${maxPrice}:${JSON.stringify({ filters, options, page, limit })}`
    );

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await super.findByPriceRange(minPrice, maxPrice, filters, options, page, limit);
    await cacheService.set(cacheKey, result, this.defaultCacheTTL);

    return result;
  }

  /**
   * Get listings by seller with caching
   */
  async getListingsBySeller(sellerId, filters = {}, options = {}, page = 1, limit = 20) {
    const cacheKey = cacheService.generateKey(
      this.cacheNamespace,
      `seller:${sellerId}:${JSON.stringify({ filters, options, page, limit })}`
    );

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await super.getListingsBySeller(sellerId, filters, options, page, limit);
    await cacheService.set(cacheKey, result, 180); // 3 minutes for user listings

    return result;
  }

  /**
   * Get featured listings with caching
   */
  async getFeaturedListings(limit = 10) {
    const cacheKey = cacheService.generateKey(
      this.cacheNamespace,
      `featured:${limit}`
    );

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await super.getFeaturedListings(limit);
    await cacheService.set(cacheKey, result, 120); // 2 minutes for featured listings

    return result;
  }

  /**
   * Get market statistics with caching
   */
  async getMarketStats(classId = null) {
    const cacheKey = cacheService.generateKey(
      this.cacheNamespace,
      `stats:${classId || 'all'}`
    );

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await super.getMarketStats(classId);
    await cacheService.set(cacheKey, result, 600); // 10 minutes for stats

    return result;
  }

  /**
   * Get trending items with caching
   */
  async getTrendingItems(limit = 10, timeframe = '24h') {
    const cacheKey = cacheService.generateKey(
      this.cacheNamespace,
      `trending:${timeframe}:${limit}`
    );

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await super.getTrendingItems(limit, timeframe);
    await cacheService.set(cacheKey, result, 1800); // 30 minutes for trending items

    return result;
  }

  /**
   * Get cheapest listing with caching
   */
  async getCheapestListing(classId, instanceId = null) {
    const cacheKey = cacheService.generateKey(
      this.cacheNamespace,
      `cheapest:${classId}:${instanceId || 'any'}`
    );

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await super.getCheapestListing(classId, instanceId);
    await cacheService.set(cacheKey, result, 60); // 1 minute for price checks

    return result;
  }

  /**
   * Create listing and invalidate cache
   */
  async create(data) {
    const result = await super.create(data);
    // Invalidate related caches
    await this._invalidateCaches();
    return result;
  }

  /**
   * Update listing and invalidate cache
   */
  async updateById(id, data) {
    const result = await super.updateById(id, data);
    // Invalidate related caches
    await this._invalidateCaches();
    return result;
  }

  /**
   * Mark as sold and invalidate cache
   */
  async markAsSold(listingId, buyerId, tradeOfferId) {
    const result = await super.markAsSold(listingId, buyerId, tradeOfferId);
    // Invalidate related caches
    await this._invalidateCaches();
    return result;
  }

  /**
   * Cancel listing and invalidate cache
   */
  async cancelListing(listingId) {
    const result = await super.cancelListing(listingId);
    // Invalidate related caches
    await this._invalidateCaches();
    return result;
  }

  /**
   * Auto-expire listings
   */
  async autoExpireListings() {
    const result = await super.autoExpireListings();
    // Invalidate related caches
    await this._invalidateCaches();
    return result;
  }

  /**
   * Invalidate related caches
   */
  async _invalidateCaches() {
    const patterns = [
      cacheService.generateKey(this.cacheNamespace, 'active:*'),
      cacheService.generateKey(this.cacheNamespace, 'search:*'),
      cacheService.generateKey(this.cacheNamespace, 'price:*'),
      cacheService.generateKey(this.cacheNamespace, 'featured:*'),
      cacheService.generateKey(this.cacheNamespace, 'stats:*'),
      cacheService.generateKey(this.cacheNamespace, 'trending:*'),
      cacheService.generateKey(this.cacheNamespace, 'cheapest:*')
    ];

    for (const pattern of patterns) {
      await cacheService.delPattern(pattern);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return cacheService.getStats();
  }

  /**
   * Clear all caches
   */
  async clearCache() {
    const pattern = cacheService.generateKey(this.cacheNamespace, '*');
    return await cacheService.delPattern(pattern);
  }
}

module.exports = new CachedMarketListingRepository();
