/**
 * Market Listing Repository Implementation
 * Handles all MarketListing model operations
 */

const BaseRepository = require('./BaseRepository');
const MarketListingRepositoryInterface = require('../interfaces/MarketListingRepositoryInterface');
const MarketListing = require('../../models/MarketListing');

class MarketListingRepository extends BaseRepository implements MarketListingRepositoryInterface {
  constructor() {
    super(MarketListing);
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
    try {
      const query = { status: 'active', ...filters };
      return await this.paginate(query, options, page, limit);
    } catch (error) {
      throw new Error(`getActiveListings failed: ${error.message}`);
    }
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
    try {
      const query = {
        $text: { $search: searchTerm },
        ...filters
      };

      const projection = {
        score: { $meta: 'textScore' },
        ...options.projection
      };

      const sortOptions = {
        score: { $meta: 'textScore' },
        ...options.sort
      };

      return await this.paginate(query, { ...options, projection, sort: sortOptions }, page, limit);
    } catch (error) {
      throw new Error(`searchListings failed: ${error.message}`);
    }
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
    try {
      const query = {
        price: { $gte: minPrice, $lte: maxPrice },
        ...filters
      };
      return await this.paginate(query, options, page, limit);
    } catch (error) {
      throw new Error(`findByPriceRange failed: ${error.message}`);
    }
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
    try {
      const query = { seller: sellerId, ...filters };
      return await this.paginate(query, options, page, limit);
    } catch (error) {
      throw new Error(`getListingsBySeller failed: ${error.message}`);
    }
  }

  /**
   * Get user's active listings
   * @param {string} sellerId - Seller user ID
   * @returns {Promise<Array>} Array of active listings
   */
  async getUserActiveListings(sellerId) {
    try {
      return await this.model
        .find({ seller: sellerId, status: 'active' })
        .sort({ createdAt: -1 })
        .lean();
    } catch (error) {
      throw new Error(`getUserActiveListings failed: ${error.message}`);
    }
  }

  /**
   * Find listings by item name
   * @param {string} itemName - Item name
   * @param {Object} filters - Additional filters
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of listings
   */
  async findByItemName(itemName, filters = {}, options = {}) {
    try {
      const query = {
        $or: [
          { 'item.name': { $regex: itemName, $options: 'i' } },
          { 'item.marketName': { $regex: itemName, $options: 'i' } }
        ],
        ...filters
      };

      let queryBuilder = this.model.find(query);

      if (options.projection) {
        queryBuilder = queryBuilder.select(options.projection);
      }

      if (options.sort) {
        queryBuilder = queryBuilder.sort(options.sort);
      }

      if (options.limit) {
        queryBuilder = queryBuilder.limit(options.limit);
      }

      return await queryBuilder.exec();
    } catch (error) {
      throw new Error(`findByItemName failed: ${error.message}`);
    }
  }

  /**
   * Get featured listings
   * @param {number} limit - Number of listings
   * @returns {Promise<Array>} Array of featured listings
   */
  async getFeaturedListings(limit = 10) {
    try {
      return await this.model
        .find({ status: 'active', featured: true })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('seller', 'steamName username displayName avatar')
        .lean();
    } catch (error) {
      throw new Error(`getFeaturedListings failed: ${error.message}`);
    }
  }

  /**
   * Increment listing views
   * @param {string} listingId - Listing ID
   * @returns {Promise<Object|null>} Updated listing
   */
  async incrementViews(listingId) {
    try {
      return await this.model.findByIdAndUpdate(
        listingId,
        { $inc: { views: 1 } },
        { new: true }
      );
    } catch (error) {
      throw new Error(`incrementViews failed: ${error.message}`);
    }
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
    try {
      const update = { status };
      if (buyerId) update.buyer = buyerId;
      if (tradeOfferId) update.tradeOfferId = tradeOfferId;

      return await this.model.findByIdAndUpdate(
        listingId,
        { $set: update },
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw new Error(`updateStatus failed: ${error.message}`);
    }
  }

  /**
   * Mark listing as sold
   * @param {string} listingId - Listing ID
   * @param {string} buyerId - Buyer user ID
   * @param {string} tradeOfferId - Trade offer ID
   * @returns {Promise<Object|null>} Updated listing
   */
  async markAsSold(listingId, buyerId, tradeOfferId) {
    try {
      return await this.model.findByIdAndUpdate(
        listingId,
        {
          $set: {
            status: 'sold',
            buyer: buyerId,
            tradeOfferId
          }
        },
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw new Error(`markAsSold failed: ${error.message}`);
    }
  }

  /**
   * Cancel listing
   * @param {string} listingId - Listing ID
   * @returns {Promise<Object|null>} Updated listing
   */
  async cancelListing(listingId) {
    try {
      return await this.model.findByIdAndUpdate(
        listingId,
        { $set: { status: 'cancelled' } },
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw new Error(`cancelListing failed: ${error.message}`);
    }
  }

  /**
   * Find expired listings
   * @returns {Promise<Array>} Array of expired listings
   */
  async findExpiredListings() {
    try {
      return await this.model
        .find({
          status: 'active',
          expiresAt: { $lt: new Date() }
        })
        .lean();
    } catch (error) {
      throw new Error(`findExpiredListings failed: ${error.message}`);
    }
  }

  /**
   * Auto-expire old listings
   * @returns {Promise<Object>} Update result
   */
  async autoExpireListings() {
    try {
      return await this.model.updateMany(
        {
          status: 'active',
          expiresAt: { $lt: new Date() }
        },
        { $set: { status: 'cancelled' } }
      );
    } catch (error) {
      throw new Error(`autoExpireListings failed: ${error.message}`);
    }
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
    try {
      const query = { ...filters };
      const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

      return await this.paginate(query, { ...options, sort }, page, limit);
    } catch (error) {
      throw new Error(`getSortedListings failed: ${error.message}`);
    }
  }

  /**
   * Get cheapest listing for an item
   * @param {string} classId - Item class ID
   * @param {string} instanceId - Item instance ID (optional)
   * @returns {Promise<Object|null>} Cheapest listing
   */
  async getCheapestListing(classId, instanceId = null) {
    try {
      const query = {
        status: 'active',
        'item.classId': classId
      };

      if (instanceId) {
        query['item.instanceId'] = instanceId;
      }

      return await this.model
        .findOne(query)
        .sort({ price: 1 })
        .populate('seller', 'steamName username displayName avatar');
    } catch (error) {
      throw new Error(`getCheapestListing failed: ${error.message}`);
    }
  }

  /**
   * Get market statistics
   * @param {string} classId - Item class ID (optional)
   * @returns {Promise<Object>} Market stats
   */
  async getMarketStats(classId = null) {
    try {
      const matchStage = classId ? { 'item.classId': classId, status: 'active' } : { status: 'active' };

      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalListings: { $sum: 1 },
            avgPrice: { $avg: '$price' },
            minPrice: { $min: '$price' },
            maxPrice: { $max: '$price' },
            totalValue: { $sum: '$price' }
          }
        }
      ];

      const result = await this.aggregate(pipeline);
      return result[0] || {
        totalListings: 0,
        avgPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        totalValue: 0
      };
    } catch (error) {
      throw new Error(`getMarketStats failed: ${error.message}`);
    }
  }

  /**
   * Bulk update listings
   * @param {Object} query - Query to match
   * @param {Object} update - Update data
   * @returns {Promise<Object>} Update result
   */
  async bulkUpdate(query, update) {
    try {
      return await this.model.updateMany(query, { $set: update });
    } catch (error) {
      throw new Error(`bulkUpdate failed: ${error.message}`);
    }
  }

  /**
   * Get listing analytics
   * @param {string} listingId - Listing ID
   * @returns {Promise<Object>} Listing analytics
   */
  async getListingAnalytics(listingId) {
    try {
      const listing = await this.model.findById(listingId);
      if (!listing) {
        return null;
      }

      // Get similar listings for price comparison
      const similarListings = await this.model
        .find({
          'item.classId': listing.item.classId,
          status: 'active',
          _id: { $ne: listingId }
        })
        .sort({ price: 1 })
        .limit(10)
        .lean();

      const pricePercentile = this.calculatePricePercentile(
        listing.price,
        similarListings.map(l => l.price)
      );

      return {
        views: listing.views,
        similarListingsCount: similarListings.length,
        pricePercentile,
        daysSinceCreated: Math.floor((Date.now() - listing.createdAt) / (1000 * 60 * 60 * 24)),
        isCompetitive: pricePercentile < 50
      };
    } catch (error) {
      throw new Error(`getListingAnalytics failed: ${error.message}`);
    }
  }

  /**
   * Helper: Calculate price percentile
   * @param {number} price - Target price
   * @param {Array} prices - Array of prices
   * @returns {number} Percentile (0-100)
   */
  calculatePricePercentile(price, prices) {
    if (!prices || prices.length === 0) return 0;
    const sortedPrices = prices.sort((a, b) => a - b);
    const index = sortedPrices.findIndex(p => p >= price);
    return index === -1 ? 100 : (index / sortedPrices.length) * 100;
  }

  /**
   * Find similar listings
   * @param {string} listingId - Listing ID
   * @param {number} limit - Number of similar listings
   * @returns {Promise<Array>} Array of similar listings
   */
  async findSimilarListings(listingId, limit = 5) {
    try {
      const listing = await this.model.findById(listingId);
      if (!listing) return [];

      return await this.model
        .find({
          'item.classId': listing.item.classId,
          status: 'active',
          _id: { $ne: listingId }
        })
        .sort({ price: 1 })
        .limit(limit)
        .populate('seller', 'steamName username displayName avatar')
        .lean();
    } catch (error) {
      throw new Error(`findSimilarListings failed: ${error.message}`);
    }
  }

  /**
   * Get trending items
   * @param {number} limit - Number of items
   * @param {string} timeframe - Timeframe (24h, 7d, 30d)
   * @returns {Promise<Array>} Trending items
   */
  async getTrendingItems(limit = 10, timeframe = '24h') {
    try {
      const timeframes = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      };

      const timeLimit = timeframes[timeframe] || timeframes['24h'];
      const since = new Date(Date.now() - timeLimit);

      const pipeline = [
        { $match: { status: 'active', createdAt: { $gte: since } } },
        {
          $group: {
            _id: '$item.classId',
            itemName: { $first: '$item.name' },
            itemMarketName: { $first: '$item.marketName' },
            listingCount: { $sum: 1 },
            avgPrice: { $avg: '$price' },
            minPrice: { $min: '$price' },
            totalVolume: { $sum: '$price' }
          }
        },
        { $sort: { listingCount: -1 } },
        { $limit: limit }
      ];

      return await this.aggregate(pipeline);
    } catch (error) {
      throw new Error(`getTrendingItems failed: ${error.message}`);
    }
  }
}

module.exports = new MarketListingRepository();
