/**
 * Trade Offer Repository Implementation
 * Handles all TradeOffer model operations
 */

const BaseRepository = require('./BaseRepository');
const TradeOfferRepositoryInterface = require('../interfaces/TradeOfferRepositoryInterface');
const TradeOffer = require('../../models/TradeOffer');

class TradeOfferRepository extends BaseRepository implements TradeOfferRepositoryInterface {
  constructor() {
    super(TradeOffer);
  }

  /**
   * Find trade offer by offer ID
   * @param {string} offerId - Steam offer ID
   * @returns {Promise<Object|null>} Trade offer document
   */
  async findByOfferId(offerId) {
    try {
      return await this.model.findOne({ offerId });
    } catch (error) {
      throw new Error(`findByOfferId failed: ${error.message}`);
    }
  }

  /**
   * Find trade offers by Steam ID
   * @param {string} steamId - Steam ID
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Paginated result
   */
  async findBySteamId(steamId, filters = {}, options = {}, page = 1, limit = 20) {
    try {
      const query = { steamId, ...filters };
      return await this.paginate(query, options, page, limit);
    } catch (error) {
      throw new Error(`findBySteamId failed: ${error.message}`);
    }
  }

  /**
   * Find trade offers by bot ID
   * @param {string} botId - Bot ID
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Paginated result
   */
  async findByBotId(botId, filters = {}, options = {}, page = 1, limit = 20) {
    try {
      const query = { botId, ...filters };
      return await this.paginate(query, options, page, limit);
    } catch (error) {
      throw new Error(`findByBotId failed: ${error.message}`);
    }
  }

  /**
   * Get trade offers by status
   * @param {string} status - Trade status
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of trade offers
   */
  async findByStatus(status, options = {}) {
    try {
      let queryBuilder = this.model.find({ status });

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
      throw new Error(`findByStatus failed: ${error.message}`);
    }
  }

  /**
   * Create a new trade offer
   * @param {Object} data - Trade offer data
   * @returns {Promise<Object>} Created trade offer
   */
  async createOffer(data) {
    try {
      const tradeOffer = new this.model({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return await tradeOffer.save();
    } catch (error) {
      throw new Error(`createOffer failed: ${error.message}`);
    }
  }

  /**
   * Update trade offer status
   * @param {string} offerId - Trade offer ID
   * @param {string} status - New status
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object|null>} Updated trade offer
   */
  async updateStatus(offerId, status, metadata = {}) {
    try {
      const update = {
        status,
        updatedAt: new Date(),
        ...metadata
      };

      return await this.model.findOneAndUpdate(
        { offerId },
        { $set: update },
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw new Error(`updateStatus failed: ${error.message}`);
    }
  }

  /**
   * Mark trade as accepted
   * @param {string} offerId - Trade offer ID
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object|null>} Updated trade offer
   */
  async markAsAccepted(offerId, metadata = {}) {
    try {
      const update = {
        status: 'accepted',
        completedAt: new Date(),
        updatedAt: new Date(),
        ...metadata
      };

      return await this.model.findOneAndUpdate(
        { offerId },
        { $set: update },
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw new Error(`markAsAccepted failed: ${error.message}`);
    }
  }

  /**
   * Mark trade as declined
   * @param {string} offerId - Trade offer ID
   * @param {string} reason - Decline reason
   * @returns {Promise<Object|null>} Updated trade offer
   */
  async markAsDeclined(offerId, reason = null) {
    try {
      const update = {
        status: 'declined',
        updatedAt: new Date()
      };

      if (reason) {
        update.errorMessage = reason;
      }

      return await this.model.findOneAndUpdate(
        { offerId },
        { $set: update },
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw new Error(`markAsDeclined failed: ${error.message}`);
    }
  }

  /**
   * Mark trade as cancelled
   * @param {string} offerId - Trade offer ID
   * @param {string} reason - Cancel reason
   * @returns {Promise<Object|null>} Updated trade offer
   */
  async markAsCancelled(offerId, reason = null) {
    try {
      const update = {
        status: 'cancelled',
        updatedAt: new Date()
      };

      if (reason) {
        update.errorMessage = reason;
      }

      return await this.model.findOneAndUpdate(
        { offerId },
        { $set: update },
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw new Error(`markAsCancelled failed: ${error.message}`);
    }
  }

  /**
   * Mark trade as failed
   * @param {string} offerId - Trade offer ID
   * @param {string} errorMessage - Error message
   * @param {string} errorCode - Error code
   * @returns {Promise<Object|null>} Updated trade offer
   */
  async markAsFailed(offerId, errorMessage, errorCode = null) {
    try {
      const update = {
        status: 'failed',
        errorMessage,
        updatedAt: new Date()
      };

      if (errorCode) {
        update.errorCode = errorCode;
      }

      return await this.model.findOneAndUpdate(
        { offerId },
        { $set: update },
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw new Error(`markAsFailed failed: ${error.message}`);
    }
  }

  /**
   * Get trade history for user
   * @param {string} steamId - Steam ID
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Paginated result
   */
  async getTradeHistory(steamId, filters = {}, options = {}, page = 1, limit = 20) {
    try {
      const query = {
        steamId,
        status: { $in: ['accepted', 'declined', 'cancelled'] },
        ...filters
      };

      const sort = options.sort || { createdAt: -1 };

      return await this.paginate(query, { ...options, sort }, page, limit);
    } catch (error) {
      throw new Error(`getTradeHistory failed: ${error.message}`);
    }
  }

  /**
   * Get trade statistics
   * @param {string} steamId - Steam ID (optional)
   * @param {string} botId - Bot ID (optional)
   * @returns {Promise<Object>} Trade statistics
   */
  async getTradeStats(steamId = null, botId = null) {
    try {
      const matchStage = {};
      if (steamId) matchStage.steamId = steamId;
      if (botId) matchStage.botId = botId;

      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalProfit: { $sum: '$profit' }
          }
        }
      ];

      const results = await this.aggregate(pipeline);

      const stats = {
        total: 0,
        accepted: 0,
        declined: 0,
        cancelled: 0,
        failed: 0,
        pending: 0,
        totalProfit: 0
      };

      results.forEach(result => {
        stats.total += result.count;
        stats[result._id] = result.count;
        if (result._id === 'accepted') {
          stats.totalProfit = result.totalProfit;
        }
      });

      return stats;
    } catch (error) {
      throw new Error(`getTradeStats failed: ${error.message}`);
    }
  }

  /**
   * Find pending trades
   * @returns {Promise<Array>} Array of pending trades
   */
  async findPendingTrades() {
    try {
      return await this.model
        .find({ status: { $in: ['sent', 'active'] } })
        .sort({ createdAt: -1 })
        .lean();
    } catch (error) {
      throw new Error(`findPendingTrades failed: ${error.message}`);
    }
  }

  /**
   * Find trades requiring action
   * @returns {Promise<Array>} Array of trades requiring action
   */
  async findTradesRequiringAction() {
    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

      return await this.model
        .find({
          status: { $in: ['sent', 'active'] },
          createdAt: { $lt: thirtyMinutesAgo }
        })
        .sort({ createdAt: 1 })
        .lean();
    } catch (error) {
      throw new Error(`findTradesRequiringAction failed: ${error.message}`);
    }
  }

  /**
   * Get trades by type
   * @param {string} tradeType - Trade type (buy, sell, swap)
   * @param {Object} filters - Additional filters
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of trades
   */
  async findByTradeType(tradeType, filters = {}, options = {}) {
    try {
      const query = { tradeType, ...filters };

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
      throw new Error(`findByTradeType failed: ${error.message}`);
    }
  }

  /**
   * Calculate total profit for trades
   * @param {string} steamId - Steam ID (optional)
   * @param {string} botId - Bot ID (optional)
   * @param {Date} startDate - Start date (optional)
   * @param {Date} endDate - End date (optional)
   * @returns {Promise<Object>} Profit statistics
   */
  async calculateProfit(steamId = null, botId = null, startDate = null, endDate = null) {
    try {
      const matchStage = { status: 'accepted' };

      if (steamId) matchStage.steamId = steamId;
      if (botId) matchStage.botId = botId;
      if (startDate) matchStage.createdAt = { ...matchStage.createdAt, $gte: startDate };
      if (endDate) {
        matchStage.createdAt = { ...matchStage.createdAt, $lte: endDate };
      }

      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalProfit: { $sum: '$profit' },
            totalValueGiven: { $sum: '$valueGiven' },
            totalValueReceived: { $sum: '$valueReceived' },
            tradeCount: { $sum: 1 }
          }
        }
      ];

      const result = await this.aggregate(pipeline);
      return result[0] || {
        totalProfit: 0,
        totalValueGiven: 0,
        totalValueReceived: 0,
        tradeCount: 0
      };
    } catch (error) {
      throw new Error(`calculateProfit failed: ${error.message}`);
    }
  }

  /**
   * Find failed trades for retry
   * @returns {Promise<Array>} Array of failed trades
   */
  async findFailedTradesForRetry() {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      return await this.model
        .find({
          status: 'failed',
          createdAt: { $gte: twentyFourHoursAgo },
          $or: [
            { errorCode: { $in: ['STEAM_TIMEOUT', 'NETWORK_ERROR'] } },
            { 'metadata.retryCount': { $lt: 3 } }
          ]
        })
        .sort({ createdAt: 1 })
        .lean();
    } catch (error) {
      throw new Error(`findFailedTradesForRetry failed: ${error.message}`);
    }
  }

  /**
   * Clean up old trade offers
   * @param {number} daysOld - Delete trades older than X days
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupOldTrades(daysOld = 90) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      return await this.model.deleteMany({
        createdAt: { $lt: cutoffDate },
        status: { $in: ['declined', 'cancelled', 'failed'] }
      });
    } catch (error) {
      throw new Error(`cleanupOldTrades failed: ${error.message}`);
    }
  }

  /**
   * Get trade analytics
   * @param {string} steamId - Steam ID (optional)
   * @param {string} period - Period (24h, 7d, 30d, all)
   * @returns {Promise<Object>} Trade analytics
   */
  async getTradeAnalytics(steamId = null, period = '7d') {
    try {
      const periods = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
        'all': null
      };

      const timeLimit = periods[period] || periods['7d'];
      const matchStage = {};

      if (steamId) matchStage.steamId = steamId;
      if (timeLimit) {
        matchStage.createdAt = { $gte: new Date(Date.now() - timeLimit) };
      }

      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: {
              status: '$status',
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
            },
            count: { $sum: 1 },
            totalProfit: { $sum: '$profit' }
          }
        },
        { $sort: { '_id.date': -1 } }
      ];

      const results = await this.aggregate(pipeline);

      // Process results into daily analytics
      const dailyStats = {};
      results.forEach(result => {
        const date = result._id.date;
        if (!dailyStats[date]) {
          dailyStats[date] = { total: 0, accepted: 0, declined: 0, cancelled: 0, failed: 0, profit: 0 };
        }
        dailyStats[date].total += result.count;
        dailyStats[date][result._id.status] += result.count;
        if (result._id.status === 'accepted') {
          dailyStats[date].profit += result.totalProfit;
        }
      });

      return {
        period,
        dailyStats,
        totalTrades: results.reduce((sum, r) => sum + r.count, 0),
        totalProfit: results.reduce((sum, r) => sum + (r._id.status === 'accepted' ? r.totalProfit : 0), 0)
      };
    } catch (error) {
      throw new Error(`getTradeAnalytics failed: ${error.message}`);
    }
  }

  /**
   * Find trade by item
   * @param {string} assetId - Asset ID
   * @param {string} steamId - Steam ID (optional)
   * @returns {Promise<Array>} Array of trades
   */
  async findByItem(assetId, steamId = null) {
    try {
      const query = {
        $or: [
          { 'itemsGiven.assetId': assetId },
          { 'itemsReceived.assetId': assetId }
        ]
      };

      if (steamId) {
        query.steamId = steamId;
      }

      return await this.model
        .find(query)
        .sort({ createdAt: -1 })
        .lean();
    } catch (error) {
      throw new Error(`findByItem failed: ${error.message}`);
    }
  }

  /**
   * Bulk update trade offers
   * @param {Object} query - Query to match
   * @param {Object} update - Update data
   * @returns {Promise<Object>} Update result
   */
  async bulkUpdate(query, update) {
    try {
      return await this.model.updateMany(query, { $set: update, $set: { updatedAt: new Date() } });
    } catch (error) {
      throw new Error(`bulkUpdate failed: ${error.message}`);
    }
  }

  /**
   * Get recent trades
   * @param {number} limit - Number of trades
   * @param {string} steamId - Steam ID (optional)
   * @returns {Promise<Array>} Array of recent trades
   */
  async getRecentTrades(limit = 10, steamId = null) {
    try {
      const query = steamId ? { steamId } : {};
      query.status = { $in: ['accepted', 'declined', 'cancelled'] };

      return await this.model
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    } catch (error) {
      throw new Error(`getRecentTrades failed: ${error.message}`);
    }
  }

  /**
   * Find duplicate offers
   * @returns {Promise<Array>} Array of duplicate offers
   */
  async findDuplicateOffers() {
    try {
      const pipeline = [
        {
          $group: {
            _id: '$offerId',
            count: { $sum: 1 },
            docs: { $push: '$_id' }
          }
        },
        {
          $match: {
            count: { $gt: 1 }
          }
        }
      ];

      const duplicates = await this.aggregate(pipeline);
      return duplicates;
    } catch (error) {
      throw new Error(`findDuplicateOffers failed: ${error.message}`);
    }
  }
}

module.exports = new TradeOfferRepository();
