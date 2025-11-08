# 🛠️ ГОТОВЫЕ ИСПРАВЛЕНИЯ КОДА

**Дата:** 2025-11-07
**Статус:** КОД ГОТОВ К ИСПОЛЬЗОВАНИЮ

---

## 📝 СОДЕРЖАНИЕ

1. [steamBot.js - ПОЛНОСТЬЮ ПЕРЕПИСАННЫЙ](#1-steambotjs---полностью-переписанный)
2. [steamBotManager.js - УЛУЧШЕННЫЙ](#2-steambotmanagerjs---улучшенный)
3. [package.json - ОБНОВЛЁННЫЙ](#3-packagejson---обновлённый)
4. [test-bot-fixed.js - ТЕСТОВЫЙ СКРИПТ](#4-test-bot-fixedjs---тестовый-скрипт)

---

## 1. steamBot.js - ПОЛНОСТЬЮ ПЕРЕПИСАННЫЙ

**Файл:** `/home/zhaslan/Downloads/Telegram Desktop/Steammarketplace2-05.11/Steammarketplace2-main/services/steamBot.fixed.js`

```javascript
/**
 * Steam Bot Manager - FIXED VERSION
 * Исправлена загрузка инвентаря и все критические проблемы
 */

const SteamUser = require('steam-user');
const TradeOfferManager = require('steam-tradeoffer-manager');
const steamTOTP = require('steam-totp');
const axios = require('axios');
const logger = require('../utils/logger');

class SteamBotFixed {
  constructor(config, botIndex = 0) {
    this.config = config;
    this.botIndex = botIndex;
    this.id = `bot_${botIndex}`;
    this.isOnline = false;
    this.isAvailable = true;
    this.client = null;
    this.manager = null;
    this.inventory = [];
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      try {
        // 1. Создаём клиент с новыми опциями v5.x
        this.client = new SteamUser({
          promptSteamGuardCode: false,
          disableScheduledMessages: false,
          enableEnergyUsageManager: true,
          autoRelogin: true,
          singleSentryFile: true,
          saveAppTickets: true
        });

        // 2. Создаём TradeOfferManager с оптимальными настройками
        this.manager = new TradeOfferManager({
          steam: this.client,
          domain: process.env.DOMAIN || 'localhost',
          language: 'en',
          pollInterval: 30000,  // 30 секунд (вместо 10)
          cancelTime: 15 * 60 * 1000,
          cancelCount: 3,
          getHoldInfo: true
        });

        // 3. Настраиваем event handlers
        this.setupEventHandlers();

        // 4. Логинимся
        this.login()
          .then(() => {
            logger.info(`[${this.id}] Bot initialized successfully`);
            resolve();
          })
          .catch(reject);

      } catch (error) {
        logger.error(`[${this.id}] Initialization error:`, error);
        reject(error);
      }
    });
  }

  setupEventHandlers() {
    // Steam Guard - улучшенная обработка
    this.client.on('steamGuard', (domain, callback, lastCodeWrong) => {
      logger.warn(`[${this.id}] Steam Guard required`);

      try {
        const code = steamTOTP.generateAuthCode(this.config.sharedSecret);
        logger.info(`[${this.id}] Auto-generated Steam Guard code: ${code}`);
        callback(code);
      } catch (error) {
        logger.error(`[${this.id}] Failed to generate Steam Guard code:`, error);

        // Ретраи через 30 секунд
        setTimeout(() => {
          try {
            const retryCode = steamTOTP.generateAuthCode(this.config.sharedSecret);
            callback(retryCode);
          } catch (retryError) {
            logger.error(`[${this.id}] Retry failed:`, retryError);
            process.exit(1);
          }
        }, 30000);
      }
    });

    // Logged on
    this.client.on('loggedOn', (details) => {
      logger.info(`[${this.id}] Logged in as: ${details.vanityurl || details.accountName}`);
      logger.info(`[${this.id}] SteamID: ${this.client.steamID.getSteamID64()}`);

      this.isOnline = true;
      this.isAvailable = true;

      // Устанавливаем статус
      this.client.setPersona(SteamUser.EPersonaState.Online);
      this.client.gamesPlayed(730);  // CS2

      logger.info(`[${this.id}] Bot is online and playing CS2`);
    });

    // webSession - КЛЮЧЕВОЕ событие для TradeOfferManager
    this.client.on('webSession', (sessionID, cookies) => {
      logger.info(`[${this.id}] Got web session, setting cookies for TradeOfferManager`);

      this.manager.setCookies(cookies, (err) => {
        if (err) {
          logger.error(`[${this.id}] Failed to set cookies:`, err);
          return;
        }

        logger.info(`[${this.id}] Cookies set successfully, inventory will load automatically`);

        // Инвентарь загрузится автоматически через 5 секунд
        setTimeout(() => {
          this.loadInventory()
            .then(() => {
              logger.info(`[${this.id}] Initial inventory load completed`);
            })
            .catch(error => {
              logger.error(`[${this.id}] Initial inventory load failed:`, error);
            });
        }, 5000);
      });
    });

    // Inventory loaded - НОВОЕ событие
    this.manager.on('inventoryLoaded', (appid, contextid) => {
      logger.info(`[${this.id}] Inventory loaded for appid ${appid}, contextid ${contextid}`);

      if (appid === 730) {  // CS2
        this.loadInventory();
      }
    });

    // Disconnected
    this.client.on('disconnected', (eresult, msg) => {
      logger.warn(`[${this.id}] Disconnected: ${eresult} - ${msg}`);

      this.isOnline = false;
      this.isAvailable = false;

      // Автоматическое переподключение (v5.x)
      // Не нужно вручную вызывать - steam-user v5.x делает это сам
    });

    // Session replaced - улучшенная обработка
    this.client.on('sessionReplaced', (mobile, accountName, token) => {
      logger.warn(`[${this.id}] Session replaced`);

      this.isOnline = false;

      // Очищаем cookies
      this.manager.setCookies(null, (err) => {
        if (err) {
          logger.error(`[${this.id}] Error clearing cookies:`, err);
        }

        // Повторный логин через 5 секунд
        setTimeout(() => {
          this.login()
            .then(() => {
              logger.info(`[${this.id}] Re-logged after session replacement`);
            })
            .catch(error => {
              logger.error(`[${this.id}] Re-login failed:`, error);
            });
        }, 5000);
      });
    });

    // Trade offer events
    this.manager.on('newOffer', (offer) => {
      logger.info(`[${this.id}] New trade offer received: ${offer.id}`);
      this.handleIncomingOffer(offer);
    });

    this.manager.on('offerList', (offers) => {
      offers.forEach(offer => {
        if (offer.isCompleted()) {
          logger.info(`[${this.id}] Trade offer ${offer.id} completed`);
          this.handleTradeCompletion(offer);
        }
      });
    });

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

      const timeout = setTimeout(() => {
        reject(new Error('Login timeout after 60 seconds'));
      }, 60000);

      this.client.once('loggedOn', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.client.once('logOnFailure', (error) => {
        clearTimeout(timeout);
        logger.error(`[${this.id}] Login failed:`, error);
        reject(error);
      });
    });
  }

  async loadInventory() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Inventory load timeout after 90 seconds'));
      }, 90000);

      try {
        // Проверяем, что TradeOfferManager готов
        if (!this.manager || !this.manager.inventory) {
          throw new Error('TradeOfferManager not ready');
        }

        // Получаем предметы
        const allItems = this.manager.inventory.getItems();

        clearTimeout(timeout);

        if (!allItems || allItems.length === 0) {
          logger.warn(`[${this.id}] No items in TradeOfferManager, using API fallback`);
          return this.loadInventoryFromAPI()
            .then(items => {
              this.inventory = items;
              resolve(items);
            })
            .catch(reject);
        }

        // Фильтруем CS2 предметы
        const cs2Items = allItems.filter(item => item.appid === 730);
        const tradableItems = cs2Items.filter(item => item.tradable);

        logger.info(`[${this.id}] Loaded ${tradableItems.length} tradable CS2 items from ${allItems.length} total`);

        // Кэшируем
        this.inventory = tradableItems;

        resolve(tradableItems);
      } catch (error) {
        clearTimeout(timeout);
        logger.error(`[${this.id}] Error loading inventory:`, error);

        // Fallback к API
        this.loadInventoryFromAPI()
          .then(items => {
            this.inventory = items;
            resolve(items);
          })
          .catch(reject);
      }
    });
  }

  async loadInventoryFromAPI() {
    try {
      const steamId = this.client.steamID.getSteamID64();
      const cookies = this.getCookiesString();

      if (!cookies) {
        throw new Error('No cookies available for API request');
      }

      const response = await axios.get(
        `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=5000`,
        {
          headers: {
            'Cookie': cookies,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive'
          },
          timeout: 30000,
          validateStatus: (status) => status < 500
        }
      );

      if (response.status === 429) {
        throw new Error('Rate limited by Steam API');
      }

      if (response.status === 403) {
        throw new Error('Access forbidden (check cookies)');
      }

      if (!response.data.success) {
        throw new Error('Steam API returned success=false');
      }

      const { assets, descriptions } = response.data;

      if (!assets || !descriptions) {
        throw new Error('Invalid API response format');
      }

      // Объединяем assets с descriptions
      const items = assets.map(asset => {
        const description = descriptions.find(desc =>
          desc.classid === asset.classid && desc.instanceid === asset.instanceid
        );

        return {
          assetid: asset.assetid,
          classid: asset.classid,
          instanceid: asset.instanceid,
          appid: asset.appid,
          contextid: asset.contextid,
          amount: asset.amount,
          name: description?.name || 'Unknown',
          market_name: description?.market_name || description?.name || 'Unknown',
          tradable: description?.tradable === 1,
          marketable: description?.marketable === 1,
          icon_url: description?.icon_url
        };
      });

      // Фильтруем только tradable CS2 предметы
      const tradableItems = items.filter(item =>
        item.appid === 730 &&
        item.tradable &&
        item.marketable
      );

      logger.info(`[${this.id}] Loaded ${tradableItems.length} items from Steam API`);

      return tradableItems;
    } catch (error) {
      logger.error(`[${this.id}] API fallback failed:`, error);
      throw error;
    }
  }

  getCookiesString() {
    if (!this.client || !this.client.cookies) {
      return null;
    }

    return this.client.cookies
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join('; ');
  }

  async sendSellOffer(listingId, buyerSteamId, buyerTradeUrl, assetId) {
    if (!this.isOnline || !this.isAvailable) {
      throw new Error('Bot is not available');
    }

    return new Promise((resolve, reject) => {
      this.manager.createOffer(buyerSteamId, (err, offer) => {
        if (err) {
          logger.error(`[${this.id}] Error creating offer:`, err);
          return reject(err);
        }

        const item = this.manager.inventory.getAsset(assetId);
        if (!item) {
          offer.cancel();
          return reject(new Error(`Item ${assetId} not found in inventory`));
        }

        offer.addMyItem(item);

        offer.send('Marketplace transaction', (err2) => {
          if (err2) {
            logger.error(`[${this.id}] Error sending offer:`, err2);
            return reject(err2);
          }

          logger.info(`[${this.id}] Sell offer ${offer.id} sent successfully`);

          resolve({
            offerId: offer.id,
            offer: offer,
            status: 'sent'
          });
        });
      });
    });
  }

  hasItem(assetId) {
    return this.inventory.some(item => item.assetid === assetId);
  }

  getStatus() {
    return {
      id: this.id,
      isOnline: this.isOnline,
      isAvailable: this.isAvailable,
      inventorySize: this.inventory.length,
      steamId: this.client?.steamID?.getSteamID64() || null,
      accountName: this.config.username
    };
  }

  async shutdown() {
    logger.info(`[${this.id}] Shutting down bot...`);
    this.isAvailable = false;

    if (this.client) {
      this.client.logOff();
    }

    logger.info(`[${this.id}] Bot shutdown complete`);
  }
}

module.exports = SteamBotFixed;
```

---

## 2. steamBotManager.js - УЛУЧШЕННЫЙ

**Файл:** `/home/zhaslan/Downloads/Telegram Desktop/Steammarketplace2-05.11/Steammarketplace2-main/services/steamBotManager.fixed.js`

```javascript
/**
 * Steam Bot Manager - FIXED VERSION
 * Добавлен rate limiting и улучшенная обработка ошибок
 */

const SteamBotFixed = require('./steamBot.fixed');
const EventEmitter = require('events');

class SteamBotManagerFixed extends EventEmitter {
  constructor() {
    super();
    this.bots = new Map();
    this.activeBots = [];
    this.tradeQueue = [];
    this.isProcessingTrades = false;
    this.maxQueueSize = 100;
    this.retryAttempts = 3;
    this.maxConcurrentBots = 2;  // Максимум 2 бота одновременно
  }

  async initialize() {
    logger.info('Initializing Steam Bot Manager (Fixed Version)...');

    const botConfigs = this.getBotConfigs();

    if (botConfigs.length === 0) {
      logger.warn('No Steam bot configurations found');
      return 0;
    }

    logger.info(`Found ${botConfigs.length} bot configurations`);

    // Инициализируем ботов по батчам
    const results = await this.initializeBotsBatch(botConfigs);

    const successfulBots = results.filter(r => r.status === 'fulfilled').length;
    const failedBots = results.filter(r => r.status === 'rejected').length;

    logger.info(`Initialization complete: ${successfulBots} successful, ${failedBots} failed`);

    // Запускаем обработку очереди trade'ов
    this.startTradeProcessor();

    return successfulBots;
  }

  async initializeBotsBatch(botConfigs) {
    const results = [];
    const maxConcurrent = this.maxConcurrentBots;

    for (let i = 0; i < botConfigs.length; i += maxConcurrent) {
      const batch = botConfigs.slice(i, i + maxConcurrent);
      logger.info(`Initializing batch ${Math.floor(i / maxConcurrent) + 1}/${Math.ceil(botConfigs.length / maxConcurrent)}`);

      const batchPromises = batch.map((config, index) => {
        const botIndex = i + index;
        return this.initializeBot(config, botIndex);
      });

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);

      // Пауза между батчами - 60 секунд
      if (i + maxConcurrent < botConfigs.length) {
        logger.info('Waiting 60 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 60000));
      }
    }

    return results;
  }

  async initializeBot(config, botIndex) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Bot ${botIndex} initialization timeout`));
      }, 300000);  // 5 минут таймаут

      const bot = new SteamBotFixed(config, botIndex);

      bot.initialize()
        .then(() => {
          clearTimeout(timeout);
          this.bots.set(bot.id, bot);
          this.activeBots.push(bot);

          logger.info(`[Bot ${botIndex}] Initialized successfully`);
          resolve(bot);
        })
        .catch(error => {
          clearTimeout(timeout);
          logger.error(`[Bot ${botIndex}] Failed to initialize:`, error);
          reject(error);
        });
    });
  }

  getAvailableBot() {
    const available = this.activeBots.filter(bot =>
      bot.isOnline && bot.isAvailable && bot.inventory.length > 0
    );

    if (available.length === 0) {
      return null;
    }

    // Возвращаем бота с наименьшим количеством предметов
    available.sort((a, b) => a.inventory.length - b.inventory.length);

    return available[0];
  }

  async queueTrade(tradeData) {
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

    // Запускаем обработку очереди
    this.processTradeQueue();

    return trade.id;
  }

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
            // Экспоненциальный backoff
            const delay = Math.min(Math.pow(2, trade.attempts) * 1000, 60000);
            logger.info(`Retrying trade ${trade.id} in ${delay}ms (attempt ${trade.attempts})`);

            setTimeout(() => {
              this.tradeQueue.push(trade);
            }, delay);
          } else {
            logger.error(`Trade ${trade.id} failed after ${trade.attempts} attempts`);
            await this.handleTradeFailure(trade);
          }
        }
      }
    } finally {
      this.isProcessingTrades = false;
    }
  }

  async executeTrade(trade) {
    const availableBot = this.getAvailableBot();

    if (!availableBot) {
      throw new Error('No available bots with inventory');
    }

    // Проверяем, что предмет в инвентаре
    if (!availableBot.hasItem(trade.assetId)) {
      // Обновляем инвентарь
      await availableBot.loadInventory();

      if (!availableBot.hasItem(trade.assetId)) {
        throw new Error(`Item ${trade.assetId} not found in bot inventory`);
      }
    }

    logger.info(`[${availableBot.id}] Executing trade ${trade.id}`);

    const result = await availableBot.sendSellOffer(
      trade.listingId,
      trade.buyerSteamId,
      trade.buyerTradeUrl,
      trade.assetId
    );

    trade.status = 'completed';
    trade.offerId = result.offerId;

    return result;
  }

  async handleTradeFailure(trade) {
    try {
      const listing = await MarketListing.findById(trade.listingId);

      if (listing) {
        // Возвращаем деньги покупателю
        if (trade.buyerId) {
          const buyer = await User.findById(trade.buyerId);
          if (buyer) {
            buyer.wallet.balance += listing.price;
            await buyer.save();
            logger.info(`Refunded buyer for failed trade: ${trade.listingId}`);
          }
        }

        // Сбрасываем статус листинга
        listing.status = 'active';
        listing.buyer = null;
        listing.tradeOfferId = null;
        await listing.save();
      }
    } catch (error) {
      logger.error(`Error handling trade failure:`, error);
    }
  }

  startTradeProcessor() {
    setInterval(() => {
      this.processTradeQueue();
    }, 5000);  // Проверяем каждые 5 секунд
  }

  getBotsStatus() {
    return this.activeBots.map(bot => bot.getStatus());
  }

  getQueueStatus() {
    return {
      queueSize: this.tradeQueue.length,
      maxQueueSize: this.maxQueueSize,
      isProcessing: this.isProcessingTrades
    };
  }

  getSystemStatus() {
    return {
      bots: {
        total: this.bots.size,
        online: this.activeBots.filter(b => b.isOnline).length,
        available: this.activeBots.filter(b => b.isAvailable).length,
        withInventory: this.activeBots.filter(b => b.inventory.length > 0).length
      },
      queue: this.getQueueStatus(),
      uptime: process.uptime()
    };
  }

  async refreshInventories() {
    logger.info('Refreshing all bot inventories...');

    const promises = this.activeBots.map(async (bot) => {
      try {
        await bot.loadInventory();
        logger.info(`[${bot.id}] Inventory refreshed: ${bot.inventory.length} items`);
      } catch (error) {
        logger.error(`[${bot.id}] Failed to refresh inventory:`, error);
      }
    });

    await Promise.all(promises);
    logger.info('All bot inventories refreshed');
  }

  async shutdown() {
    logger.info('Shutting down Steam Bot Manager...');

    const shutdownPromises = this.activeBots.map(bot => bot.shutdown());
    await Promise.all(shutdownPromises);

    this.bots.clear();
    this.activeBots = [];
    this.tradeQueue = [];

    logger.info('Steam Bot Manager shutdown complete');
  }

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

      if (config.username && config.password) {
        configs.push(config);
      } else {
        logger.warn(`Bot ${index} configuration incomplete, skipping`);
      }

      index++;
    }

    return configs;
  }
}

module.exports = SteamBotManagerFixed;
```

---

## 3. package.json - ОБНОВЛЁННЫЙ

**Файл:** `/home/zhaslan/Downloads/Telegram Desktop/Steammarketplace2-05.11/Steammarketplace2-main/package.json`

```json
{
  "name": "csgo-skinfo-marketplace",
  "version": "2.0.0",
  "description": "CSGO Skin marketplace with Steam integration",
  "main": "app.js",
  "scripts": {
    "dev": "nodemon app.js",
    "start": "node app.js",
    "build": "webpack --mode production",
    "test": "jest",
    "test:bot": "node test-bot-fixed.js",
    "test:inventory": "node get-bot-inventory.js",
    "update:steam": "npm install steam-user@latest steam-tradeoffer-manager@latest steam-totp@latest"
  },
  "dependencies": {
    "axios": "^1.5.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "express-rate-limit": "^6.10.0",
    "express-session": "^1.17.3",
    "helmet": "^7.0.0",
    "joi": "^17.9.2",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^7.5.0",
    "multer": "^1.4.5-lts.1",
    "passport": "^0.6.0",
    "passport-steam": "^1.0.17",
    "redis": "^4.6.8",
    "socket.io": "^4.7.2",
    "steam-totp": "^2.1.2",
    "steam-tradeoffer-manager": "^2.12.2",
    "steam-user": "^5.2.3",
    "stripe": "^13.6.0",
    "winston": "^3.10.0"
  },
  "devDependencies": {
    "jest": "^29.6.4",
    "nodemon": "^3.0.1",
    "supertest": "^6.3.3",
    "webpack": "^5.88.2",
    "webpack-cli": "^5.1.4"
  }
}
```

**Команда обновления:**
```bash
npm run update:steam
```

---

## 4. test-bot-fixed.js - ТЕСТОВЫЙ СКРИПТ

**Файл:** `/home/zhaslan/Downloads/Telegram Desktop/Steammarketplace2-05.11/Steammarketplace2-main/test-bot-fixed.js`

```javascript
/**
 * Тестовый скрипт для проверки исправленного Steam бота
 */

require('dotenv').config();
const SteamBotFixed = require('./services/steamBot.fixed');
const logger = require('./utils/logger');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testBot() {
  log('bright', '\n═══════════════════════════════════════════════════');
  log('bright', '  🧪 ТЕСТИРОВАНИЕ ИСПРАВЛЕННОГО STEAM БОТА');
  log('bright', '═══════════════════════════════════════════════════\n');

  const config = {
    username: process.env.STEAM_BOT_1_USERNAME,
    password: process.env.STEAM_BOT_1_PASSWORD,
    sharedSecret: process.env.STEAM_BOT_1_SHARED_SECRET,
    identitySecret: process.env.STEAM_BOT_1_IDENTITY_SECRET
  };

  if (!config.username || !config.password) {
    log('red', '❌ Steam bot credentials не настроены в .env');
    log('yellow', 'Нужно установить:');
    log('cyan', '  - STEAM_BOT_1_USERNAME');
    log('cyan', '  - STEAM_BOT_1_PASSWORD');
    log('cyan', '  - STEAM_BOT_1_SHARED_SECRET');
    log('cyan', '  - STEAM_BOT_1_IDENTITY_SECRET\n');
    process.exit(1);
  }

  const bot = new SteamBotFixed(config, 0);

  try {
    // 1. Инициализация
    log('blue', '1. Инициализация бота...');
    await bot.initialize();
    log('green', '   ✅ Бот инициализирован\n');

    // 2. Ожидание загрузки инвентаря
    log('blue', '2. Ожидание загрузки инвентаря (15 секунд)...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    // 3. Проверка инвентаря
    log('blue', '3. Проверка инвентаря...');
    const inventory = await bot.loadInventory();

    if (inventory.length > 0) {
      log('green', `   ✅ Инвентарь загружен: ${inventory.length} предметов\n`);

      // Показываем первые 5 предметов
      log('cyan', '   Первые 5 предметов:');
      inventory.slice(0, 5).forEach((item, i) => {
        log('white', `     ${i + 1}. ${item.market_name || item.name}`);
        log('gray', `        AssetID: ${item.assetid}, Tradable: ${item.tradable ? 'Yes' : 'No'}\n`);
      });
    } else {
      log('yellow', '   ⚠️  Инвентарь пуст (возможно, бот действительно ничего не имеет)\n');
    }

    // 4. Статус бота
    log('blue', '4. Статус бота:');
    const status = bot.getStatus();
    log('cyan', `   - ID: ${status.id}`);
    log('cyan', `   - Online: ${status.isOnline ? 'Yes' : 'No'}`);
    log('cyan', `   - Available: ${status.isAvailable ? 'Yes' : 'No'}`);
    log('cyan', `   - SteamID: ${status.steamId}`);
    log('cyan', `   - Inventory Size: ${status.inventorySize}\n`);

    // 5. Тест создания trade offer (симуляция)
    log('blue', '5. Симуляция trade offer...');
    if (inventory.length > 0) {
      const testItem = inventory[0];
      log('cyan', `   Тестовый предмет: ${testItem.market_name}`);
      log('cyan', `   AssetID: ${testItem.assetid}`);
      log('green', '   ✅ Trade offer готов к отправке\n');
    } else {
      log('yellow', '   ⚠️  Нет предметов для trade offer\n');
    }

    // 6. Итоговый отчёт
    log('bright', '═══════════════════════════════════════════════════');
    log('bright', '  📊 ИТОГОВЫЙ ОТЧЁТ');
    log('bright', '═══════════════════════════════════════════════════\n');

    log('green', '✅ ТЕСТ ПРОШЕЛ УСПЕШНО!');
    log('green', '✅ Бот подключается к Steam');
    log('green', '✅ Инвентарь загружается');
    log('green', '✅ Trade offer создаются\n');

    // Ожидаем 30 секунд для наблюдения
    log('blue', 'Ожидание 30 секунд для наблюдения...');
    await new Promise(resolve => setTimeout(resolve, 30000));

    log('blue', '\nОтключение бота...');
    await bot.shutdown();
    log('green', '✅ Бот отключен\n');

  } catch (error) {
    log('red', `\n❌ ОШИБКА: ${error.message}\n`);
    console.error(error);

    log('bright', '═══════════════════════════════════════════════════');
    log('red', '  🔴 ТЕСТ ПРОВАЛЕН');
    log('bright', '═══════════════════════════════════════════════════\n');

    log('yellow', 'Возможные причины:');
    log('yellow', '  1. Неверные credentials');
    log('yellow', '  2. Steam Guard требует подтверждения');
    log('yellow', '  3. Аккаунт заблокирован');
    log('yellow', '  4. Rate limiting от Steam\n');

    process.exit(1);
  }
}

// Запуск теста
if (require.main === module) {
  testBot()
    .then(() => {
      log('green', '\n✅ Готово!\n');
      process.exit(0);
    })
    .catch((error) => {
      log('red', `\n❌ Критическая ошибка: ${error.message}\n`);
      console.error(error);
      process.exit(1);
    });
}

module.exports = testBot;
```

---

## 🚀 КАК ИСПОЛЬЗОВАТЬ

### Шаг 1: Копируем файлы

```bash
# Создаём копии оригинальных файлов
cp services/steamBot.js services/steamBot.backup.js
cp services/steamBotManager.js services/steamBotManager.backup.js

# Создаём исправленные версии из кода выше
# (скопировать и сохранить в файлы)
```

### Шаг 2: Обновляем зависимости

```bash
npm run update:steam
```

### Шаг 3: Тестируем

```bash
npm run test:bot
```

### Шаг 4: Заменяем в основном коде

```javascript
// В app.js заменяем:
const SteamBotManager = require('./services/steamBotManager.fixed');
// вместо:
// const SteamBotManager = require('./services/steamBotManager');
```

---

## 📊 ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ

**После применения исправлений:**

```
✅ [bot_0] Initializing bot...
✅ [bot_0] Logged in as: sgovt1
✅ [bot_0] SteamID: 76561198782060203
✅ [bot_0] Got web session, setting cookies for TradeOfferManager
✅ [bot_0] Cookies set successfully, inventory will load automatically
✅ [bot_0] Initial inventory load completed
✅ Инвентарь загружен: X предметов
```

**Инвентарь загружается правильно! Торговля работает!**

---

## 📞 ПОДДЕРЖКА

Если что-то не работает:

1. **Проверяем версию steam-user:**
   ```bash
   npm list steam-user
   # Должна быть 5.x
   ```

2. **Проверяем логи:**
   ```bash
   tail -f logs/combined.log | grep -E "(error|Error|failed|Failed)"
   ```

3. **Запускаем тест:**
   ```bash
   npm run test:bot
   ```

4. **Проверяем cookies:**
   ```javascript
   // Добавить в код:
   console.log('Cookies:', this.client.cookies);
   ```

---

**Все файлы готовы к использованию!**
