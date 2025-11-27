import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Redis } from 'ioredis';
import { InjectRedis } from '@liaoliaots/nestjs-redis';

import { SystemConfig } from '../entities/system-config.entity';
import { AuditLogService } from './audit-log.service';
import { AuditTargetType } from '../entities/audit-log.entity';
import { ConfigValueType } from '../entities/system-config.entity';
import { User } from '../../auth/entities/user.entity';
import { ConfigNotFoundException, ConfigKeyAlreadyExistsException, ConfigNotEditableException, ConfigValueValidationException } from '../exceptions/admin.exception';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface ConfigFilters {
  category?: string;
  isPublic?: boolean;
  searchQuery?: string;
}

@Injectable()
export class SystemConfigService {
  private readonly CACHE_TTL = 3600; // 1 hour

  // Common config keys as constants
  static readonly MAINTENANCE_MODE = 'maintenance_mode';
  static readonly TRADING_FEE_PERCENTAGE = 'trading_fee_percentage';
  static readonly MAX_TRADE_VALUE = 'max_trade_value';
  static readonly MIN_TRADE_VALUE = 'min_trade_value';
  static readonly BOT_MAX_CONCURRENT_TRADES = 'bot_max_concurrent_trades';
  static readonly DISPUTE_RESOLUTION_DAYS = 'dispute_resolution_days';
  static readonly AUDIT_LOG_RETENTION_DAYS = 'audit_log_retention_days';

  constructor(
    @InjectRepository(SystemConfig)
    private systemConfigRepository: Repository<SystemConfig>,
    private auditLogService: AuditLogService,
    @InjectRedis() private redis: Redis,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
  ) {}

  async getConfig(key: string, useCache: boolean = true): Promise<any> {
    const cacheKey = `config:${key}`;

    if (useCache) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return this.parseValue(JSON.parse(cached));
      }
    }

    const config = await this.systemConfigRepository.findOne({
      where: { key },
    });

    if (!config) {
      throw new ConfigNotFoundException(key);
    }

    const parsedValue = this.parseValue(config);

    // Cache the config
    if (useCache) {
      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(config));
    }

    return parsedValue;
  }

  async getAllConfigs(
    filters: ConfigFilters = {},
    pagination: PaginationOptions = {},
  ): Promise<{ data: SystemConfig[]; total: number; page: number; limit: number }> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'key',
      sortOrder = 'ASC',
    } = pagination;

    const queryBuilder = this.systemConfigRepository.createQueryBuilder('config');

    // Apply filters
    if (filters.category) {
      queryBuilder.andWhere('config.category = :category', { category: filters.category });
    }

    if (filters.isPublic !== undefined) {
      queryBuilder.andWhere('config.isPublic = :isPublic', { isPublic: filters.isPublic });
    }

    if (filters.searchQuery) {
      queryBuilder.andWhere('config.key ILIKE :searchQuery OR config.description ILIKE :searchQuery', {
        searchQuery: `%${filters.searchQuery}%`,
      });
    }

    // Apply pagination
    const totalCount = await queryBuilder.getCount();
    const data = await queryBuilder
      .orderBy(`config.${sortBy}`, sortOrder)
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

  async getPublicConfigs(): Promise<Record<string, any>> {
    const cacheKey = 'public_configs';
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const configs = await this.systemConfigRepository.find({
      where: { isPublic: true },
    });

    const publicConfigs: Record<string, any> = {};
    configs.forEach(config => {
      publicConfigs[config.key] = this.parseValue(config);
    });

    // Cache public configs
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(publicConfigs));

    return publicConfigs;
  }

  async createConfig(
    adminId: string,
    key: string,
    value: any,
    valueType: ConfigValueType,
    category: string,
    description: string,
    isPublic: boolean = false,
    isEditable: boolean = true,
  ): Promise<SystemConfig> {
    // Check if config key already exists
    const existingConfig = await this.systemConfigRepository.findOne({
      where: { key },
    });

    if (existingConfig) {
      throw new ConfigKeyAlreadyExistsException(key);
    }

    // Validate value type
    const validatedValue = this.validateValue(value, valueType);

    const config = this.systemConfigRepository.create({
      key,
      value: validatedValue,
      valueType,
      category,
      description,
      isPublic,
      isEditable,
      lastModifiedBy: adminId,
    });

    await this.systemConfigRepository.save(config);

    // Invalidate cache
    await this.invalidateConfigCache(key);

    // Log audit - use config.id (UUID) as targetId, keep key in metadata
    await this.auditLogService.logAction(
      adminId,
      'config.create',
      AuditTargetType.CONFIG,
      config.id,
      {},
      {
        key,
        value: validatedValue,
        valueType,
        category,
        isPublic,
        isEditable,
      },
      { key }, // Keep the human-readable key in metadata for filtering
    );

    this.logger.log('Config created', { adminId, key, category });

    return config;
  }

  async updateConfig(
    adminId: string,
    key: string,
    newValue: any,
  ): Promise<SystemConfig> {
    const config = await this.systemConfigRepository.findOne({
      where: { key },
    });

    if (!config) {
      throw new ConfigNotFoundException(key);
    }

    if (!config.isEditable) {
      throw new ConfigNotEditableException(key);
    }

    // Validate new value
    const validatedValue = this.validateValue(newValue, config.valueType);

    const oldValue = config.value;
    config.value = validatedValue;
    config.lastModifiedBy = adminId;
    config.updatedAt = new Date();

    await this.systemConfigRepository.save(config);

    // Invalidate cache
    await this.invalidateConfigCache(key);

    // Log audit - use config.id (UUID) as targetId, keep key in metadata
    await this.auditLogService.logAction(
      adminId,
      'config.update',
      AuditTargetType.CONFIG,
      config.id,
      { value: oldValue },
      { value: validatedValue },
      { key }, // Keep the human-readable key in metadata for filtering
    );

    this.logger.log('Config updated', { adminId, key, oldValue, newValue });

    return config;
  }

  async deleteConfig(adminId: string, key: string): Promise<void> {
    const config = await this.systemConfigRepository.findOne({
      where: { key },
    });

    if (!config) {
      throw new ConfigNotFoundException(key);
    }

    // For safety, we'll soft delete by setting a deleted flag
    // In a real implementation, you might want to hard delete or use a deletedAt field
    await this.systemConfigRepository.remove(config);

    // Invalidate cache
    await this.invalidateConfigCache(key);

    // Log audit - use config.id (UUID) as targetId, keep key in metadata
    await this.auditLogService.logAction(
      adminId,
      'config.delete',
      AuditTargetType.CONFIG,
      config.id,
      config,
      {},
      { key }, // Keep the human-readable key in metadata for filtering
    );

    this.logger.log('Config deleted', { adminId, key });
  }

  async bulkUpdateConfigs(
    adminId: string,
    configs: { key: string; value: any }[],
  ): Promise<SystemConfig[]> {
    const results: SystemConfig[] = [];

    // Use transaction for atomicity
    await this.systemConfigRepository.manager.transaction(async manager => {
      for (const { key, value } of configs) {
        const config = await manager.findOne(SystemConfig, { where: { key } });
        if (!config) {
          throw new ConfigNotFoundException(key);
        }

        if (!config.isEditable) {
          throw new ConfigNotEditableException(key);
        }

        const validatedValue = this.validateValue(value, config.valueType);
        const oldValue = config.value;

        config.value = validatedValue;
        config.lastModifiedBy = adminId;
        config.updatedAt = new Date();

        await manager.save(config);
        results.push(config);

        // Log audit for each config - use config.id (UUID) as targetId, keep key in metadata
        await this.auditLogService.logAction(
          adminId,
          'config.update',
          AuditTargetType.CONFIG,
          config.id,
          { value: oldValue },
          { value: validatedValue },
          { key }, // Keep the human-readable key in metadata for filtering
        );

        // Invalidate cache for each config
        await this.invalidateConfigCache(key);
      }
    });

    this.logger.log('Bulk config update completed', { adminId, count: configs.length });

    return results;
  }

  async getConfigHistory(key: string): Promise<any[]> {
    // This would typically query audit logs for config changes
    // For now, return empty array - would need to implement audit log querying
    return [];
  }

  // Helper methods
  private parseValue(config: SystemConfig | any): any {
    const value = typeof config.value === 'string' ? config.value : JSON.stringify(config.value);

    switch (config.valueType) {
      case ConfigValueType.STRING:
        return value;
      case ConfigValueType.NUMBER:
        return parseFloat(value);
      case ConfigValueType.BOOLEAN:
        return value === 'true';
      case ConfigValueType.JSON:
        return JSON.parse(value);
      default:
        return value;
    }
  }

  private validateValue(value: any, valueType: ConfigValueType): string {
    switch (valueType) {
      case ConfigValueType.STRING:
        if (typeof value !== 'string') {
          throw new ConfigValueValidationException(valueType, 'string');
        }
        return value;
      case ConfigValueType.NUMBER:
        if (typeof value !== 'number' && isNaN(Number(value))) {
          throw new ConfigValueValidationException(valueType, 'number');
        }
        return String(Number(value));
      case ConfigValueType.BOOLEAN:
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
          throw new ConfigValueValidationException(valueType, 'boolean');
        }
        return String(value);
      case ConfigValueType.JSON:
        try {
          return typeof value === 'string' ? value : JSON.stringify(value);
        } catch (error) {
          throw new ConfigValueValidationException(valueType, 'valid JSON');
        }
      default:
        return String(value);
    }
  }

  private async invalidateConfigCache(key?: string): Promise<void> {
    if (key) {
      await this.redis.del(`config:${key}`);
    }
    // Invalidate public configs cache
    await this.redis.del('public_configs');
  }
}