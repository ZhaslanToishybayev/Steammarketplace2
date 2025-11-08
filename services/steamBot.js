/**
 * Steam Bot Manager - Production Ready
 * Реальный бот для автоматизации trade offers в marketplace
 */

const SteamUser = require('steam-user');
const TradeOfferManager = require('steam-tradeoffer-manager');
const steamTOTP = require('steam-totp');
const logger = require('../utils/logger');
const steamIntegration = require('./steamIntegrationService');
const MarketListing = require('../models/MarketListing');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

class SteamBot {
  constructor(config, botIndex = 0) {
    this.config = config;
    this.botIndex = botIndex;
    this.id = `bot_${botIndex}`;
    this.isOnline = false;
    this.isAvailable = true;
    this.currentTrades = 0;
    this.maxTrades = 5;
    this.client = null;
    this.manager = null;
    // Поддержка множественных инвентарей для разных игр
    this.inventory = {}; // { '730': [], '570': [] }
    this.inventoryLoaded = {}; // { '730': false, '570': false }
  }

  async initialize() {
    try {
      logger.info(`[${this.id}] Initializing bot...`);

      // Create SteamUser client with optimized settings
      this.client = new SteamUser({
        promptSteamGuardCode: false,
        disableScheduledMessages: false,
        enableChainrhinos: false
      });

      // Create TradeOfferManager
      this.manager = new TradeOfferManager({
        steam: this.client,
        language: 'en',
        pollInterval: 10000, // 10 seconds
        cancelTime: 15 * 60 * 1000 // 15 minutes
      });

      // Setup event handlers
      this.setupEventHandlers();

      // Login to Steam
      await this.login();

      // Wait for webSession to get cookies for TradeOfferManager
      logger.info(`[${this.id}] Waiting for webSession to get cookies...`);
      await new Promise((resolve, reject) => {
        this.client.once('webSession', (sessionID, cookies) => {
          logger.info(`[${this.id}] Got web session, setting cookies for TradeOfferManager`);

          this.manager.setCookies(cookies, (err) => {
            if (err) {
              logger.error(`[${this.id}] Failed to set cookies:`, err);
              reject(err);
              return;
            }

            logger.info(`[${this.id}] Cookies set successfully, inventory will load automatically`);
            resolve();
          });
        });

        // Timeout after 30 seconds
        setTimeout(() => {
          reject(new Error('webSession timeout - cookies not received'));
        }, 30000);
      });

      // Force load bot inventory immediately
      logger.info(`[${this.id}] Forcing bot inventory load...`);
      try {
        this.manager.emit('steamCurrency', (currency) => {
          logger.info(`[${this.id}] Steam currency: ${currency}`);
        });

        // Try to get inventory directly - TradeOfferManager loads inventory automatically
        // Check if inventory is already loaded
        if (this.manager.inventory && this.manager.inventory.getItems) {
          const items = this.manager.inventory.getItems();
          logger.info(`[${this.id}] Got inventory directly: ${items?.length || 0} items`);
        } else {
          logger.info(`[${this.id}] Inventory not loaded yet, will retry later`);
        }
      } catch (error) {
        logger.error(`[${this.id}] Error forcing inventory load:`, error);
      }

      // Load all inventories (CS2 and Dota 2)
      await this.loadInventory();

      logger.info(`[${this.id}] Bot initialized successfully`);

      return true;
    } catch (error) {
      logger.error(`[${this.id}] Failed to initialize:`, error);
      throw error;
    }
  }

  setupEventHandlers() {
    // Steam Guard authentication
    this.client.on('steamGuard', (domain, callback, lastCodeWrong) => {
      logger.warn(`[${this.id}] Steam Guard required`);

      try {
        const code = steamTOTP.generateAuthCode(this.config.sharedSecret);
        logger.info(`[${this.id}] Auto-generating Steam Guard code: ${code}`);
        callback(code);
      } catch (error) {
        logger.error(`[${this.id}] Failed to generate Steam Guard code:`, error);
        callback(null); // Will prompt user
      }
    });

    // Logged in successfully
    this.client.on('loggedOn', (details) => {
      logger.info(`[${this.id}] Logged in as: ${details.vanityurl || details.accountName}`);
      logger.info(`[${this.id}] SteamID available: ${this.client.steamID || this.client.steamId || 'NONE'}`);
      logger.info(`[${this.id}] Client properties: ${JSON.stringify(Object.keys(this.client).slice(0, 20))}`);

      this.isOnline = true;
      this.isAvailable = true;

      // Set persona to online
      this.client.setPersona(SteamUser.EPersonaState.Online);

      // Play CS2
      this.client.gamesPlayed(730);

      logger.info(`[${this.id}] Bot is online and playing CS2`);
    });

    // Disconnected
    this.client.on('disconnected', (eresult, msg) => {
      logger.warn(`[${this.id}] Disconnected: ${eresult} - ${msg}`);

      this.isOnline = false;
      this.isAvailable = false;

      // Attempt to reconnect after delay
      setTimeout(() => {
        logger.info(`[${this.id}] Attempting to reconnect...`);
        this.reconnect();
      }, 30000);
    });

    // Session replaced (logged in elsewhere)
    this.client.on('sessionReplaced', (mobile, accountName, token) => {
      logger.warn(`[${this.id}] Session replaced`);

      this.isOnline = false;

      // Re-login
      setTimeout(() => {
        this.login();
      }, 5000);
    });

    // New trade offer received
    this.manager.on('newOffer', (offer) => {
      logger.info(`[${this.id}] New trade offer received: ${offer.id}`);

      this.handleIncomingOffer(offer);
    });

    // Trade offer state changed
    this.manager.on('offerList', (offers) => {
      if (!Array.isArray(offers)) return;
      offers.forEach(offer => {
        if (offer.isCompleted()) {
          logger.info(`[${this.id}] Trade offer ${offer.id} completed`);
          this.handleTradeCompletion(offer);
        }
      });
    });

    // Bot inventory loaded
    this.manager.on('inventoryLoaded', () => {
      logger.info(`[${this.id}] Bot inventory loaded event triggered`);
      this.loadInventory();
    });

    // Add retry mechanism for inventory loading
    let inventoryRetryCount = 0;
    const config = SteamBot.INVENTORY_CONFIG;

    const retryInventoryLoad = () => {
      if (inventoryRetryCount < config.MAX_RETRIES) {
        inventoryRetryCount++;
        logger.info(`[${this.id}] Retrying inventory load (attempt ${inventoryRetryCount}/${config.MAX_RETRIES})`);
        setTimeout(() => {
          this.loadInventory().then(() => {
            const totalItems = (this.inventory['730']?.length || 0) + (this.inventory['570']?.length || 0);
            if (totalItems === 0 && inventoryRetryCount < config.MAX_RETRIES) {
              retryInventoryLoad();
            }
          });
        }, config.RETRY_DELAY); // Wait 10 seconds between retries
      } else {
        logger.warn(`[${this.id}] Max inventory retry attempts reached, giving up`);
      }
    };

    // Start retry mechanism after initial load
    setTimeout(() => {
      const totalItems = (this.inventory['730']?.length || 0) + (this.inventory['570']?.length || 0);
      if (totalItems === 0) {
        logger.info(`[${this.id}] Initial inventory empty, starting retry mechanism`);
        retryInventoryLoad();
      }
    }, config.INITIAL_RETRY_DELAY); // Start after 30 seconds

    // Error handling
    this.client.on('error', (error) => {
      logger.error(`[${this.id}] Client error:`, error);
    });

    this.manager.on('error', (error) => {
      logger.error(`[${this.id}] Manager error:`, error);
    });
  }

  async login() {
    return new Promise((resolve, reject) => {
      logger.info(`[${this.id}] Logging in...`);

      this.client.logOn({
        accountName: this.config.username,
        password: this.config.password,
        twoFactorCode: this.config.sharedSecret
          ? steamTOTP.generateAuthCode(this.config.sharedSecret)
          : undefined
      });

      this.client.once('loggedOn', () => {
        resolve();
      });

      this.client.once('logOnFailure', (error) => {
        logger.error(`[${this.id}] Login failed:`, error);
        reject(error);
      });
    });
  }

  async reconnect() {
    try {
      await this.login();
    } catch (error) {
      logger.error(`[${this.id}] Reconnection failed:`, error);
    }
  }

  // Константы для настройки загрузки инвентаря
  static INVENTORY_CONFIG = {
    MAX_RETRIES: 5,
    RETRY_DELAY: 10000, // 10 seconds
    INITIAL_RETRY_DELAY: 30000, // 30 seconds
    TIMEOUT: 30000 // 30 seconds
  };

  /**
   * Load inventory for specific game (or all games)
   * @param {number} appId - Game appId (730 for CS2, 570 for Dota 2). If not specified, loads all games.
   * @returns {Promise<Array>} - Loaded inventory items
   */
  async loadInventory(appId = null) {
    try {
      // Load all inventories if no specific appId
      if (!appId) {
        logger.info(`[${this.id}] Loading all bot inventories (CS2 and Dota 2)...`);

        // Load CS2 inventory (appId=730)
        this.inventory['730'] = await this.loadInventory(730);
        this.inventoryLoaded['730'] = true;

        // Load Dota 2 inventory (appId=570)
        this.inventory['570'] = await this.loadInventory(570);
        this.inventoryLoaded['570'] = true;

        logger.info(`[${this.id}] All inventories loaded - CS2: ${this.inventory['730'].length}, Dota 2: ${this.inventory['570'].length}`);

        return {
          '730': this.inventory['730'],
          '570': this.inventory['570']
        };
      }

      // Load specific game inventory
      const gameName = appId === 730 ? 'CS2' : (appId === 570 ? 'Dota 2' : `AppId ${appId}`);
      logger.info(`[${this.id}] Loading ${gameName} inventory (appId: ${appId})...`);

      this.inventory[appId] = await new Promise((resolve, reject) => {
        steamIntegration.getBotInventory(this.manager, appId)
          .then(resolve)
          .catch(reject);
      });

      this.inventoryLoaded[appId] = true;
      logger.info(`[${this.id}] Loaded ${this.inventory[appId].length} ${gameName} items`);

      return this.inventory[appId];
    } catch (error) {
      logger.error(`[${this.id}] Failed to load inventory for appId ${appId}:`, error);
      this.inventory[appId] = [];
      this.inventoryLoaded[appId] = false;
      return [];
    }
  }

  /**
   * Send trade offer to user (for selling items)
   */
  async sendSellOffer(listingId, buyerSteamId, buyerTradeUrl, assetId) {
    try {
      if (!this.isOnline || !this.isAvailable) {
        throw new Error('Bot is not available');
      }

      if (this.currentTrades >= this.maxTrades) {
        throw new Error('Bot has reached maximum trade limit');
      }

      logger.info(`[${this.id}] Creating sell offer for listing ${listingId}`);

      // Get listing details
      const listing = await MarketListing.findById(listingId);
      if (!listing || listing.status !== 'pending_trade') {
        throw new Error('Invalid listing status');
      }

      // Find item in bot inventory
      const item = this.inventory.find(invItem =>
        invItem.assetid === assetId || invItem.id === assetId
      );

      if (!item) {
        logger.error(`[${this.id}] Item ${assetId} not found in bot inventory`);
        throw new Error('Item not found in bot inventory');
      }

      if (!item.tradable) {
        throw new Error('Item is not tradable');
      }

      this.currentTrades++;

      // Create trade offer
      const offerResult = await steamIntegration.createTradeOffer(
        this.manager,
        buyerSteamId,
        [assetId],
        [] // No items needed from user (paying with wallet)
      );

      logger.info(`[${this.id}] Sell offer ${offerResult.offerId} created for listing ${listingId}`);

      // Update listing with trade offer ID
      listing.tradeOfferId = offerResult.offerId;
      await listing.save();

      // Schedule inventory refresh
      setTimeout(() => {
        this.loadInventory();
      }, 10000);

      return offerResult;
    } catch (error) {
      logger.error(`[${this.id}] Failed to send sell offer:`, error);
      this.currentTrades = Math.max(0, this.currentTrades - 1);
      throw error;
    }
  }

  /**
   * Send trade offer to user (for buying items)
   */
  async sendBuyOffer(sellerSteamId, itemAssetIds) {
    try {
      if (!this.isOnline || !this.isAvailable) {
        throw new Error('Bot is not available');
      }

      if (this.currentTrades >= this.maxTrades) {
        throw new Error('Bot has reached maximum trade limit');
      }

      logger.info(`[${this.id}] Creating buy offer for ${itemAssetIds.length} items`);

      this.currentTrades++;

      // Create trade offer - bot gives nothing, receives items
      const offerResult = await steamIntegration.createTradeOffer(
        this.manager,
        sellerSteamId,
        [], // No items from bot
        itemAssetIds // Items we want to buy
      );

      logger.info(`[${this.id}] Buy offer ${offerResult.offerId} created`);

      // Schedule inventory refresh
      setTimeout(() => {
        this.loadInventory();
      }, 10000);

      return offerResult;
    } catch (error) {
      logger.error(`[${this.id}] Failed to send buy offer:`, error);
      this.currentTrades = Math.max(0, this.currentTrades - 1);
      throw error;
    }
  }

  /**
   * Handle incoming trade offer
   */
  async handleIncomingOffer(offer) {
    try {
      // Check if this is a marketplace offer
      const listing = await MarketListing.findOne({
        tradeOfferId: offer.id
      });

      if (listing) {
        // Verify offer contents
        await offer.getItems((err, myItems, theirItems) => {
          if (err) {
            logger.error(`[${this.id}] Error checking offer ${offer.id}:`, err);
            return;
          }

          // Validate items match listing
          const expectedItemId = listing.item.assetId;
          const actualItem = myItems.find(item => item.assetid === expectedItemId);

          if (!actualItem) {
            logger.error(`[${this.id}] Offer ${offer.id} doesn't contain expected item`);
            offer.decline();
            return;
          }

          logger.info(`[${this.id}] Accepting valid marketplace offer ${offer.id}`);
          offer.accept();
        });
      } else {
        // Not a marketplace offer, log and continue
        logger.info(`[${this.id}] Received non-marketplace offer ${offer.id}`);
      }
    } catch (error) {
      logger.error(`[${this.id}] Error handling incoming offer:`, error);
    }
  }

  /**
   * Handle trade completion
   */
  async handleTradeCompletion(offer) {
    try {
      const listing = await MarketListing.findOne({
        tradeOfferId: offer.id
      });

      if (listing) {
        logger.info(`[${this.id}] Trade ${offer.id} completed for listing ${listing._id}`);

        // Update listing status
        listing.status = 'sold';
        await listing.save();

        // Update transactions
        const transaction = await Transaction.findOne({
          listing: listing._id,
          type: 'purchase'
        });

        if (transaction) {
          transaction.status = 'completed';
          await transaction.save();

          // Release funds to seller
          const seller = await User.findById(listing.seller);
          if (seller) {
            seller.wallet.pendingBalance -= listing.price;
            seller.wallet.balance += listing.price;
            await seller.save();
          }
        }
      }
    } catch (error) {
      logger.error(`[${this.id}] Error handling trade completion:`, error);
    }

    // Decrement trade counter
    this.currentTrades = Math.max(0, this.currentTrades - 1);

    // Refresh inventory
    this.loadInventory();
  }

  /**
   * Check if bot has specific item (searches in all inventories)
   */
  hasItem(assetId) {
    const allItems = [
      ...(this.inventory['730'] || []),
      ...(this.inventory['570'] || [])
    ];
    return allItems.some(item =>
      item.assetid === assetId || item.id === assetId
    );
  }

  /**
   * Get bot status
   */
  getStatus() {
    return {
      id: this.id,
      isOnline: this.isOnline,
      isAvailable: this.isAvailable,
      currentTrades: this.currentTrades,
      maxTrades: this.maxTrades,
      inventory: {
        cs2: this.inventory['730']?.length || 0,
        dota2: this.inventory['570']?.length || 0,
        total: (this.inventory['730']?.length || 0) + (this.inventory['570']?.length || 0)
      },
      steamId: this.client?.steamID || null,
      accountName: this.config.username
    };
  }

  /**
   * Shutdown bot
   */
  async shutdown() {
    logger.info(`[${this.id}] Shutting down bot...`);

    this.isAvailable = false;

    if (this.client) {
      this.client.logOff();
    }

    logger.info(`[${this.id}] Bot shutdown complete`);
  }
}

module.exports = SteamBot;
