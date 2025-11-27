import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { UserNotificationPreferences } from '../entities/user-notification-preferences.entity';
import { ConfigService } from '@nestjs/config';

export interface NotificationPayload {
  title: string;
  message: string;
  data?: Record<string, any>;
}

export interface NotificationJobData {
  userId: string;
  type: string;
  payload: NotificationPayload;
}

@Injectable()
export class UserNotificationService {
  private readonly logger = new Logger(UserNotificationService.name);
  private readonly NOTIFICATION_QUEUE = 'user-notifications';

  constructor(
    @InjectRepository(UserNotificationPreferences)
    private userNotificationPreferencesRepository: Repository<UserNotificationPreferences>,
    @InjectQueue('user-notifications')
    private notificationQueue: Queue,
    private configService: ConfigService,
  ) {}

  async sendNotification(
    userId: string,
    type: string,
    payload: NotificationPayload,
  ): Promise<void> {
    try {
      // Check if user has notifications enabled for this type
      const preferences = await this.checkPreferences(userId, type);
      if (!preferences) {
        this.logger.debug(`Notifications disabled for user ${userId}, type: ${type}`);
        return;
      }

      // Add job to queue for async processing
      await this.notificationQueue.add('sendNotification', {
        userId,
        type,
        payload,
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      this.logger.debug(`Notification queued for user ${userId}, type: ${type}`);
    } catch (error) {
      this.logger.error(`Failed to queue notification for user ${userId}:`, error.message);
      throw error;
    }
  }

  async checkPreferences(userId: string, notificationType: string): Promise<boolean> {
    try {
      const preferences = await this.userNotificationPreferencesRepository.findOne({
        where: { userId },
      });

      if (!preferences) {
        // Default to enabled if no preferences found
        return true;
      }

      // Map notification types to preference fields
      const typeToFieldMap: Record<string, keyof UserNotificationPreferences> = {
        trade_accepted: 'notifyOnTradeAccepted',
        trade_declined: 'notifyOnTradeDeclined',
        trade_completed: 'notifyOnTradeCompleted',
        deposit: 'notifyOnDeposit',
        withdrawal: 'notifyOnWithdrawal',
        referral_bonus: 'notifyOnReferralBonus',
        price_change: 'notifyOnPriceChange',
      };

      const preferenceField = typeToFieldMap[notificationType];
      if (!preferenceField) {
        return true; // Default to enabled for unknown types
      }

      return preferences[preferenceField] as boolean;
    } catch (error) {
      this.logger.error(`Failed to check preferences for user ${userId}:`, error.message);
      return true; // Default to enabled on error
    }
  }

  async sendTradeNotification(
    userId: string,
    tradeId: string,
    event: 'accepted' | 'declined' | 'completed' | 'failed',
  ): Promise<void> {
    const notificationTypes = {
      accepted: 'trade_accepted',
      declined: 'trade_declined',
      completed: 'trade_completed',
      failed: 'trade_failed',
    };

    const notificationType = notificationTypes[event];
    if (!notificationType) {
      return;
    }

    const payload: NotificationPayload = {
      title: this.getTradeNotificationTitle(event),
      message: this.getTradeNotificationMessage(event, tradeId),
      data: {
        tradeId,
        event,
        redirectUrl: `/trades/${tradeId}`,
      },
    };

    await this.sendNotification(userId, notificationType, payload);
  }

  async sendBalanceNotification(
    userId: string,
    transactionId: string,
    type: 'deposit' | 'withdrawal' | 'trade_credit' | 'trade_debit',
    amount: number,
    currency: string,
  ): Promise<void> {
    const notificationTypes = {
      deposit: 'deposit',
      withdrawal: 'withdrawal',
      trade_credit: 'trade_completed',
      trade_debit: 'trade_completed',
    };

    const notificationType = notificationTypes[type];
    if (!notificationType) {
      return;
    }

    const payload: NotificationPayload = {
      title: this.getBalanceNotificationTitle(type),
      message: this.getBalanceNotificationMessage(type, amount, currency),
      data: {
        transactionId,
        amount,
        currency,
        type,
        redirectUrl: '/wallet',
      },
    };

    await this.sendNotification(userId, notificationType, payload);
  }

  async sendReferralNotification(
    userId: string,
    referralId: string,
    type: 'code_applied' | 'bonus_earned' | 'friend_registered',
    bonusAmount?: number,
    currency?: string,
  ): Promise<void> {
    const notificationTypes = {
      code_applied: 'referral_bonus',
      bonus_earned: 'referral_bonus',
      friend_registered: 'referral_bonus',
    };

    const notificationType = notificationTypes[type];
    if (!notificationType) {
      return;
    }

    const payload: NotificationPayload = {
      title: this.getReferralNotificationTitle(type),
      message: this.getReferralNotificationMessage(type, bonusAmount, currency),
      data: {
        referralId,
        type,
        bonusAmount,
        currency,
        redirectUrl: '/referrals',
      },
    };

    await this.sendNotification(userId, notificationType, payload);
  }

  private getTradeNotificationTitle(event: string): string {
    const titles = {
      accepted: 'Trade Accepted!',
      declined: 'Trade Declined',
      completed: 'Trade Completed!',
      failed: 'Trade Failed',
    };
    return titles[event] || 'Trade Update';
  }

  private getTradeNotificationMessage(event: string, tradeId: string): string {
    const messages = {
      accepted: `Your trade #${tradeId} has been accepted by the other party.`,
      declined: `Your trade #${tradeId} has been declined.`,
      completed: `Your trade #${tradeId} has been completed successfully!`,
      failed: `Unfortunately, your trade #${tradeId} has failed.`,
    };
    return messages[event] || `Your trade #${tradeId} status has changed.`;
  }

  private getBalanceNotificationTitle(type: string): string {
    const titles = {
      deposit: 'Deposit Received!',
      withdrawal: 'Withdrawal Processed',
      trade_credit: 'Payment Received!',
      trade_debit: 'Payment Sent',
    };
    return titles[type] || 'Balance Update';
  }

  private getBalanceNotificationMessage(
    type: string,
    amount: number,
    currency: string,
  ): string {
    const messages = {
      deposit: `Your deposit of ${amount} ${currency} has been credited to your account.`,
      withdrawal: `Your withdrawal of ${amount} ${currency} has been processed.`,
      trade_credit: `You received ${amount} ${currency} from a trade.`,
      trade_debit: `You paid ${amount} ${currency} for a trade.`,
    };
    return messages[type] || `${amount} ${currency} has been ${type}.`;
  }

  private getReferralNotificationTitle(type: string): string {
    const titles = {
      code_applied: 'Referral Code Applied!',
      bonus_earned: 'Referral Bonus Earned!',
      friend_registered: 'Friend Joined!',
    };
    return titles[type] || 'Referral Update';
  }

  private getReferralNotificationMessage(
    type: string,
    bonusAmount?: number,
    currency?: string,
  ): string {
    const messages = {
      code_applied: 'You successfully applied a referral code!',
      bonus_earned: `You earned a referral bonus of ${bonusAmount} ${currency}!`,
      friend_registered: 'Your friend has successfully registered using your code!',
    };
    return messages[type] || 'Referral activity detected.';
  }
}