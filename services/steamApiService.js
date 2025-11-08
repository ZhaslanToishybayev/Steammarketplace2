const axios = require('axios');
const logger = require('../utils/logger');
const steamOAuthService = require('./steamOAuthService');

/**
 * Steam API Service
 * Получает реальный инвентарь пользователей и ботов через Steam API
 */
class SteamApiService {
  constructor() {
    this.apiKey = process.env.STEAM_API_KEY;
    this.baseUrl = 'https://steamcommunity.com';
    this.inventoryUrl = 'https://steamcommunity.com/inventory';
  }

  /**
   * Получить инвентарь пользователя из Steam API
   * @param {string} steamId - SteamID пользователя
   * @param {number} appId - ID игры (730 для CS2, 570 для Dota 2)
   * @param {string|null} accessToken - OAuth токен Steam (null для OpenID 2.0)
   * @param {boolean} includeDescription - Включать описания предметов
   * @returns {Promise<Object>} Инвентарь с предметами
   */
  async getUserInventory(steamId, appId, accessToken, includeDescription = true) {
    try {
      logger.info(`🔍 Fetching ${appId} inventory for SteamID: ${steamId} ${accessToken ? '(with token)' : '(no token - public)'}`);

      // Параметры запроса
      const params = {
        l: 'english',
        count: 5000, // Максимальное количество предметов
        start_assetid: undefined
      };

      // Добавляем API key для доступа к публичному инвентарю
      if (!accessToken && this.apiKey) {
        params.key = this.apiKey;
        logger.info(`🔑 Using Steam API Key: ${this.apiKey.substring(0, 10)}...`);
      } else if (!this.apiKey) {
        logger.warn(`⚠️ No Steam API Key available!`);
      }

      // Заголовки - добавляем OAuth токен только если он есть
      const headers = {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Steam-Marketplace/1.0)',
        'Referer': 'https://steamcommunity.com/',
        'Origin': 'https://steamcommunity.com'
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const url = `${this.inventoryUrl}/${steamId}/${appId}/2`;
      const fullUrl = `${url}?${new URLSearchParams(params).toString()}`;
      logger.info(`📡 API Request: ${url} ${accessToken ? '[AUTHENTICATED]' : '[PUBLIC]'}`);
      logger.info(`🔗 Full URL: ${fullUrl}`);

      const response = await axios.get(url, { params, headers, timeout: 30000 });

      logger.info(`📊 Response received:`, {
        status: response.status,
        statusText: response.statusText,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : []
      });

      if (!response.data) {
        logger.error('❌ No data in Steam API response');
        throw new Error('No data in Steam API response');
      }

      // Steam API может вернуть success: false для приватного инвентаря
      if (response.data.success === false) {
        const errorMsg = response.data.Error || 'Inventory is private or unavailable';
        logger.warn('⚠️ Steam API returned success=false:', errorMsg);
        throw new Error(errorMsg);
      }

      // Если нет assets - инвентарь пустой
      if (!response.data.assets) {
        logger.info('ℹ️ No assets in response - empty inventory');
        return {
          success: true,
          items: [],
          cached: false
        };
      }

      if (!response.data.descriptions) {
        logger.error('❌ Invalid response structure from Steam API - no descriptions');
        throw new Error('Invalid response structure from Steam API');
      }

      const { assets, descriptions } = response.data;

      if (!assets || !descriptions) {
        logger.error('❌ Invalid response structure from Steam API');
        throw new Error('Invalid response structure from Steam API');
      }

      logger.info(`✅ Steam API returned ${assets.length} assets, ${descriptions.length} descriptions`);

      // Создаем карту описаний для быстрого поиска
      const descriptionMap = new Map();
      descriptions.forEach(desc => {
        const key = `${desc.classid}_${desc.instanceid}`;
        descriptionMap.set(key, desc);
      });

      // Преобразуем активы в предметы
      const items = assets.map(asset => {
        const descKey = `${asset.classid}_${asset.instanceid}`;
        const description = descriptionMap.get(descKey);

        if (!description) {
          logger.warn(`⚠️ No description found for asset ${asset.assetid}`);
          return null;
        }

        // Извлекаем теги
        let tags = [];
        if (description.tags) {
          tags = description.tags.map(tag => ({
            category: tag.category,
            internal_name: tag.internal_name,
            name: tag.name
          }));
        }

        // Создаем стандартизированный объект предмета
        const item = {
          assetId: asset.assetid,
          classId: asset.classid,
          instanceId: asset.instanceid,
          appId: appId,
          name: description.name || 'Unknown Item',
          marketName: description.market_name || description.name,
          type: description.type || '',
          tradable: description.tradable || false,
          marketable: description.marketable || false,
          descriptions: description.descriptions || [],
          tags: tags,
          // Дополнительные поля для CS2
          exterior: this.extractTag(tags, 'Exterior'),
          weapon: this.extractTag(tags, 'Weapon'),
          skin: this.extractTag(tags, 'Skin'),
          quality: this.extractTag(tags, 'Quality'),
          rarity: this.extractTag(tags, 'Rarity'),
          // Цена (если доступна)
          price: description.price || null
        };

        return item;
      }).filter(item => item !== null); // Удаляем null элементы

      logger.info(`📦 Processed ${items.length} items for game ${appId}`);

      return {
        success: true,
        items: items,
        count: items.length,
        appId: appId,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`❌ Error fetching inventory for SteamID ${steamId}:`, error.message);

      if (error.response) {
        logger.error('Response status:', error.response.status);
        logger.error('Response data:', error.response.data);
      }

      // Проверяем специфичные ошибки
      if (error.response?.status === 401) {
        throw new Error('Steam authentication required. OAuth token may be invalid.');
      } else if (error.response?.status === 403) {
        throw new Error('Access to inventory is forbidden. Check privacy settings.');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limited by Steam. Please try again later.');
      }

      throw new Error(`Failed to fetch inventory: ${error.message}`);
    }
  }

  /**
   * Получить инвентарь бота через TradeOfferManager
   * @param {Object} bot - Объект бота из botManager
   * @param {string} appId - ID игры (730 для CS2, 570 для Dota 2)
   * @returns {Promise<Object>} Инвентарь с предметами
   */
  async getBotInventory(bot, appId) {
    try {
      if (!bot.isOnline) {
        throw new Error('Bot is offline (rate limited by Steam)');
      }

      if (!bot.inventory || !bot.inventory[appId]) {
        logger.warn(`⚠️ Bot inventory not available for appId ${appId}`);
        return {
          success: true,
          items: [],
          count: 0,
          appId: appId,
          empty: true,
          message: 'Bot inventory not loaded yet'
        };
      }

      const rawItems = bot.inventory[appId];
      logger.info(`📦 Bot inventory for ${appId}: ${rawItems.length} items`);

      // Преобразуем в стандартизированный формат
      const items = rawItems.map(item => {
        const tags = item.tags || [];

        return {
          assetId: item.assetid,
          classId: item.classid,
          instanceId: item.instanceid,
          appId: parseInt(appId),
          name: item.name || 'Unknown Item',
          marketName: item.market_name || item.name,
          type: item.type || '',
          tradable: item.tradable || false,
          marketable: item.marketable || false,
          descriptions: item.descriptions || [],
          tags: tags,
          // Дополнительные поля
          exterior: this.extractTag(tags, 'Exterior'),
          weapon: this.extractTag(tags, 'Weapon'),
          skin: this.extractTag(tags, 'Skin'),
          quality: this.extractTag(tags, 'Quality'),
          rarity: this.extractTag(tags, 'Rarity')
        };
      });

      logger.info(`✅ Processed ${items.length} bot items`);

      return {
        success: true,
        items: items,
        count: items.length,
        appId: appId,
        botSteamId: bot.steamId
      };

    } catch (error) {
      logger.error('❌ Error getting bot inventory:', error.message);
      throw error;
    }
  }

  /**
   * Фильтрация предметов по игре
   * @param {Array} items - Массив предметов
   * @param {string} game - 'cs2' или 'dota2'
   * @returns {Array} Отфильтрованные предметы
   */
  filterByGame(items, game) {
    const gameName = game === 'dota2' ? 'Dota 2' : 'CS2';
    logger.info(`🔍 Filtering ${items.length} items for ${gameName}`);

    if (game === 'dota2') {
      // Dota 2 - показываем только предметы Dota 2 (appId = 570)
      const filtered = items.filter(item => {
        const isDota2Item = item.appId === 570;
        const isMarketable = item.marketable;
        const isTradable = item.tradable;

        return isDota2Item && isMarketable && isTradable;
      });

      const filteredOut = items.length - filtered.length;
      logger.info(`✅ Dota 2 filter: ${items.length} → ${filtered.length} (filtered out: ${filteredOut})`);

      return filtered;

    } else {
      // CS2 - фильтруем типы предметов
      const filtered = items.filter(item => {
        if (!item.type) return false;
        if (!item.marketable) return false;

        // Исключаем нежелательные типы
        if (item.type.includes('Base Grade Container')) return false;
        if (item.type.includes('Graffiti')) return false;
        if (item.type.includes('Music')) return false;

        return true;
      });

      const filteredOut = items.length - filtered.length;
      logger.info(`✅ CS2 filter: ${items.length} → ${filtered.length} (filtered out: ${filteredOut})`);

      return filtered;
    }
  }

  /**
   * Извлечь тег по категории
   * @param {Array} tags - Массив тегов
   * @param {string} category - Категория тега
   * @returns {Object|null} Тег или null
   */
  extractTag(tags, category) {
    const tag = tags.find(t => t.category === category);
    return tag || null;
  }

  /**
   * Получить валидный OAuth токен для пользователя
   * @param {Object} user - Пользователь из базы
   * @returns {Promise<string>} Валидный OAuth токен
   */
  async getValidAccessToken(user) {
    if (!user.steamAccessToken) {
      throw new Error('User has no Steam OAuth token. Please authenticate with Steam.');
    }

    // Проверяем и обновляем токен при необходимости
    const validToken = await steamOAuthService.getValidToken(user);
    return validToken;
  }

  /**
   * Проверить доступность Steam API
   * @returns {Promise<boolean>} true если API доступен
   */
  async checkApiAvailability() {
    try {
      // Делаем простой запрос к Steam API для проверки
      const response = await axios.get(
        `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${this.apiKey}&steamids=76561197960287930`,
        { timeout: 5000 }
      );

      return response.status === 200;
    } catch (error) {
      logger.error('❌ Steam API not available:', error.message);
      return false;
    }
  }
}

module.exports = new SteamApiService();
