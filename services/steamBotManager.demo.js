const logger = require('../utils/logger');

class SteamBotManager {
  constructor() {
    this.bots = new Map();
    this.activeBots = [];
    this.tradeQueue = [];
    this.isProcessingTrades = false;
  }

  initialize() {
    const botConfigs = this.getBotConfigs();

    botConfigs.forEach((config, index) => {
      this.createBot(config, index);
    });

    // Start trade processor
    this.startTradeProcessor();
  }

  getBotConfigs() {
    // For demo - skip bots without credentials
    const configs = [
      {
        username: process.env.STEAM_BOT_1_USERNAME,
        password: process.env.STEAM_BOT_1_PASSWORD,
        sharedSecret: process.env.STEAM_BOT_1_SHARED_SECRET,
        identitySecret: process.env.STEAM_BOT_1_IDENTITY_SECRET
      }
    ];

    // Only return configs with username and password
    return configs.filter(config => config.username && config.password);
  }

  createBot(config, index) {
    const botId = `bot_${index}`;

    // In demo mode, don't initialize actual Steam client
    const bot = {
      id: botId,
      client: null,
      manager: null,
      config,
      isOnline: false,
      isAvailable: true,
      currentTrades: 0,
      maxTrades: 5,
      demoMode: true
    };

    // Set up event handlers
    this.setupBotEventHandlers(bot);

    // Store bot
    this.bots.set(botId, bot);

    // In demo mode, simulate successful login
    logger.info(`[DEMO MODE] Bot ${bot.id} initialized - Steam integration simulated`);
    bot.isOnline = true;

    if (!this.activeBots.includes(bot.id)) {
      this.activeBots.push(bot.id);
    }

    logger.info(`Bot ${bot.id} is now ONLINE and ready!`);
  }

  setupBotEventHandlers(bot) {
    // In demo mode, skip actual Steam event handlers
    logger.info(`[DEMO] Bot ${bot.id} event handlers configured`);
  }

  async handleIncomingTradeOffer(bot, offer) {
    logger.info(`[DEMO] Bot ${bot.id} would handle trade offer ${offer.id}`);
  }

  handleTradeOfferStateChange(bot, offer, oldState) {
    logger.info(`[DEMO] Bot ${bot.id} trade ${offer.id} state changed`);
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

    logger.info(`[DEMO] Bot ${botId} would send trade offer`);
    return new Promise((resolve) => {
      bot.currentTrades++;
      setTimeout(() => {
        resolve({ offerId: `demo_${Date.now()}`, status: 'sent' });
      }, 1000);
    });
  }

  startTradeProcessor() {
    setInterval(() => {
      if (!this.isProcessingTrades && this.tradeQueue.length > 0) {
        this.processTradeQueue();
      }
    }, 5000);
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
    logger.info(`[DEMO] Trade queued: ${tradeData.itemsToGive?.length || 0} items`);
  }
}

module.exports = SteamBotManager;
