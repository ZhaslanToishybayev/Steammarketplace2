import { Injectable, Inject, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Between, LessThan } from 'typeorm';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Redis } from 'ioredis';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { ConfigService } from '@nestjs/config';

import { User } from '../../auth/entities/user.entity';
import { AuditLogService } from './audit-log.service';
import { AuditTargetType } from '../entities/audit-log.entity';
import { UserRole } from '../../auth/entities/user.entity';
import { UserAlreadyBannedException, UserNotBannedException, UserAlreadySuspendedException, UserAlreadyActiveException, UserAlreadyVerifiedException, UserRoleUnchangedException, AdminException } from '../exceptions/admin.exception';

export interface UserFilters {
  role?: UserRole;
  isActive?: boolean;
  isBanned?: boolean;
  searchQuery?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

@Injectable()
export class AdminUserService {
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private auditLogService: AuditLogService,
    @InjectQueue('admin-operations') private adminQueue: Queue,
    @InjectRedis() private redis: Redis,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
  ) {}

  async getAllUsers(
    filters: UserFilters,
    pagination: PaginationOptions = {},
  ): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = pagination;

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    // Apply filters
    if (filters.role) {
      queryBuilder.andWhere('user.role = :role', { role: filters.role });
    }

    if (filters.isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive: filters.isActive });
    }

    if (filters.isBanned !== undefined) {
      queryBuilder.andWhere('user.isBanned = :isBanned', { isBanned: filters.isBanned });
    }

    if (filters.searchQuery) {
      queryBuilder.andWhere(
        '(user.username ILIKE :q OR user.email ILIKE :q OR user.steamId ILIKE :q)',
        { q: `%${filters.searchQuery}%` },
      );
    }

    if (filters.dateFrom && filters.dateTo) {
      queryBuilder.andWhere('user.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      });
    }

    // Exclude sensitive fields
    queryBuilder.select([
      'user.id',
      'user.username',
      'user.email',
      'user.steamId',
      'user.role',
      'user.isActive',
      'user.isBanned',
      'user.isVerified',
      'user.banReason',
      'user.banExpiresAt',
      'user.createdAt',
      'user.updatedAt',
    ]);

    // Apply pagination
    const totalCount = await queryBuilder.getCount();
    const data = await queryBuilder
      .orderBy(`user.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data,
      total: totalCount,
      page,
      limit,
    };
  }

  /**
   * Retrieves a user by UUID for admin operations.
   * @param userId - User's UUID (string)
   * @returns User entity with selected fields
   * @throws AdminException if user not found
   */
  async getUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: [
        'id',
        'username',
        'email',
        'steamId',
        'role',
        'isActive',
        'isBanned',
        'isVerified',
        'banReason',
        'banExpiresAt',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!user) {
      throw new AdminException('User not found', HttpStatus.NOT_FOUND);
    }

    return user;
  }

  async banUser(
    adminId: string,
    userId: string,
    reason: string,
    duration?: number,
  ): Promise<User> {
    const user = await this.getUserById(userId);

    if (user.isBanned) {
      throw new UserAlreadyBannedException(userId);
    }

    const updateData: Partial<User> = {
      isBanned: true,
      banReason: reason,
    };

    if (duration) {
      const banExpiresAt = new Date();
      banExpiresAt.setHours(banExpiresAt.getHours() + duration);
      updateData.banExpiresAt = banExpiresAt;

      // Schedule unban job
      await this.adminQueue.add(
        'unban-user',
        { userId },
        {
          delay: duration * 60 * 60 * 1000, // Convert hours to milliseconds
          removeOnComplete: true,
        },
      );
    }

    await this.userRepository.update(userId, updateData);

    // Invalidate cache
    await this.invalidateUserCache(userId);

    // Log audit
    await this.auditLogService.logAction(
      adminId,
      'user.ban',
      AuditTargetType.USER,
      userId,
      { isBanned: false },
      { isBanned: true, banReason: reason },
      { reason, duration },
    );

    this.logger.log('User banned', { adminId, userId, reason, duration });

    return this.getUserById(userId);
  }

  async unbanUser(adminId: string, userId: string): Promise<User> {
    const user = await this.getUserById(userId);

    if (!user.isBanned) {
      throw new UserNotBannedException(userId);
    }

    const updateData: Partial<User> = {
      isBanned: false,
      banReason: null,
      banExpiresAt: null,
    };

    await this.userRepository.update(userId, updateData);

    // Invalidate cache
    await this.invalidateUserCache(userId);

    // Log audit
    await this.auditLogService.logAction(
      adminId,
      'user.unban',
      AuditTargetType.USER,
      userId,
      { isBanned: true, banReason: user.banReason },
      { isBanned: false, banReason: null },
      {},
    );

    this.logger.log('User unbanned', { adminId, userId });

    return this.getUserById(userId);
  }

  async suspendUser(adminId: string, userId: string, reason: string): Promise<User> {
    const user = await this.getUserById(userId);

    if (!user.isActive) {
      throw new UserAlreadySuspendedException(userId);
    }

    await this.userRepository.update(userId, { isActive: false });

    // Invalidate cache
    await this.invalidateUserCache(userId);

    // Log audit
    await this.auditLogService.logAction(
      adminId,
      'user.suspend',
      AuditTargetType.USER,
      userId,
      { isActive: true },
      { isActive: false },
      { reason },
    );

    this.logger.log('User suspended', { adminId, userId, reason });

    return this.getUserById(userId);
  }

  async activateUser(adminId: string, userId: string): Promise<User> {
    const user = await this.getUserById(userId);

    if (user.isActive) {
      throw new UserAlreadyActiveException(userId);
    }

    await this.userRepository.update(userId, { isActive: true });

    // Invalidate cache
    await this.invalidateUserCache(userId);

    // Log audit
    await this.auditLogService.logAction(
      adminId,
      'user.activate',
      AuditTargetType.USER,
      userId,
      { isActive: false },
      { isActive: true },
      {},
    );

    this.logger.log('User activated', { adminId, userId });

    return this.getUserById(userId);
  }

  async updateUserRole(
    adminId: string,
    userId: string,
    newRole: UserRole,
  ): Promise<User> {
    const user = await this.getUserById(userId);

    if (user.role === newRole) {
      throw new UserRoleUnchangedException(userId);
    }

    await this.userRepository.update(userId, { role: newRole });

    // Invalidate cache
    await this.invalidateUserCache(userId);

    // Log audit
    await this.auditLogService.logAction(
      adminId,
      'user.update_role',
      AuditTargetType.USER,
      userId,
      { role: user.role },
      { role: newRole },
      {},
    );

    this.logger.log('User role updated', { adminId, userId, newRole });

    return this.getUserById(userId);
  }

  async verifyUser(adminId: string, userId: string): Promise<User> {
    const user = await this.getUserById(userId);

    if (user.isVerified) {
      throw new UserAlreadyVerifiedException(userId);
    }

    await this.userRepository.update(userId, { isVerified: true });

    // Invalidate cache
    await this.invalidateUserCache(userId);

    // Log audit
    await this.auditLogService.logAction(
      adminId,
      'user.verify',
      AuditTargetType.USER,
      userId,
      { isVerified: false },
      { isVerified: true },
      {},
    );

    this.logger.log('User verified', { adminId, userId });

    return this.getUserById(userId);
  }

  async getUserActivityReport(userId: string): Promise<any> {
    // This would typically aggregate data from multiple services
    // For now, return basic user info with placeholder for extended stats
    const user = await this.getUserById(userId);

    // Cache key for user activity report
    const cacheKey = `user_activity_report:${userId}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Placeholder implementation - would integrate with actual services
    const report = {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isBanned: user.isBanned,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
      statistics: {
        // These would come from UserStatisticsService
        totalTrades: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        accountBalance: 0,
        lastLoginAt: null,
      },
      recentActivity: {
        // Recent trades, transactions, etc.
        lastTrades: [],
        lastTransactions: [],
      },
    };

    // Cache the report for 10 minutes
    await this.redis.setex(cacheKey, 600, JSON.stringify(report));

    return report;
  }

  private async invalidateUserCache(userId: string): Promise<void> {
    const patterns = [
      `user_activity_report:${userId}`,
      `user:${userId}`,
    ];

    for (const pattern of patterns) {
      await this.redis.del(pattern);
    }
  }

  async getUsersWithExpiredBans(): Promise<User[]> {
    try {
      const now = new Date();

      const expiredUsers = await this.userRepository.find({
        where: {
          isBanned: true,
          banExpiresAt: LessThan(now),
        },
        relations: ['admin'],
      });

      this.logger.log('Found users with expired bans', {
        count: expiredUsers.length,
        userIds: expiredUsers.map(user => user.id),
      });

      return expiredUsers;
    } catch (error) {
      this.logger.error('Failed to get users with expired bans', { error });
      throw error;
    }
  }
}