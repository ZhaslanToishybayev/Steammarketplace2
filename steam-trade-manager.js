#!/usr/bin/env node

// СИСТЕМА УПРАВЛЕНИЯ ТОРГОВЫМИ ПРЕДЛОЖЕНИЯМИ СТЕАМ БОТА
// Выдача trade offer с бота на другой аккаунт

const SteamUser = require('steam-user');
const SteamCommunity = require('steamcommunity');
const TradeOfferManager = require('steam-tradeoffer-manager');
const SteamTotp = require('steam-totp');
const express = require('express');
const crypto = require('crypto');

class SteamTradeManager {
  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.initializeBot();
  }

  setupMiddleware() {
    this.app.use(express.json());
  }

  setupRoutes() {
    // Главная страница API
    this.app.get('/api', (req, res) => {
      res.json({
        success: true,
        service: 'Steam Trade Manager',
        version: '1.0.0',
        endpoints: {
          trades: {
            create: 'POST /api/trades/create - Создать trade offer',
            status: 'GET /api/trades/status/:tradeId - Проверить статус предложения',
            cancel: 'POST /api/trades/cancel/:tradeId - Отменить предложение',
            sent: 'GET /api/trades/sent - Отправленные предложения',
            received: 'GET /api/trades/received - Полученные предложения'
          },
          inventory: {
            bot: 'GET /api/inventory/bot - Инвентарь бота',
            user: 'GET /api/inventory/user/:steamId - Инвентарь пользователя'
          },
          account: {
            status: 'GET /api/account/status - Статус бота',
            profile: 'GET /api/account/profile - Профиль бота'
          }
        },
        steamTradeManager: true,
        message: 'Управление торговыми предложениями Steam бота'
      });
    });

    // Статус бота
    this.app.get('/api/account/status', (req, res) => {
      res.json({
        success: true,
        data: {
          botStatus: this.bot?.loggedOn ? 'online' : 'offline',
          steamId: this.bot?.steamID?.getSteamID64() || 'unknown',
          username: this.botCredentials?.username || 'unknown',
          mobileAuthenticator: !!this.botCredentials?.sharedSecret,
          identitySecret: !!this.botCredentials?.identitySecret,
          tradeManagerReady: this.manager?.polling ? 'ready' : 'not ready',
          lastUpdate: new Date().toISOString()
        }
      });
    });

    // Профиль бота
    this.app.get('/api/account/profile', async (req, res) => {
      try {
        if (!this.bot || !this.bot.loggedOn) {
          return res.status(503).json({
            success: false,
            error: 'Бот не авторизован'
          });
        }

        const steamId = this.bot.steamID.getSteamID64();

        const response = await fetch(
          `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/` +
          `?key=${this.steamApiKey}&steamids=${steamId}`
        );

        const data = await response.json();

        if (data.response && data.response.players && data.response.players.length > 0) {
          const player = data.response.players[0];
          res.json({
            success: true,
            data: {
              steamId: player.steamid,
              personaname: player.personaname,
              profileurl: player.profileurl,
              avatar: player.avatar,
              avatarmedium: player.avatarmedium,
              avatarfull: player.avatarfull,
              personastate: player.personastate,
              communityvisibilitystate: player.communityvisibilitystate,
              profilestate: player.profilestate,
              realSteamProfile: true
            }
          });
        } else {
          res.json({
            success: false,
            error: 'Не удалось получить профиль'
          });
        }
      } catch (error) {
        console.error('❌ Ошибка получения профиля:', error.message);
        res.status(500).json({
          success: false,
          error: 'Ошибка получения профиля',
          details: error.message
        });
      }
    });

    // Инвентарь бота
    this.app.get('/api/inventory/bot', async (req, res) => {
      try {
        if (!this.bot || !this.bot.loggedOn) {
          return res.status(503).json({
            success: false,
            error: 'Бот not авторизован'
          });
        }

        const botSteamId = this.bot.steamID.getSteamID64();
        const inventory = await this.getSteamInventory(botSteamId, 730, 2);

        if (inventory && inventory.length > 0) {
          const processedItems = inventory.map(item => ({
            id: item.id || crypto.randomUUID(),
            assetid: item.assetid,
            name: item.market_name || `Item ${item.classid}`,
            classid: item.classid,
            instanceid: item.instanceid,
            description: item.type || 'CS:GO Item',
            tradable: item.tradable || false,
            marketable: item.marketable || false,
            price: this.estimateItemPrice(item.market_name),
            image: item.icon_url
              ? `https://steamcommunity-a.akamaihd.net/economy/itemimages/730/${item.icon_url}.png`
              : null,
            rarity: item.rarity?.name || 'Unknown',
            exterior: item.wear?.name || 'Unknown',
            realSteamItem: true,
            steamId: botSteamId,
            lastUpdated: new Date().toISOString()
          }));

          res.json({
            success: true,
            data: {
              steamId: botSteamId,
              items: processedItems,
              totalItems: processedItems.length,
              realSteamInventory: true,
              source: 'Steam Community Inventory via Bot',
              lastUpdated: new Date().toISOString()
            }
          });
        } else {
          res.json({
            success: true,
            data: {
              steamId: botSteamId,
              items: [],
              totalItems: 0,
              realSteamInventory: true,
              source: 'Steam Community Inventory via Bot',
              lastUpdated: new Date().toISOString()
            }
          });
        }
      } catch (error) {
        console.error('❌ Ошибка получения инвентаря бота:', error.message);
        res.status(500).json({
          success: false,
          error: 'Ошибка получения инвентаря бота',
          details: error.message
        });
      }
    });

    // Инвентарь пользователя
    this.app.get('/api/inventory/user/:steamId', async (req, res) => {
      try {
        if (!this.bot || !this.bot.loggedOn) {
          return res.status(503).json({
            success: false,
            error: 'Бот not авторизован'
          });
        }

        const { steamId } = req.params;
        const inventory = await this.getSteamInventory(steamId, 730, 2);

        if (inventory && inventory.length > 0) {
          const processedItems = inventory.map(item => ({
            id: item.id || crypto.randomUUID(),
            assetid: item.assetid,
            name: item.market_name || `Item ${item.classid}`,
            classid: item.classid,
            instanceid: item.instanceid,
            description: item.type || 'CS:GO Item',
            tradable: item.tradable || false,
            marketable: item.marketable || false,
            price: this.estimateItemPrice(item.market_name),
            image: item.icon_url
              ? `https://steamcommunity-a.akamaihd.net/economy/itemimages/730/${item.icon_url}.png`
              : null,
            rarity: item.rarity?.name || 'Unknown',
            exterior: item.wear?.name || 'Unknown',
            realSteamItem: true,
            steamId: steamId,
            lastUpdated: new Date().toISOString()
          }));

          res.json({
            success: true,
            data: {
              steamId: steamId,
              items: processedItems,
              totalItems: processedItems.length,
              realSteamInventory: true,
              source: 'Steam Community Inventory via Bot',
              lastUpdated: new Date().toISOString()
            }
          });
        } else {
          res.json({
            success: false,
            error: 'Инвентарь пуст or недоступен',
            details: 'Возможно профиль приватный или инвентарь пуст'
          });
        }
      } catch (error) {
        console.error('❌ Ошибка получения инвентаря пользователя:', error.message);
        res.status(500).json({
          success: false,
          error: 'Ошибка получения инвентаря пользователя',
          details: error.message
        });
      }
    });

    // Создать trade offer
    this.app.post('/api/trades/create', async (req, res) => {
      try {
        if (!this.bot || !this.bot.loggedOn) {
          return res.status(503).json({
            success: false,
            error: 'Бот not авторизован'
          });
        }

        const { partnerSteamId, itemsFromBot, itemsFromPartner, message } = req.body;

        if (!partnerSteamId) {
          return res.status(400).json({
            success: false,
            error: 'Необходимо указать partnerSteamId'
          });
        }

        console.log(`🔄 Создание trade offer для: ${partnerSteamId}`);

        // Создаем новое предложение
        const offer = this.manager.createOffer(partnerSteamId);

        // Добавляем предметы от бота
        if (itemsFromBot && itemsFromBot.length > 0) {
          offer.itemsFromMe = itemsFromBot.map(item => ({
            appid: 730,
            contextid: '2',
            assetid: item.assetid,
            amount: 1
          }));
        }

        // Добавляем предметы от партнера
        if (itemsFromPartner && itemsFromPartner.length > 0) {
          offer.itemsFromThem = itemsFromPartner.map(item => ({
            appid: 730,
            contextid: '2',
            assetid: item.assetid,
            amount: 1
          }));
        }

        // Отправляем предложение
        const result = await new Promise((resolve, reject) => {
          offer.send(message || 'Trade offer from Steam bot', (err, status) => {
            if (err) {
              reject(err);
            } else {
              resolve({ status, tradeId: offer.id });
            }
          });
        });

        console.log(`✅ Trade offer создан: ${result.tradeId}, статус: ${result.status}`);

        res.json({
          success: true,
          data: {
            tradeId: result.tradeId,
            status: result.status,
            partnerSteamId: partnerSteamId,
            itemsFromBot: itemsFromBot || [],
            itemsFromPartner: itemsFromPartner || [],
            message: message || 'Trade offer from Steam bot',
            createdAt: new Date().toISOString()
          }
        });

      } catch (error) {
        console.error('❌ Ошибка создания trade offer:', error.message);
        res.status(500).json({
          success: false,
          error: 'Ошибка создания trade offer',
          details: error.message
        });
      }
    });

    // Проверить статус предложения
    this.app.get('/api/trades/status/:tradeId', async (req, res) => {
      try {
        if (!this.bot || !this.bot.loggedOn) {
          return res.status(503).json({
            success: false,
            error: 'Бот not авторизован'
          });
        }

        const { tradeId } = req.params;

        const offer = await new Promise((resolve, reject) => {
          this.manager.getOffer(tradeId, (err, offer) => {
            if (err) {
              reject(err);
            } else {
              resolve(offer);
            }
          });
        });

        if (offer) {
          res.json({
            success: true,
            data: {
              tradeId: offer.id,
              partnerSteamId: offer.partner.getSteamID64(),
              state: offer.state,
              stateName: TradeOfferManager.ETradeOfferState[offer.state],
              itemsFromMe: offer.itemsToGive?.map(item => ({
                assetid: item.assetid,
                name: item.name,
                appid: item.appid
              })) || [],
              itemsFromThem: offer.itemsToReceive?.map(item => ({
                assetid: item.assetid,
                name: item.name,
                appid: item.appid
              })) || [],
              message: offer.message,
              created: offer.created?.toISOString(),
              updated: offer.updated?.toISOString(),
              expires: offer.expires?.toISOString()
            }
          });
        } else {
          res.json({
            success: false,
            error: 'Предложение не найдено'
          });
        }

      } catch (error) {
        console.error('❌ Ошибка получения статуса предложения:', error.message);
        res.status(500).json({
          success: false,
          error: 'Ошибка получения статуса предложения',
          details: error.message
        });
      }
    });

    // Отменить предложение
    this.app.post('/api/trades/cancel/:tradeId', async (req, res) => {
      try {
        if (!this.bot || !this.bot.loggedOn) {
          return res.status(503).json({
            success: false,
            error: 'Бот not авторизован'
          });
        }

        const { tradeId } = req.params;

        const offer = await new Promise((resolve, reject) => {
          this.manager.getOffer(tradeId, (err, offer) => {
            if (err) {
              reject(err);
            } else {
              resolve(offer);
            }
          });
        });

        if (offer && offer.state === TradeOfferManager.ETradeOfferState.Active) {
          await new Promise((resolve, reject) => {
            offer.cancel((err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          });

          res.json({
            success: true,
            data: {
              tradeId: tradeId,
              status: 'cancelled',
              message: 'Предложение успешно отменено'
            }
          });
        } else {
          res.json({
            success: false,
            error: 'Предложение не может быть отменено',
            details: 'Предложение уже обработано или не существует'
          });
        }

      } catch (error) {
        console.error('❌ Ошибка отмены предложения:', error.message);
        res.status(500).json({
          success: false,
          error: 'Ошибка отмены предложения',
          details: error.message
        });
      }
    });

    // Отправленные предложения
    this.app.get('/api/trades/sent', async (req, res) => {
      try {
        if (!this.bot || !this.bot.loggedOn) {
          return res.status(503).json({
            success: false,
            error: 'Бот not авторизован'
          });
        }

        const offers = await new Promise((resolve, reject) => {
          this.manager.getOffers(TradeOfferManager.EOfferFilter.Sent, (err, sentOffers) => {
            if (err) {
              reject(err);
            } else {
              resolve(sentOffers);
            }
          });
        });

        const processedOffers = offers.map(offer => ({
          tradeId: offer.id,
          partnerSteamId: offer.partner.getSteamID64(),
          state: offer.state,
          stateName: TradeOfferManager.ETradeOfferState[offer.state],
          itemsFromMe: offer.itemsToGive?.length || 0,
          itemsFromThem: offer.itemsToReceive?.length || 0,
          message: offer.message,
          created: offer.created?.toISOString(),
          updated: offer.updated?.toISOString()
        }));

        res.json({
          success: true,
          data: {
            offers: processedOffers,
            totalOffers: processedOffers.length
          }
        });

      } catch (error) {
        console.error('❌ Ошибка получения отправленных предложений:', error.message);
        res.status(500).json({
          success: false,
          error: 'Ошибка получения отправленных предложений',
          details: error.message
        });
      }
    });

    // Полученные предложения
    this.app.get('/api/trades/received', async (req, res) => {
      try {
        if (!this.bot || !this.bot.loggedOn) {
          return res.status(503).json({
            success: false,
            error: 'Бот not авторизован'
          });
        }

        const offers = await new Promise((resolve, reject) => {
          this.manager.getOffers(TradeOfferManager.EOfferFilter.Received, (err, receivedOffers) => {
            if (err) {
              reject(err);
            } else {
              resolve(receivedOffers);
            }
          });
        });

        const processedOffers = offers.map(offer => ({
          tradeId: offer.id,
          partnerSteamId: offer.partner.getSteamID64(),
          state: offer.state,
          stateName: TradeOfferManager.ETradeOfferState[offer.state],
          itemsFromMe: offer.itemsToGive?.length || 0,
          itemsFromThem: offer.itemsToReceive?.length || 0,
          message: offer.message,
          created: offer.created?.toISOString(),
          updated: offer.updated?.toISOString()
        }));

        res.json({
          success: true,
          data: {
            offers: processedOffers,
            totalOffers: processedOffers.length
          }
        });

      } catch (error) {
        console.error('❌ Ошибка получения полученных предложений:', error.message);
        res.status(500).json({
          success: false,
          error: 'Ошибка получения полученных предложений',
          details: error.message
        });
      }
    });
  }

  // Инициализация Steam бота
  async initializeBot() {
    console.log('🚀 Инициализация Steam бота для управления trades...');

    // Ваши реальные учетные данные
    this.botCredentials = {
      username: 'Sgovt1',
      password: 'Szxc123!',
      sharedSecret: 'LVke3WPKHWzT8pCNSemh2FMuJ90=',
      identitySecret: 'fzCjA+NZa0b3yOeEMhln81qgNM4=',
      steamId: '76561198012345678'
    };

    this.steamApiKey = 'E1FC69B3707FF57C6267322B0271A86B';

    try {
      this.bot = new SteamUser();
      this.community = new SteamCommunity();
      this.manager = new TradeOfferManager({
        steam: this.bot,
        community: this.community,
        language: 'ru',
        pollInterval: 10000,
        cancelTime: 300000,
      });

      this.setupBotEvents();
      this.setupTradeOfferManager();

      // Логин бота
      const logOnOptions = {
        accountName: this.botCredentials.username,
        password: this.botCredentials.password,
      };

      if (this.botCredentials.sharedSecret) {
        logOnOptions.twoFactorCode = SteamTotp.generateAuthCode(this.botCredentials.sharedSecret);
      }

      console.log('🔐 Авторизация бота...');
      this.bot.logOn(logOnOptions);

      const timeout = setTimeout(() => {
        throw new Error('Таймаут входа в Steam');
      }, 30000);

      this.bot.on('loggedOn', (details) => {
        clearTimeout(timeout);
        console.log(`🎮 Бот вошел в Steam как ${details.player_name || 'Unknown'}`);
        console.log(`🆔 SteamID: ${this.bot.steamID.getSteamID64()}`);

        this.bot.setPersona(1); // Online
        this.bot.gamesPlayed([730]); // CS:GO

        this.bot.on('webSession', (sessionID, cookies) => {
          console.log('🌐 Бот получил веб-сессию');
          this.community.setCookies(cookies);
          this.manager.setCookies(cookies);
        });
      });

    } catch (error) {
      console.error('❌ Ошибка инициализации бота:', error.message);
    }
  }

  setupBotEvents() {
    if (!this.bot) return;

    this.bot.on('loggedOn', (details) => {
      console.log(`🎮 Бот вошел в Steam как ${details.player_name || 'Unknown'}`);
    });

    this.bot.on('webSession', (sessionID, cookies) => {
      console.log('🌐 Бот получил веб-сессию');
      this.community.setCookies(cookies);
      this.manager.setCookies(cookies);
    });

    this.bot.on('error', (error) => {
      console.error(`❌ Ошибка Steam: ${error.message}`);
    });

    this.bot.on('disconnected', (eresult) => {
      console.error(`🔌 Бот отключен от Steam (eresult: ${eresult})`);
    });
  }

  setupTradeOfferManager() {
    if (!this.manager) return;

    this.manager.on('sentOfferChanged', (offer, oldState) => {
      console.log(`🔄 Оффер #${offer.id} изменился: ${TradeOfferManager.ETradeOfferState[oldState]} -> ${TradeOfferManager.ETradeOfferState[offer.state]}`);
    });

    this.manager.on('receivedOfferChanged', (offer, oldState) => {
      console.log(`📥 Полученный оффер #${offer.id} изменился: ${TradeOfferManager.ETradeOfferState[oldState]} -> ${TradeOfferManager.ETradeOfferState[offer.state]}`);
    });

    this.manager.on('pollData', (pollData) => {
      console.log(`💾 Сохранение данных опроса`);
    });
  }

  // Получение инвентаря через Steam Community
  getSteamInventory(steamId, appId = 730, contextId = 2) {
    return new Promise((resolve, reject) => {
      try {
        this.community.getUserInventory(steamId, appId, contextId, true, (err, inventory) => {
          if (err) {
            console.error(`❌ Ошибка получения инвентаря для ${steamId}:`, err.message);
            return reject(err);
          }

          if (!inventory || inventory.length === 0) {
            console.log(`📦 Инвентарь для ${steamId} пуст`);
            return resolve([]);
          }

          console.log(`🎮 Получен инвентарь для ${steamId}: ${inventory.length} предметов`);
          resolve(inventory);
        });
      } catch (error) {
        console.error(`❌ Ошибка запроса инвентаря:`, error.message);
        reject(error);
      }
    });
  }

  // Оценка цены предмета
  estimateItemPrice(itemName) {
    const priceMap = {
      'AK-47': 125.5,
      'M4A4': 899.99,
      'AWP': 2499.99,
      'Desert Eagle': 50.0,
      'Glock': 25.0,
      'USP-S': 50.0,
      'P250': 25.0,
      'Nova': 15.0,
      'XM1014': 45.0
    };

    for (const [key, price] of Object.entries(priceMap)) {
      if (itemName && itemName.includes(key)) {
        return price;
      }
    }
    return Math.random() * 1000 + 50;
  }

  // Запуск системы
  async start(port = 3020) {
    console.log('🚀 Запуск Steam Trade Manager...');
    console.log('🎮 Используем реальные Steam учетные данные');
    console.log(`🔐 Username: ${this.botCredentials?.username}`);
    console.log(`🆔 SteamID: ${this.botCredentials?.steamId}`);
    console.log(`🔑 Steam API Key: ${this.steamApiKey}`);
    console.log('');

    return new Promise((resolve) => {
      this.app.listen(port, () => {
        console.log(`🌐 Steam Trade Manager запущен на порту ${port}`);
        console.log('');
        console.log('📊 Доступные эндпоинты:');
        console.log('   🤖 GET /api/account/status - Статус бота');
        console.log('   🤖 GET /api/account/profile - Профиль бота');
        console.log('   🎁 GET /api/inventory/bot - Инвентарь бота');
        console.log('   👥 GET /api/inventory/user/{steamId} - Инвентарь пользователя');
        console.log('   🔄 POST /api/trades/create - Создать trade offer');
        console.log('   📋 GET /api/trades/status/{tradeId} - Проверить статус');
        console.log('   ❌ POST /api/trades/cancel/{tradeId} - Отменить предложение');
        console.log('   📤 GET /api/trades/sent - Отправленные предложения');
        console.log('   📥 GET /api/trades/received - Полученные предложения');
        console.log('');
        console.log('🎮 ВАШ STEAM БОТ ГОТОВ К ТОРГОВЛЕ:');
        console.log(`   🔐 Steam Bot: ${this.botCredentials?.username}`);
        console.log(`   🆔 SteamID: ${this.botCredentials?.steamId}`);
        console.log(`   📱 Mobile Authenticator: ${this.botCredentials?.sharedSecret ? 'Доступен' : 'Недоступен'}`);
        console.log(`   🔑 Identity Secret: ${this.botCredentials?.identitySecret ? 'Доступен' : 'Недоступен'}`);
        console.log(`   💼 Trade Manager: Ready`);
        console.log(`   ✅ Готов выдавать trades на другие аккаунты!`);
        resolve(this.app);
      });
    });
  }
}

// Запуск системы
const tradeManager = new SteamTradeManager();
tradeManager.start(3020).catch(console.error);

module.exports = SteamTradeManager;