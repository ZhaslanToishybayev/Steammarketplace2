import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReferralService } from '../services/referral.service';
import { TransactionService } from '../services/transaction.service';

@Injectable()
export class ReferralScheduler {
  private readonly logger = new Logger(ReferralScheduler.name);

  constructor(
    private referralService: ReferralService,
    private transactionService: TransactionService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async checkReferralRequirements(): Promise<void> {
    try {
      this.logger.log('Starting referral requirements check');

      // Get all pending referrals using service method
      const pendingReferrals = await this.referralService.getPendingReferrals();

      this.logger.log(`Found ${pendingReferrals.length} pending referrals to check`);

      // Check requirements for each referral
      for (const referral of pendingReferrals) {
        try {
          const requirementsMet = await this.referralService.checkReferralRequirements(referral.id);

          if (requirementsMet) {
            this.logger.log(`Requirements met for referral ${referral.id}, status updated`);
          }
        } catch (error) {
          this.logger.error(`Failed to check requirements for referral ${referral.id}:`, error.message);
        }
      }

      this.logger.log('Referral requirements check completed');
    } catch (error) {
      this.logger.error('Failed to check referral requirements:', error.message);
    }
  }

  @Cron('0 */6 * * *') // Every 6 hours
  async payPendingBonuses(): Promise<void> {
    try {
      this.logger.log('Starting pending bonus payment process');

      // Get all referrals with requirements met but bonus not paid using service method
      const eligibleReferrals = await this.referralService.getEligibleForBonusReferrals();

      this.logger.log(`Found ${eligibleReferrals.length} eligible referrals for bonus payment`);

      // Process bonus payments for each eligible referral
      for (const referral of eligibleReferrals) {
        try {
          await this.referralService.payReferralBonus(referral.id);
          this.logger.log(`Bonus paid for referral ${referral.id}`);
        } catch (error) {
          this.logger.error(`Failed to pay bonus for referral ${referral.id}:`, error.message);
        }
      }

      this.logger.log('Pending bonus payment process completed');
    } catch (error) {
      this.logger.error('Failed to pay pending bonuses:', error.message);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expireOldReferrals(): Promise<void> {
    try {
      this.logger.log('Starting referral expiration check');

      // Get all referrals with expiresAt < now and status != 'completed' using service method
      const now = new Date();
      const expirableReferrals = await this.referralService.getExpirableReferrals(now);

      this.logger.log(`Found ${expirableReferrals.length} referrals to expire`);

      // Update their status to 'expired' using enum
      for (const referral of expirableReferrals) {
        try {
          await this.referralService.updateReferralStatus(referral.id, 'expired');
          this.logger.log(`Referral ${referral.id} expired`);
        } catch (error) {
          this.logger.error(`Failed to expire referral ${referral.id}:`, error.message);
        }
      }

      this.logger.log('Referral expiration check completed');
    } catch (error) {
      this.logger.error('Failed to expire old referrals:', error.message);
    }
  }

  @Cron('0 0 * * 1') // Every Monday at midnight
  async generateReferralReports(): Promise<void> {
    try {
      this.logger.log('Starting weekly referral report generation');

      // This is a simplified implementation
      // In a real scenario, you would:
      // 1. Generate weekly referral statistics
      // 2. Create reports for admin review
      // 3. Send notifications for high-performing referrers

      this.logger.log('Weekly referral report generation completed');
    } catch (error) {
      this.logger.error('Failed to generate referral reports:', error.message);
    }
  }

  @Cron('0 1 * * 0') // Every Sunday at 1 AM
  async cleanupOldReferralData(): Promise<void> {
    try {
      this.logger.log('Starting referral data cleanup');

      // This is a simplified implementation
      // In a real scenario, you would:
      // 1. Clean up old referral logs and analytics
      // 2. Archive completed referrals beyond retention period
      // 3. Optimize referral database tables

      this.logger.log('Referral data cleanup completed');
    } catch (error) {
      this.logger.error('Failed to cleanup referral data:', error.message);
    }
  }
}