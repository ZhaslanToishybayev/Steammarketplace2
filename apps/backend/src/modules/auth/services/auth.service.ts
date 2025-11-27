import { Injectable } from '@nestjs/common';

export interface SteamUserProfile {
  steamid: string;
  personaname: string;
  avatar: string;
  profileurl: string;
  [key: string]: any;
}

export interface User {
  id: string;
  steamId: string;
  nickname: string;
  avatar?: string;
  profileUrl?: string;
  tradeUrl?: string;
  apiKey?: string;
  apiKeyLastVerified?: string;
  apiKeyStatus?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  stats?: {
    totalTrades: number;
    successfulTrades: number;
    cancelledTrades: number;
    totalSpent: number;
    totalEarned: number;
    itemsListed: number;
    itemsSold: number;
  };
}

@Injectable()
export class AuthService {
  async validateSteamUser(steamProfile: SteamUserProfile): Promise<User> {
    // Mock implementation - in real app, this would check database
    const user: User = {
      id: '1',
      steamId: steamProfile.steamid,
      nickname: steamProfile.personaname || 'Unknown',
      avatar: steamProfile.avatar,
      profileUrl: steamProfile.profileurl,
      tradeUrl: `https://steamcommunity.com/trade/${steamProfile.steamid.replace('7656119', '123456789')}/tradeoffers/`,
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
    };

    console.log('Validated Steam user:', user.nickname, user.steamId);
    return user;
  }

  async login(user: User, req: any) {
    // Mock login - in real app, this would generate JWT tokens
    return {
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
      accessToken: 'mock-access-token',
      expiresIn: 900
    };
  }
}