/**
 * Cached User Repository
 * UserRepository with Redis caching for sessions and profiles
 */

const UserRepository = require('./implementations/UserRepository');
const cacheService = require('../services/cache/RedisCacheService');

class CachedUserRepository extends UserRepository {
  constructor() {
    super();
    this.sessionCacheNamespace = 'user_sessions';
    this.profileCacheNamespace = 'user_profiles';
    this.inventoryCacheNamespace = 'user_inventory';
  }

  /**
   * Find user by Steam ID with caching
   */
  async findBySteamId(steamId) {
    const cacheKey = cacheService.generateKey(this.profileCacheNamespace, `steamid:${steamId}`);

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await super.findBySteamId(steamId);
    if (user) {
      // Cache for 10 minutes
      await cacheService.set(cacheKey, user, 600);
    }

    return user;
  }

  /**
   * Get public profile with caching
   */
  async getPublicProfile(userId) {
    const cacheKey = cacheService.generateKey(this.profileCacheNamespace, `profile:${userId}`);

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const profile = await super.getPublicProfile(userId);
    if (profile) {
      // Cache for 5 minutes
      await cacheService.set(cacheKey, profile, 300);
    }

    return profile;
  }

  /**
   * Get user inventory with caching
   */
  async getInventory(userId, game = null) {
    const cacheKey = cacheService.generateKey(
      this.inventoryCacheNamespace,
      `${userId}:${game || 'all'}`
    );

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const inventory = await super.getInventory(userId, game);
    // Cache for 2 minutes
    await cacheService.set(cacheKey, inventory, 120);

    return inventory;
  }

  /**
   * Update inventory and invalidate cache
   */
  async updateInventory(userId, inventory) {
    const result = await super.updateInventory(userId, inventory);
    // Invalidate inventory cache
    await this._invalidateUserCaches(userId);
    return result;
  }

  /**
   * Add inventory item and invalidate cache
   */
  async addInventoryItem(userId, item) {
    const result = await super.addInventoryItem(userId, item);
    // Invalidate inventory cache
    await this._invalidateUserCaches(userId);
    return result;
  }

  /**
   * Remove inventory item and invalidate cache
   */
  async removeInventoryItem(userId, assetId) {
    const result = await super.removeInventoryItem(userId, assetId);
    // Invalidate inventory cache
    await this._invalidateUserCaches(userId);
    return result;
  }

  /**
   * Update wallet balance and invalidate cache
   */
  async updateWalletBalance(userId, balance, pendingBalance = null) {
    const result = await super.updateWalletBalance(userId, balance, pendingBalance);
    // Invalidate profile and session caches
    await this._invalidateUserCaches(userId);
    return result;
  }

  /**
   * Update reputation and invalidate cache
   */
  async updateReputation(userId, reputation) {
    const result = await super.updateReputation(userId, reputation);
    // Invalidate profile cache
    await this._invalidateUserCaches(userId);
    return result;
  }

  /**
   * Update user and invalidate cache
   */
  async updateById(id, data) {
    const result = await super.updateById(id, data);
    // Invalidate all user caches
    await this._invalidateUserCaches(id);
    return result;
  }

  /**
   * Create user session
   */
  async createUserSession(userId, sessionData, ttl = 86400) { // 24 hours default
    const cacheKey = cacheService.generateKey(this.sessionCacheNamespace, `session:${userId}`);
    await cacheService.set(cacheKey, sessionData, ttl);
    return true;
  }

  /**
   * Get user session
   */
  async getUserSession(userId) {
    const cacheKey = cacheService.generateKey(this.sessionCacheNamespace, `session:${userId}`);
    return await cacheService.get(cacheKey);
  }

  /**
   * Delete user session
   */
  async deleteUserSession(userId) {
    const cacheKey = cacheService.generateKey(this.sessionCacheNamespace, `session:${userId}`);
    return await cacheService.del(cacheKey);
  }

  /**
   * Refresh user session TTL
   */
  async refreshUserSession(userId, ttl = 86400) {
    const cacheKey = cacheService.generateKey(this.sessionCacheNamespace, `session:${userId}`);
    return await cacheService.expire(cacheKey, ttl);
  }

  /**
   * Get online users count
   */
  async getOnlineUsersCount() {
    const cacheKey = cacheService.generateKey(this.sessionCacheNamespace, 'online_count');
    return await cacheService.inc(cacheKey);
  }

  /**
   * Get active users (users with recent sessions)
   */
  async getActiveUsers(limit = 100) {
    const cacheKey = cacheService.generateKey(this.sessionCacheNamespace, `active:${limit}`);
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    // Get users active in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const users = await super.findMany(
      { updatedAt: { $gte: oneDayAgo } },
      { limit, sort: { updatedAt: -1 } }
    );

    // Cache for 5 minutes
    await cacheService.set(cacheKey, users, 300);
    return users;
  }

  /**
   * Get top users by reputation with caching
   */
  async getTopUsersByReputation(limit = 10) {
    const cacheKey = cacheService.generateKey(this.profileCacheNamespace, `top:${limit}`);
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    const users = await super.getTopUsersByReputation(limit);
    // Cache for 15 minutes
    await cacheService.set(cacheKey, users, 900);

    return users;
  }

  /**
   * Search users with caching
   */
  async searchUsers(searchTerm, options = {}) {
    const cacheKey = cacheService.generateKey(
      this.profileCacheNamespace,
      `search:${searchTerm}:${JSON.stringify(options)}`
    );

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const users = await super.searchUsers(searchTerm, options);
    // Cache for 5 minutes
    await cacheService.set(cacheKey, users, 300);

    return users;
  }

  /**
   * Invalidate all user-related caches
   */
  async _invalidateUserCaches(userId) {
    const patterns = [
      cacheService.generateKey(this.profileCacheNamespace, `steamid:${userId}*`),
      cacheService.generateKey(this.profileCacheNamespace, `profile:${userId}`),
      cacheService.generateKey(this.inventoryCacheNamespace, `${userId}:*`),
      cacheService.generateKey(this.sessionCacheNamespace, `session:${userId}`),
      cacheService.generateKey(this.sessionCacheNamespace, `active:*`),
      cacheService.generateKey(this.profileCacheNamespace, `top:*`)
    ];

    for (const pattern of patterns) {
      await cacheService.delPattern(pattern);
    }
  }

  /**
   * Invalidate all caches
   */
  async clearAllCaches() {
    const patterns = [
      cacheService.generateKey(this.profileCacheNamespace, '*'),
      cacheService.generateKey(this.inventoryCacheNamespace, '*'),
      cacheService.generateKey(this.sessionCacheNamespace, '*')
    ];

    let deleted = 0;
    for (const pattern of patterns) {
      deleted += await cacheService.delPattern(pattern);
    }
    return deleted;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      profileCache: cacheService.getStats(),
      inventoryCache: cacheService.getStats(),
      sessionCache: cacheService.getStats()
    };
  }
}

module.exports = new CachedUserRepository();
