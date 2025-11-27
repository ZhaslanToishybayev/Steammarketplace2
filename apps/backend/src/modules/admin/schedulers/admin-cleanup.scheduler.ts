import { Injectable, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

import { SystemConfigService } from '../services/system-config.service';

@Injectable()
export class AdminCleanupScheduler {
  constructor(
    @InjectQueue('admin-operations') private adminQueue: Queue,
    private systemConfigService: SystemConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldAuditLogs(): Promise<void> {
    try {
      this.logger.log('Scheduling daily audit log cleanup');

      // Get retention days from config
      const retentionDays = await this.systemConfigService.getConfig(
        'AUDIT_LOG_RETENTION_DAYS',
        false,
      ).catch(() => 365); // Default to 365 days if config not found

      await this.adminQueue.add(
        'cleanup-old-audit-logs',
        { retentionDays },
        {
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      );

      this.logger.log('Audit log cleanup job scheduled', { retentionDays });
    } catch (error) {
      this.logger.error('Failed to schedule audit log cleanup', { error });
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async generateDailyReport(): Promise<void> {
    try {
      this.logger.log('Scheduling daily report generation');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await this.adminQueue.add(
        'generate-report',
        {
          type: 'daily',
          date: today,
        },
        {
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      );

      this.logger.log('Daily report generation job scheduled', { date: today });
    } catch (error) {
      this.logger.error('Failed to schedule daily report generation', { error });
    }
  }

  @Cron('0 0 * * 1') // Every Monday at midnight
  async generateWeeklyReport(): Promise<void> {
    try {
      this.logger.log('Scheduling weekly report generation');

      const monday = new Date();
      monday.setDate(monday.getDate() - monday.getDay()); // Go back to Monday
      monday.setHours(0, 0, 0, 0);

      await this.adminQueue.add(
        'generate-report',
        {
          type: 'weekly',
          date: monday,
        },
        {
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      );

      this.logger.log('Weekly report generation job scheduled', { date: monday });
    } catch (error) {
      this.logger.error('Failed to schedule weekly report generation', { error });
    }
  }

  @Cron('0 0 1 * *') // First day of every month at midnight
  async generateMonthlyReport(): Promise<void> {
    try {
      this.logger.log('Scheduling monthly report generation');

      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);

      await this.adminQueue.add(
        'generate-report',
        {
          type: 'monthly',
          date: firstDayOfMonth,
        },
        {
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      );

      this.logger.log('Monthly report generation job scheduled', { date: firstDayOfMonth });
    } catch (error) {
      this.logger.error('Failed to schedule monthly report generation', { error });
    }
  }

  @Cron('0 0 * * *') // Every hour at midnight
  async checkExpiredBans(): Promise<void> {
    try {
      this.logger.debug('Checking for expired bans');

      // This would typically involve querying users with banExpiresAt < now()
      // Check for users with expired bans
      const expiredUsers = await this.adminUserService.getUsersWithExpiredBans();

      if (expiredUsers.length === 0) {
        this.logger.log('No expired bans found');
        return;
      }

      this.logger.log('Found expired bans, scheduling unban jobs', {
        count: expiredUsers.length,
        userIds: expiredUsers.map(user => user.id),
      });

      // Schedule unban jobs for each expired user
      for (const user of expiredUsers) {
        await this.adminQueue.add(
          'unban-user',
          { userId: user.id },
          {
            removeOnComplete: true,
            priority: 10, // High priority for unban operations
          },
        );
      }

      this.logger.log('Ban expiration check completed', {
        processedCount: expiredUsers.length,
      });
    } catch (error) {
      this.logger.error('Failed to check expired bans', { error });
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async performDailyMaintenance(): Promise<void> {
    try {
      this.logger.log('Starting daily maintenance tasks');

      // Schedule all daily tasks
      await Promise.all([
        this.cleanupOldAuditLogs(),
        this.generateDailyReport(),
        this.checkExpiredBans(),
      ]);

      this.logger.log('Daily maintenance tasks completed');
    } catch (error) {
      this.logger.error('Daily maintenance tasks failed', { error });
    }
  }

  @Cron('0 0 1 1 *') // Every January 1st at midnight
  async performAnnualMaintenance(): Promise<void> {
    try {
      this.logger.log('Starting annual maintenance tasks');

      // This could include tasks like:
      // - Archive old data
      // - Update system statistics
      // - Clean up temporary files
      // - Generate annual reports

      this.logger.log('Annual maintenance tasks completed');
    } catch (error) {
      this.logger.error('Annual maintenance tasks failed', { error });
    }
  }
}