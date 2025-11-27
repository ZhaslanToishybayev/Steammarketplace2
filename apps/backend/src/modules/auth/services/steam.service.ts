import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { SteamUserProfile } from '../interfaces/steam-user-profile.interface';

@Injectable()
export class SteamService {
  private readonly logger = new Logger(SteamService.name);
  private readonly STEAM_API_KEY: string;
  private readonly STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login';
  private readonly STEAM_API_BASE_URL = 'http://api.steampowered.com';

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.STEAM_API_KEY = this.configService.get<string>('STEAM_API_KEY', '');
    if (!this.STEAM_API_KEY) {
      this.logger.warn('STEAM_API_KEY not configured. Some features may not work properly.');
    }
  }

  /**
   * Generate Steam OpenID authentication URL
   */
  generateAuthUrl(returnUrl: string, realm?: string): string {
    const params = new URLSearchParams({
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'checkid_setup',
      'openid.return_to': returnUrl,
      'openid.realm': realm || this.configService.get<string>('STEAM_REALM', 'http://localhost:3000'),
      'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
      'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
    });

    return `${this.STEAM_OPENID_URL}?${params.toString()}`;
  }

  /**
   * Validate OpenID response from Steam
   */
  async validateOpenIdResponse(params: any): Promise<SteamUserProfile> {
    try {
      // Build validation URL
      const validationParams = new URLSearchParams({
        'openid.ns': 'http://specs.openid.net/auth/2.0',
        'openid.mode': 'check_authentication',
        ...params,
      });

      const validationUrl = `${this.STEAM_OPENID_URL}?${validationParams.toString()}`;

      // Validate response with Steam
      const response: AxiosResponse<string> = await this.httpService.axiosRef.get(validationUrl);
      const validationText = response.data;

      if (!validationText.includes('is_valid:true')) {
        throw new Error('Steam OpenID validation failed');
      }

      // Extract Steam ID from claimed_id
      const claimedId = params['openid.claimed_id'];
      if (!claimedId) {
        throw new Error('No claimed_id in OpenID response');
      }

      const steamIdMatch = claimedId.match(/\/(\d{17})\/?$/);
      const steamId = steamIdMatch ? steamIdMatch[1] : null;

      if (!steamId) {
        throw new Error('Could not extract Steam ID from claimed_id');
      }

      // Get detailed user information
      return await this.getPlayerSummaries(steamId);

    } catch (error) {
      this.logger.error('Steam OpenID validation failed:', error);
      throw new Error('Steam authentication failed');
    }
  }

  /**
   * Get player summaries from Steam API
   */
  async getPlayerSummaries(steamId: string): Promise<SteamUserProfile> {
    if (!this.STEAM_API_KEY) {
      throw new Error('STEAM_API_KEY not configured');
    }

    try {
      const url = `${this.STEAM_API_BASE_URL}/ISteamUser/GetPlayerSummaries/v0002/`;
      const params = {
        key: this.STEAM_API_KEY,
        steamids: steamId,
      };

      const response: AxiosResponse<any> = await this.httpService.axiosRef.get(url, { params });
      const data = response.data;

      if (!data.response || !data.response.players || data.response.players.length === 0) {
        throw new Error('Player not found');
      }

      const player = data.response.players[0];

      // Validate that the player profile is public
      if (player.communityvisibilitystate !== 3) {
        throw new Error('Steam profile is not public');
      }

      return {
        steamId: player.steamid,
        username: player.personaname,
        avatar: player.avatar,
        avatarMedium: player.avatarmedium,
        avatarFull: player.avatarfull,
        profileUrl: player.profileurl,
        profileState: player.profilestate,
        personaState: player.personastate,
        primaryClanId: player.primaryclanid,
        timeCreated: player.timecreated ? new Date(player.timecreated * 1000) : null,
        personaname: player.personaname,
        commentPermission: player.commentpermission,
        locCountryCode: player.loccountrycode,
        locStateCode: player.locstatecode,
        locCityId: player.loccityid,
        lastLogoff: player.lastlogoff ? new Date(player.lastlogoff * 1000) : null,
        communityBanned: false, // Will be checked separately
        tradeBanned: false, // Will be checked separately
        isLimitedAccount: false, // Will be checked separately
        lastSteamSync: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to get player summaries for Steam ID ${steamId}:`, error);
      throw new Error('Failed to fetch Steam profile');
    }
  }

  /**
   * Get player bans information
   */
  async getPlayerBans(steamId: string): Promise<{
    communityBanned: boolean;
    tradeBanned: boolean;
    isLimitedAccount: boolean;
    daysSinceLastBan: number;
    numberOfVACBans: number;
    numberOfGameBans: number;
    economyBan: string;
  }> {
    if (!this.STEAM_API_KEY) {
      throw new Error('STEAM_API_KEY not configured');
    }

    try {
      const url = `${this.STEAM_API_BASE_URL}/ISteamUser/GetPlayerBans/v1/`;
      const params = {
        key: this.STEAM_API_KEY,
        steamids: steamId,
      };

      const response: AxiosResponse<any> = await this.httpService.axiosRef.get(url, { params });
      const data = response.data;

      if (!data.players || data.players.length === 0) {
        throw new Error('Player bans not found');
      }

      const bans = data.players[0];

      return {
        communityBanned: bans.communitybanned || false,
        tradeBanned: bans.economybanned || false,
        isLimitedAccount: bans.islimitedaccount || false,
        daysSinceLastBan: bans.dailysincelastbans || 0,
        numberOfVACBans: bans.vacbanned ? 1 : bans.numvacbans || 0,
        numberOfGameBans: bans.numgamebans || 0,
        economyBan: bans.economyban || 'none',
      };

    } catch (error) {
      this.logger.error(`Failed to get player bans for Steam ID ${steamId}:`, error);
      throw new Error('Failed to fetch Steam bans');
    }
  }

  /**
   * Get user's trade offers
   */
  async getTradeOffers(steamId: string, activeOnly: boolean = true): Promise<any> {
    if (!this.STEAM_API_KEY) {
      throw new Error('STEAM_API_KEY not configured');
    }

    try {
      const url = `${this.STEAM_API_BASE_URL}/IEconService/GetTradeOffers/v1/`;
      const params = {
        key: this.STEAM_API_KEY,
        get_sent_offers: 1,
        get_received_offers: 1,
        active_only: activeOnly ? 1 : 0,
        time_historical_cutoff: Math.floor(Date.now() / 1000),
      };

      const response: AxiosResponse<any> = await this.httpService.axiosRef.get(url, { params });
      return response.data;

    } catch (error) {
      this.logger.error(`Failed to get trade offers for Steam ID ${steamId}:`, error);
      throw new Error('Failed to fetch trade offers');
    }
  }

  /**
   * Get specific trade offer details
   */
  async getTradeOffer(tradeId: string): Promise<any> {
    if (!this.STEAM_API_KEY) {
      throw new Error('STEAM_API_KEY not configured');
    }

    try {
      const url = `${this.STEAM_API_BASE_URL}/IEconService/GetTradeOffer/v1/`;
      const params = {
        key: this.STEAM_API_KEY,
        tradeofferid: tradeId,
      };

      const response: AxiosResponse<any> = await this.httpService.axiosRef.get(url, { params });
      return response.data;

    } catch (error) {
      this.logger.error(`Failed to get trade offer ${tradeId}:`, error);
      throw new Error('Failed to fetch trade offer');
    }
  }

  /**
   * Validate trade URL format and extract token
   */
  validateTradeUrl(tradeUrl: string): { isValid: boolean; token?: string; steamId?: string } {
    try {
      const url = new URL(tradeUrl);

      // Check if it's a Steam trade URL
      if (!url.hostname.includes('steamcommunity.com') && !url.hostname.includes('tradeoffer')) {
        return { isValid: false };
      }

      // Extract token from URL parameters
      const token = url.searchParams.get('token');
      const partner = url.searchParams.get('partner');

      if (!token || !partner) {
        return { isValid: false };
      }

      // Validate token format (alphanumeric with some special chars)
      if (!/^[a-zA-Z0-9_-]+$/.test(token)) {
        return { isValid: false };
      }

      return {
        isValid: true,
        token,
        steamId: partner,
      };

    } catch (error) {
      return { isValid: false };
    }
  }

  /**
   * Check if user has Steam Guard enabled (requires additional API key)
   */
  async checkSteamGuardStatus(steamId: string): Promise<boolean> {
    // This would require the user's Steam Web API key which is not typically available
    // For now, we'll return false and let the user verify manually
    this.logger.warn(`Steam Guard check not implemented for Steam ID ${steamId}`);
    return false;
  }

  /**
   * Verify that a user can trade (basic checks)
   */
  async canUserTrade(steamId: string): Promise<{
    canTrade: boolean;
    reasons: string[];
  }> {
    const reasons: string[] = [];

    try {
      // Check bans
      const bans = await this.getPlayerBans(steamId);

      if (bans.communityBanned) {
        reasons.push('Community banned');
      }

      if (bans.tradeBanned) {
        reasons.push('Trade banned');
      }

      if (bans.isLimitedAccount) {
        reasons.push('Limited account');
      }

      // Check if account is new (less than 7 days)
      const profile = await this.getPlayerSummaries(steamId);
      if (profile.timeCreated) {
        const accountAgeDays = (Date.now() - profile.timeCreated.getTime()) / (1000 * 60 * 60 * 24);
        if (accountAgeDays < 7) {
          reasons.push('Account is less than 7 days old');
        }
      }

      return {
        canTrade: reasons.length === 0,
        reasons,
      };

    } catch (error) {
      this.logger.error(`Failed to check trade eligibility for Steam ID ${steamId}:`, error);
      return {
        canTrade: false,
        reasons: ['Failed to verify trade eligibility'],
      };
    }
  }

  /**
   * Get user's Steam level (requires additional API)
   */
  async getSteamLevel(steamId: string): Promise<number> {
    // Steam level API requires additional setup
    // For now, return 0
    this.logger.warn(`Steam level check not implemented for Steam ID ${steamId}`);
    return 0;
  }
}