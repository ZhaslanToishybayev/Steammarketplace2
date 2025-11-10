/**
 * Database Index Optimization Script
 * Creates and manages optimized indexes for better performance
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

class DatabaseOptimizer {
  constructor() {
    this.db = mongoose.connection;
  }

  /**
   * Create all optimized indexes
   */
  async createAllIndexes() {
    logger.info('Starting database index optimization...');

    try {
      await this.createUserIndexes();
      await this.createMarketListingIndexes();
      await this.createTradeOfferIndexes();
      await this.createTransactionIndexes();

      logger.info('Database index optimization completed successfully');
    } catch (error) {
      logger.error('Error during index optimization:', error);
      throw error;
    }
  }

  /**
   * Create User model indexes
   */
  async createUserIndexes() {
    logger.info('Creating User indexes...');

    const indexes = [
      // Primary indexes
      { steamId: 1, unique: true, background: true },
      { username: 1, unique: true, background: true },
      { email: 1, sparse: true, background: true },

      // Query optimization indexes
      { isBanned: 1, background: true },
      { isAdmin: 1, background: true },
      { createdAt: -1, background: true },
      { 'wallet.balance': 1, background: true },
      { 'reputation.positive': -1, background: true },

      // Inventory indexes
      { 'userInventory.lastUpdated': -1, background: true },
      { 'steamInventory.lastUpdated': -1, background: true },

      // Search indexes
      { steamName: 'text', username: 'text', displayName: 'text', background: true },

      // Compound indexes for common queries
      { isBanned: 1, 'reputation.positive': -1, background: true },
      { isAdmin: 1, createdAt: -1, background: true }
    ];

    await this._createIndexes('users', indexes);
    logger.info('User indexes created successfully');
  }

  /**
   * Create MarketListing model indexes
   */
  async createMarketListingIndexes() {
    logger.info('Creating MarketListing indexes...');

    const indexes = [
      // Primary indexes
      { 'item.assetId': 1, unique: true, background: true },
      { seller: 1, background: true },

      // Status-based indexes
      { status: 1, background: true },
      { status: 1, createdAt: -1, background: true },
      { status: 1, price: 1, background: true },

      // Item-based indexes
      { 'item.classId': 1, background: true },
      { 'item.instanceId': 1, background: true },
      { 'item.marketName': 1, background: true },
      { 'item.rarity': 1, background: true },
      { 'item.type': 1, background: true },

      // Text search index
      { 'item.marketName': 'text', 'item.name': 'text', background: true },

      // Price and time-based indexes
      { price: 1, background: true },
      { price: -1, background: true },
      { expiresAt: 1, background: true },
      { createdAt: -1, background: true },
      { updatedAt: -1, background: true },

      // Views and popularity
      { views: -1, background: true },
      { featured: 1, background: true },

      // Compound indexes for complex queries
      { status: 1, 'item.classId': 1, price: 1, background: true },
      { status: 1, 'item.rarity': 1, price: -1, background: true },
      { status: 1, featured: -1, createdAt: -1, background: true },

      // Auto-expire index
      { expiresAt: 1 }, // No background flag for TTL
    ];

    await this._createIndexes('marketlistings', indexes);
    logger.info('MarketListing indexes created successfully');
  }

  /**
   * Create TradeOffer model indexes
   */
  async createTradeOfferIndexes() {
    logger.info('Creating TradeOffer indexes...');

    const indexes = [
      // Primary indexes
      { offerId: 1, unique: true, background: true },

      // Status-based indexes
      { status: 1, background: true },
      { status: 1, createdAt: -1, background: true },
      { status: 1, updatedAt: -1, background: true },

      // User and bot indexes
      { steamId: 1, background: true },
      { steamId: 1, createdAt: -1, background: true },
      { botId: 1, background: true },
      { botId: 1, createdAt: -1, background: true },

      // Trade type and value indexes
      { tradeType: 1, background: true },
      { valueGiven: 1, background: true },
      { valueReceived: 1, background: true },
      { profit: 1, background: true },
      { profit: -1, background: true },

      // Time-based indexes
      { createdAt: -1, background: true },
      { updatedAt: -1, background: true },
      { completedAt: -1, background: true },

      // Item-based indexes
      { 'itemsGiven.assetId': 1, background: true },
      { 'itemsReceived.assetId': 1, background: true },
      { 'itemsGiven.classId': 1, background: true },
      { 'itemsReceived.classId': 1, background: true },

      // Compound indexes for complex queries
      { steamId: 1, status: 1, createdAt: -1, background: true },
      { botId: 1, status: 1, createdAt: -1, background: true },
      { status: 1, tradeType: 1, createdAt: -1, background: true }
    ];

    await this._createIndexes('tradeoffers', indexes);
    logger.info('TradeOffer indexes created successfully');
  }

  /**
   * Create Transaction model indexes
   */
  async createTransactionIndexes() {
    logger.info('Creating Transaction indexes...');

    const indexes = [
      // User and status indexes
      { user: 1, background: true },
      { user: 1, status: 1, background: true },
      { status: 1, background: true },

      // Time-based indexes
      { createdAt: -1, background: true },
      { completedAt: -1, background: true },

      // Amount and type indexes
      { type: 1, background: true },
      { amount: 1, background: true },
      { amount: -1, background: true },

      // User transaction history compound index
      { user: 1, type: 1, createdAt: -1, background: true },
      { user: 1, status: 1, createdAt: -1, background: true },

      // Date-based partition indexes
      { createdAt: -1, status: 1, background: true }
    ];

    await this._createIndexes('transactions', indexes);
    logger.info('Transaction indexes created successfully');
  }

  /**
   * Create indexes for a collection
   */
  async _createIndexes(collectionName, indexes) {
    const collection = this.db.collection(collectionName);

    for (const index of indexes) {
      try {
        const indexOptions = {
          background: index.background !== false,
          unique: index.unique || false,
          sparse: index.sparse || false
        };

        await collection.createIndex(index, indexOptions);
        logger.debug(`Created index for ${collectionName}:`, index);
      } catch (error) {
        if (error.code === 85) {
          // Index already exists with different options
          logger.warn(`Index already exists for ${collectionName}:`, index);
        } else {
          logger.error(`Error creating index for ${collectionName}:`, error);
          throw error;
        }
      }
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(collectionName) {
    const collection = this.db.collection(collectionName);
    const stats = await collection.stats();

    const indexes = await collection.listIndexes().toArray();

    return {
      collection: collectionName,
      totalIndexes: indexes.length,
      indexSize: stats.indexSizes,
      avgObjSize: stats.avgObjSize,
      totalSize: stats.totalSize,
      indexes: indexes.map(idx => ({
        name: idx.name,
        key: idx.key,
        unique: idx.unique || false,
        sparse: idx.sparse || false
      }))
    };
  }

  /**
   * Get all collection statistics
   */
  async getAllStats() {
    const collections = ['users', 'marketlistings', 'tradeoffers', 'transactions'];
    const stats = {};

    for (const collection of collections) {
      try {
        stats[collection] = await this.getIndexStats(collection);
      } catch (error) {
        logger.error(`Error getting stats for ${collection}:`, error);
        stats[collection] = { error: error.message };
      }
    }

    return stats;
  }

  /**
   * Drop redundant indexes
   */
  async dropRedundantIndexes() {
    logger.info('Dropping redundant indexes...');

    // Define redundant indexes to drop
    const redundantIndexes = {
      'marketlistings': ['itemName_1', 'itemId_1'], // Old single field indexes
      'users': ['steamName_1'], // Old single field indexes
    };

    for (const [collectionName, indexes] of Object.entries(redundantIndexes)) {
      const collection = this.db.collection(collectionName);

      for (const indexName of indexes) {
        try {
          await collection.dropIndex(indexName);
          logger.info(`Dropped redundant index ${indexName} from ${collectionName}`);
        } catch (error) {
          if (error.code === 27) {
            // Index not found
            logger.debug(`Index ${indexName} not found in ${collectionName}`);
          } else {
            logger.error(`Error dropping index ${indexName}:`, error);
          }
        }
      }
    }

    logger.info('Redundant index cleanup completed');
  }

  /**
   * Analyze slow queries using profiler
   */
  async analyzeSlowQueries() {
    logger.info('Starting slow query analysis...');

    // Enable profiling for slow operations (>100ms)
    await this.db.admin().command({
      profile: 2,
      slowms: 100
    });

    logger.info('Profiling enabled. Run your queries and then call getProfilerData()');

    return {
      message: 'Profiling enabled. Execute your queries and then call getProfilerData() to see results.'
    };
  }

  /**
   * Get profiler data
   */
  async getProfilerData() {
    try {
      const profilerData = await this.db.collection('system.profile')
        .find({})
        .sort({ ts: -1 })
        .limit(50)
        .toArray();

      return {
        totalQueries: profilerData.length,
        queries: profilerData.map(q => ({
          operation: q.op,
          collection: q.ns,
          duration: `${q.millis}ms`,
          timestamp: q.ts,
          query: q.command || q.query,
          sort: q.sort,
          limit: q.limit
        }))
      };
    } catch (error) {
      logger.error('Error getting profiler data:', error);
      throw error;
    }
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats() {
    const collections = ['users', 'marketlistings', 'tradeoffers', 'transactions'];
    const stats = {};

    for (const collectionName of collections) {
      try {
        const collection = this.db.collection(collectionName);
        const count = await collection.countDocuments();
        const size = await this.db.command({ collStats: collectionName });

        stats[collectionName] = {
          documents: count,
          size: `${(size.size / 1024 / 1024).toFixed(2)} MB`,
          avgObjSize: `${(size.avgObjSize / 1024).toFixed(2)} KB`,
          indexes: size.nindexes,
          indexSize: `${(size.totalIndexSize / 1024 / 1024).toFixed(2)} MB`
        };
      } catch (error) {
        logger.error(`Error getting stats for ${collectionName}:`, error);
      }
    }

    return stats;
  }
}

module.exports = new DatabaseOptimizer();
