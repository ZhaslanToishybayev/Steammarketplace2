const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Steam Web API Service
 * Получает данные о пользователях через Steam Web API
 * Работает с STEAM_API_KEY (не требует OAuth токен)
 */
class SteamWebApiService {
  constructor() {
    this.apiKey = process.env.STEAM_API_KEY;
    this.baseUrl = 'https://api.steampowered.com';
  }

  /**
   * Получить профиль пользователя
   * @param {string} steamId - SteamID пользователя
   * @returns {Promise<Object>} Профиль пользователя
   */
  async getUserProfile(steamId) {
    try {
      logger.info(`👤 Fetching profile for SteamID: ${steamId}`);

      const response = await axios.get(
        `${this.baseUrl}/ISteamUser/GetPlayerSummaries/v2/`,
        {
          params: {
            key: this.apiKey,
            steamids: steamId
          },
          timeout: 10000
        }
      );

      const player = response.data.response.players[0];

      if (!player) {
        throw new Error('Player not found');
      }

      const profile = {
        steamId: player.steamid,
        username: player.personaname,
        displayName: player.personaname,
        avatar: player.avatarmedium,
        profileUrl: player.profileurl,
        isPublic: player.communityvisibilitystate === 3,
        lastLogOff: player.lastlogoff,
        personaState: player.personastate,
        timeCreated: player.timecreated,
        // Дополнительная информация
        realName: player.realname || null,
        country: player.loccountrycode || null,
        state: player.locstatecode || null,
        city: player.loccityid || null
      };

      logger.info(`✅ Profile loaded: ${profile.username} (${profile.isPublic ? 'Public' : 'Private'})`);

      return {
        success: true,
        profile: profile
      };

    } catch (error) {
      logger.error(`❌ Error fetching profile for ${steamId}:`, error.message);
      throw new Error(`Failed to fetch user profile: ${error.message}`);
    }
  }

  /**
   * Получить список игр пользователя
   * @param {string} steamId - SteamID пользователя
   * @returns {Promise<Object>} Список игр
   */
  async getOwnedGames(steamId) {
    try {
      logger.info(`🎮 Fetching games for SteamID: ${steamId}`);

      const response = await axios.get(
        `${this.baseUrl}/IPlayerService/GetOwnedGames/v1/`,
        {
          params: {
            key: this.apiKey,
            steamid: steamId,
            include_appinfo: 1,
            include_played_free_games: 1
          },
          timeout: 10000
        }
      );

      const games = response.data.response.games || [];
      const gameList = games.map(game => ({
        appId: game.appid,
        name: game.name,
        playTimeForever: game.playtime_forever,
        playTime2Weeks: game.playtime_2weeks || 0,
        icon: game.img_icon_url,
        logo: game.img_logo_url,
        hasCommunityVisibleStats: game.has_community_visible_stats || false
      }));

      logger.info(`✅ Found ${gameList.length} games for user`);

      return {
        success: true,
        games: gameList,
        gameCount: gameList.length
      };

    } catch (error) {
      logger.error(`❌ Error fetching games for ${steamId}:`, error.message);

      // Если приватные данные - возвращаем пустой список с пояснением
      if (error.response && error.response.status === 403) {
        return {
          success: false,
          error: 'Games list is private',
          games: [],
          gameCount: 0,
          isPrivate: true
        };
      }

      throw new Error(`Failed to fetch owned games: ${error.message}`);
    }
  }

  /**
   * Проверить владение конкретной игрой
   * @param {string} steamId - SteamID пользователя
   * @param {number} appId - ID игры (730 для CS2, 570 для Dota 2)
   * @returns {Promise<Object>} Результат проверки
   */
  async isGameOwner(steamId, appId) {
    try {
      const gamesData = await this.getOwnedGames(steamId);

      // Если это ответ об ошибке (приватные данные)
      if (!gamesData.success && gamesData.isPrivate) {
        return {
          success: false,
          isOwner: null,
          isPrivate: true,
          reason: 'Games list is private'
        };
      }

      const game = gamesData.games.find(g => g.appId === appId);
      const isOwner = !!game;

      logger.info(`🎯 Game ownership check for ${appId}: ${isOwner ? 'Owner' : 'Not owner'}`);

      return {
        success: true,
        isOwner: isOwner,
        isPrivate: false,
        game: game || null
      };

    } catch (error) {
      logger.error(`❌ Error checking game ownership:`, error.message);
      return {
        success: false,
        isOwner: null,
        isPrivate: false,
        reason: error.message
      };
    }
  }

  /**
   * Получить уровень пользователя
   * @param {string} steamId - SteamID пользователя
   * @returns {Promise<Object>} Уровень пользователя
   */
  async getUserLevel(steamId) {
    try {
      logger.info(`⭐ Fetching level for SteamID: ${steamId}`);

      const response = await axios.get(
        `${this.baseUrl}/IPlayerService/GetSteamLevel/v1/`,
        {
          params: {
            key: this.apiKey,
            steamid: steamId
          },
          timeout: 10000
        }
      );

      const level = response.data.response.player_level;

      logger.info(`✅ User level: ${level}`);

      return {
        success: true,
        level: level
      };

    } catch (error) {
      logger.error(`❌ Error fetching user level:`, error.message);
      return {
        success: false,
        level: null,
        error: error.message
      };
    }
  }

  /**
   * Получить полную информацию о пользователе
   * @param {string} steamId - SteamID пользователя
   * @returns {Promise<Object>} Полная информация
   */
  async getFullUserInfo(steamId) {
    try {
      logger.info(`📊 Fetching full info for SteamID: ${steamId}`);

      // Параллельно загружаем профиль, игры и уровень
      const [profileResult, gamesResult, levelResult] = await Promise.allSettled([
        this.getUserProfile(steamId),
        this.getOwnedGames(steamId),
        this.getUserLevel(steamId)
      ]);

      const profile = profileResult.status === 'fulfilled' ? profileResult.value : null;
      const games = gamesResult.status === 'fulfilled' ? gamesResult.value : { games: [], gameCount: 0 };
      const level = levelResult.status === 'fulfilled' ? levelResult.value : { level: null };

      // Проверяем владение CS2 и Dota 2
      const cs2Ownership = await this.isGameOwner(steamId, 730);
      const dota2Ownership = await this.isGameOwner(steamId, 570);

      const fullInfo = {
        steamId: steamId,
        profile: profile?.profile || null,
        games: games.games || [],
        gameCount: games.gameCount || 0,
        level: level.level || 0,
        ownership: {
          cs2: cs2Ownership,
          dota2: dota2Ownership
        },
        isProfilePublic: profile?.profile?.isPublic || false,
        areGamesPrivate: games.isPrivate || false
      };

      logger.info(`✅ Full info loaded for ${fullInfo.profile?.username || steamId}`);

      return {
        success: true,
        data: fullInfo
      };

    } catch (error) {
      logger.error(`❌ Error fetching full user info:`, error.message);
      throw new Error(`Failed to fetch full user info: ${error.message}`);
    }
  }

  /**
   * Проверить статус Steam API
   * @returns {Promise<boolean>} true если API доступен
   */
  async checkApiStatus() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/ISteamUser/GetPlayerSummaries/v2/`,
        {
          params: {
            key: this.apiKey,
            steamids: '76561197960287930' // Test user
          },
          timeout: 5000
        }
      );

      return response.status === 200;
    } catch (error) {
      logger.error('❌ Steam Web API not available:', error.message);
      return false;
    }
  }
}

module.exports = new SteamWebApiService();