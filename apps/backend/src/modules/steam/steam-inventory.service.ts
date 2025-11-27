import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import * as http from 'http';
import * as url from 'url';

interface SteamUser {
  id: string;
  steamId: string;
  nickname: string;
  avatar: string;
  profileUrl: string;
  tradeUrl: string;
  apiKey: string;
  apiKeyLastVerified: string;
  apiKeyStatus: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  stats: any;
}

@Injectable()
export class SteamInventoryService {
  private readonly logger = new Logger(SteamInventoryService.name);
  private users: SteamUser[] = [];
  private currentUserId: string | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    // Initialize with test user
    this.users = [
      {
        id: '1',
        steamId: '76561198012345678',
        nickname: 'TestUser',
        avatar: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fake.jpg',
        profileUrl: 'https://steamcommunity.com/profiles/76561198012345678',
        tradeUrl: 'https://steamcommunity.com/trade/123456789/tradeoffers/',
        apiKey: 'mock_api_key_12345',
        apiKeyLastVerified: new Date().toISOString(),
        apiKeyStatus: 'active',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stats: {
          totalTrades: 15,
          successfulTrades: 12,
          cancelledTrades: 3,
          totalSpent: 250.50,
          totalEarned: 320.00,
          itemsListed: 8,
          itemsSold: 5
        }
      }
    ];
  }

  async getSteamAuthUrl(): Promise<string> {
    const protocol = 'http';
    const host = 'localhost:3000';
    const returnUrl = `${protocol}://${host}/api/steam/auth/return`;
    const realm = this.configService.get<string>('STEAM_REALM') || 'http://localhost:3000';

    const steamOpenIdUrl = `https://steamcommunity.com/openid/login?` + new URLSearchParams({
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'checkid_setup',
      'openid.return_to': returnUrl,
      'openid.realm': realm,
      'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
      'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
    });

    this.logger.log(`🔗 Redirecting to Steam OAuth: ${steamOpenIdUrl}`);
    return steamOpenIdUrl;
  }

  async handleSteamCallback(queryParams: any): Promise<{success: boolean, data?: any, error?: string}> {
    try {
      this.logger.log('🎯 Steam callback endpoint hit!');
      this.logger.log('🎯 Full query params:', Object.keys(queryParams));
      this.logger.log('🎯 OpenID mode:', queryParams['openid.mode']);
      this.logger.log('🎯 Claimed ID:', queryParams['openid.claimed_id']);

      // Check if this is a Steam OpenID response
      if (queryParams['openid.mode'] === 'id_res') {
        this.logger.log('✅ Steam OAuth ID response detected');

        // Extract Steam ID from claimed_id
        const claimedId = queryParams['openid.claimed_id'];
        this.logger.log('🎯 Claimed ID to parse:', claimedId);

        if (!claimedId) {
          this.logger.error('❌ No claimed_id in params');
          return { success: false, error: 'Invalid Steam response - no claimed_id' };
        }

        const steamIdMatch = claimedId.match(/\/(\d{17,18})$/);
        const steamId = steamIdMatch ? steamIdMatch[1] : null;

        this.logger.log('🎯 Extracted Steam ID:', steamId);

        if (steamId) {
          this.logger.log(`✅ Steam OAuth successful! Steam ID: ${steamId}`);

          // Get user profile from Steam Web API
          const userProfile = await this.getSteamUserProfile(steamId);
          this.logger.log('🎯 User profile received:', userProfile.personaname);

          // Create or update user in database
          let user = this.users.find(u => u.steamId === steamId);
          if (!user) {
            user = {
              id: (this.users.length + 1).toString(),
              steamId: steamId,
              nickname: userProfile.personaname || `User${steamId.slice(-6)}`,
              avatar: userProfile.avatar || 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fallback/fallback_bighead.png',
              profileUrl: userProfile.profileurl || `https://steamcommunity.com/profiles/${steamId}`,
              tradeUrl: `https://steamcommunity.com/trade/${steamId}/tradeoffers/`,
              apiKey: `steam_api_${steamId}_${Date.now()}`,
              apiKeyLastVerified: new Date().toISOString(),
              apiKeyStatus: 'active',
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              stats: {
                totalTrades: 0,
                successfulTrades: 0,
                cancelledTrades: 0,
                totalSpent: 0,
                totalEarned: 0,
                itemsListed: 0,
                itemsSold: 0
              }
            };
            this.users.push(user);
            this.logger.log('🆕 Created new user:', user.nickname);
          } else {
            this.logger.log('👋 Returning user:', user.nickname);
          }

          // Set current user
          this.currentUserId = user.id;
          this.logger.log('🎯 Current user set to:', this.currentUserId);

          // Generate authentication tokens
          const authResponse = {
            user: {
              id: user.id,
              steamId: user.steamId,
              nickname: user.nickname,
              avatar: user.avatar,
              profileUrl: user.profileUrl,
              tradeUrl: user.tradeUrl,
              apiKey: user.apiKey,
              apiKeyLastVerified: user.apiKeyLastVerified,
              apiKeyStatus: user.apiKeyStatus,
              isActive: user.isActive,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
              stats: user.stats
            },
            accessToken: `steam-access-token-${steamId}-${Date.now()}`,
            expiresIn: 3600
          };

          return { success: true, data: authResponse };
        } else {
          this.logger.error('❌ Failed to extract Steam ID from claimed_id');
          return { success: false, error: 'Failed to extract Steam ID' };
        }
      } else if (queryParams['openid.mode'] === 'cancel') {
        this.logger.log('❌ Steam OAuth cancelled by user');
        return { success: false, error: 'Authentication cancelled by user' };
      } else {
        this.logger.log('⚠️ Steam OAuth failed or invalid response');
        this.logger.log('⚠️ OpenID mode:', queryParams['openid.mode']);
        this.logger.log('⚠️ Full params:', queryParams);
        return { success: false, error: 'Authentication failed - invalid response' };
      }
    } catch (error) {
      this.logger.error('❌ Steam callback error:', error);
      return { success: false, error: 'Server error during authentication' };
    }
  }

  async getSteamUserProfile(steamId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const STEAM_API_KEY = this.configService.get<string>('STEAM_API_KEY') || 'YOUR_STEAM_API_KEY_HERE';
      const apiUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId}`;

      this.logger.log(`👤 Calling Steam Profile API: ${apiUrl}`);

      https.get(apiUrl, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            this.logger.log(`👤 Profile API Response Status: ${res.statusCode}`);
            this.logger.log(`👤 Response length: ${data.length} bytes`);

            const response = JSON.parse(data);
            this.logger.log(`👤 Profile response:`, response);

            if (response.response && response.response.players && response.response.players.length > 0) {
              const player = response.response.players[0];
              this.logger.log(`👤 Steam user profile:`, {
                steamid: player.steamid,
                personaname: player.personaname,
                avatar: player.avatar,
                profileurl: player.profileurl
              });
              resolve({
                steamid: player.steamid,
                personaname: player.personaname,
                avatar: player.avatarfull || player.avatar,
                profileurl: player.profileurl,
                profilestate: player.profilestate,
                commentpermission: player.commentpermission
              });
            } else {
              this.logger.error('❌ User not found in Steam response');
              reject(new Error('User not found'));
            }
          } catch (error) {
            this.logger.error('❌ Failed to parse Steam profile data:', error.message);
            this.logger.log('👤 Raw profile response (first 500 chars):', data.substring(0, 500));
            reject(new Error('Failed to get user profile'));
          }
        });

      }).on('error', (error) => {
        this.logger.error('❌ Steam profile API request error:', error);
        reject(error);
      });
    });
  }

  async getUserInventory(steamId: string, appId = '730'): Promise<any> {
    return new Promise((resolve, reject) => {
      const apiUrl = `https://steamcommunity.com/inventory/${steamId}/${appId}/2?l=english&count=5000`;

      this.logger.log(`📦 Calling Steam API: ${apiUrl}`);

      https.get(apiUrl, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            this.logger.log(`📦 Steam API Response Status: ${res.statusCode}`);
            this.logger.log(`📦 Response length: ${data.length} bytes`);

            const inventory = JSON.parse(data);
            this.logger.log(`📦 Parsed inventory object:`, {
              success: inventory.success,
              assets: inventory.assets?.length || 0,
              descriptions: inventory.descriptions?.length || 0,
              error: inventory.error
            });

            if (inventory.error) {
              reject(new Error(inventory.error));
              return;
            }

            if (!inventory.success || !inventory.assets) {
              reject(new Error('Inventory is empty or private'));
              return;
            }

            // Process inventory items
            const items = inventory.assets.map(asset => {
              const description = inventory.descriptions.find(desc => desc.classid === asset.classid);

              return {
                assetId: asset.assetid,
                classId: asset.classid,
                instanceId: asset.instanceid,
                amount: asset.amount,
                name: description?.name || 'Unknown Item',
                type: description?.type || '',
                rarity: description?.tags?.find(tag => tag.category === 'Rarity')?.localized_tag || '',
                quality: description?.tags?.find(tag => tag.category === 'Quality')?.localized_tag || '',
                exterior: description?.tags?.find(tag => tag.category === 'Exterior')?.localized_tag || '',
                image: description?.icon_url ? `https://steamcommunity-a.akamaihd.net/economy/image/${description.icon_url}/62fx62f` : '',
                imageLarge: description?.icon_url_large ? `https://steamcommunity-a.akamaihd.net/economy/image/${description.icon_url_large}/184fx184f` : '',
                tradable: description?.tradable === 1,
                marketable: description?.marketable === 1,
                marketHashName: description?.market_hash_name || '',
                description: description?.descriptions?.[0]?.value || '',
                appId: appId,
                price: Math.random() * 100 + 1
              };
            });

            resolve({
              success: true,
              steamId,
              appId,
              items,
              totalCount: items.length
            });

          } catch (error) {
            this.logger.error('❌ Failed to parse Steam inventory data:', error.message);
            this.logger.log('📦 Raw response data (first 500 chars):', data.substring(0, 500));
            reject(new Error('Failed to parse inventory data'));
          }
        });

      }).on('error', (error) => {
        this.logger.error('❌ Steam API request error:', error);
        reject(error);
      });
    });
  }

  async getCurrentUserInventory(appId = '730'): Promise<any> {
    const currentUser = this.users.find(u => u.id === this.currentUserId);
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    return this.getUserInventory(currentUser.steamId, appId);
  }

  async getCurrentUser(): Promise<SteamUser | null> {
    return this.users.find(u => u.id === this.currentUserId) || null;
  }

  async getUsersCount(): Promise<number> {
    return this.users.length;
  }

  async getCurrentUserId(): Promise<string | null> {
    return this.currentUserId;
  }

  async logout(): Promise<void> {
    this.currentUserId = null;
  }
}