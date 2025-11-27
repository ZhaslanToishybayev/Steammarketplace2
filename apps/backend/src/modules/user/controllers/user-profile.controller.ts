import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { User } from '../../../auth/entities/user.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { UserSettings } from '../entities/user-settings.entity';
import { UserNotificationPreferences } from '../entities/user-notification-preferences.entity';
import { UserStatisticsDto } from '../dto/user-statistics.dto';
import { UserProfileService } from '../services/user-profile.service';
import { UserStatisticsService } from '../services/user-statistics.service';
import { UserNotificationService } from '../services/user-notification.service';
import {
  CreateProfileDto,
  UpdateProfileDto,
  UpdateSettingsDto,
  UpdateNotificationPreferencesDto,
} from '../dto';

@Controller('user')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('User Profile')
@ApiBearerAuth()
export class UserProfileController {
  constructor(
    private userProfileService: UserProfileService,
    private userStatisticsService: UserStatisticsService,
    private userNotificationService: UserNotificationService,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, type: UserProfile })
  async getMyProfile(@CurrentUser() user: User): Promise<UserProfile> {
    return this.userProfileService.getProfile(user.id);
  }

  @Get('profile/:userId')
  @ApiOperation({ summary: 'Get public profile by user ID' })
  @ApiParam({ name: 'userId', type: 'uuid', description: 'User ID' })
  @ApiResponse({ status: 200, type: UserProfile })
  async getProfileById(@Param('userId') userId: string): Promise<UserProfile> {
    const profile = await this.userProfileService.getProfile(userId);
    if (!profile || !profile.isProfilePublic) {
      throw new Error('Profile not found or not public');
    }
    return profile;
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({ status: 200, type: UserProfile })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateDto: UpdateProfileDto,
  ): Promise<UserProfile> {
    const existingProfile = await this.userProfileService.getProfile(user.id);
    if (!existingProfile) {
      return this.userProfileService.createProfile(user.id, updateDto);
    }
    return this.userProfileService.updateProfile(user.id, updateDto);
  }

  @Delete('profile')
  @ApiOperation({ summary: 'Delete user profile (soft delete)' })
  @ApiResponse({ status: 200, description: 'Profile deleted successfully' })
  async deleteProfile(@CurrentUser() user: User): Promise<void> {
    return this.userProfileService.deleteProfile(user.id);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get user settings' })
  @ApiResponse({ status: 200, type: UserSettings })
  async getSettings(@CurrentUser() user: User): Promise<UserSettings> {
    const settings = await this.userProfileService.getSettings(user.id);
    if (!settings) {
      // Create default settings if they don't exist
      await this.userProfileService.updateSettings(user.id, {});
      return this.userProfileService.getSettings(user.id);
    }
    return settings;
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update user settings' })
  @ApiBody({ type: UpdateSettingsDto })
  @ApiResponse({ status: 200, type: UserSettings })
  async updateSettings(
    @CurrentUser() user: User,
    @Body() updateDto: UpdateSettingsDto,
  ): Promise<UserSettings> {
    return this.userProfileService.updateSettings(user.id, updateDto);
  }

  @Get('notifications/preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  @ApiResponse({ status: 200, type: UserNotificationPreferences })
  async getNotificationPreferences(@CurrentUser() user: User): Promise<UserNotificationPreferences> {
    const preferences = await this.userProfileService.getNotificationPreferences(user.id);
    if (!preferences) {
      // Create default preferences if they don't exist
      await this.userProfileService.updateNotificationPreferences(user.id, {});
      return this.userProfileService.getNotificationPreferences(user.id);
    }
    return preferences;
  }

  @Put('notifications/preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiBody({ type: UpdateNotificationPreferencesDto })
  @ApiResponse({ status: 200, type: UserNotificationPreferences })
  async updateNotificationPreferences(
    @CurrentUser() user: User,
    @Body() updateDto: UpdateNotificationPreferencesDto,
  ): Promise<UserNotificationPreferences> {
    return this.userProfileService.updateNotificationPreferences(user.id, updateDto);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get current user statistics' })
  @ApiResponse({ status: 200, type: UserStatisticsDto })
  async getMyStatistics(@CurrentUser() user: User): Promise<UserStatisticsDto> {
    return this.userStatisticsService.getUserStatistics(user.id);
  }

  @Get('statistics/:userId')
  @ApiOperation({ summary: 'Get user statistics by user ID' })
  @ApiParam({ name: 'userId', type: 'uuid', description: 'User ID' })
  @ApiResponse({ status: 200, type: UserStatisticsDto })
  async getStatisticsById(@Param('userId') userId: string): Promise<UserStatisticsDto> {
    return this.userStatisticsService.getUserStatistics(userId);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get user leaderboard' })
  @ApiQuery({ name: 'limit', type: 'number', required: false, description: 'Number of users to return' })
  @ApiQuery({ name: 'sortBy', type: 'string', required: false, description: 'Sort by (reputation, totalTrades, successRate)' })
  @ApiResponse({ status: 200, type: [UserStatisticsDto] })
  async getLeaderboard(
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
  ): Promise<UserStatisticsDto[]> {
    return this.userStatisticsService.getLeaderboard(limit || 10, sortBy || 'reputation');
  }

  @Post('test-notification')
  @ApiOperation({ summary: 'Test notification system (for development)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['trade_accepted', 'trade_declined', 'trade_completed', 'deposit', 'withdrawal', 'referral_bonus'],
        },
        message: {
          type: 'string',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Notification sent successfully' })
  async testNotification(
    @CurrentUser() user: User,
    @Body() body: { type: string; message: string },
  ): Promise<void> {
    await this.userNotificationService.sendNotification(user.id, body.type, {
      title: 'Test Notification',
      message: body.message,
      data: {
        test: true,
      },
    });
  }
}