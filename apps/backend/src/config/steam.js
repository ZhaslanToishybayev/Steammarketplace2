// apps/backend/src/config/steam.js
const SteamAPI = require('steamapi');

class SteamService {
  constructor() {
    this.apiKey = process.env.STEAM_API_KEY;
    this.steam = new SteamAPI(this.apiKey);
  }

  async getInventory(steamId, appId = '730', contextId = '2') {
    try {
      return await this.steam.getUserInventory(steamId, appId, contextId, true);
    } catch (error) {
      console.error(`Steam API Error for ${steamId}:`, error);
      throw error;
    }
  }

  async getProfile(steamId) {
    try {
      return await this.steam.getUserSummary(steamId);
    } catch (error) {
      console.error(`Steam Profile Error for ${steamId}:`, error);
      throw error;
    }
  }

  async getFriendList(steamId) {
    try {
      return await this.steam.getUserFriends(steamId);
    } catch (error) {
      console.error(`Steam Friends Error for ${steamId}:`, error);
      throw error;
    }
  }

  /**
   * Test the connection to Steam API
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      if (!this.apiKey || this.apiKey === 'your_steam_api_key_here') {
        return false;
      }
      // Attempt to fetch a generic profile to validate the key
      // using a well-known SteamID (e.g., Robin Walker)
      await this.steam.getUserSummary('76561197960435530');
      return true;
    } catch (error) {
      console.error('Steam API Connection Test Failed:', error.message);
      return false;
    }
  }
}

module.exports = new SteamService();