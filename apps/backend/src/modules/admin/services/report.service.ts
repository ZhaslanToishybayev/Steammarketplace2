import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { InjectRedis } from '@liaoliaots/nestjs-redis';

import { Report, ReportType, ReportStatus } from '../entities/report.entity';
import { User } from '../../auth/entities/user.entity';

export interface ReportFilters {
  type?: ReportType;
  status?: ReportStatus;
  dateFrom?: Date;
  dateTo?: Date;
  searchQuery?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface ReportData {
  type: string;
  date: string;
  period: {
    dateFrom: Date;
    dateTo: Date;
  };
  statistics: any;
  revenueReport: any;
  disputeStatistics: any;
  generatedAt: string;
}

@Injectable()
export class ReportService {
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly REPORT_EXPIRY_DAYS = 30; // Reports expire after 30 days

  constructor(
    @InjectRepository(Report)
    private reportRepository: Repository<Report>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRedis() private redis: Redis,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
  ) {}

  async createReport(
    type: ReportType,
    title: string,
    periodStart: Date,
    periodEnd: Date,
    data: ReportData,
    generatedBy?: string,
  ): Promise<Report> {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.REPORT_EXPIRY_DAYS);

      const report = this.reportRepository.create({
        type,
        title,
        description: this.generateReportDescription(type, periodStart, periodEnd),
        periodStart,
        periodEnd,
        data,
        status: ReportStatus.GENERATED,
        generatedAt: new Date(),
        expiresAt,
        generatedBy,
      });

      const savedReport = await this.reportRepository.save(report);

      this.logger.log('Report created successfully', {
        reportId: savedReport.id,
        type,
        title,
        generatedBy,
      });

      // Clear reports cache
      await this.clearReportsCache();

      return savedReport;
    } catch (error) {
      this.logger.error('Failed to create report', { error, type, title, generatedBy });
      throw error;
    }
  }

  async getReports(
    filters: ReportFilters,
    pagination: PaginationOptions = {},
  ): Promise<{ data: Report[]; total: number; page: number; limit: number }> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = pagination;

    const cacheKey = this.generateCacheKey('reports', filters, pagination);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const queryBuilder = this.reportRepository.createQueryBuilder('report');

    // Apply filters
    if (filters.type) {
      queryBuilder.andWhere('report.type = :type', { type: filters.type });
    }

    if (filters.status) {
      queryBuilder.andWhere('report.status = :status', { status: filters.status });
    }

    if (filters.dateFrom && filters.dateTo) {
      queryBuilder.andWhere('report.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      });
    }

    if (filters.searchQuery) {
      queryBuilder.andWhere(
        '(report.title ILIKE :searchQuery OR report.description ILIKE :searchQuery)',
        { searchQuery: `%${filters.searchQuery}%` },
      );
    }

    // Apply pagination
    const totalCount = await queryBuilder.getCount();
    const data = await queryBuilder
      .orderBy(`report.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const result = {
      data,
      total: totalCount,
      page,
      limit,
    };

    // Cache the result
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));

    return result;
  }

  async getReportById(id: string): Promise<Report | null> {
    const cacheKey = `report:${id}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const report = await this.reportRepository.findOne({
      where: { id },
      relations: ['generatedByUser'],
    });

    if (report) {
      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(report));
    }

    return report;
  }

  async updateReportStatus(id: string, status: ReportStatus, errorMessage?: string): Promise<void> {
    try {
      await this.reportRepository.update(id, {
        status,
        errorMessage,
        ...(status === ReportStatus.FAILED && { generatedAt: null }),
      });

      // Clear cache
      await this.clearReportsCache();
      await this.redis.del(`report:${id}`);

      this.logger.log('Report status updated', { id, status, errorMessage });
    } catch (error) {
      this.logger.error('Failed to update report status', { error, id, status });
      throw error;
    }
  }

  async incrementDownloadCount(id: string): Promise<void> {
    try {
      await this.reportRepository.increment({ id }, 'downloadCount', 1);
      await this.redis.del(`report:${id}`);
    } catch (error) {
      this.logger.error('Failed to increment download count', { error, id });
    }
  }

  async deleteExpiredReports(): Promise<{ deletedCount: number }> {
    try {
      const now = new Date();
      const result = await this.reportRepository
        .createQueryBuilder()
        .delete()
        .where('expiresAt < :now', { now })
        .execute();

      const deletedCount = result.affected || 0;

      if (deletedCount > 0) {
        this.logger.log('Expired reports deleted', { deletedCount });
        await this.clearReportsCache();
      }

      return { deletedCount };
    } catch (error) {
      this.logger.error('Failed to delete expired reports', { error });
      throw error;
    }
  }

  async exportReport(report: Report, format: 'json' | 'csv'): Promise<string> {
    if (format === 'json') {
      return JSON.stringify(report.data, null, 2);
    } else if (format === 'csv') {
      return this.convertToCsv(report.data);
    }

    throw new Error('Unsupported export format');
  }

  private generateReportDescription(type: ReportType, periodStart: Date, periodEnd: Date): string {
    const period = `${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`;

    const descriptions = {
      [ReportType.DAILY]: `Daily statistics report for ${period}`,
      [ReportType.WEEKLY]: `Weekly statistics report for ${period}`,
      [ReportType.MONTHLY]: `Monthly statistics report for ${period}`,
    };

    return descriptions[type];
  }

  private generateCacheKey(prefix: string, filters: any, pagination: any): string {
    const filterStr = JSON.stringify({ filters, pagination });
    const hash = require('crypto').createHash('md5').update(filterStr).digest('hex');
    return `${prefix}:${hash}`;
  }

  private async clearReportsCache(): Promise<void> {
    const pattern = 'reports:*';
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  private convertToCsv(data: any): string {
    // Basic CSV conversion for report data
    // This would need to be customized based on the actual report structure
    const headers = ['Metric', 'Value'];
    const rows = [];

    if (data.statistics) {
      Object.entries(data.statistics).forEach(([key, value]) => {
        rows.push([key, String(value)]);
      });
    }

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }
}