const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const SteamCommunity = require('steamcommunity');
const TradeOfferManager = require('steam-tradeoffer-manager');
const express = require('express');

class SteamBotTradingSystem {
  constructor() {
    this.bots = new Map();
    this.app = express();
    this.setupMiddleware();
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.static('public'));
  }

  // Инициализация Steam бота
  async initializeBot(botId, credentials) {
    console.log(`🚀 Инициализация Steam бота: ${botId}`);

    const client = new SteamUser();
    const community = new SteamCommunity();
    const manager = new TradeOfferManager({
      steam: client,
      community: community,
      language: 'ru',
      pollInterval: 10000, // Проверять каждые 10 секунд
      cancelTime: 300000, // Отменять офферы через 5 минут
    });

    const bot = {
      id: botId,
      client: client,
      community: community,
      manager: manager,
      credentials: credentials,
      status: 'initializing',
      inventory: [],
      trades: [],
      offers: []
    };

    this.setupBotEvents(bot);
    this.setupTradeOfferManager(bot);

    try {
      await this.loginBot(bot);
      this.bots.set(botId, bot);
      console.log(`✅ Steam бот ${botId} успешно инициализирован`);

      // Начинаем мониторинг инвентаря
      this.startInventoryMonitoring(bot);

      return bot;
    } catch (error) {
      console.error(`❌ Ошибка инициализации бота ${botId}:`, error.message);
      throw error;
    }
  }

  // Настройка событий бота
  setupBotEvents(bot) {
    const client = bot.client;

    client.on('loggedOn', (details) => {
      console.log(`🎮 ${bot.id} вошел в Steam как ${details.player_name}`);
      bot.status = 'online';
      this.updateBotStatus(bot.id, 'online');
    });

    client.on('webSession', (sessionID, cookies) => {
      console.log(`🌐 ${bot.id} получил веб-сессию`);
      bot.community.setCookies(cookies);
      bot.manager.setCookies(cookies);
    });

    client.on('error', (error) => {
      console.error(`❌ ${bot.id} ошибка:`, error.message);
      bot.status = 'error';
      this.updateBotStatus(bot.id, 'error');
    });

    client.on('disconnected', (eresult) => {
      console.log(`🔌 ${bot.id} отключен от Steam (eresult: ${eresult})`);
      bot.status = 'offline';
      this.updateBotStatus(bot.id, 'offline');
    });
  }

  // Настройка Trade Offer Manager
  setupTradeOfferManager(bot) {
    const manager = bot.manager;

    manager.on('sentOfferChanged', (offer, oldState) => {
      console.log(`🔄 ${bot.id} оффер #${offer.id} изменился: ${TradeOfferManager.ETradeOfferState[oldState]} -> ${TradeOfferManager.ETradeOfferState[offer.state]}`);
    });

    manager.on('receivedOfferChanged', (offer, oldState) => {
      console.log(`📥 ${bot.id} полученный оффер #${offer.id} изменился: ${TradeOfferManager.ETradeOfferState[oldState]} -> ${TradeOfferManager.ETradeOfferState[offer.state]}`);
    });

    manager.on('pollData', (pollData) => {
      // Сохраняем данные опроса для восстановления
      console.log(`💾 ${bot.id} сохранение данных опроса`);
    });
  }

  // Логин бота
  async loginBot(bot) {
    return new Promise((resolve, reject) => {
      const { username, password, sharedSecret } = bot.credentials;

      const logOnOptions = {
        accountName: username,
        password: password,
      };

      // Добавляем 2FA если есть shared secret
      if (sharedSecret) {
        logOnOptions.twoFactorCode = SteamTotp.generateAuthCode(sharedSecret);
      }

      bot.client.logOn(logOnOptions);

      const timeout = setTimeout(() => {
        reject(new Error('Таймаут входа в Steam'));
      }, 30000);

      bot.client.on('loggedOn', () => {
        clearTimeout(timeout);
        resolve();
      });

      bot.client.on('logOnError', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Ошибка входа: ${error.message}`));
      });

      bot.client.on('loginKey', (key) => {
        console.log(`🔑 ${bot.id} получен login key`);
      });
    });
  }

  // Подтверждение торговых предложений
  async confirmTradeOffer(bot, offerId) {
    return new Promise((resolve, reject) => {
      const { identitySecret } = bot.credentials;

      if (!identitySecret) {
        reject(new Error('Нет identity secret для подтверждения'));
        return;
      }

      const time = SteamTotp.getTime();
      const confirmation = {
        time: time,
        tag: 'conf'
      };

      bot.community.getConfirmations(time, SteamTotp.generateAuthCode(identitySecret, time), (err, confirmations) => {
        if (err) {
          reject(err);
          return;
        }

        const offer = confirmations.find(conf => conf.id === offerId);
        if (!offer) {
          reject(new Error('Подтверждение не найдено'));
          return;
        }

        offer.respond(true, (err) => {
          if (err) {
            reject(err);
          } else {
            console.log(`✅ ${bot.id} подтвердил оффер #${offerId}`);
            resolve();
          }
        });
      });
    });
  }

  // Мониторинг инвентаря
  async startInventoryMonitoring(bot) {
    setInterval(async () => {
      try {
        const inventory = await this.getBotInventory(bot);
        bot.inventory = inventory;
        console.log(`📦 ${bot.id} инвентарь обновлен: ${inventory.length} предметов`);
      } catch (error) {
        console.error(`❌ ${bot.id} ошибка мониторинга инвентаря:`, error.message);
      }
    }, 60000); // Каждую минуту
  }

  // Получение инвентаря бота
  async getBotInventory(bot) {
    return new Promise((resolve, reject) => {
      const steamId = bot.client.steamID.getSteamID64();

      bot.community.getUserInventory(steamId, 730, 2, true, (err, inventory) => {
        if (err) {
          reject(err);
        } else {
          const items = inventory.map(item => ({
            id: item.id,
            name: item.market_name,
            classid: item.classid,
            instanceid: item.instanceid,
            description: item.type,
            tradable: item.tradable,
            marketable: item.marketable,
            image: `https://steamcommunity-a.akamaihd.net/economy/itemimages/730/${item.name}.png`,
            rarity: item.rarity?.name || 'Unknown',
            exterior: item.wear?.name || 'Unknown'
          }));
          resolve(items);
        }
      });
    });
  }

  // Создание торгового предложения
  async createTradeOffer(bot, partnerSteamId, itemsFromMe, itemsFromThem, message = '') {
    const offer = bot.manager.createOffer(partnerSteamId);

    return new Promise((resolve, reject) => {
      offer.addMyItems(itemsFromMe);
      offer.addTheirItems(itemsFromThem);

      offer.send(message, (err, status) => {
        if (err) {
          reject(err);
        } else {
          console.log(`📤 ${bot.id} оффер отправлен: ${status} (#${offer.id})`);
          resolve({ offerId: offer.id, status: status });
        }
      });
    });
  }

  // Получение статуса бота
  getBotStatus(botId) {
    const bot = this.bots.get(botId);
    return bot ? {
      id: bot.id,
      status: bot.status,
      inventoryCount: bot.inventory.length,
      tradeCount: bot.trades.length,
      offersCount: bot.offers.length
    } : null;
  }

  // Обновление статуса бота
  updateBotStatus(botId, status) {
    const bot = this.bots.get(botId);
    if (bot) {
      bot.status = status;
    }
  }

  // Запуск системы
  async start() {
    console.log('🚀 Запуск Steam Bot Trading System...');

    // Инициализация основного бота
    try {
      const mainBotCredentials = {
        username: 'Sgovt1',
        password: 'Szxc123!',
        sharedSecret: 'LVke3WPKHWzT8pCNSemh2FMuJ90=',
        identitySecret: 'fzCjA+NZa0b3yOeEMhln81qgNM4='
      };

      await this.initializeBot('steam_bot_1', mainBotCredentials);

      // Запуск HTTP API
      this.setupAPI();
      this.app.listen(3013, () => {
        console.log('🌐 Steam Bot Trading API запущен на порту 3013');
        console.log('📊 Доступные эндпоинты:');
        console.log('   GET /api/bots/status - Статус всех ботов');
        console.log('   GET /api/bots/{id}/inventory - Инвентарь бота');
        console.log('   POST /api/trade/offer - Создать оффер');
        console.log('   POST /api/trade/confirm/{offerId} - Подтвердить оффер');
      });

    } catch (error) {
      console.error('❌ Ошибка запуска Steam Bot Trading System:', error.message);
    }
  }

  // Настройка HTTP API
  setupAPI() {
    // Статус всех ботов
    this.app.get('/api/bots/status', (req, res) => {
      const status = Array.from(this.bots.keys()).map(id => this.getBotStatus(id));
      res.json({ success: true, data: status });
    });

    // Инвентарь бота
    this.app.get('/api/bots/:botId/inventory', (req, res) => {
      const botId = req.params.botId;
      const bot = this.bots.get(botId);
      if (bot) {
        res.json({ success: true, data: bot.inventory });
      } else {
        res.status(404).json({ success: false, error: 'Бот не найден' });
      }
    });

    // Создание торгового предложения
    this.app.post('/api/trade/offer', async (req, res) => {
      try {
        const { botId, partnerSteamId, itemsFromMe, itemsFromThem, message } = req.body;
        const bot = this.bots.get(botId);

        if (!bot) {
          return res.status(404).json({ success: false, error: 'Бот не найден' });
        }

        const result = await this.createTradeOffer(bot, partnerSteamId, itemsFromMe, itemsFromThem, message);
        res.json({ success: true, data: result });

      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Подтверждение оффера
    this.app.post('/api/trade/confirm/:offerId', async (req, res) => {
      try {
        const offerId = req.params.offerId;
        const { botId } = req.body;
        const bot = this.bots.get(botId);

        if (!bot) {
          return res.status(404).json({ success: false, error: 'Бот не найден' });
        }

        await this.confirmTradeOffer(bot, offerId);
        res.json({ success: true, message: 'Оффер подтвержден' });

      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
  }
}

// Запуск системы
const tradingSystem = new SteamBotTradingSystem();
tradingSystem.start();

module.exports = SteamBotTradingSystem;