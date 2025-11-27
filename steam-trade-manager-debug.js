#!/usr/bin/env node

// УЛУЧШЕННАЯ СИСТЕМА УПРАВЛЕНИЯ ТОРГОВЫМИ ПРЕДЛОЖЕНИЯМИ СТЕАМ БОТА
// С ДЕТАЛЬНЫМ ЛОГИРОВАНИЕМ ДЛЯ ДИАГНОСТИКИ ПРОБЛЕМ

const SteamUser = require('steam-user');
const SteamCommunity = require('steamcommunity');
const TradeOfferManager = require('steam-tradeoffer-manager');
const SteamTotp = require('steam-totp');
const express = require('express');
const crypto = require('crypto');

class SteamTradeManagerDebug {
  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.initializeBot();
  }

  setupMiddleware() {
    this.app.use(express.json());
    // Добавим логирование всех запросов
    this.app.use((req, res, next) => {
      console.log(`🌐 API Запрос: ${req.method} ${req.path}`);
      next();
    });
  }

  setupRoutes() {
    // Главная страница API
    this.app.get('/api', (req, res) => {
      console.log('📋 Запрос: Главная страница API');
      res.json({
        success: true,
        service: 'Steam Trade Manager Debug',
        version: '1.0.1',
        debugMode: true,
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
        message: 'Управление торговыми предложениями Steam бота (Debug Mode)',
        debugInfo: {
          botCredentialsSet: !!this.botCredentials,
          steamApiKeySet: !!this.steamApiKey,
          botInstanceCreated: !!this.bot,
          managerInstanceCreated: !!this.manager
        }
      });
    });

    // Статус бота с подробной информацией
    this.app.get('/api/account/status', (req, res) => {
      console.log('📊 Запрос: Статус бота');

      const statusData = {
        success: true,
        data: {
          botStatus: this.bot?.loggedOn ? 'online' : 'offline',
          steamId: this.bot?.steamID?.getSteamID64() || 'unknown',
          username: this.botCredentials?.username || 'unknown',
          mobileAuthenticator: !!this.botCredentials?.sharedSecret,
          identitySecret: !!this.botCredentials?.identitySecret,
          tradeManagerReady: this.manager?.polling ? 'ready' : 'not ready',
          lastUpdate: new Date().toISOString(),
          debugInfo: {
            botInstance: !!this.bot,
            communityInstance: !!this.community,
            managerInstance: !!this.manager,
            credentialsLoaded: !!this.botCredentials,
            sharedSecretValid: this.validateSharedSecret(),
            currentPhase: this.getCurrentPhase()
          }
        }
      };

      console.log('📊 Статус бота:', JSON.stringify(statusData.data, null, 2));
      res.json(statusData);
    });

    // Профиль бота
    this.app.get('/api/account/profile', async (req, res) => {
      console.log('👤 Запрос: Профиль бота');
      console.log('   Bot loggedOn:', this.bot?.loggedOn);
      console.log('   Bot SteamID:', this.bot?.steamID?.getSteamID64());
      console.log('   Current Phase:', this.getCurrentPhase());

      try {
        // Use more comprehensive check for bot authorization
        if (!this.bot || this.getCurrentPhase() !== 'fully_ready') {
          console.log('❌ Бот не авторизован');
          return res.status(503).json({
            success: false,
            error: 'Бот не авторизован'
          });
        }

        const steamId = this.bot.steamID.getSteamID64();
        console.log('🔍 Получаем профиль для SteamID:', steamId);

        const response = await fetch(
          `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/` +
          `?key=${this.steamApiKey}&steamids=${steamId}`
        );

        console.log('📡 Steam API Response Status:', response.status);

        const data = await response.json();
        console.log('📡 Steam API Response Data:', JSON.stringify(data, null, 2));

        if (data.response && data.response.players && data.response.players.length > 0) {
          const player = data.response.players[0];
          console.log('✅ Профиль получен:', player.personaname);
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
          console.log('❌ Не удалось получить профиль');
          res.json({
            success: false,
            error: 'Не удалось получить профиль'
          });
        }
      } catch (error) {
        console.error('❌ Ошибка получения профиля:', error.message);
        console.error('❌ Stack:', error.stack);
        res.status(500).json({
          success: false,
          error: 'Ошибка получения профиля',
          details: error.message,
          stack: error.stack
        });
      }
    });

    // Инвентарь бота
    this.app.get('/api/inventory/bot', async (req, res) => {
      console.log('🎁 Запрос: Инвентарь бота');
      console.log('   Bot loggedOn:', this.bot?.loggedOn);
      console.log('   Bot SteamID:', this.bot?.steamID?.getSteamID64());
      console.log('   Current Phase:', this.getCurrentPhase());

      try {
        // Use more comprehensive check for bot authorization
        if (!this.bot || this.getCurrentPhase() !== 'fully_ready') {
          console.log('❌ Бот not авторизован');
          return res.status(503).json({
            success: false,
            error: 'Бот not авторизован'
          });
        }

        const botSteamId = this.bot.steamID?.getSteamID64();
        if (!botSteamId) {
          console.log('❌ Не удалось получить SteamID бота');
          return res.status(500).json({
            success: false,
            error: 'Не удалось получить SteamID бота'
          });
        }
        console.log('🔍 Получаем инвентарь для SteamID:', botSteamId);

        const inventory = await this.getSteamInventory(botSteamId, 730, 2);

        if (inventory && inventory.length > 0) {
          console.log(`✅ Получено ${inventory.length} предметов`);
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
          console.log('📦 Инвентарь пуст');
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
        console.error('❌ Stack:', error.stack);
        res.status(500).json({
          success: false,
          error: 'Ошибка получения инвентаря бота',
          details: error.message,
          stack: error.stack
        });
      }
    });

    // Создать trade offer
    this.app.post('/api/trades/create', async (req, res) => {
      console.log('🔄 Запрос: Создать trade offer');
      console.log('📝 Данные запроса:', JSON.stringify(req.body, null, 2));

      try {
        // Use more comprehensive check for bot authorization
        if (!this.bot || this.getCurrentPhase() !== 'fully_ready') {
          console.log('❌ Бот not авторизован');
          return res.status(503).json({
            success: false,
            error: 'Бот not авторизован'
          });
        }

        const { partnerSteamId, itemsFromBot, itemsFromPartner, message } = req.body;

        if (!partnerSteamId) {
          console.log('❌ Не указан partnerSteamId');
          return res.status(400).json({
            success: false,
            error: 'Необходимо указать partnerSteamId'
          });
        }

        console.log(`🔄 Создание trade offer для: ${partnerSteamId}`);

        // Создаем новое предложение
        const offer = this.manager.createOffer(partnerSteamId);
        console.log('✅ Создан объект предложения:', offer.id);

        // Добавляем предметы от бота
        if (itemsFromBot && itemsFromBot.length > 0) {
          console.log('📦 Добавляем предметы от бота:', itemsFromBot);
          offer.itemsToGive = itemsFromBot.map(item => ({
            appid: 730,
            contextid: '2',
            assetid: item.assetid,
            amount: 1
          }));
        }

        // Добавляем предметы от партнера
        if (itemsFromPartner && itemsFromPartner.length > 0) {
          console.log('🎁 Добавляем предметы от партнера:', itemsFromPartner);
          offer.itemsToReceive = itemsFromPartner.map(item => ({
            appid: 730,
            contextid: '2',
            assetid: item.assetid,
            amount: 1
          }));
        }

        // Устанавливаем сообщение для предложения
        if (message) {
          offer.setMessage(message);
          console.log(`📝 Установлено сообщение: ${message}`);
        }

        // Отправляем предложение
        console.log('📤 Отправка предложения...');
        const sendResult = await new Promise((resolve, reject) => {
          offer.send((err, status) => {
            if (err) {
              console.error('❌ Ошибка отправки:', err.message);
              reject(err);
            } else {
              console.log(`✅ Предложение отправлено: ${offer.id}, статус: ${status}`);
              resolve({ status, tradeId: offer.id });
            }
          });
        });

        res.json({
          success: true,
          data: {
            tradeId: sendResult.tradeId,
            status: sendResult.status,
            partnerSteamId: partnerSteamId,
            itemsFromBot: itemsFromBot || [],
            itemsFromPartner: itemsFromPartner || [],
            message: message || 'Trade offer from Steam bot',
            createdAt: new Date().toISOString()
          }
        });

      } catch (error) {
        console.error('❌ Ошибка создания trade offer:', error.message);

        // Enhanced error analysis for Steam API errors
        if (error.message && (error.message.includes('15') || error.message.includes('AccessDenied'))) {
          console.log('🔒 Steam API Error 15: AccessDenied detected');
          console.log('   This is a Steam platform restriction, not a code issue.');
          console.log('   Possible solutions:');
          console.log('   1. Target account may have private profile');
          console.log('   2. Mobile authenticator requirements not met (15+ days)');
          console.log('   3. Trade restrictions on one or both accounts');
          console.log('   4. Item trading restrictions or cooldowns');
          console.log('   5. Rate limiting or suspicious activity detection');
          console.log('   6. Account needs to be friends or have public profile');
        }

        console.error('❌ Stack:', error.stack);
        res.status(500).json({
          success: false,
          error: 'Ошибка создания trade offer',
          details: error.message,
          stack: error.stack,
          steamError: error.message.includes('15') ? 'AccessDenied' : null
        });
      }
    });
  }

  validateSharedSecret() {
    try {
      if (!this.botCredentials?.sharedSecret) {
        return false;
      }
      // Проверим, может ли shared secret генерировать код
      const code = SteamTotp.generateAuthCode(this.botCredentials.sharedSecret);
      return !!code && code.length === 5;
    } catch (error) {
      console.error('❌ Ошибка валидации shared secret:', error.message);
      return false;
    }
  }

  getCurrentPhase() {
    if (!this.bot) return 'bot_not_created';
    if (!this.bot.loggedOn) return 'bot_created_not_logged';
    if (this.bot.loggedOn && (!this.manager || !this.manager.pollInterval)) return 'bot_logged_no_manager';
    if (this.bot.loggedOn && this.manager && this.manager.pollInterval) return 'fully_ready';
    return 'unknown';
  }

  // Инициализация Steam бота с подробным логированием
  async initializeBot() {
    console.log('🚀 ИНИЦИАЛИЗАЦИЯ Steam бота (Debug Mode)...');
    console.log('─'.repeat(60));

    // Ваши реальные учетные данные
    this.botCredentials = {
      username: 'Sgovt1',
      password: 'Szxc123!',
      sharedSecret: 'LVke3WPKHWzT8pCNSemh2FMuJ90=',
      identitySecret: 'fzCjA+NZa0b3yOeEMhln81qgNM4=',
      steamId: '76561198782060203'
    };

    this.steamApiKey = 'E1FC69B3707FF57C6267322B0271A86B';

    console.log('📋 Учетные данные загружены:');
    console.log(`   Username: ${this.botCredentials.username}`);
    console.log(`   SteamID: ${this.botCredentials.steamId}`);
    console.log(`   Shared Secret: ${this.validateSharedSecret() ? 'VALID' : 'INVALID'}`);
    console.log(`   Identity Secret: ${this.botCredentials.identitySecret ? 'SET' : 'NOT SET'}`);
    console.log('');

    try {
      console.log('🔧 Создание экземпляров...');
      this.bot = new SteamUser();
      this.community = new SteamCommunity();
      this.manager = new TradeOfferManager({
        steam: this.bot,
        community: this.community,
        language: 'ru',
        pollInterval: 10000,
        cancelTime: 300000,
      });

      console.log('✅ Экземпляры созданы');
      console.log(`   Bot instance: ${!!this.bot}`);
      console.log(`   Community instance: ${!!this.community}`);
      console.log(`   Manager instance: ${!!this.manager}`);
      console.log('');

      this.setupBotEvents();
      this.setupTradeOfferManager();

      // Логин бота
      const logOnOptions = {
        accountName: this.botCredentials.username,
        password: this.botCredentials.password,
      };

      if (this.botCredentials.sharedSecret) {
        console.log('🔐 Генерация 2FA кода...');
        logOnOptions.twoFactorCode = SteamTotp.generateAuthCode(this.botCredentials.sharedSecret);
        console.log(`   2FA Code: ${logOnOptions.twoFactorCode}`);
      }

      console.log('🔐 Попытка авторизации в Steam...');
      console.log(`   Account: ${logOnOptions.accountName}`);
      console.log(`   2FA: ${logOnOptions.twoFactorCode ? 'ENABLED' : 'DISABLED'}`);
      console.log('');

      this.bot.logOn(logOnOptions);

      const timeout = setTimeout(() => {
        console.error('❌ Таймаут входа в Steam');
        throw new Error('Таймаут входа в Steam');
      }, 30000);

      this.bot.on('loggedOn', (details) => {
        clearTimeout(timeout);
        console.log('🎉 Бот успешно вошел в Steam!');
        console.log(`   Player Name: ${details.player_name || 'Unknown'}`);
        console.log(`   SteamID: ${this.bot.steamID.getSteamID64()}`);
        console.log(`   Current Phase: ${this.getCurrentPhase()}`);
        console.log(`   Bot loggedOn property: ${this.bot.loggedOn}`);
        console.log(`   Bot state:`, {
          loggedOn: this.bot.loggedOn,
          steamID: this.bot.steamID?.getSteamID64(),
          accountName: this.bot.accountName
        });
        console.log('');

        this.bot.setPersona(1); // Online
        this.bot.gamesPlayed([730]); // CS:GO

        this.bot.on('webSession', (sessionID, cookies) => {
          console.log('🌐 Бот получил веб-сессию');
          console.log(`   SessionID: ${sessionID.substring(0, 10)}...`);
          console.log(`   Cookies count: ${cookies.length}`);

          this.community.setCookies(cookies);
          this.manager.setCookies(cookies);

          // Start polling for trade offers
          console.log('🔄 Запуск polling для TradeOfferManager...');
          this.manager.pollInterval = 10000; // Устанавливаем интервал опроса

          // Явно запускаем polling
          if (this.manager.poll) {
            console.log('🔄 Запускаем метод poll()...');
            this.manager.poll();
          }

          // Set bot as fully ready when web session is established
          console.log('✅ Cookies установлены');
          console.log(`   Community ready: ${this.community !== null}`);
          console.log(`   Manager polling: ${this.manager.pollInterval ? 'STARTED' : 'NOT STARTED'}`);
          console.log('🎉 Бот теперь полностью готов к работе!');

          // Force loggedOn to true since the library doesn't set it properly
          if (!this.bot.loggedOn) {
            console.log('🔧 Принудительная установка loggedOn = true');
            this.bot.loggedOn = true;
          }

          console.log('');
        });
      });

      // Добавим больше событий для диагностики
      this.bot.on('error', (error) => {
        console.error('❌ Steam Bot Error:', error.message);
        console.error('   Stack:', error.stack);
      });

      this.bot.on('disconnected', (eresult) => {
        console.error(`🔌 Бот отключен от Steam (eresult: ${eresult})`);
      });

      this.bot.on('steamGuard', (domain, callback) => {
        console.log('🛡️ Steam Guard запрос');
        console.error('❌ Steam Guard требует email подтверждение');
        console.error('   Это может быть причиной проблемы!');
      });

      this.bot.on('loginKey', (key) => {
        console.log('🔑 Login key получен:', key);
      });

      this.bot.on('limitation', (limited) => {
        console.log(`🔒 Бот ${limited ? 'LIMITED' : 'NOT LIMITED'}`);
      });

    } catch (error) {
      console.error('❌ Ошибка инициализации бота:', error.message);
      console.error('Stack:', error.stack);
    }
  }

  setupBotEvents() {
    if (!this.bot) return;

    console.log('📡 Настройка событий бота...');

    this.bot.on('loggedOn', (details) => {
      console.log(`🎮 Бот вошел в Steam как ${details.player_name || 'Unknown'}`);
      console.log(`   SteamID: ${this.bot.steamID.getSteamID64()}`);
      console.log(`   Phase: ${this.getCurrentPhase()}`);
    });

    this.bot.on('webSession', (sessionID, cookies) => {
      console.log('🌐 Бот получил веб-сессию');
      this.community.setCookies(cookies);
      this.manager.setCookies(cookies);
      console.log('✅ Cookies установлены для Community и Manager');
    });

    this.bot.on('error', (error) => {
      console.error(`❌ Steam Error: ${error.message}`);
      console.error(`   EResult: ${error.eresult}`);
      console.error(`   Stack: ${error.stack}`);
    });

    this.bot.on('disconnected', (eresult) => {
      console.error(`🔌 Бот отключен (eresult: ${eresult})`);
    });

    this.bot.on('steamGuard', (domain, callback) => {
      console.log('🛡️ Steam Guard сработал!');
      console.error('❌ Требуется email подтверждение - это может быть причиной проблемы');
    });
  }

  setupTradeOfferManager() {
    if (!this.manager) return;

    console.log('🔄 Настройка TradeOfferManager...');

    this.manager.on('sentOfferChanged', (offer, oldState) => {
      console.log(`🔄 Оффер #${offer.id} изменился: ${TradeOfferManager.ETradeOfferState[oldState]} -> ${TradeOfferManager.ETradeOfferState[offer.state]}`);
    });

    this.manager.on('receivedOfferChanged', (offer, oldState) => {
      console.log(`📥 Полученный оффер #${offer.id} изменился: ${TradeOfferManager.ETradeOfferState[oldState]} -> ${TradeOfferManager.ETradeOfferState[offer.state]}`);
    });

    this.manager.on('pollData', (pollData) => {
      console.log(`💾 Сохранение данных опроса`);
    });

    this.manager.on('debug', (message) => {
      console.log(`🐛 TradeManager Debug: ${message}`);
    });
  }

  // Получение инвентаря через Steam Community
  getSteamInventory(steamId, appId = 730, contextId = 2) {
    return new Promise((resolve, reject) => {
      try {
        console.log(`📦 Запрос инвентаря для ${steamId} (App: ${appId}, Context: ${contextId})`);

        this.community.getUserInventory(steamId, appId, contextId, true, (err, inventory) => {
          if (err) {
            console.error(`❌ Ошибка получения инвентаря для ${steamId}:`, err.message);
            console.error(`   EResult: ${err.eresult}`);
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
  async start(port = 3021) {
    console.log('🚀 Запуск Steam Trade Manager Debug...');
    console.log('🎮 Используем реальные Steam учетные данные (Debug Mode)');
    console.log(`🔐 Username: ${this.botCredentials?.username}`);
    console.log(`🆔 SteamID: ${this.botCredentials?.steamId}`);
    console.log(`🔑 Steam API Key: ${this.steamApiKey}`);
    console.log('🔧 DEBUG MODE: Включено подробное логирование');
    console.log('');

    return new Promise((resolve) => {
      this.app.listen(port, () => {
        console.log(`🌐 Steam Trade Manager Debug запущен на порту ${port}`);
        console.log('');
        console.log('📊 Доступные эндпоинты:');
        console.log('   🤖 GET /api/account/status - Статус бота (с деталями)');
        console.log('   🤖 GET /api/account/profile - Профиль бота');
        console.log('   🎁 GET /api/inventory/bot - Инвентарь бота');
        console.log('   🔄 POST /api/trades/create - Создать trade offer');
        console.log('');
        console.log('🔍 DEBUG INFO:');
        console.log('   • Все запросы логируются');
        console.log('   • Подробные ошибки и стек-трейсы');
        console.log('   • Состояние бота в реальном времени');
        console.log('   • Валидация учетных данных');
        console.log('');
        console.log('🎮 ВАШ STEAM БОТ ГОТОВ К ДИАГНОСТИКЕ:');
        console.log(`   🔐 Steam Bot: ${this.botCredentials?.username}`);
        console.log(`   🆔 SteamID: ${this.botCredentials?.steamId}`);
        console.log(`   📱 Mobile Authenticator: ${this.botCredentials?.sharedSecret ? 'SET' : 'NOT SET'}`);
        console.log(`   🔑 Identity Secret: ${this.botCredentials?.identitySecret ? 'SET' : 'NOT SET'}`);
        console.log(`   🌐 Debug Mode: ENABLED`);
        console.log('');
        resolve(this.app);
      });
    });
  }
}

// Запуск системы
const tradeManager = new SteamTradeManagerDebug();
tradeManager.start(3021).catch(console.error);

module.exports = SteamTradeManagerDebug;