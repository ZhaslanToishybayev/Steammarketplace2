const SteamUser = require('steam-user');
const TradeOfferManager = require('steam-tradeoffer-manager');
const logger = require('../utils/logger');
const readline = require('readline');

class SteamBotManager {
  constructor() {
    this.bots = new Map();
    this.activeBots = [];
    this.tradeQueue = [];
    this.isProcessingTrades = false;
  }

  initialize() {
    logger.info('SteamBotManager.initialize() called');
    const botConfigs = this.getBotConfigs();
    logger.info(`Got ${botConfigs.length} bot configurations`);

    botConfigs.forEach((config, index) => {
      logger.info(`Creating bot ${index} with username: ${config.username}`);
      this.createBot(config, index);
    });

    // Start trade processing
    logger.info('Starting trade processor...');
    this.startTradeProcessor();
    logger.info('SteamBotManager.initialize() complete');
  }

  getBotConfigs() {
    // In production, these would come from environment variables or database
    return [
      {
        username: process.env.STEAM_BOT_1_USERNAME,
        password: process.env.STEAM_BOT_1_PASSWORD,
        sharedSecret: process.env.STEAM_BOT_1_SHARED_SECRET,
        identitySecret: process.env.STEAM_BOT_1_IDENTITY_SECRET
      }
      // Add more bots as needed
    ].filter(config => config.username && config.password);
  }

  createBot(config, index) {
    logger.info(`createBot() called for bot ${index}`);
    const botId = `bot_${index}`;
    logger.info(`Creating bot with ID: ${botId}`);

    logger.info('Creating SteamUser client...');
    const client = new SteamUser();
    logger.info('SteamUser client created');

    logger.info('Creating TradeOfferManager...');
    const manager = new TradeOfferManager({
      steam: client,
      language: 'en'
    });
    logger.info('TradeOfferManager created');

    const bot = {
      id: botId,
      client,
      manager,
      config,
      isOnline: false,
      isAvailable: true,
      currentTrades: 0,
      maxTrades: 5
    };
    logger.info('Bot object created');

    // Set up event handlers
    logger.info('Setting up event handlers...');
    this.setupBotEventHandlers(bot);
    logger.info('Event handlers set up');

    // Store bot
    logger.info('Storing bot in Map...');
    this.bots.set(botId, bot);
    logger.info('Bot stored in Map');

    // Login
    logger.info('Calling loginBot()...');
    this.loginBot(bot);
    logger.info('loginBot() called');
  }

  setupBotEventHandlers(bot) {
    const { client, manager } = bot;

    // Store callback globally to prevent it from being lost
    global.steamGuardCallback = null;

    client.on('steamGuard', (...args) => {
      // Log all arguments to understand the order
      logger.info(`Debug: steamGuard called with ${args.length} arguments`);
      args.forEach((arg, i) => {
        logger.info(`  arg[${i}] type: ${typeof arg}, value: ${arg}`);
      });

      // Find the callback (it should be a function)
      const callback = args.find(arg => typeof arg === 'function');
      if (!callback) {
        logger.error('No callback function found in arguments!');
        process.exit(1);
      }

      global.steamGuardCallback = callback;

      logger.warn(`Bot ${bot.id} requires Steam Guard code!`);
      logger.info(`1. Open Steam Mobile app on your phone`);
      logger.info(`2. Go to "Authenticator" tab`);
      logger.info(`3. Enter the 5-6 character code below:`);
      logger.info(`⚠️  Code expires in 30 seconds!`);
      logger.info(`Found callback with type: ${typeof callback}`);

      const timeout = setTimeout(() => {
        logger.error(`Bot ${bot.id} Steam Guard timeout`);
        process.exit(1);
      }, 30000);

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question('\nEnter Steam Guard Code: ', (code) => {
        clearTimeout(timeout);

        // Validate code format (5 or 6 characters)
        if (!code || (code.length !== 5 && code.length !== 6)) {
          logger.error(`Invalid code format. Must be 5-6 characters.`);
          rl.close();
          process.exit(1);
        }

        // Also allow alphanumeric for email codes
        if (!/^[A-Za-z0-9]{5,6}$/.test(code)) {
          logger.error(`Invalid code format. Use alphanumeric characters.`);
          rl.close();
          process.exit(1);
        }

        rl.close();

        logger.info(`Submitting code: ${code}`);

        if (typeof global.steamGuardCallback === 'function') {
          global.steamGuardCallback(code);
        } else {
          logger.error('No valid callback found! Exiting.');
          process.exit(1);
        }
      });
    });

    client.on('loggedOn', () => {
      logger.info(`Bot ${bot.id} logged into Steam`);
      bot.isOnline = true;
      client.setPersona(SteamUser.EPersonaState.Online);
      client.gamesPlayed([730]); // CS2 app ID
    });

    client.on('webSession', (sessionid, cookies) => {
      manager.setCookies(cookies);

      if (!this.activeBots.includes(bot.id)) {
        this.activeBots.push(bot.id);
      }

      logger.info(`Bot ${bot.id} session established and active!`);
    });

    manager.on('newOffer', (offer) => {
      logger.info(`Bot ${bot.id} received new trade offer: ${offer.id}`);
      this.handleIncomingTradeOffer(bot, offer);
    });

    manager.on('sentOfferChanged', (offer, oldState) => {
      logger.info(`Bot ${bot.id} trade offer ${offer.id} changed state: ${oldState} -> ${offer.state}`);
      this.handleTradeOfferStateChange(bot, offer, oldState);
    });

    client.on('error', (err) => {
      logger.error(`Bot ${bot.id} error:`, err);
      bot.isOnline = false;
      
      // Attempt to reconnect after delay
      setTimeout(() => {
        this.loginBot(bot);
      }, 30000);
    });
  }

  loginBot(bot) {
    logger.info(`loginBot() called for bot ${bot.id}`);
    logger.info(`Username: ${bot.config.username}`);

    const logOnOptions = {
      accountName: bot.config.username,
      password: bot.config.password,
      sharedSecret: bot.config.sharedSecret,
      identitySecret: bot.config.identitySecret
    };

    logger.info('Calling bot.client.logOn()...');
    try {
      bot.client.logOn(logOnOptions);
      logger.info('bot.client.logOn() called successfully');
    } catch (error) {
      logger.error(`Error calling logOn: ${error}`);
    }
  }

  async handleIncomingTradeOffer(bot, offer) {
    try {
      // Auto-decline offers that aren't from our system
      const isSystemTrade = await this.isSystemGeneratedTrade(offer);
      
      if (!isSystemTrade) {
        offer.decline((err) => {
          if (err) {
            logger.error(`Failed to decline offer ${offer.id}:`, err);
          } else {
            logger.info(`Declined non-system offer ${offer.id}`);
          }
        });
        return;
      }

      // Handle system trades
      this.processSystemTrade(bot, offer);
    } catch (error) {
      logger.error(`Error handling incoming trade offer:`, error);
    }
  }

  async isSystemGeneratedTrade(offer) {
    // Check if this trade offer was generated by our marketplace system
    // This could be done by checking against pending trades in database
    const MarketListing = require('../models/MarketListing');
    
    const listing = await MarketListing.findOne({
      tradeOfferId: offer.id,
      status: 'pending_trade'
    });

    return !!listing;
  }

  async processSystemTrade(bot, offer) {
    try {
      // Validate the trade offer matches our expectations
      const isValid = await this.validateTradeOffer(offer);
      
      if (isValid) {
        offer.accept((err, status) => {
          if (err) {
            logger.error(`Failed to accept trade offer ${offer.id}:`, err);
            this.handleTradeFailure(offer.id, err);
          } else {
            logger.info(`Accepted trade offer ${offer.id}, status: ${status}`);
            this.handleTradeSuccess(offer.id);
          }
        });
      } else {
        logger.warn(`Invalid trade offer ${offer.id}, declining`);
        offer.decline();
      }
    } catch (error) {
      logger.error(`Error processing system trade:`, error);
    }
  }

  async validateTradeOffer(offer) {
    // Implement validation logic
    // Check items, quantities, etc.
    return true; // Simplified for now
  }

  handleTradeOfferStateChange(bot, offer, oldState) {
    const TradeOfferManager = require('steam-tradeoffer-manager');
    
    if (offer.state === TradeOfferManager.ETradeOfferState.Accepted) {
      this.handleTradeSuccess(offer.id);
      bot.currentTrades = Math.max(0, bot.currentTrades - 1);
    } else if (offer.state === TradeOfferManager.ETradeOfferState.Declined ||
               offer.state === TradeOfferManager.ETradeOfferState.Canceled ||
               offer.state === TradeOfferManager.ETradeOfferState.InvalidItems) {
      this.handleTradeFailure(offer.id, `Trade state: ${offer.state}`);
      bot.currentTrades = Math.max(0, bot.currentTrades - 1);
    }
  }

  async handleTradeSuccess(offerId) {
    try {
      const MarketListing = require('../models/MarketListing');
      const Transaction = require('../models/Transaction');
      
      const listing = await MarketListing.findOne({ tradeOfferId: offerId })
        .populate('seller buyer');
      
      if (listing) {
        // Update listing status
        listing.status = 'sold';
        await listing.save();

        // Create transaction records
        await this.createTransactionRecords(listing);

        // Notify users via socket
        this.notifyTradeCompletion(listing);
      }
    } catch (error) {
      logger.error(`Error handling trade success:`, error);
    }
  }

  async handleTradeFailure(offerId, error) {
    try {
      const MarketListing = require('../models/MarketListing');
      
      const listing = await MarketListing.findOne({ tradeOfferId: offerId });
      
      if (listing) {
        // Reset listing status
        listing.status = 'active';
        listing.tradeOfferId = null;
        await listing.save();

        // Notify users of failure
        this.notifyTradeFailure(listing, error);
      }
    } catch (error) {
      logger.error(`Error handling trade failure:`, error);
    }
  }

  async createTransactionRecords(listing) {
    const Transaction = require('../models/Transaction');
    
    // Create sale transaction for seller
    await Transaction.create({
      type: 'sale',
      user: listing.seller._id,
      amount: listing.price * 0.95, // 5% marketplace fee
      marketListing: listing._id,
      status: 'completed',
      description: `Sale of ${listing.item.marketName}`
    });

    // Create purchase transaction for buyer
    await Transaction.create({
      type: 'purchase',
      user: listing.buyer._id,
      amount: -listing.price,
      marketListing: listing._id,
      status: 'completed',
      description: `Purchase of ${listing.item.marketName}`
    });

    // Create fee transaction
    await Transaction.create({
      type: 'fee',
      user: listing.seller._id,
      amount: -listing.price * 0.05,
      marketListing: listing._id,
      status: 'completed',
      description: `Marketplace fee for ${listing.item.marketName}`
    });
  }

  notifyTradeCompletion(listing) {
    // Implementation would use socket.io to notify users
    logger.info(`Trade completed for listing ${listing._id}`);
  }

  notifyTradeFailure(listing, error) {
    // Implementation would use socket.io to notify users
    logger.error(`Trade failed for listing ${listing._id}:`, error);
  }

  getAvailableBot() {
    for (const bot of this.bots.values()) {
      if (bot.isOnline && bot.isAvailable && bot.currentTrades < bot.maxTrades) {
        return bot;
      }
    }
    return null;
  }

  async sendTradeOffer(botId, partnerSteamId, itemsToGive, itemsToReceive, tradeUrl, message) {
    const bot = this.bots.get(botId);
    
    if (!bot || !bot.isOnline) {
      throw new Error('Bot not available');
    }

    return new Promise((resolve, reject) => {
      const offer = bot.manager.createOffer(tradeUrl);
      
      if (itemsToGive.length > 0) {
        offer.addMyItems(itemsToGive);
      }
      
      if (itemsToReceive.length > 0) {
        offer.addTheirItems(itemsToReceive);
      }
      
      offer.setMessage(message || 'CSGO Skinfo Marketplace Trade');
      
      offer.send((err, status) => {
        if (err) {
          reject(err);
        } else {
          bot.currentTrades++;
          resolve({ offerId: offer.id, status });
        }
      });
    });
  }

  startTradeProcessor() {
    setInterval(() => {
      if (!this.isProcessingTrades && this.tradeQueue.length > 0) {
        this.processTradeQueue();
      }
    }, 5000); // Check every 5 seconds
  }

  async processTradeQueue() {
    if (this.tradeQueue.length === 0) return;
    
    this.isProcessingTrades = true;
    
    try {
      const trade = this.tradeQueue.shift();
      const bot = this.getAvailableBot();
      
      if (bot) {
        await this.sendTradeOffer(
          bot.id,
          trade.partnerSteamId,
          trade.itemsToGive,
          trade.itemsToReceive,
          trade.tradeUrl,
          trade.message
        );
      } else {
        // Put trade back in queue if no bot available
        this.tradeQueue.unshift(trade);
      }
    } catch (error) {
      logger.error('Error processing trade queue:', error);
    } finally {
      this.isProcessingTrades = false;
    }
  }

  queueTrade(tradeData) {
    this.tradeQueue.push(tradeData);
  }
}

module.exports = SteamBotManager;