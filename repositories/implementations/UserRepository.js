/**
 * User Repository Implementation
 * Handles all User model operations
 */

const BaseRepository = require('./BaseRepository');
const UserRepositoryInterface = require('../interfaces/UserRepositoryInterface');
const User = require('../../models/User');

class UserRepository extends BaseRepository implements UserRepositoryInterface {
  constructor() {
    super(User);
  }

  /**
   * Find user by Steam ID
   * @param {string} steamId - Steam ID
   * @returns {Promise<Object|null>} User document
   */
  async findBySteamId(steamId) {
    try {
      return await this.model.findOne({ steamId });
    } catch (error) {
      throw new Error(`findBySteamId failed: ${error.message}`);
    }
  }

  /**
   * Find user by username
   * @param {string} username - Username
   * @returns {Promise<Object|null>} User document
   */
  async findByUsername(username) {
    try {
      return await this.model.findOne({ username });
    } catch (error) {
      throw new Error(`findByUsername failed: ${error.message}`);
    }
  }

  /**
   * Update user wallet balance
   * @param {string} userId - User ID
   * @param {number} balance - New balance
   * @param {number} pendingBalance - Pending balance (optional)
   * @returns {Promise<Object|null>} Updated user
   */
  async updateWalletBalance(userId, balance, pendingBalance = null) {
    try {
      const update = { 'wallet.balance': balance };
      if (pendingBalance !== null) {
        update['wallet.pendingBalance'] = pendingBalance;
      }
      return await this.model.findByIdAndUpdate(
        userId,
        { $set: update },
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw new Error(`updateWalletBalance failed: ${error.message}`);
    }
  }

  /**
   * Add item to user inventory
   * @param {string} userId - User ID
   * @param {Object} item - Item data
   * @returns {Promise<Object|null>} Updated user
   */
  async addInventoryItem(userId, item) {
    try {
      return await this.model.findByIdAndUpdate(
        userId,
        {
          $push: {
            userInventory: {
              ...item,
              lastUpdated: new Date()
            }
          }
        },
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw new Error(`addInventoryItem failed: ${error.message}`);
    }
  }

  /**
   * Remove item from user inventory
   * @param {string} userId - User ID
   * @param {string} assetId - Asset ID
   * @returns {Promise<Object|null>} Updated user
   */
  async removeInventoryItem(userId, assetId) {
    try {
      return await this.model.findByIdAndUpdate(
        userId,
        {
          $pull: {
            userInventory: { assetId }
          }
        },
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw new Error(`removeInventoryItem failed: ${error.message}`);
    }
  }

  /**
   * Update user inventory
   * @param {string} userId - User ID
   * @param {Array} inventory - New inventory
   * @returns {Promise<Object|null>} Updated user
   */
  async updateInventory(userId, inventory) {
    try {
      return await this.model.findByIdAndUpdate(
        userId,
        {
          $set: {
            userInventory: inventory.map(item => ({
              ...item,
              lastUpdated: new Date()
            }))
          }
        },
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw new Error(`updateInventory failed: ${error.message}`);
    }
  }

  /**
   * Get user inventory
   * @param {string} userId - User ID
   * @param {string} game - Game name (CS2, Dota 2, etc.)
   * @returns {Promise<Array>} User inventory items
   */
  async getInventory(userId, game = null) {
    try {
      const user = await this.model.findById(userId);
      if (!user) {
        return [];
      }

      if (game) {
        return user.gameInventories.get(game) || [];
      }

      return user.userInventory || [];
    } catch (error) {
      throw new Error(`getInventory failed: ${error.message}`);
    }
  }

  /**
   * Update user reputation
   * @param {string} userId - User ID
   * @param {Object} reputation - Reputation data
   * @returns {Promise<Object|null>} Updated user
   */
  async updateReputation(userId, reputation) {
    try {
      return await this.model.findByIdAndUpdate(
        userId,
        {
          $set: {
            'reputation.positive': reputation.positive,
            'reputation.negative': reputation.negative,
            'reputation.total': reputation.total
          }
        },
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw new Error(`updateReputation failed: ${error.message}`);
    }
  }

  /**
   * Increment user stats
   * @param {string} userId - User ID
   * @param {Object} stats - Stats to increment
   * @returns {Promise<Object|null>} Updated user
   */
  async incrementStats(userId, stats) {
    try {
      const update = {};
      Object.keys(stats).forEach(key => {
        update[`stats.${key}`] = stats[key];
      });

      return await this.model.findByIdAndUpdate(
        userId,
        { $inc: update },
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw new Error(`incrementStats failed: ${error.message}`);
    }
  }

  /**
   * Get user public profile (without sensitive data)
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Public user data
   */
  async getPublicProfile(userId) {
    try {
      return await this.model
        .findById(userId)
        .select('-steamAccessToken -steamRefreshToken -__v')
        .lean();
    } catch (error) {
      throw new Error(`getPublicProfile failed: ${error.message}`);
    }
  }

  /**
   * Search users by name or username
   * @param {string} searchTerm - Search term
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of users
   */
  async searchUsers(searchTerm, options = {}) {
    try {
      const query = {
        $or: [
          { steamName: { $regex: searchTerm, $options: 'i' } },
          { username: { $regex: searchTerm, $options: 'i' } },
          { displayName: { $regex: searchTerm, $options: 'i' } }
        ]
      };

      let queryBuilder = this.model.find(query);

      if (options.projection) {
        queryBuilder = queryBuilder.select(options.projection);
      }

      if (options.limit) {
        queryBuilder = queryBuilder.limit(options.limit);
      }

      if (options.sort) {
        queryBuilder = queryBuilder.sort(options.sort);
      }

      return await queryBuilder.exec();
    } catch (error) {
      throw new Error(`searchUsers failed: ${error.message}`);
    }
  }

  /**
   * Get users with pagination and filters
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Paginated result
   */
  async getUsersWithFilters(filters = {}, options = {}, page = 1, limit = 20) {
    try {
      const query = { ...filters };

      // Exclude sensitive data
      const projection = options.projection || '-steamAccessToken -steamRefreshToken -__v';

      return await this.paginate(query, { ...options, projection }, page, limit);
    } catch (error) {
      throw new Error(`getUsersWithFilters failed: ${error.message}`);
    }
  }

  /**
   * Update user settings
   * @param {string} userId - User ID
   * @param {Object} settings - User settings
   * @returns {Promise<Object|null>} Updated user
   */
  async updateSettings(userId, settings) {
    try {
      return await this.model.findByIdAndUpdate(
        userId,
        { $set: { settings } },
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw new Error(`updateSettings failed: ${error.message}`);
    }
  }

  /**
   * Ban/Unban user
   * @param {string} userId - User ID
   * @param {boolean} isBanned - Ban status
   * @param {string} reason - Ban reason (optional)
   * @returns {Promise<Object|null>} Updated user
   */
  async setBanStatus(userId, isBanned, reason = null) {
    try {
      const update = { isBanned };
      if (reason) {
        update.banReason = reason;
      }

      return await this.model.findByIdAndUpdate(
        userId,
        { $set: update },
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw new Error(`setBanStatus failed: ${error.message}`);
    }
  }

  /**
   * Get top users by reputation
   * @param {number} limit - Number of users
   * @returns {Promise<Array>} Top users
   */
  async getTopUsersByReputation(limit = 10) {
    try {
      return await this.model
        .find({ isBanned: { $ne: true } })
        .select('steamName username displayName avatar reputation')
        .sort({ 'reputation.positive': -1 })
        .limit(limit)
        .lean();
    } catch (error) {
      throw new Error(`getTopUsersByReputation failed: ${error.message}`);
    }
  }

  /**
   * Bulk update inventory items
   * @param {string} userId - User ID
   * @param {Array} items - Items to update
   * @returns {Promise<Object|null>} Updated user
   */
  async bulkUpdateInventory(userId, items) {
    try {
      return await this.model.findByIdAndUpdate(
        userId,
        {
          $set: {
            userInventory: items.map(item => ({
              ...item,
              lastUpdated: new Date()
            }))
          }
        },
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw new Error(`bulkUpdateInventory failed: ${error.message}`);
    }
  }
}

module.exports = new UserRepository();
