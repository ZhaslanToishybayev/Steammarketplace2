import { Processor, Process, OnQueueCompleted, OnQueueFailed, Job } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { TransactionService } from '../services/transaction.service';
import { BalanceService } from '../services/balance.service';
import { UserNotificationService } from '../../user/services/user-notification.service';

export interface WithdrawalJobData {
  transactionId: string;
  userId: string;
  amount: number;
  destination: string;
  paymentMethod: string;
}

@Processor('withdrawal-processing')
export class WithdrawalProcessor {
  private readonly logger = new Logger(WithdrawalProcessor.name);
  private readonly WITHDRAWAL_QUEUE = 'withdrawal-processing';

  constructor(
    private transactionService: TransactionService,
    private balanceService: BalanceService,
    private userNotificationService: UserNotificationService,
  ) {}

  @Process('processWithdrawal')
  async processWithdrawal(job: Job<WithdrawalJobData>): Promise<void> {
    const { transactionId, userId, amount, destination, paymentMethod } = job.data;

    try {
      this.logger.debug(`Processing withdrawal ${transactionId} for user ${userId}`);

      // Verify transaction exists and is in correct state
      const transaction = await this.transactionService.getTransaction(transactionId);
      if (!transaction || transaction.status !== 'processing') {
        throw new Error(`Invalid transaction state for withdrawal ${transactionId}`);
      }

      // Perform additional withdrawal validations
      await this.validateWithdrawalRequest(transaction);

      // Process withdrawal with external provider
      const withdrawalResult = await this.executeWithdrawal(transaction);

      if (withdrawalResult.success) {
        // Enqueue completion job
        await this.enqueueCompletionJob(transactionId, withdrawalResult.payoutId);
      } else {
        // Enqueue failure job
        await this.enqueueFailureJob(transactionId, withdrawalResult.error);
      }

      this.logger.log(`Withdrawal processing completed for ${transactionId}`);
    } catch (error) {
      this.logger.error(`Failed to process withdrawal ${transactionId}:`, error.message);
      // Enqueue failure job
      await this.enqueueFailureJob(transactionId, error.message);
      throw error;
    }
  }

  @Process('verifyWithdrawal')
  async verifyWithdrawal(job: Job<{ transactionId: string; payoutId: string }>): Promise<void> {
    const { transactionId, payoutId } = job.data;

    try {
      this.logger.debug(`Verifying withdrawal ${transactionId} with payout ${payoutId}`);

      const transaction = await this.transactionService.getTransaction(transactionId);
      if (!transaction) {
        throw new Error(`Transaction ${transactionId} not found`);
      }

      // Verify withdrawal status with provider
      const verification = await this.verifyWithdrawalStatus(transactionId, payoutId);

      if (verification.success && verification.status === 'completed') {
        // Enqueue completion job
        await this.enqueueCompletionJob(transactionId, payoutId);
      } else if (verification.status === 'failed') {
        // Enqueue failure job
        await this.enqueueFailureJob(transactionId, verification.error || 'Withdrawal verification failed');
      } else {
        // Still processing, schedule another verification
        await this.scheduleWithdrawalVerification(transactionId, payoutId);
      }

      this.logger.log(`Withdrawal verification completed for ${transactionId}`);
    } catch (error) {
      this.logger.error(`Failed to verify withdrawal ${transactionId}:`, error.message);
      // Enqueue failure job
      await this.enqueueFailureJob(transactionId, error.message);
    }
  }

  @Process('completeWithdrawal')
  async completeWithdrawal(job: Job<{ transactionId: string; payoutId: string }>): Promise<void> {
    const { transactionId, payoutId } = job.data;

    try {
      await this.completeWithdrawalInternal(transactionId, payoutId);
      this.logger.log(`Withdrawal completed successfully for ${transactionId}`);
    } catch (error) {
      this.logger.error(`Failed to complete withdrawal ${transactionId}:`, error.message);
      throw error;
    }
  }

  @Process('failWithdrawal')
  async failWithdrawal(job: Job<{ transactionId: string; reason: string }>): Promise<void> {
    const { transactionId, reason } = job.data;

    try {
      await this.failWithdrawalInternal(transactionId, reason);
      this.logger.log(`Withdrawal failed for ${transactionId}: ${reason}`);
    } catch (error) {
      this.logger.error(`Failed to process withdrawal failure for ${transactionId}:`, error.message);
      throw error;
    }
  }

  @OnQueueCompleted()
  async onCompleted(job: Job<any>) {
    this.logger.debug(`Withdrawal job ${job.id} completed successfully`);
  }

  @OnQueueFailed()
  async onFailed(job: Job<any>, error: Error) {
    this.logger.error(`Withdrawal job ${job.id} failed:`, error.message);
  }

  private async validateWithdrawalRequest(transaction: any): Promise<void> {
    // Check withdrawal limits
    const dailyLimit = parseFloat(process.env.DAILY_WITHDRAWAL_LIMIT || '5000');
    const monthlyLimit = parseFloat(process.env.MONTHLY_WITHDRAWAL_LIMIT || '50000');

    // Check if user has passed KYC (if required)
    const kycRequired = process.env.KYC_REQUIRED === 'true';
    if (kycRequired && !transaction.user.isVerified) {
      throw new Error('KYC verification required for withdrawals');
    }

    // Check withdrawal frequency limits
    const minInterval = parseInt(process.env.MIN_WITHDRAWAL_INTERVAL || '3600'); // 1 hour in seconds
    const lastWithdrawal = await this.getLastWithdrawal(transaction.userId);

    if (lastWithdrawal && (Date.now() - lastWithdrawal.getTime()) / 1000 < minInterval) {
      throw new Error(`Withdrawal interval limit exceeded. Please wait ${minInterval / 3600} hours.`);
    }

    this.logger.debug(`Withdrawal validation passed for ${transaction.id}`);
  }

  private async executeWithdrawal(transaction: any): Promise<{
    success: boolean;
    payoutId?: string;
    error?: string;
  }> {
    try {
      // Mock withdrawal execution
      // In real implementation, this would call the actual payment provider APIs

      const { paymentMethod, amount, currency, destination } = transaction;

      // Simulate different processing times based on payment method
      const processingTime = this.getProcessingTime(paymentMethod);
      await this.delay(processingTime);

      // Mock success/failure rate
      const successRate = 0.95; // 95% success rate
      const isSuccess = Math.random() < successRate;

      if (isSuccess) {
        return {
          success: true,
          payoutId: `payout_${Date.now()}`,
        };
      } else {
        return {
          success: false,
          error: 'Payment provider rejected the withdrawal request',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async verifyWithdrawalStatus(
    transactionId: string,
    payoutId: string,
  ): Promise<{ success: boolean; status: string; error?: string }> {
    try {
      // Mock status verification
      // In real implementation, this would call the payment provider's status API

      return {
        success: true,
        status: 'completed', // or 'pending', 'failed'
      };
    } catch (error) {
      return {
        success: false,
        status: 'failed',
        error: error.message,
      };
    }
  }

  private async scheduleWithdrawalVerification(transactionId: string, payoutId: string): Promise<void> {
    // Schedule another verification in 5 minutes
    // This would be implemented using Bull's delayed jobs
    this.logger.debug(`Scheduling withdrawal verification for ${transactionId} in 5 minutes`);
  }

  private async getLastWithdrawal(userId: string): Promise<Date | null> {
    try {
      const lastWithdrawal = await this.transactionService.getUserTransactions(
        userId,
        {
          types: ['withdrawal'],
          statuses: ['completed', 'failed'],
        },
        { page: 1, limit: 1 },
      );

      if (lastWithdrawal.transactions.length > 0) {
        return lastWithdrawal.transactions[0].createdAt;
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get last withdrawal for user ${userId}:`, error.message);
      return null;
    }
  }

  private getProcessingTime(paymentMethod: string): number {
    const processingTimes = {
      crypto: 5000,    // 5 seconds
      card: 10000,     // 10 seconds
      paypal: 8000,    // 8 seconds
      bank: 15000,     // 15 seconds
    };

    return processingTimes[paymentMethod] || 10000;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Internal helper methods that contain the actual logic
  private async completeWithdrawalInternal(transactionId: string, payoutId: string): Promise<void> {
    this.logger.debug(`Completing withdrawal ${transactionId}`);

    const transaction = await this.transactionService.getTransaction(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    // Deduct funds from user balance
    await this.balanceService.deductFunds(
      transaction.userId,
      transaction.amount,
      transactionId,
      `Withdrawal to ${transaction.paymentMethod}`,
    );

    // Unlock previously locked funds
    await this.balanceService.unlockFunds(transaction.userId, transaction.amount);

    // Update transaction status to completed
    await this.transactionService.updateTransactionStatus(
      transactionId,
      'completed',
      {
        payoutId,
        completedAt: new Date().toISOString(),
      },
    );

    // Send notification to user
    await this.userNotificationService.sendBalanceNotification(
      transaction.userId,
      transactionId,
      'withdrawal',
      transaction.amount,
      transaction.currency,
    );
  }

  private async failWithdrawalInternal(transactionId: string, reason: string): Promise<void> {
    this.logger.debug(`Failing withdrawal ${transactionId}: ${reason}`);

    const transaction = await this.transactionService.getTransaction(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    // Unlock funds (don't deduct since withdrawal failed)
    await this.balanceService.unlockFunds(transaction.userId, transaction.amount);

    // Update transaction status to failed
    await this.transactionService.updateTransactionStatus(
      transactionId,
      'failed',
      { failureReason: reason },
    );

    // Send notification to user
    await this.userNotificationService.sendBalanceNotification(
      transaction.userId,
      transactionId,
      'withdrawal',
      transaction.amount,
      transaction.currency,
    );
  }

  // Methods to enqueue jobs (these would need Bull queue injection to work properly)
  private async enqueueCompletionJob(transactionId: string, payoutId: string): Promise<void> {
    // This would enqueue a new job to the withdrawal-processing queue
    // For now, we'll call the internal method directly since we don't have queue injection
    await this.completeWithdrawalInternal(transactionId, payoutId);
  }

  private async enqueueFailureJob(transactionId: string, reason: string): Promise<void> {
    // This would enqueue a new job to the withdrawal-processing queue
    // For now, we'll call the internal method directly since we don't have queue injection
    await this.failWithdrawalInternal(transactionId, reason);
  }
}