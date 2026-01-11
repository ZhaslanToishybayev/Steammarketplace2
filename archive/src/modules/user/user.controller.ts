import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('search')
  async searchUsers(@Query('q') query: string) {
    try {
      const users = await this.userService.searchUsers(query);
      return {
        success: true,
        data: users.map(user => ({
          id: user.id,
          username: user.username,
          avatar: user.avatar,
          steamId: user.steamId,
          tradeUrlVerified: user.tradeUrlVerified,
          createdAt: user.createdAt
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    try {
      const userId = parseInt(id);
      const user = await this.userService.findById(userId);
      
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      const stats = await this.userService.getUserStats(userId);

      return {
        success: true,
        data: {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
          steamId: user.steamId,
          profileUrl: user.profileUrl,
          tradeUrlVerified: user.tradeUrlVerified,
          stats: stats,
          createdAt: user.createdAt
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get(':id/inventory')
  async getUserInventory(@Param('id') id: string) {
    try {
      const userId = parseInt(id);
      const inventory = await this.userService.getUserInventory(userId);
      
      return {
        success: true,
        data: inventory
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get(':id/stats')
  async getUserStats(@Param('id') id: string) {
    try {
      const userId = parseInt(id);
      const stats = await this.userService.getUserStats(userId);
      
      if (!stats) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
