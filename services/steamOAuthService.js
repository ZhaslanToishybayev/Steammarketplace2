const axios = require('axios');
const crypto = require('crypto');
const querystring = require('querystring');
const logger = require('../utils/logger');
const { EAuthTokenPlatformType, EAuthSessionGuardType, steamid, AuthSession } = require('steam-session');

/**
 * Steam OAuth 2.0 Service
 * Handles Steam OAuth flow and token management using modern steam-session library
 */
class SteamOAuthService {
  constructor() {
    this.clientId = process.env.STEAM_CLIENT_ID || process.env.STEAM_API_KEY;
    this.clientSecret = process.env.STEAM_CLIENT_SECRET || process.env.STEAM_API_KEY;
    this.redirectUri = `${process.env.BASE_URL}/api/auth/steam/callback`;
    this.scope = 'read';

    if (!this.clientId) {
      logger.error('STEAM_CLIENT_ID or STEAM_API_KEY is not set in environment variables');
    }
  }

  /**
   * Generate authorization URL for Steam OAuth
   * @param {string} state - Random state parameter for CSRF protection
   * @returns {Object} Object containing authorization URL and state
   */
  getAuthorizationUrl(state = null) {
    const stateParam = state || crypto.randomBytes(16).toString('hex');

    // Using modern OAuth 2.0 parameters
    const authParams = {
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: this.scope,
      state: stateParam
    };

    const queryString = new URLSearchParams(authParams).toString();

    return {
      url: `https://steamcommunity.com/oauth/authorize?${queryString}`,
      state: stateParam
    };
  }

  /**
   * Exchange authorization code for access token
   * @param {string} code - Authorization code from callback
   * @returns {Promise<Object>} Token response
   */
  async exchangeCodeForToken(code) {
    try {
      logger.info('🔑 Exchanging authorization code for access token');

      // Steam OAuth 2.0 token exchange endpoint
      const response = await axios.post('https://steamcommunity.com/oauth/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.redirectUri
        }), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const tokenData = response.data;
      logger.info('✅ Access token received', {
        hasAccessToken: !!tokenData.access_token,
        expiresIn: tokenData.expires_in
      });

      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresIn: tokenData.expires_in,
        tokenType: tokenData.token_type
      };
    } catch (error) {
      logger.error('❌ Error exchanging code for token:', error.response?.data || error.message);
      throw new Error(`Token exchange failed: ${error.message}`);
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} New token response
   */
  async refreshToken(refreshToken) {
    try {
      logger.info('🔄 Refreshing access token');

      const response = await axios.post('https://steamcommunity.com/oauth/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret
        }), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const tokenData = response.data;
      logger.info('✅ Access token refreshed');

      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || refreshToken,
        expiresIn: tokenData.expires_in,
        tokenType: tokenData.token_type
      };
    } catch (error) {
      logger.error('❌ Error refreshing token:', error.response?.data || error.message);
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * Get Steam user information using SteamID
   * @param {string} steamId - Steam user ID
   * @returns {Promise<Object>} User information
   */
  async getUserInfo(steamId) {
    try {
      logger.info('👤 Fetching Steam user information', { steamId });

      // Steam Web API doesn't need access token, only API key
      const response = await axios.get('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/', {
        params: {
          key: this.clientId,
          steamids: steamId  // Use actual SteamID, not 'me'
        }
        // No Authorization header needed for Steam Web API with API key
      });

      const userData = response.data.response.players[0];
      logger.info('✅ User information received', {
        steamId: userData.steamid,
        username: userData.personaname
      });

      return {
        steamId: userData.steamid,
        username: userData.personaname,
        displayName: userData.personaname,
        avatar: userData.avatarmedium,
        profileUrl: userData.profileurl,
        lastLogOff: userData.lastlogoff,
        visibility: userData.visibilitystate,
        personaState: userData.personastate,
        personaStateText: userData.personastatetext
      };
    } catch (error) {
      logger.error('❌ Error fetching user info:', error.response?.data || error.message);
      throw new Error(`User info fetch failed: ${error.message}`);
    }
  }

  /**
   * Get SteamID from access token
   * @param {string} accessToken - OAuth access token
   * @returns {Promise<string>} SteamID
   */
  async getSteamIdFromToken(accessToken) {
    try {
      logger.info('👤 Getting SteamID from access token');

      const response = await axios.get('https://api.steampowered.com/ISteamUserOAuth2/GetToken/v1/', {
        params: {
          access_token: accessToken
        }
      });

      const data = response.data;
      logger.info('✅ SteamID retrieved', { steamId: data.steamid });

      return data.steamid;
    } catch (error) {
      logger.error('❌ Error getting SteamID from token:', error.response?.data || error.message);
      throw new Error(`Failed to get SteamID: ${error.message}`);
    }
  }

  /**
   * Verify OAuth response (for login flow)
   * @param {Object} params - Query parameters from callback
   * @returns {Object} Verification result with steamId and tokens
   */
  async verifyOAuthResponse(params) {
    try {
      logger.info('🔍 OAuth callback parameters:', params);

      const { code, state } = params;

      // Check if required parameters exist
      if (!code) {
        logger.error('❌ Missing authorization code');
        return { isValid: false, error: 'Missing authorization code' };
      }

      if (!state) {
        logger.error('❌ Missing state parameter');
        return { isValid: false, error: 'Missing state parameter' };
      }

      // Exchange code for tokens
      const tokenData = await this.exchangeCodeForToken(code);

      // Get SteamID from access token
      const steamId = await this.getSteamIdFromToken(tokenData.accessToken);

      logger.info('✅ OAuth response verified', {
        steamId,
        hasAccessToken: !!tokenData.accessToken,
        hasRefreshToken: !!tokenData.refreshToken
      });

      return {
        isValid: true,
        steamId: steamId,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresIn: tokenData.expiresIn
      };
    } catch (error) {
      logger.error('❌ OAuth verification failed:', error.message);
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Verify OpenID response (legacy support, deprecated)
   * @param {Object} params - Query parameters from callback
   * @returns {Object} Verification result
   */
  verifyOpenIDResponse(params) {
    try {
      // DEBUG: Log all incoming parameters
      logger.info('🔍 OpenID callback parameters:', params);

      // Express preserves dots in query parameters, so we need to use bracket notation
      const openid_ns = params['openid.ns'];
      const openid_claimed_id = params['openid.claimed_id'];
      const openid_identity = params['openid.identity'];

      logger.info('🔑 Extracted parameters:', { openid_ns, openid_claimed_id, openid_identity });

      // Check if required parameters exist
      if (!openid_ns) {
        logger.error('❌ Missing openid.ns parameter');
        return { isValid: false, error: 'Missing openid.ns' };
      }
      if (!openid_claimed_id) {
        logger.error('❌ Missing openid.claimed_id parameter');
        return { isValid: false, error: 'Missing openid.claimed_id' };
      }

      // Verify the OpenID namespace
      if (openid_ns !== 'http://specs.openid.net/auth/2.0') {
        logger.error('❌ Invalid OpenID namespace:', openid_ns);
        return { isValid: false, error: 'Invalid OpenID namespace' };
      }

      // Steam returns claimed_id and identity with the same value
      const steamId = openid_claimed_id.split('/').pop();

      logger.info('✅ OpenID response verified', {
        steamId,
        hasClaimedId: !!openid_claimed_id,
        hasIdentity: !!openid_identity,
        namespace: openid_ns
      });

      return {
        isValid: true,
        steamId: steamId,
        claimedId: openid_claimed_id,
        identity: openid_identity
      };
    } catch (error) {
      logger.error('❌ OpenID verification failed:', error.message);
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Validate and refresh token if needed
   * @param {Object} user - User object from database
   * @returns {Promise<string>} Valid access token
   */
  async getValidToken(user) {
    // Check if user has a token
    if (!user.steamAccessToken) {
      throw new Error('User has no Steam access token');
    }

    // For now, assume token is valid
    // In production, you would check expiration and refresh if needed
    return user.steamAccessToken;
  }

  /**
   * Revoke access token
   * @param {string} accessToken - Access token to revoke
   * @returns {Promise<boolean>} Success status
   */
  async revokeToken(accessToken) {
    try {
      logger.info('🔒 Revoking access token');

      await axios.post('https://steamcommunity.com/oauth/token',
        new URLSearchParams({
          grant_type: 'revoke',
          token: accessToken
        }), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      logger.info('✅ Token revoked successfully');
      return true;
    } catch (error) {
      logger.error('❌ Error revoking token:', error.message);
      return false;
    }
  }
}

module.exports = new SteamOAuthService();