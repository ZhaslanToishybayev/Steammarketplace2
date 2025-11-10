/**
 * Trade Offer Repository Interface
 * Defines specific operations for TradeOffer model
 */

const BaseRepositoryInterface = require('./BaseRepositoryInterface');

class TradeOfferRepositoryInterface extends BaseRepositoryInterface {
  /**
   * Find trade offer by offer ID
   * @param {string} offerId - Steam offer ID
   * @returns {Promise<Object|null>} Trade offer document
   */
  async findByOfferId(offerId) {
    throw new Error('Not implemented');
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
    throw new Error('Not implemented');
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
    throw new Error('Not implemented');
  }

  /**
   * Get trade offers by status
   * @param {string} status - Trade status
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of trade offers
   */
  async findByStatus(status, options = {}) {
    throw new Error('Not implemented');
  }

  /**
   * Create a new trade offer
   * @param {Object} data - Trade offer data
   * @returns {Promise<Object>} Created trade offer
   */
  async createOffer(data) {
    throw new Error('Not implemented');
  }

  /**
   * Update trade offer status
   * @param {string} offerId - Trade offer ID
   * @param {string} status - New status
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object|null>} Updated trade offer
   */
  async updateStatus(offerId, status, metadata = {}) {
    throw new Error('Not implemented');
  }

  /**
   * Mark trade as accepted
   * @param {string} offerId - Trade offer ID
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object|null>} Updated trade offer
   */
  async markAsAccepted(offerId, metadata = {}) {
    throw new Error('Not implemented');
  }

  /**
   * Mark trade as declined
   * @param {string} offerId - Trade offer ID
   * @param {string} reason - Decline reason
   * @returns {Promise<Object|null>} Updated trade offer
   */
  async markAsDeclined(offerId, reason = null) {
    throw new Error('Not implemented');
  }

  /**
   * Mark trade as cancelled
   * @param {string} offerId - Trade offer ID
   * @param {string} reason - Cancel reason
   * @returns {Promise<Object|null>} Updated trade offer
   */
  async markAsCancelled(offerId, reason = null) {
    throw new Error('Not implemented');
  }

  /**
   * Mark trade as failed
   * @param {string} offerId - Trade offer ID
   * @param {string} errorMessage - Error message
   * @param {string} errorCode - Error code
   * @returns {Promise<Object|null>} Updated trade offer
   */
  async markAsFailed(offerId, errorMessage, errorCode = null) {
    throw new Error('Not implemented');
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
    throw new Error('Not implemented');
  }

  /**
   * Get trade statistics
   * @param {string} steamId - Steam ID (optional)
   * @param {string} botId - Bot ID (optional)
   * @returns {Promise<Object>} Trade statistics
   */
  async getTradeStats(steamId = null, botId = null) {
    throw new Error('Not implemented');
  }

  /**
   * Find pending trades
   * @returns {Promise<Array>} Array of pending trades
   */
  async findPendingTrades() {
    throw new Error('Not implemented');
  }

  /**
   * Find trades requiring action
   * @returns {Promise<Array>} Array of trades requiring action
   */
  async findTradesRequiringAction() {
    throw new Error('Not implemented');
  }

  /**
   * Get trades by type
   * @param {string} tradeType - Trade type (buy, sell, swap)
   * @param {Object} filters - Additional filters
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of trades
   */
  async findByTradeType(tradeType, filters = {}, options = {}) {
    throw new Error('Not implemented');
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
    throw new Error('Not implemented');
  }

  /**
   * Find failed trades for retry
   * @returns {Promise<Array>} Array of failed trades
   */
  async findFailedTradesForRetry() {
    throw new Error('Not implemented');
  }

  /**
   * Clean up old trade offers
   * @param {number} daysOld - Delete trades older than X days
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupOldTrades(daysOld = 90) {
    throw new Error('Not implemented');
  }

  /**
   * Get trade analytics
   * @param {string} steamId - Steam ID (optional)
   * @param {string} period - Period (24h, 7d, 30d, all)
   * @returns {Promise<Object>} Trade analytics
   */
  async getTradeAnalytics(steamId = null, period = '7d') {
    throw new Error('Not implemented');
  }

  /**
   * Find trade by item
   * @param {string} assetId - Asset ID
   * @param {string} steamId - Steam ID (optional)
   * @returns {Promise<Array>} Array of trades
   */
  async findByItem(assetId, steamId = null) {
    throw new Error('Not implemented');
  }

  /**
   * Bulk update trade offers
   * @param {Object} query - Query to match
   * @param {Object} update - Update data
   * @returns {Promise<Object>} Update result
   */
  async bulkUpdate(query, update) {
    throw new Error('Not implemented');
  }

  /**
   * Get recent trades
   * @param {number} limit - Number of trades
   * @param {string} steamId - Steam ID (optional)
   * @returns {Promise<Array>} Array of recent trades
   */
  async getRecentTrades(limit = 10, steamId = null) {
    throw new Error('Not implemented');
  }

  /**
   * Find duplicate offers
   * @returns {Promise<Array>} Array of duplicate offers
   */
  async findDuplicateOffers() {
    throw new Error('Not implemented');
  }
}

module.exports = TradeOfferRepositoryInterface;
