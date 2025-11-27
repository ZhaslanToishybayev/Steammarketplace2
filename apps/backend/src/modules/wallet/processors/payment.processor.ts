import { Processor, Process, OnQueueCompleted, OnQueueFailed, Job } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { TransactionService } from '../services/transaction.service';
import { BalanceService } from '../services/balance.service';
import { CryptoPaymentService } from '../services/crypto-payment.service';
import { FiatPaymentService } from '../services/fiat-payment.service';
import { TransactionType, TransactionStatus } from '../entities/transaction.entity';

export interface DepositJobData {
  transactionId: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  metadata?: Record<string, any>;
}

@Processor('payment-processing')
export class PaymentProcessor {
  private readonly logger = new Logger(PaymentProcessor.name);

  constructor(
    private transactionService: TransactionService,
    private balanceService: BalanceService,
    private cryptoPaymentService: CryptoPaymentService,
    private fiatPaymentService: FiatPaymentService,
  ) {}

  // Note: This processor handles deposits and generic payment verification only.
  // Withdrawal processing is handled by the separate WithdrawalProcessor to avoid duplication.

  @Process('processDeposit')
  async processDeposit(job: Job<DepositJobData>): Promise<void> {
    const { transactionId, userId, amount, currency, paymentMethod, metadata } = job.data;

    try {
      this.logger.debug(`Processing deposit for transaction ${transactionId}`);

      // Verify payment with provider
      const verification = await this.verifyDepositInternal(transactionId, metadata?.provider);

      if (!verification.success) {
        await this.transactionService.failTransaction(
          transactionId,
          verification.error || 'Payment verification failed',
        );
        return;
      }

      // Update transaction status to completed
      await this.transactionService.updateTransactionStatus(
        transactionId,
        TransactionStatus.COMPLETED,
      );

      // Add funds to user balance
      await this.balanceService.addFunds(
        userId,
        amount,
        transactionId,
        `Deposit via ${paymentMethod}`,
      );

      this.logger.log(`Deposit processed successfully for transaction ${transactionId}`);
    } catch (error) {
      this.logger.error(`Failed to process deposit ${transactionId}:`, error.message);
      await this.transactionService.failTransaction(transactionId, error.message);
      throw error;
    }
  }

  @Process('verifyDeposit')
  async handleVerifyDepositJob(job: Job<{ transactionId: string; provider?: string }>): Promise<void> {
    const { transactionId, provider } = job.data;

    try {
      this.logger.debug(`Verifying deposit for transaction ${transactionId}`);

      const transaction = await this.transactionService.getTransaction(transactionId);
      if (!transaction) {
        throw new Error(`Transaction ${transactionId} not found`);
      }

      // Call the internal verification method
      const verification = await this.verifyDepositInternal(transactionId, provider);

      if (!verification.success || verification.status !== 'completed') {
        throw new Error(`Payment verification failed: ${verification.status || 'unknown'}`);
      }

      await this.transactionService.updateTransactionStatus(
        transactionId,
        TransactionStatus.COMPLETED,
        { verifiedAt: new Date().toISOString() },
      );

      this.logger.log(`Deposit verification completed for transaction ${transactionId}`);
    } catch (error) {
      this.logger.error(`Failed to verify deposit ${transactionId}:`, error.message);
      await this.transactionService.failTransaction(transactionId, error.message);
      throw error;
    }
  }

  @Process('retryFailedPayment')
  async retryFailedPayment(job: Job<{ transactionId: string; attempt: number }>): Promise<void> {
    const { transactionId, attempt } = job.data;

    try {
      this.logger.log(`Retrying failed payment ${transactionId}, attempt ${attempt}`);

      const transaction = await this.transactionService.getTransaction(transactionId);
      if (!transaction) {
        throw new Error(`Transaction ${transactionId} not found`);
      }

      if (transaction.status !== TransactionStatus.FAILED) {
        this.logger.debug(`Transaction ${transactionId} is not in failed state, skipping retry`);
        return;
      }

      // Reset transaction status to pending
      await this.transactionService.updateTransactionStatus(
        transactionId,
        TransactionStatus.PENDING,
      );

      // Re-process based on transaction type
      if (transaction.type === TransactionType.DEPOSIT) {
        await this.transactionService.processDeposit(transactionId);
      } else if (transaction.type === TransactionType.WITHDRAWAL) {
        await this.transactionService.processWithdrawal(transactionId);
      } else {
        throw new Error(`Cannot retry transaction type: ${transaction.type}`);
      }

      this.logger.log(`Payment retry completed for transaction ${transactionId}`);
    } catch (error) {
      this.logger.error(`Payment retry failed for ${transactionId}:`, error.message);

      // If this was the last attempt, mark as permanently failed
      if (attempt >= 3) {
        await this.transactionService.failTransaction(
          transactionId,
          `Payment permanently failed after ${attempt} attempts: ${error.message}`,
        );
      }

      throw error;
    }
  }

  @OnQueueCompleted()
  async onCompleted(job: Job<any>) {
    this.logger.debug(`Payment job ${job.id} completed successfully`);
  }

  @OnQueueFailed()
  async onFailed(job: Job<any, any>, error: Error) {
    this.logger.error(`Payment job ${job.id} failed:`, error.message);
  }

  private async verifyDepositInternal(
    transactionId: string,
    provider?: string,
  ): Promise<{ success: boolean; status?: string; error?: string }> {
    try {
      const transaction = await this.transactionService.getTransaction(transactionId);
      if (!transaction) {
        throw new Error(`Transaction ${transactionId} not found`);
      }

      if (transaction.metadata?.paymentMethod === 'crypto') {
        // Verify crypto transaction using the proper service method
        const verification = await this.cryptoPaymentService.verifyPayment({
          externalTransactionId: transaction.externalTransactionId || transactionId,
          metadata: {
            provider: provider || 'crypto',
            amount: transaction.amount,
            currency: transaction.currency,
            ...transaction.metadata,
          },
        });

        return {
          success: verification.success,
          status: verification.status,
          error: verification.success ? undefined : verification.error,
        };
      } else {
        // Verify fiat payment using the proper service method
        const verification = await this.fiatPaymentService.verifyPayment({
          externalTransactionId: transaction.externalTransactionId || transactionId,
          metadata: {
            provider: provider || 'stripe',
            amount: transaction.amount,
            currency: transaction.currency,
            ...transaction.metadata,
          },
        });

        return {
          success: verification.success,
          status: verification.status,
          error: verification.success ? undefined : verification.error,
        };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}