import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

interface SteamProfile {
  steamId: string;
  username: string;
  avatar: string;
  profileUrl: string;
  tradeUrl?: string;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  async createOrUpdateUser(profile: SteamProfile): Promise<User> {
    try {
      // Check if user exists
      let user = await this.userRepository.findOne({
        where: { steamId: profile.steamId }
      });

      if (user) {
        // Update existing user
        user.username = profile.username;
        user.avatar = profile.avatar;
        user.profileUrl = profile.profileUrl;
        user.tradeUrl = profile.tradeUrl || user.tradeUrl;
        user.updatedAt = new Date();
      } else {
        // Create new user
        user = this.userRepository.create({
          steamId: profile.steamId,
          username: profile.username,
          avatar: profile.avatar,
          profileUrl: profile.profileUrl,
          tradeUrl: profile.tradeUrl
        });
      }

      return await this.userRepository.save(user);
    } catch (error) {
      console.error('Error creating/updating user:', error);
      throw new Error('Failed to create or update user');
    }
  }

  async findById(id: number): Promise<User | null> {
    try {
      return await this.userRepository.findOne({
        where: { id }
      });
    } catch (error) {
      console.error('Error finding user by id:', error);
      return null;
    }
  }

  async findBySteamId(steamId: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({
        where: { steamId }
      });
    } catch (error) {
      console.error('Error finding user by Steam ID:', error);
      return null;
    }
  }

  async updateTradeUrl(userId: number, tradeUrl: string): Promise<User> {
    try {
      const user = await this.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.tradeUrl = tradeUrl;
      user.tradeUrlVerified = this.validateTradeUrl(tradeUrl);
      
      return await this.userRepository.save(user);
    } catch (error) {
      console.error('Error updating trade URL:', error);
      throw new Error('Failed to update trade URL');
    }
  }

  async incrementTradeStats(userId: number, success: boolean): Promise<void> {
    try {
      const user = await this.findById(userId);
      if (!user) {
        return;
      }

      user.tradeOfferCount += 1;
      if (success) {
        user.successfulTrades += 1;
      } else {
        user.failedTrades += 1;
      }

      await this.userRepository.save(user);
    } catch (error) {
      console.error('Error updating trade stats:', error);
    }
  }

  async getUserStats(userId: number): Promise<any> {
    try {
      const user = await this.findById(userId);
      if (!user) {
        return null;
      }

      const successRate = user.tradeOfferCount > 0 
        ? (user.successfulTrades / user.tradeOfferCount) * 100 
        : 0;

      return {
        totalTrades: user.tradeOfferCount,
        successfulTrades: user.successfulTrades,
        failedTrades: user.failedTrades,
        successRate: Math.round(successRate * 100) / 100,
        tradeUrlVerified: user.tradeUrlVerified,
        reputation: this.calculateReputation(user)
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return null;
    }
  }

  private validateTradeUrl(tradeUrl: string): boolean {
    // Basic validation for Steam trade URL format
    const tradeUrlRegex = /^https:\/\/steamcommunity\.com\/tradeoffer\/partner\/\d+\/?$/;
    return tradeUrlRegex.test(tradeUrl);
  }

  private calculateReputation(user: User): string {
    const successRate = user.tradeOfferCount > 0 
      ? (user.successfulTrades / user.tradeOfferCount) * 100 
      : 0;

    if (user.tradeOfferCount < 5) return 'New';
    if (successRate >= 95) return 'Excellent';
    if (successRate >= 85) return 'Good';
    if (successRate >= 70) return 'Average';
    return 'Poor';
  }

  async getUserInventory(userId: number): Promise<any[]> {
    // This would integrate with Steam Inventory API
    // For now, return empty array
    return [];
  }

  async searchUsers(query: string, limit = 20): Promise<User[]> {
    try {
      return await this.userRepository
        .createQueryBuilder('user')
        .where('user.username ILIKE :query', { query: `%${query}%` })
        .orWhere('user.steamId ILIKE :query', { query: `%${query}%` })
        .limit(limit)
        .getMany();
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }
}
