/**
 * User Repository Interface
 * Defines specific operations for User model
 */

const BaseRepositoryInterface = require('./BaseRepositoryInterface');

class UserRepositoryInterface extends BaseRepositoryInterface {
  /**
   * Find user by Steam ID
   * @param {string} steamId - Steam ID
   * @returns {Promise<Object|null>} User document
   */
  async findBySteamId(steamId) {
    throw new Error('Not implemented');
  }

  /**
   * Find user by username
   * @param {string} username - Username
   * @returns {Promise<Object|null>} User document
   */
  async findByUsername(username) {
    throw new Error('Not implemented');
  }

  /**
   * Update user wallet balance
   * @param {string} userId - User ID
   * @param {number} balance - New balance
   * @param {number} pendingBalance - Pending balance (optional)
   * @returns {Promise<Object|null>} Updated user
   */
  async updateWalletBalance(userId, balance, pendingBalance = null) {
    throw new Error('Not implemented');
  }

  /**
   * Add item to user inventory
   * @param {string} userId - User ID
   * @param {Object} item - Item data
   * @returns {Promise<Object|null>} Updated user
   */
  async addInventoryItem(userId, item) {
    throw new Error('Not implemented');
  }

  /**
   * Remove item from user inventory
   * @param {string} userId - User ID
   * @param {string} assetId - Asset ID
   * @returns {Promise<Object|null>} Updated user
   */
  async removeInventoryItem(userId, assetId) {
    throw new Error('Not implemented');
  }

  /**
   * Update user inventory
   * @param {string} userId - User ID
   * @param {Array} inventory - New inventory
   * @returns {Promise<Object|null>} Updated user
   */
  async updateInventory(userId, inventory) {
    throw new Error('Not implemented');
  }

  /**
   * Get user inventory
   * @param {string} userId - User ID
   * @param {string} game - Game name (CS2, Dota 2, etc.)
   * @returns {Promise<Array>} User inventory items
   */
  async getInventory(userId, game = null) {
    throw new Error('Not implemented');
  }

  /**
   * Update user reputation
   * @param {string} userId - User ID
   * @param {Object} reputation - Reputation data
   * @returns {Promise<Object|null>} Updated user
   */
  async updateReputation(userId, reputation) {
    throw new Error('Not implemented');
  }

  /**
   * Increment user stats
   * @param {string} userId - User ID
   * @param {Object} stats - Stats to increment
   * @returns {Promise<Object|null>} Updated user
   */
  async incrementStats(userId, stats) {
    throw new Error('Not implemented');
  }

  /**
   * Get user public profile (without sensitive data)
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Public user data
   */
  async getPublicProfile(userId) {
    throw new Error('Not implemented');
  }

  /**
   * Search users by name or username
   * @param {string} searchTerm - Search term
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of users
   */
  async searchUsers(searchTerm, options = {}) {
    throw new Error('Not implemented');
  }

  /**
   * Get users with pagination and filters
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Paginated result
   */
  async getUsersWithFilters(filters, options = {}, page = 1, limit = 20) {
    throw new Error('Not implemented');
  }

  /**
   * Update user settings
   * @param {string} userId - User ID
   * @param {Object} settings - User settings
   * @returns {Promise<Object|null>} Updated user
   */
  async updateSettings(userId, settings) {
    throw new Error('Not implemented');
  }

  /**
   * Ban/Unban user
   * @param {string} userId - User ID
   * @param {boolean} isBanned - Ban status
   * @param {string} reason - Ban reason (optional)
   * @returns {Promise<Object|null>} Updated user
   */
  async setBanStatus(userId, isBanned, reason = null) {
    throw new Error('Not implemented');
  }

  /**
   * Get top users by reputation
   * @param {number} limit - Number of users
   * @returns {Promise<Array>} Top users
   */
  async getTopUsersByReputation(limit = 10) {
    throw new Error('Not implemented');
  }

  /**
   * Bulk update inventory items
   * @param {string} userId - User ID
   * @param {Array} items - Items to update
   * @returns {Promise<Object|null>} Updated user
   */
  async bulkUpdateInventory(userId, items) {
    throw new Error('Not implemented');
  }
}

module.exports = UserRepositoryInterface;
