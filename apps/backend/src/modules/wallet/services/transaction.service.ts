import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { User } from '../../../auth/entities/user.entity';
import { Transaction } from '../entities/transaction.entity';
import { Balance } from '../entities/balance.entity';
import { Referral } from '../entities/referral.entity';
import { TransactionType, TransactionStatus } from '../entities/transaction.entity';
import { WalletException, InsufficientFundsException, TransactionNotFoundException } from '../exceptions/wallet.exception';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);
  private readonly TRANSACTION_CACHE_TTL = 300; // 5 minutes
  private readonly PROCESSING_QUEUE = 'payment-processing';
  private readonly WITHDRAWAL_QUEUE = 'withdrawal-processing';

  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Balance)
    private balanceRepository: Repository<Balance>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(CACHE_MANAGER)
    private cache: Cache,
    @InjectQueue('payment-processing')
    private paymentQueue: Queue,
    @InjectQueue('withdrawal-processing')
    private withdrawalQueue: Queue,
    private dataSource: DataSource,
    private configService: ConfigService,
  ) {}

  async createTransaction(
    manager: any,
    userId: string,
    type: TransactionType,
    amount: number,
    metadata: Record<string, any> = {},
  ): Promise<Transaction>;
  async createTransaction(
    userId: string,
    type: TransactionType,
    amount: number,
    metadata: Record<string, any> = {},
  ): Promise<Transaction>;
  async createTransaction(
    userIdOrManager: string | any,
    typeOrUserId: TransactionType | string,
    amountOrType?: number | TransactionType,
    metadataOrAmount?: Record<string, any> | number,
    metadata: Record<string, any> = {},
  ): Promise<Transaction> {
    let manager: any;
    let userId: string;
    let type: TransactionType;
    let amount: number;

    // Determine if we're using the manager overload or the simple overload
    if (typeof userIdOrManager === 'string') {
      // Simple signature: createTransaction(userId, type, amount, metadata)
      if (typeof amountOrType !== 'number') {
        throw new Error('Invalid arguments: amount must be a number');
      }
      userId = userIdOrManager;
      type = typeOrUserId as TransactionType;
      amount = amountOrType;
      metadata = metadataOrAmount as Record<string, any> || {};

      // Use internal transaction for simple calls
      manager = undefined;
    } else {
      // Manager signature: createTransaction(manager, userId, type, amount, metadata)
      manager = userIdOrManager;
      userId = typeOrUserId as string;
      type = amountOrType as TransactionType;
      amount = metadataOrAmount as number;
      metadata = metadata || {};
    }

    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    if (manager) {
      // Use provided manager for external transactions
      try {
        // Check if user exists
        const user = await manager.findOne(User, { where: { id: userId } });
        if (!user) {
          throw new Error(`User with id ${userId} not found`);
        }

        // Get current balance for balanceBefore
        const balance = await manager.findOne(Balance, {
          where: { userId },
        });

        const balanceBefore = balance ? balance.amount : 0;

        const transaction = this.transactionRepository.create({
          userId,
          type,
          status: TransactionStatus.PENDING,
          amount,
          currency: balance?.currency || 'USD',
          balanceBefore,
          balanceAfter: balanceBefore,
          metadata,
          description: metadata.description || `${type} transaction`,
        });

        const savedTransaction = await manager.save(transaction);

        this.logger.log(`Transaction created: ${savedTransaction.id} for user ${userId}`);
        return savedTransaction;
      } catch (error) {
        this.logger.error(`Failed to create transaction for user ${userId}:`, error.message);
        throw error;
      }
    } else {
      // Use internal transaction for simple calls
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Check if user exists
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
          throw new Error(`User with id ${userId} not found`);
        }

        // Get current balance for balanceBefore
        const balance = await this.balanceRepository.findOne({
          where: { userId },
        });

        const balanceBefore = balance ? balance.amount : 0;

        const transaction = this.transactionRepository.create({
          userId,
          type,
          status: TransactionStatus.PENDING,
          amount,
          currency: balance?.currency || 'USD',
          balanceBefore,
          balanceAfter: balanceBefore,
          metadata,
          description: metadata.description || `${type} transaction`,
        });

        const savedTransaction = await queryRunner.manager.save(transaction);
        await queryRunner.commitTransaction();

        // Invalidate cache
        await this.cache.del(`transaction:${savedTransaction.id}`);

        this.logger.log(`Transaction created: ${savedTransaction.id} for user ${userId}`);
        return savedTransaction;
      } catch (error) {
        await queryRunner.rollbackTransaction();
        this.logger.error(`Failed to create transaction for user ${userId}:`, error.message);
        throw error;
      } finally {
        await queryRunner.release();
      }
    }
  }

  async getTransaction(transactionId: string): Promise<Transaction> {
    const cacheKey = `transaction:${transactionId}`;
    const cachedTransaction = await this.cache.get<Transaction>(cacheKey);

    if (cachedTransaction) {
      this.logger.debug(`Cache hit for transaction: ${transactionId}`);
      return cachedTransaction;
    }

    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
      relations: ['user', 'trade', 'referral'],
    });

    if (!transaction) {
      throw new TransactionNotFoundException(`Transaction ${transactionId} not found`);
    }

    await this.cache.set(cacheKey, transaction, this.TRANSACTION_CACHE_TTL);
    return transaction;
  }

  async getUserTransactions(
    userId: string,
    filters: {
      types?: TransactionType[];
      statuses?: TransactionStatus[];
      dateFrom?: Date;
      dateTo?: Date;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    } = {},
    pagination: { page?: number; limit?: number } = { page: 1, limit: 20 },
  ): Promise<{
    transactions: Transaction[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { types, statuses, dateFrom, dateTo, sortBy = 'createdAt', sortOrder = 'DESC' } = filters;
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    let query = this.transactionRepository.createQueryBuilder('transaction')
      .where('transaction.userId = :userId', { userId })
      .skip(skip)
      .take(limit);

    // Apply sorting
    const allowedSortFields = ['createdAt', 'amount', 'status'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';
    query = query.orderBy(`transaction.${sortField}`, order);

    if (types && types.length > 0) {
      query = query.andWhere('transaction.type IN (:...types)', { types });
    }

    if (statuses && statuses.length > 0) {
      query = query.andWhere('transaction.status IN (:...statuses)', { statuses });
    }

    if (dateFrom) {
      query = query.andWhere('transaction.createdAt >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      query = query.andWhere('transaction.createdAt <= :dateTo', { dateTo });
    }

    const [transactions, total] = await query.getManyAndCount();

    return {
      transactions,
      total,
      page,
      limit,
    };
  }

  async updateTransactionStatus(
    transactionId: string,
    status: TransactionStatus,
    metadata: Record<string, any> = {},
  ): Promise<Transaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const transaction = await queryRunner.manager.findOne(Transaction, {
        where: { id: transactionId },
      });

      if (!transaction) {
        throw new TransactionNotFoundException(`Transaction ${transactionId} not found`);
      }

      const oldStatus = transaction.status;
      transaction.status = status;
      transaction.processedAt = new Date();
      transaction.metadata = { ...transaction.metadata, ...metadata };

      if (status === TransactionStatus.FAILED && metadata.failureReason) {
        transaction.failureReason = metadata.failureReason;
      }

      const updatedTransaction = await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      // Invalidate cache
      await this.cache.del(`transaction:${transactionId}`);

      this.logger.log(`Transaction ${transactionId} status updated from ${oldStatus} to ${status}`);
      return updatedTransaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to update transaction ${transactionId} status:`, error.message);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async processDeposit(transactionId: string): Promise<void> {
    try {
      const transaction = await this.getTransaction(transactionId);

      if (transaction.type !== TransactionType.DEPOSIT) {
        throw new Error('Only deposit transactions can be processed as deposits');
      }

      if (transaction.status !== TransactionStatus.PENDING) {
        throw new Error('Only pending transactions can be processed');
      }

      // Add job to payment processing queue with correct payload structure
      await this.paymentQueue.add('processDeposit', {
        transactionId,
        userId: transaction.userId,
        amount: transaction.amount,
        currency: transaction.currency,
        paymentMethod: transaction.metadata?.paymentMethod || 'crypto',
        metadata: transaction.metadata,
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      await this.updateTransactionStatus(transactionId, TransactionStatus.PROCESSING);

      this.logger.log(`Deposit processing started for transaction: ${transactionId}`);
    } catch (error) {
      this.logger.error(`Failed to start deposit processing for transaction ${transactionId}:`, error.message);
      throw error;
    }
  }

  async processWithdrawal(transactionId: string): Promise<void> {
    try {
      const transaction = await this.getTransaction(transactionId);

      if (transaction.type !== TransactionType.WITHDRAWAL) {
        throw new Error('Only withdrawal transactions can be processed as withdrawals');
      }

      if (transaction.status !== TransactionStatus.PENDING) {
        throw new Error('Only pending transactions can be processed');
      }

      // Add job to withdrawal processing queue
      await this.withdrawalQueue.add('processWithdrawal', {
        transactionId,
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      await this.updateTransactionStatus(transactionId, TransactionStatus.PROCESSING);

      this.logger.log(`Withdrawal processing started for transaction: ${transactionId}`);
    } catch (error) {
      this.logger.error(`Failed to start withdrawal processing for transaction ${transactionId}:`, error.message);
      throw error;
    }
  }

  async completeTransaction(transactionId: string, balanceAfter?: number): Promise<Transaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const transaction = await queryRunner.manager.findOne(Transaction, {
        where: { id: transactionId },
      });

      if (!transaction) {
        throw new TransactionNotFoundException(`Transaction ${transactionId} not found`);
      }

      if (transaction.status === TransactionStatus.COMPLETED) {
        throw new Error('Transaction is already completed');
      }

      // Update balance
      const balance = await queryRunner.manager.findOne(Balance, {
        where: { userId: transaction.userId },
      });

      if (!balance) {
        throw new Error(`Balance for user ${transaction.userId} not found`);
      }

      let newBalance = balance.amount;

      if (transaction.isCredit) {
        newBalance += transaction.amount;
      } else {
        newBalance -= transaction.amount;
      }

      // Validate balance doesn't go negative
      if (newBalance < 0) {
        throw new InsufficientFundsException('Transaction would result in negative balance');
      }

      balance.amount = newBalance;
      balance.lastTransactionAt = new Date();

      if (transaction.isCredit) {
        balance.totalDeposited += transaction.amount;
      } else {
        balance.totalWithdrawn += transaction.amount;
      }

      await queryRunner.manager.save(balance);

      // Update transaction
      transaction.status = TransactionStatus.COMPLETED;
      transaction.balanceAfter = balanceAfter || newBalance;
      transaction.processedAt = new Date();

      const updatedTransaction = await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      // Invalidate cache
      await Promise.all([
        this.cache.del(`transaction:${transactionId}`),
        this.cache.del(`balance:${transaction.userId}`),
      ]);

      this.logger.log(`Transaction ${transactionId} completed successfully`);
      return updatedTransaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to complete transaction ${transactionId}:`, error.message);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async failTransaction(transactionId: string, reason: string): Promise<Transaction> {
    const transaction = await this.updateTransactionStatus(
      transactionId,
      TransactionStatus.FAILED,
      { failureReason: reason },
    );

    this.logger.log(`Transaction ${transactionId} failed: ${reason}`);
    return transaction;
  }

  async refundTransaction(transactionId: string, reason?: string): Promise<Transaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const originalTransaction = await queryRunner.manager.findOne(Transaction, {
        where: { id: transactionId },
      });

      if (!originalTransaction) {
        throw new TransactionNotFoundException(`Transaction ${transactionId} not found`);
      }

      if (originalTransaction.status !== TransactionStatus.COMPLETED) {
        throw new Error('Only completed transactions can be refunded');
      }

      // Create refund transaction
      const refundTransaction = this.transactionRepository.create({
        userId: originalTransaction.userId,
        type: TransactionType.REFUND,
        status: TransactionStatus.COMPLETED,
        amount: originalTransaction.amount,
        currency: originalTransaction.currency,
        balanceBefore: 0, // Will be set correctly in completeTransaction
        balanceAfter: 0, // Will be set correctly in completeTransaction
        description: reason || `Refund for transaction ${transactionId}`,
        metadata: {
          originalTransactionId: transactionId,
          reason,
        },
        processedAt: new Date(),
      });

      const savedRefundTransaction = await queryRunner.manager.save(refundTransaction);

      // Process the refund (this will update balances)
      await this.completeTransaction(savedRefundTransaction.id);

      await queryRunner.commitTransaction();

      this.logger.log(`Transaction ${transactionId} refunded successfully`);
      return savedRefundTransaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to refund transaction ${transactionId}:`, error.message);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateTransactionMetadata(
    transactionId: string,
    metadata: Record<string, any>,
  ): Promise<Transaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const transaction = await queryRunner.manager.findOne(Transaction, {
        where: { id: transactionId },
      });

      if (!transaction) {
        throw new TransactionNotFoundException(`Transaction ${transactionId} not found`);
      }

      transaction.metadata = { ...transaction.metadata, ...metadata };

      const updatedTransaction = await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      // Invalidate cache
      await this.cache.del(`transaction:${transactionId}`);

      this.logger.log(`Transaction ${transactionId} metadata updated`);
      return updatedTransaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to update transaction ${transactionId} metadata:`, error.message);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
    async getTransactionStatistics(userId: string): Promise<{
    totalDeposits: number;
    totalWithdrawals: number;
    totalTrades: number;
    totalReferrals: number;
    pendingTransactions: number;
    failedTransactions: number;
  }> {
    const [
      totalDeposits,
      totalWithdrawals,
      totalTrades,
      totalReferrals,
      pendingTransactions,
      failedTransactions,
    ] = await Promise.all([
      this.transactionRepository
        .createQueryBuilder('transaction')
        .select('COALESCE(SUM(transaction.amount), 0)', 'total')
        .where('transaction.userId = :userId', { userId })
        .andWhere('transaction.type = :type', { type: TransactionType.DEPOSIT })
        .getRawOne(),
      this.transactionRepository
        .createQueryBuilder('transaction')
        .select('COALESCE(SUM(transaction.amount), 0)', 'total')
        .where('transaction.userId = :userId', { userId })
        .andWhere('transaction.type = :type', { type: TransactionType.WITHDRAWAL })
        .getRawOne(),
      this.transactionRepository.count({
        where: { userId, type: In([TransactionType.TRADE_CREDIT, TransactionType.TRADE_DEBIT]) },
      }),
      this.transactionRepository.count({
        where: { userId, type: TransactionType.REFERRAL_BONUS },
      }),
      this.transactionRepository.count({
        where: { userId, status: TransactionStatus.PENDING },
      }),
      this.transactionRepository.count({
        where: { userId, status: TransactionStatus.FAILED },
      }),
    ]);

    return {
      totalDeposits: parseFloat(totalDeposits.total) || 0,
      totalWithdrawals: parseFloat(totalWithdrawals.total) || 0,
      totalTrades,
      totalReferrals,
      pendingTransactions,
      failedTransactions,
    };
  }

  async cancelTransaction(transactionId: string): Promise<Transaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const transaction = await queryRunner.manager.findOne(Transaction, {
        where: { id: transactionId },
      });

      if (!transaction) {
        throw new TransactionNotFoundException(`Transaction ${transactionId} not found`);
      }

      if (transaction.status !== TransactionStatus.PENDING) {
        throw new Error('Only pending transactions can be cancelled');
      }

      transaction.status = TransactionStatus.CANCELLED;
      transaction.processedAt = new Date();

      const updatedTransaction = await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      // Invalidate cache
      await this.cache.del(`transaction:${transactionId}`);

      this.logger.log(`Transaction ${transactionId} cancelled successfully`);
      return updatedTransaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to cancel transaction ${transactionId}:`, error.message);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}