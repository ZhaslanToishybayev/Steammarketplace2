/**
 * Steam Bot Manager - Production Version
 * Управление множественными Steam ботами для автоматизации trade offers
 */

const SteamBot = require('./steamBot');
const MarketListing = require('../models/MarketListing');
const User = require('../models/User');
const logger = require('../utils/logger');

class SteamBotManager {
  constructor() {
    this.bots = new Map();
    this.activeBots = [];
    this.tradeQueue = [];
    this.isProcessingTrades = false;
    this.maxQueueSize = 100;
    this.retryAttempts = 3;
  }

  /**
   * Initialize all configured bots
   */
  async initialize() {
    logger.info('Initializing Steam Bot Manager...');

    const botConfigs = this.getBotConfigs();

    if (botConfigs.length === 0) {
      logger.warn('No Steam bot configurations found');
      return;
    }

    logger.info(`Found ${botConfigs.length} bot configurations`);

    // Initialize bots with delays to avoid Steam rate limiting
    for (let i = 0; i < botConfigs.length; i++) {
      try {
        const bot = new SteamBot(botConfigs[i], i);
        await bot.initialize();

        this.bots.set(bot.id, bot);
        this.activeBots.push(bot);

        logger.info(`[${bot.id}] Bot initialized successfully`);

        // Delay between bot initializations (5 seconds)
        if (i < botConfigs.length - 1) {
          await this.sleep(5000);
        }
      } catch (error) {
        logger.error(`[Bot ${i}] Failed to initialize:`, error.message);
        continue;
      }
    }

    logger.info(`Steam Bot Manager initialized with ${this.bots.size} bots`);

    // Start trade queue processor
    this.startTradeProcessor();

    return this.bots.size;
  }

  /**
   * Get bot configurations from environment
   */
  getBotConfigs() {
    const configs = [];
    let index = 1;

    while (process.env[`STEAM_BOT_${index}_USERNAME`]) {
      const config = {
        username: process.env[`STEAM_BOT_${index}_USERNAME`],
        password: process.env[`STEAM_BOT_${index}_PASSWORD`],
        sharedSecret: process.env[`STEAM_BOT_${index}_SHARED_SECRET`],
        identitySecret: process.env[`STEAM_BOT_${index}_IDENTITY_SECRET`]
      };

      // Validate required fields
      if (config.username && config.password) {
        configs.push(config);
      } else {
        logger.warn(`Bot ${index} configuration incomplete, skipping`);
      }

      index++;
    }

    return configs;
  }

  /**
   * Queue a trade offer for sending
   */
  queueTrade(tradeData) {
    if (this.tradeQueue.length >= this.maxQueueSize) {
      throw new Error('Trade queue is full');
    }

    const trade = {
      ...tradeData,
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      attempts: 0,
      status: 'queued'
    };

    this.tradeQueue.push(trade);

    logger.info(`Trade queued: ${trade.id} for listing ${tradeData.listingId}`);

    return trade.id;
  }

  /**
   * Process trade queue
   */
  async processTradeQueue() {
    if (this.isProcessingTrades || this.tradeQueue.length === 0) {
      return;
    }

    this.isProcessingTrades = true;

    try {
      while (this.tradeQueue.length > 0) {
        const trade = this.tradeQueue.shift();

        try {
          await this.executeTrade(trade);
          logger.info(`Trade ${trade.id} executed successfully`);
        } catch (error) {
          logger.error(`Trade ${trade.id} failed:`, error.message);

          trade.attempts++;
          trade.status = 'failed';
          trade.error = error.message;

          if (trade.attempts < this.retryAttempts) {
            // Exponential backoff
            const delay = Math.pow(2, trade.attempts) * 1000;
            logger.info(`Retrying trade ${trade.id} in ${delay}ms (attempt ${trade.attempts})`);

            setTimeout(() => {
              this.tradeQueue.push(trade);
            }, delay);
          } else {
            logger.error(`Trade ${trade.id} failed after ${trade.attempts} attempts`);

            // Handle permanent failure
            await this.handleTradeFailure(trade);
          }
        }
      }
    } finally {
      this.isProcessingTrades = false;
    }
  }

  /**
   * Execute a trade
   */
  async executeTrade(trade) {
    const listing = await MarketListing.findById(trade.listingId).populate('seller buyer');

    if (!listing) {
      throw new Error('Listing not found');
    }

    if (listing.status !== 'pending_trade') {
      throw new Error('Listing is not in pending_trade status');
    }

    // Find available bot
    const availableBot = this.getAvailableBot();
    if (!availableBot) {
      throw new Error('No available bots');
    }

    // Verify item is in bot inventory
    if (!availableBot.hasItem(trade.assetId)) {
      // Refresh bot inventory and try again
      await availableBot.loadInventory();

      if (!availableBot.hasItem(trade.assetId)) {
        throw new Error(`Item ${trade.assetId} not found in bot inventory`);
      }
    }

    logger.info(`[${availableBot.id}] Executing trade ${trade.id} for listing ${trade.listingId}`);

    // Get buyer's Steam ID
    let buyerSteamId;
    if (trade.buyerId) {
      const buyer = await User.findById(trade.buyerId);
      if (buyer && buyer.steamId) {
        buyerSteamId = buyer.steamId;
      }
    }

    if (!buyerSteamId) {
      throw new Error('Buyer Steam ID not found');
    }

    // Create and send trade offer
    const result = await availableBot.sendSellOffer(
      trade.listingId,
      buyerSteamId,
      trade.buyerTradeUrl,
      trade.assetId
    );

    // Update listing with trade offer ID
    listing.tradeOfferId = result.offerId;
    await listing.save();

    // Update transaction
    const transaction = await Transaction.findOne({
      listing: trade.listingId,
      type: 'purchase'
    });

    if (transaction) {
      transaction.status = 'completed';
      transaction.tradeOfferId = result.offerId;
      await transaction.save();
    }

    trade.status = 'completed';
    trade.offerId = result.offerId;

    return result;
  }

  /**
   * Handle trade failure
   */
  async handleTradeFailure(trade) {
    try {
      const listing = await MarketListing.findById(trade.listingId);

      if (listing) {
        // Refund buyer
        if (trade.buyerId) {
          const buyer = await User.findById(trade.buyerId);
          if (buyer) {
            buyer.wallet.balance += listing.price;
            buyer.wallet.pendingBalance -= listing.price;
            await buyer.save();

            // Log refund
            logger.info(`Refunded buyer for failed trade: ${trade.listingId}`);
          }
        }

        // Reset listing to active
        listing.status = 'active';
        listing.buyer = null;
        listing.tradeOfferId = null;
        await listing.save();

        logger.info(`Listing ${trade.listingId} reset to active status`);
      }
    } catch (error) {
      logger.error(`Error handling trade failure:`, error);
    }
  }

  /**
   * Get available bot
   */
  getAvailableBot() {
    const available = this.activeBots.filter(bot =>
      bot.isOnline && bot.isAvailable && bot.currentTrades < bot.maxTrades
    );

    if (available.length === 0) {
      return null;
    }

    // Return bot with least current trades
    available.sort((a, b) => a.currentTrades - b.currentTrades);

    return available[0];
  }

  /**
   * Start trade queue processor
   */
  startTradeProcessor() {
    setInterval(() => {
      this.processTradeQueue();
    }, 5000); // Check every 5 seconds
  }

  /**
   * Check trade offer status
   */
  async checkTradeStatus(tradeOfferId) {
    try {
      // Find bot that created this trade
      for (const bot of this.activeBots) {
        const status = await require('./steamIntegrationService').getTradeOfferStatus(
          bot.manager,
          tradeOfferId
        );

        if (status) {
          return {
            botId: bot.id,
            ...status
          };
        }
      }

      return null;
    } catch (error) {
      logger.error(`Error checking trade status for ${tradeOfferId}:`, error);
      return null;
    }
  }

  /**
   * Get all bot statuses
   */
  getBotsStatus() {
    return this.activeBots.map(bot => bot.getStatus());
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      queueSize: this.tradeQueue.length,
      maxQueueSize: this.maxQueueSize,
      isProcessing: this.isProcessingTrades,
      trades: this.tradeQueue.map(trade => ({
        id: trade.id,
        listingId: trade.listingId,
        status: trade.status,
        attempts: trade.attempts,
        timestamp: new Date(trade.timestamp)
      }))
    };
  }

  /**
   * Get system status
   */
  getSystemStatus() {
    return {
      bots: {
        total: this.bots.size,
        online: this.activeBots.filter(b => b.isOnline).length,
        available: this.activeBots.filter(b => b.isAvailable).length
      },
      queue: this.getQueueStatus(),
      uptime: process.uptime()
    };
  }

  /**
   * Refresh all bot inventories
   */
  async refreshInventories() {
    logger.info('Refreshing all bot inventories...');

    for (const bot of this.activeBots) {
      try {
        await bot.loadInventory();
      } catch (error) {
        logger.error(`[${bot.id}] Failed to refresh inventory:`, error);
      }
    }

    logger.info('Bot inventories refreshed');
  }

  /**
   * Shutdown all bots
   */
  async shutdown() {
    logger.info('Shutting down Steam Bot Manager...');

    const shutdownPromises = [];

    for (const bot of this.activeBots) {
      shutdownPromises.push(bot.shutdown());
    }

    await Promise.all(shutdownPromises);

    this.bots.clear();
    this.activeBots = [];
    this.tradeQueue = [];

    logger.info('Steam Bot Manager shutdown complete');
  }

  /**
   * Helper: Sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = SteamBotManager;
