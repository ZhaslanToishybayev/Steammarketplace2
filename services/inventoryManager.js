const steamApiService = require('./steamApiService');
const steamWebApiService = require('./steamWebApiService');
const botManager = require('./steamBotManager');
const logger = require('../utils/logger');

/**
 * Inventory Manager
 * Умная система управления инвентарём пользователей и ботов
 */
class InventoryManager {
  constructor() {
    this.maxRetries = 3;
    this.retryDelay = 2000; // 2 секунды
  }

  /**
   * Получить инвентарь пользователя с детальной диагностикой
   * @param {string} steamId - SteamID пользователя
   * @param {string} game - 'cs2' или 'dota2'
   * @param {Object} options - Дополнительные опции
   * @returns {Promise<Object>} Результат с данными и диагностикой
   */
  async getUserInventoryWithDiagnostics(steamId, game = 'cs2', options = {}) {
    const appId = game === 'cs2' ? 730 : 570;
    const gameName = game === 'cs2' ? 'CS2' : 'Dota 2';

    logger.info(`🔍 Getting user inventory for ${gameName} (SteamID: ${steamId})`);

    try {
      // 1. Получаем профиль пользователя через Web API
      let userProfile = null;
      let profileError = null;

      try {
        const profileResult = await steamWebApiService.getUserProfile(steamId);
        userProfile = profileResult.profile;
      } catch (error) {
        profileError = error.message;
        logger.warn(`⚠️ Could not fetch user profile: ${error.message}`);
      }

      // 2. Проверяем владение игрой
      let gameOwnership = null;
      try {
        gameOwnership = await steamWebApiService.isGameOwner(steamId, appId);
      } catch (error) {
        logger.warn(`⚠️ Could not check game ownership: ${error.message}`);
      }

      // 3. Пробуем загрузить инвентарь через Community API
      let inventoryResult = null;
      let inventoryError = null;
      let inventoryAttempted = false;

      try {
        inventoryAttempted = true;
        // Попытка загрузить инвентарь (может не сработать без токена)
        inventoryResult = await steamApiService.getUserInventory(steamId, appId, null);

        if (inventoryResult.success) {
          // API сработал успешно, проверим количество предметов
          const filteredItems = steamApiService.filterByGame(inventoryResult.items, game);

          logger.info(`✅ User inventory API response: ${inventoryResult.items.length} items, filtered to ${filteredItems.length}`);

          if (filteredItems.length > 0) {
            return {
              success: true,
              items: filteredItems,
              count: filteredItems.length,
              source: 'steam-community-api',
              game: game,
              userProfile: userProfile,
              gameOwnership: gameOwnership,
              diagnostics: {
                profileLoaded: !!userProfile,
                profileError: profileError,
                ownershipChecked: !!gameOwnership,
                ownershipResult: gameOwnership,
                inventoryAttempted: inventoryAttempted,
                inventoryLoaded: true,
                inventoryApiSuccess: true,
                itemsFound: filteredItems.length,
                reason: 'Inventory loaded successfully'
              }
            };
          } else {
            // Инвентарь загружен, но пуст
            return {
              success: true,
              items: [],
              count: 0,
              source: 'steam-community-api',
              game: game,
              userProfile: userProfile,
              gameOwnership: gameOwnership,
              empty: true,
              diagnostics: {
                profileLoaded: !!userProfile,
                profileError: profileError,
                ownershipChecked: !!gameOwnership,
                ownershipResult: gameOwnership,
                inventoryAttempted: inventoryAttempted,
                inventoryLoaded: true,
                inventoryApiSuccess: true,
                itemsFound: 0,
                reason: 'Your Steam inventory is empty or contains no tradeable items for this game'
              }
            };
          }
        } else {
          inventoryError = inventoryResult.error || 'Unknown error';
          logger.warn(`⚠️ Steam API returned error: ${inventoryError}`);
        }
      } catch (error) {
        inventoryError = error.message;
        logger.warn(`⚠️ User inventory not available: ${error.message}`);
      }

      // 4. Формируем ответ с диагностикой (для случаев когда API не сработал)
      const diagnostics = {
        profileLoaded: !!userProfile,
        profileError: profileError,
        ownershipChecked: !!gameOwnership,
        ownershipResult: gameOwnership,
        inventoryAttempted: inventoryAttempted,
        inventoryLoaded: false,
        inventoryApiSuccess: false,
        inventoryError: inventoryError,
        itemsFound: 0,
        needsOAuth: this._determineOAuthNeed(inventoryError, userProfile, gameOwnership),
        reason: this._determineFailureReason(inventoryError, userProfile, gameOwnership)
      };

      return {
        success: false,
        items: [],
        count: 0,
        source: 'failed',
        game: game,
        userProfile: userProfile,
        gameOwnership: gameOwnership,
        diagnostics: diagnostics
      };

    } catch (error) {
      logger.error(`❌ Error in getUserInventoryWithDiagnostics:`, error.message);

      return {
        success: false,
        items: [],
        count: 0,
        source: 'error',
        game: game,
        userProfile: null,
        gameOwnership: null,
        error: error.message,
        diagnostics: {
          profileLoaded: false,
          profileError: error.message,
          ownershipChecked: false,
          inventoryAttempted: false,
          inventoryLoaded: false,
          itemsFound: 0,
          needsOAuth: true,
          reason: 'System error'
        }
      };
    }
  }

  /**
   * Получить инвентарь бота
   * @param {string} game - 'cs2' или 'dota2'
   * @returns {Promise<Object>} Инвентарь бота
   */
  async getBotInventory(game = 'cs2') {
    const appId = game === 'cs2' ? 730 : 570;
    const gameName = game === 'cs2' ? 'CS2' : 'Dota 2';

    try {
      const bot = botManager.getBots()[0]; // Берём первого бота

      if (!bot) {
        throw new Error('No bots available');
      }

      logger.info(`🤖 Getting bot inventory for ${gameName}`);

      const result = await steamApiService.getBotInventory(bot, appId);

      if (result.success) {
        // Фильтруем по игре
        const filteredItems = steamApiService.filterByGame(result.items, game);

        logger.info(`✅ Bot inventory loaded: ${filteredItems.length} items`);

        return {
          success: true,
          items: filteredItems,
          count: filteredItems.length,
          source: 'bot-inventory',
          game: game,
          botInfo: {
            steamId: bot.steamId,
            username: bot.username || 'Unknown',
            isOnline: bot.isOnline
          }
        };
      } else {
        throw new Error('Bot inventory loading failed');
      }

    } catch (error) {
      logger.error(`❌ Error getting bot inventory:`, error.message);

      return {
        success: false,
        items: [],
        count: 0,
        source: 'error',
        game: game,
        error: error.message
      };
    }
  }

  /**
   * Получить полную информацию о пользователе
   * @param {string} steamId - SteamID пользователя
   * @returns {Promise<Object>} Полная информация
   */
  async getUserInfo(steamId) {
    try {
      logger.info(`📊 Getting full user info for SteamID: ${steamId}`);

      const result = await steamWebApiService.getFullUserInfo(steamId);

      return result;

    } catch (error) {
      logger.error(`❌ Error getting user info:`, error.message);
      throw error;
    }
  }

  /**
   * Получить статус инвентаря пользователя
   * @param {string} steamId - SteamID пользователя
   * @param {string} game - 'cs2' или 'dota2'
   * @returns {Promise<Object>} Статус инвентаря
   */
  async getInventoryStatus(steamId, game = 'cs2') {
    try {
      const appId = game === 'cs2' ? 730 : 570;
      const gameName = game === 'cs2' ? 'CS2' : 'Dota 2';

      // Проверяем владение игрой
      const ownership = await steamWebApiService.isGameOwner(steamId, appId);

      // Проверяем профиль
      let profile = null;
      try {
        const profileResult = await steamWebApiService.getUserProfile(steamId);
        profile = profileResult.profile;
      } catch (error) {
        // Профиль может быть приватным
      }

      const status = {
        steamId: steamId,
        game: game,
        gameName: gameName,
        profile: profile,
        ownership: ownership,
        isProfilePublic: profile?.isPublic || false,
        isGameOwner: ownership.isOwner,
        canLoadInventory: this._canLoadInventory(ownership, profile),
        reason: this._getStatusReason(ownership, profile)
      };

      logger.info(`📋 Inventory status for ${gameName}:`, {
        profilePublic: status.isProfilePublic,
        gameOwner: status.isGameOwner,
        canLoad: status.canLoadInventory
      });

      return {
        success: true,
        status: status
      };

    } catch (error) {
      logger.error(`❌ Error checking inventory status:`, error.message);
      throw error;
    }
  }

  /**
   * Определить нужен ли OAuth токен
   * @private
   */
  _determineOAuthNeed(inventoryError, userProfile, gameOwnership) {
    // Если профиль приватный, то точно нужен OAuth
    if (!userProfile || !userProfile.isPublic) {
      return true;
    }

    // Если пользователь не владеет игрой, инвентарь не загрузится
    if (gameOwnership && gameOwnership.isOwner === false) {
      return false;
    }

    // Если есть ошибка авторизации, нужен OAuth
    if (inventoryError && (
      inventoryError.includes('authentication') ||
      inventoryError.includes('token') ||
      inventoryError.includes('401') ||
      inventoryError.includes('403')
    )) {
      return true;
    }

    // По умолчанию считаем что нужен OAuth (политика Steam)
    return true;
  }

  /**
   * Определить причину неудачи
   * @private
   */
  _determineFailureReason(inventoryError, userProfile, gameOwnership) {
    if (!userProfile) {
      return 'Could not fetch user profile';
    }

    if (!userProfile.isPublic) {
      return 'Profile is private - OAuth token required';
    }

    if (gameOwnership && gameOwnership.isOwner === false) {
      return 'User does not own this game';
    }

    if (gameOwnership && gameOwnership.isPrivate) {
      return 'Game ownership is private';
    }

    if (inventoryError) {
      if (inventoryError.includes('401') || inventoryError.includes('403')) {
        return 'Authentication required - OAuth token needed';
      }
      if (inventoryError.includes('private') || inventoryError.includes('unavailable')) {
        return 'Inventory is private or unavailable';
      }
      return `Inventory error: ${inventoryError}`;
    }

    return 'Unknown reason - likely needs OAuth token';
  }

  /**
   * Проверить можно ли загрузить инвентарь
   * @private
   */
  _canLoadInventory(ownership, profile) {
    // Нужны публичный профиль и владение игрой
    if (!profile || !profile.isPublic) {
      return false;
    }

    if (!ownership || ownership.isOwner !== true) {
      return false;
    }

    return true;
  }

  /**
   * Получить текстовое описание статуса
   * @private
   */
  _getStatusReason(ownership, profile) {
    if (!profile) {
      return 'Unable to fetch profile information';
    }

    if (!profile.isPublic) {
      return 'Profile is private';
    }

    if (!ownership) {
      return 'Unable to check game ownership';
    }

    if (ownership.isPrivate) {
      return 'Game ownership is private';
    }

    if (ownership.isOwner === false) {
      return 'User does not own this game';
    }

    if (ownership.isOwner === true) {
      return 'Ready to load inventory (OAuth may still be required)';
    }

    return 'Unknown status';
  }
}

module.exports = new InventoryManager();