import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Like, Between } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Redis } from 'ioredis';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { User } from '../../auth/entities/user.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { AuditTargetType } from '../entities/audit-log.entity';

export interface AuditLogFilters {
  adminId?: string;
  action?: string;
  targetType?: AuditTargetType;
  targetId?: string;
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
export class AuditLogService {
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRedis() private redis: Redis,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
  ) {}

  async logAction(
    adminId: string,
    action: string,
    targetType: AuditTargetType,
    targetId: string,
    changesBefore?: any,
    changesAfter?: any,
    metadata?: any,
    request?: any,
  ): Promise<void> {
    try {
      const admin = await this.userRepository.findOne({ where: { id: adminId } });
      const adminUsername = admin?.username || adminId;

      const auditLog = this.auditLogRepository.create({
        adminId,
        adminUsername,
        action,
        targetType,
        targetId,
        targetIdentifier: this.generateTargetIdentifier(targetType, targetId, adminUsername),
        changesBefore,
        changesAfter,
        metadata,
        ipAddress: this.extractIpAddress(request),
        userAgent: this.extractUserAgent(request),
      });

      await this.auditLogRepository.save(auditLog);

      // Cache admin activity summary for performance
      await this.updateAdminActivityCache(adminId);

      this.logger.log('Audit log created', {
        adminId,
        action,
        targetType,
        targetId,
        ipAddress: auditLog.ipAddress,
      });
    } catch (error) {
      this.logger.error('Failed to create audit log', { error, adminId, action });
    }
  }

  async getAuditLogs(
    filters: AuditLogFilters,
    pagination: PaginationOptions = {},
  ): Promise<{ data: AuditLog[]; total: number; page: number; limit: number }> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = pagination;

    const queryBuilder = this.auditLogRepository.createQueryBuilder('audit');

    // Apply filters
    if (filters.adminId) {
      queryBuilder.andWhere('audit.adminId = :adminId', { adminId: filters.adminId });
    }

    if (filters.action) {
      queryBuilder.andWhere('audit.action = :action', { action: filters.action });
    }

    if (filters.targetType) {
      queryBuilder.andWhere('audit.targetType = :targetType', { targetType: filters.targetType });
    }

    if (filters.targetId) {
      queryBuilder.andWhere('audit.targetId = :targetId', { targetId: filters.targetId });
    }

    if (filters.dateFrom && filters.dateTo) {
      queryBuilder.andWhere('audit.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      });
    }

    // Apply pagination
    const totalCount = await queryBuilder.getCount();
    const data = await queryBuilder
      .orderBy(`audit.${sortBy}`, sortOrder)
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

  async getAuditLogById(id: string): Promise<AuditLog | null> {
    return this.auditLogRepository.findOne({
      where: { id },
      relations: ['admin'],
    });
  }

  async getAdminActivitySummary(
    adminId: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    recentActions: AuditLog[];
  }> {
    const cacheKey = `admin_activity:${adminId}:${dateFrom?.toISOString() || ''}:${dateTo?.toISOString() || ''}`;

    // Try to get from cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const queryBuilder = this.auditLogRepository.createQueryBuilder('audit');
    queryBuilder.where('audit.adminId = :adminId', { adminId });

    if (dateFrom && dateTo) {
      queryBuilder.andWhere('audit.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom,
        dateTo,
      });
    }

    const [logs, total] = await queryBuilder.getManyAndCount();

    const actionsByType = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {});

    const recentActions = logs.slice(0, 10); // Last 10 actions

    const summary = {
      totalActions: total,
      actionsByType,
      recentActions,
    };

    // Cache the result
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(summary));

    return summary;
  }

  async exportAuditLogs(
    filters: AuditLogFilters,
    format: 'json' | 'csv',
  ): Promise<string> {
    const logs = await this.getAllAuditLogsForExport(filters);

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    } else if (format === 'csv') {
      return this.convertToCsv(logs);
    }

    throw new Error('Unsupported export format');
  }

  private async getAllAuditLogsForExport(filters: AuditLogFilters): Promise<AuditLog[]> {
    const queryBuilder = this.auditLogRepository.createQueryBuilder('audit');

    // Apply filters (same logic as getAuditLogs)
    if (filters.adminId) {
      queryBuilder.andWhere('audit.adminId = :adminId', { adminId: filters.adminId });
    }

    if (filters.action) {
      queryBuilder.andWhere('audit.action = :action', { action: filters.action });
    }

    if (filters.targetType) {
      queryBuilder.andWhere('audit.targetType = :targetType', { targetType: filters.targetType });
    }

    if (filters.targetId) {
      queryBuilder.andWhere('audit.targetId = :targetId', { targetId: filters.targetId });
    }

    if (filters.dateFrom && filters.dateTo) {
      queryBuilder.andWhere('audit.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      });
    }

    return queryBuilder
      .orderBy('audit.createdAt', 'DESC')
      .getMany();
  }

  private async updateAdminActivityCache(adminId: string): Promise<void> {
    // Clear existing cache for this admin
    const pattern = `admin_activity:${adminId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  private generateTargetIdentifier(
    targetType: AuditTargetType,
    targetId: string,
    fallback: string,
  ): string {
    // This would typically fetch the actual identifier from the target entity
    // For now, return a generic identifier
    return `${targetType}:${targetId}`;
  }

  private extractIpAddress(request: any): string | null {
    if (!request) return null;

    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.ip
    );
  }

  private extractUserAgent(request: any): string | null {
    if (!request) return null;
    return request.headers['user-agent'] || null;
  }

  private convertToCsv(logs: AuditLog[]): string {
    const headers = [
      'ID',
      'Admin ID',
      'Admin Username',
      'Action',
      'Target Type',
      'Target ID',
      'Target Identifier',
      'IP Address',
      'Created At',
      'Metadata',
    ];

    const rows = logs.map(log => [
      log.id,
      log.adminId,
      log.adminUsername,
      log.action,
      log.targetType,
      log.targetId,
      log.targetIdentifier || '',
      log.ipAddress || '',
      log.createdAt.toISOString(),
      JSON.stringify(log.metadata || {}),
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  async deleteOldAuditLogs(cutoffDate: Date): Promise<{ deletedCount: number }> {
    try {
      const result = await this.auditLogRepository
        .createQueryBuilder()
        .delete()
        .where('createdAt < :cutoffDate', { cutoffDate })
        .execute();

      const deletedCount = result.affected || 0;

      this.logger.log('Audit logs deleted successfully', {
        deletedCount,
        cutoffDate: cutoffDate.toISOString(),
      });

      // Clear admin activity cache since we've deleted logs
      await this.clearAllAdminActivityCache();

      return { deletedCount };
    } catch (error) {
      this.logger.error('Failed to delete old audit logs', {
        error,
        cutoffDate: cutoffDate.toISOString(),
      });
      throw error;
    }
  }

  private async clearAllAdminActivityCache(): Promise<void> {
    // Clear all admin activity cache entries
    const pattern = 'admin_activity:*';
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}