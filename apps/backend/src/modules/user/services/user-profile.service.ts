import { Injectable, Logger, Inject, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { User } from '../../auth/entities/user.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { UserSettings } from '../entities/user-settings.entity';
import { UserNotificationPreferences } from '../entities/user-notification-preferences.entity';
import { CreateProfileDto } from '../dto/create-profile.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UpdateSettingsDto } from '../dto/update-settings.dto';
import { UpdateNotificationPreferencesDto } from '../dto/update-notification-preferences.dto';

@Injectable()
export class UserProfileService {
  private readonly logger = new Logger(UserProfileService.name);
  private readonly PROFILE_CACHE_TTL = 300; // 5 minutes
  private readonly SETTINGS_CACHE_TTL = 600; // 10 minutes

  constructor(
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
    @InjectRepository(UserSettings)
    private userSettingsRepository: Repository<UserSettings>,
    @InjectRepository(UserNotificationPreferences)
    private userNotificationPreferencesRepository: Repository<UserNotificationPreferences>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(CACHE_MANAGER)
    private cache: Cache,
    private dataSource: DataSource,
    private configService: ConfigService,
  ) {}

  async getProfile(userId: string): Promise<UserProfile> {
    if (!userId || typeof userId !== 'string') {
      throw new BadRequestException('Invalid userId: must be a non-empty string');
    }

    const cacheKey = `user:profile:${userId}`;
    const cachedProfile = await this.cache.get<UserProfile>(cacheKey);

    if (cachedProfile) {
      this.logger.debug(`Cache hit for user profile: ${userId}`);
      return cachedProfile;
    }

    const profile = await this.userProfileRepository.findOne({
      where: { userId },
      relations: ['user'],
    });

    if (profile) {
      const profileTtl = this.configService.get<number>('USER_PROFILE_CACHE_TTL_SECONDS', 300);
      await this.cache.set(cacheKey, profile, profileTtl);
    }

    return profile;
  }

  async createProfile(userId: string, createDto: CreateProfileDto): Promise<UserProfile> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if user exists
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new BadRequestException(`User with id ${userId} not found`);
      }

      // Check if profile already exists
      const existingProfile = await this.userProfileRepository.findOne({
        where: { userId },
      });

      if (existingProfile) {
        throw new BadRequestException(`Profile for user ${userId} already exists`);
      }

      // Create profile
      const profile = this.userProfileRepository.create({
        userId,
        ...createDto,
      });

      const savedProfile = await queryRunner.manager.save(profile);

      // Create default settings
      const settings = this.userSettingsRepository.create({
        userId,
        preferredCurrency: createDto.preferredCurrency || 'USD',
      });

      await queryRunner.manager.save(settings);

      // Create default notification preferences
      const notificationPreferences = this.userNotificationPreferencesRepository.create({
        userId,
      });

      await queryRunner.manager.save(notificationPreferences);

      await queryRunner.commitTransaction();

      // Invalidate cache
      await this.cache.del(`user:profile:${userId}`);

      this.logger.log(`Profile created for user: ${userId}`);
      return savedProfile;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create profile for user ${userId}:`, error.message);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateProfile(userId: string, updateDto: UpdateProfileDto): Promise<UserProfile> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const profile = await this.userProfileRepository.findOne({
        where: { userId },
      });

      if (!profile) {
        throw new BadRequestException(`Profile for user ${userId} not found`);
      }

      Object.assign(profile, updateDto);
      const updatedProfile = await queryRunner.manager.save(profile);

      await queryRunner.commitTransaction();

      // Invalidate cache
      await this.cache.del(`user:profile:${userId}`);

      this.logger.log(`Profile updated for user: ${userId}`);
      return updatedProfile;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to update profile for user ${userId}:`, error.message);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getSettings(userId: string): Promise<UserSettings> {
    const cacheKey = `user:settings:${userId}`;
    const cachedSettings = await this.cache.get<UserSettings>(cacheKey);

    if (cachedSettings) {
      this.logger.debug(`Cache hit for user settings: ${userId}`);
      return cachedSettings;
    }

    const settings = await this.userSettingsRepository.findOne({
      where: { userId },
    });

    if (settings) {
      const settingsTtl = this.configService.get<number>('USER_STATISTICS_CACHE_TTL_SECONDS', 600);
      // Use TTL in seconds (consistent with cache-manager)
      await this.cache.set(cacheKey, settings, settingsTtl);
    }

    return settings;
  }

  async updateSettings(userId: string, updateDto: UpdateSettingsDto): Promise<UserSettings> {
    let settings = await this.userSettingsRepository.findOne({
      where: { userId },
    });

    if (!settings) {
      // Create new settings with sensible defaults
      settings = this.userSettingsRepository.create({
        userId,
        emailNotifications: true,
        pushNotifications: true,
        tradeNotifications: true,
        priceAlertNotifications: true,
        marketingEmails: false,
        twoFactorEnabled: false,
        autoAcceptTrades: false,
        preferredCurrency: 'USD',
        theme: 'auto',
      });
    }

    Object.assign(settings, updateDto);
    const updatedSettings = await this.userSettingsRepository.save(settings);

    // Invalidate cache
    await this.cache.del(`user:settings:${userId}`);
    this.logger.log(`Settings updated for user: ${userId}`);
    return updatedSettings;
  }

  async getNotificationPreferences(userId: string): Promise<UserNotificationPreferences> {
    const cacheKey = `user:notification-preferences:${userId}`;
    const cachedPreferences = await this.cache.get<UserNotificationPreferences>(cacheKey);

    if (cachedPreferences) {
      this.logger.debug(`Cache hit for user notification preferences: ${userId}`);
      return cachedPreferences;
    }

    const preferences = await this.userNotificationPreferencesRepository.findOne({
      where: { userId },
    });

    if (preferences) {
      const settingsTtl = this.configService.get<number>('USER_STATISTICS_CACHE_TTL_SECONDS', 600);
      // Use TTL in seconds (consistent with cache-manager)
      await this.cache.set(cacheKey, preferences, settingsTtl);
    }

    return preferences;
  }

  async updateNotificationPreferences(
    userId: string,
    updateDto: UpdateNotificationPreferencesDto,
  ): Promise<UserNotificationPreferences> {
    let preferences = await this.userNotificationPreferencesRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      // Create new notification preferences with sensible defaults
      preferences = this.userNotificationPreferencesRepository.create({
        userId,
        notifyOnTradeAccepted: true,
        notifyOnTradeDeclined: true,
        notifyOnTradeCompleted: true,
        notifyOnDeposit: true,
        notifyOnWithdrawal: true,
        notifyOnReferralBonus: true,
        notifyOnPriceChange: false,
        priceChangeThreshold: 10.0,
      });
    }

    Object.assign(preferences, updateDto);
    const updatedPreferences = await this.userNotificationPreferencesRepository.save(preferences);

    // Invalidate cache
    await this.cache.del(`user:notification-preferences:${userId}`);

    this.logger.log(`Notification preferences updated for user: ${userId}`);
    return updatedPreferences;
  }

  async deleteProfile(userId: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Soft delete user (mark as inactive)
      const result = await queryRunner.manager.update(
        User,
        { id: userId },
        { isActive: false },
      );

      if (result.affected === 0) {
        throw new BadRequestException(`User with id ${userId} not found`);
      }

      await queryRunner.commitTransaction();

      // Invalidate all user-related cache
      await this.cache.del(`user:profile:${userId}`);
      await this.cache.del(`user:settings:${userId}`);
      await this.cache.del(`user:notification-preferences:${userId}`);

      this.logger.log(`Profile soft deleted for user: ${userId}`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to delete profile for user ${userId}:`, error.message);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async ensureUserProfileExists(userId: string): Promise<void> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      await this.createProfile(userId, {});
    }
  }
}