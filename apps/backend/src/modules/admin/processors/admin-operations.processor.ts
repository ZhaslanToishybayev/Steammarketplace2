import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed, Inject } from '@nestjs/bull';
import { Job } from 'bull';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

import { AdminUserService } from '../services/admin-user.service';
import { AdminDashboardService } from '../services/admin-dashboard.service';
import { TradeDisputeService } from '../services/trade-dispute.service';
import { AuditLogService } from '../services/audit-log.service';
import { ReportService } from '../services/report.service';
import { SystemConfigService } from '../services/system-config.service';

export interface UnbanUserJob {
  userId: string;
}

export interface CleanupOldAuditLogsJob {
  retentionDays: number;
}

export interface GenerateReportJob {
  type: 'daily' | 'weekly' | 'monthly';
  date: Date;
}

@Processor('admin-operations')
export class AdminOperationsProcessor {
  constructor(
    private adminUserService: AdminUserService,
    private adminDashboardService: AdminDashboardService,
    private tradeDisputeService: TradeDisputeService,
    private auditLogService: AuditLogService,
    private reportService: ReportService,
    private systemConfigService: SystemConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
  ) {}

  @Process('unban-user')
  async handleUnbanUser(job: Job<UnbanUserJob>): Promise<void> {
    const { userId } = job.data;

    try {
      this.logger.log('Processing scheduled unban job', { userId, jobId: job.id });

      // Get user to check if they should still be banned
      const user = await this.adminUserService.getUserById(userId);

      if (!user.isBanned) {
        this.logger.log('User is no longer banned, skipping unban job', { userId });
        return;
      }

      // Check if ban has expired
      if (user.banExpiresAt && user.banExpiresAt > new Date()) {
        this.logger.log('Ban has not expired yet, rescheduling unban job', {
          userId,
          banExpiresAt: user.banExpiresAt,
        });

        // Reschedule the job for the actual expiration time
        const delay = user.banExpiresAt.getTime() - Date.now();
        if (delay > 0) {
          await job.queue.add(
            'unban-user',
            { userId },
            {
              delay,
              removeOnComplete: true,
            },
          );
        }
        return;
      }

      // Unban the user
      await this.adminUserService.unbanUser('SYSTEM', userId);

      this.logger.log('User automatically unbanned', { userId });
    } catch (error) {
      this.logger.error('Failed to process unban user job', { error, userId, jobId: job.id });
      throw error;
    }
  }

  @Process('cleanup-old-audit-logs')
  async handleCleanupOldAuditLogs(job: Job<CleanupOldAuditLogsJob>): Promise<void> {
    const { retentionDays } = job.data;

    try {
      this.logger.log('Processing audit log cleanup job', { retentionDays, jobId: job.id });

      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // This would typically involve a database query to delete old audit logs
      const result = await this.auditLogService.deleteOldAuditLogs(cutoffDate);

      this.logger.log('Audit log cleanup completed', {
        retentionDays,
        cutoffDate: cutoffDate.toISOString(),
        deletedCount: result.deletedCount,
      });
    } catch (error) {
      this.logger.error('Failed to process audit log cleanup job', {
        error,
        retentionDays,
        jobId: job.id,
      });
      throw error;
    }
  }

  @Process('generate-report')
  async handleGenerateReport(job: Job<GenerateReportJob>): Promise<void> {
    const { type, date } = job.data;

    try {
      this.logger.log('Processing report generation job', { type, date, jobId: job.id });

      // Get retention days from config
      const retentionDays = await this.systemConfigService.getConfig(
        'AUDIT_LOG_RETENTION_DAYS',
        false,
      ).catch(() => 365); // Default to 365 days if config not found

      // Calculate date range based on report type
      let dateFrom: Date;
      let dateTo = date;

      switch (type) {
        case 'daily':
          dateFrom = new Date(date);
          dateFrom.setHours(0, 0, 0, 0);
          dateTo = new Date(date);
          dateTo.setHours(23, 59, 59, 999);
          break;
        case 'weekly':
          dateFrom = new Date(date);
          dateFrom.setDate(dateFrom.getDate() - 7);
          break;
        case 'monthly':
          dateFrom = new Date(date);
          dateFrom.setMonth(dateFrom.getMonth() - 1);
          break;
        default:
          throw new Error(`Unknown report type: ${type}`);
      }

      // Generate platform statistics for the period
      const statistics = await this.adminDashboardService.getPlatformStatistics(
        dateFrom,
        dateTo,
      );

      // Generate revenue report
      const revenueReport = await this.adminDashboardService.getRevenueReport(
        dateFrom,
        dateTo,
      );

      // Generate dispute statistics
      const disputeStatistics = await this.tradeDisputeService.getDisputeStatistics();

      const report = {
        type,
        date,
        period: { dateFrom, dateTo },
        statistics,
        revenueReport,
        disputeStatistics,
        generatedAt: new Date().toISOString(),
      };

      // Save report to database
      await this.reportService.createReport(
        type as any, // Convert string to ReportType enum
        this.generateReportTitle(type, date),
        dateFrom,
        dateTo,
        report,
        'SYSTEM',
      );

      this.logger.log('Report generated and saved successfully', {
        type,
        date,
        reportSize: JSON.stringify(report).length,
      });

    } catch (error) {
      this.logger.error('Failed to process report generation job', {
        error,
        type,
        date,
        jobId: job.id,
      });
      throw error;
    }
  }

  private generateReportTitle(type: string, date: string): string {
    const dateObj = new Date(date);
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const titles = {
      daily: `Daily Report - ${formattedDate}`,
      weekly: `Weekly Report - ${formattedDate}`,
      monthly: `Monthly Report - ${dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`,
    };

    return titles[type as keyof typeof titles] || `${type.charAt(0).toUpperCase() + type.slice(1)} Report - ${formattedDate}`;
  }

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.debug('Admin operation job started', {
      jobId: job.id,
      name: job.name,
      data: job.data,
    });
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log('Admin operation job completed', {
      jobId: job.id,
      name: job.name,
      result,
    });
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error('Admin operation job failed', {
      jobId: job.id,
      name: job.name,
      error: error.message,
      stack: error.stack,
    });
  }
}