import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { User } from '../../../auth/entities/user.entity';
import { Balance } from '../entities/balance.entity';
import { Transaction, TransactionStatus, TransactionType } from '../entities/transaction.entity';
import { TransactionService } from './transaction.service';
import { WalletException, InsufficientFundsException } from '../exceptions/wallet.exception';

@Injectable()
export class BalanceService {
  private readonly logger = new Logger(BalanceService.name);
  private readonly BALANCE_CACHE_TTL = 60; // 1 minute
  private readonly MIN_BALANCE = 0;

  constructor(
    @InjectRepository(Balance)
    private balanceRepository: Repository<Balance>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @Inject(CACHE_MANAGER)
    private cache: Cache,
    private dataSource: DataSource,
    private transactionService: TransactionService,
    private configService: ConfigService,
  ) {}

  async getBalance(userId: string): Promise<Balance> {
    const cacheKey = `balance:${userId}`;
    const cachedBalance = await this.cache.get<Balance>(cacheKey);

    if (cachedBalance) {
      this.logger.debug(`Cache hit for balance: ${userId}`);
      return cachedBalance;
    }

    const balance = await this.balanceRepository.findOne({
      where: { userId },
    });

    if (balance) {
      await this.cache.set(cacheKey, balance, this.BALANCE_CACHE_TTL);
    }

    return balance;
  }

  async createBalance(userId: string, currency: string = 'USD'): Promise<Balance> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if user exists
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new BadRequestException(`User with id ${userId} not found`);
      }

      // Check if balance already exists
      const existingBalance = await this.balanceRepository.findOne({
        where: { userId },
      });

      if (existingBalance) {
        throw new BadRequestException(`Balance for user ${userId} already exists`);
      }

      const balance = this.balanceRepository.create({
        userId,
        currency,
        amount: 0,
        lockedAmount: 0,
        totalDeposited: 0,
        totalWithdrawn: 0,
        totalEarned: 0,
      });

      const savedBalance = await queryRunner.manager.save(balance);

      await queryRunner.commitTransaction();

      // Invalidate cache
      await this.cache.del(`balance:${userId}`);

      this.logger.log(`Balance created for user: ${userId}, currency: ${currency}`);
      return savedBalance;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create balance for user ${userId}:`, error.message);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async addFunds(
    userId: string,
    amount: number,
    transactionId: string,
    description?: string,
  ): Promise<Balance> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const balance = await queryRunner.manager.findOne(Balance, {
        where: { userId },
      });

      if (!balance) {
        throw new BadRequestException(`Balance for user ${userId} not found`);
      }

      const transaction = await queryRunner.manager.findOne(Transaction, {
        where: { id: transactionId },
      });

      if (!transaction) {
        throw new BadRequestException(`Transaction ${transactionId} not found`);
      }

      if (transaction.status !== TransactionStatus.COMPLETED) {
        throw new BadRequestException(`Transaction ${transactionId} is not completed`);
      }

      // Check currency consistency
      if (transaction.currency !== balance.currency) {
        throw new BadRequestException(`Currency mismatch: transaction currency (${transaction.currency}) does not match balance currency (${balance.currency})`);
      }

      const oldBalance = balance.amount;
      const newBalance = balance.amount + amount;

      balance.amount = newBalance;
      balance.totalDeposited += amount;
      balance.lastTransactionAt = new Date();

      const updatedBalance = await queryRunner.manager.save(balance);

      // Update transaction with final balance
      transaction.balanceAfter = newBalance;
      transaction.description = description || `Added funds: ${amount} ${balance.currency}`;
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      // Invalidate cache
      await this.cache.del(`balance:${userId}`);

      this.logger.log(`Added ${amount} ${balance.currency} to balance for user: ${userId}`);
      return updatedBalance;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to add funds for user ${userId}:`, error.message);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async deductFunds(
    userId: string,
    amount: number,
    transactionId: string,
    description?: string,
  ): Promise<Balance> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const balance = await queryRunner.manager.findOne(Balance, {
        where: { userId },
      });

      if (!balance) {
        throw new BadRequestException(`Balance for user ${userId} not found`);
      }

      const availableAmount = balance.amount - balance.lockedAmount;
      if (availableAmount < amount) {
        throw new BadRequestException(`Insufficient funds. Available: ${availableAmount}, Requested: ${amount}`);
      }

      const transaction = await queryRunner.manager.findOne(Transaction, {
        where: { id: transactionId },
      });

      if (!transaction) {
        throw new BadRequestException(`Transaction ${transactionId} not found`);
      }

      if (transaction.status !== TransactionStatus.COMPLETED) {
        throw new BadRequestException(`Transaction ${transactionId} is not completed`);
      }

      // Check currency consistency
      if (transaction.currency !== balance.currency) {
        throw new BadRequestException(`Currency mismatch: transaction currency (${transaction.currency}) does not match balance currency (${balance.currency})`);
      }

      const oldBalance = balance.amount;
      const newBalance = balance.amount - amount;

      balance.amount = newBalance;
      balance.totalWithdrawn += amount;
      balance.lastTransactionAt = new Date();

      const updatedBalance = await queryRunner.manager.save(balance);

      // Update transaction with final balance
      transaction.balanceAfter = newBalance;
      transaction.description = description || `Deducted funds: ${amount} ${balance.currency}`;
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      // Invalidate cache
      await this.cache.del(`balance:${userId}`);

      this.logger.log(`Deducted ${amount} ${balance.currency} from balance for user: ${userId}`);
      return updatedBalance;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to deduct funds for user ${userId}:`, error.message);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async lockFunds(userId: string, amount: number): Promise<Balance> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const balance = await queryRunner.manager.findOne(Balance, {
        where: { userId },
      });

      if (!balance) {
        throw new BadRequestException(`Balance for user ${userId} not found`);
      }

      const availableAmount = balance.amount - balance.lockedAmount;
      if (availableAmount < amount) {
        throw new BadRequestException(`Insufficient available funds. Available: ${availableAmount}, Requested: ${amount}`);
      }

      balance.lockedAmount += amount;

      const updatedBalance = await queryRunner.manager.save(balance);

      await queryRunner.commitTransaction();

      // Invalidate cache
      await this.cache.del(`balance:${userId}`);

      this.logger.log(`Locked ${amount} ${balance.currency} for user: ${userId}`);
      return updatedBalance;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to lock funds for user ${userId}:`, error.message);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async unlockFunds(userId: string, amount: number): Promise<Balance> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const balance = await queryRunner.manager.findOne(Balance, {
        where: { userId },
      });

      if (!balance) {
        throw new BadRequestException(`Balance for user ${userId} not found`);
      }

      if (balance.lockedAmount < amount) {
        throw new BadRequestException(`Cannot unlock more than locked amount. Locked: ${balance.lockedAmount}, Requested: ${amount}`);
      }

      balance.lockedAmount -= amount;

      const updatedBalance = await queryRunner.manager.save(balance);

      await queryRunner.commitTransaction();

      // Invalidate cache
      await this.cache.del(`balance:${userId}`);

      this.logger.log(`Unlocked ${amount} ${balance.currency} for user: ${userId}`);
      return updatedBalance;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to unlock funds for user ${userId}:`, error.message);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async transferFunds(
    fromUserId: string,
    toUserId: string,
    amount: number,
    description?: string,
  ): Promise<{ fromBalance: Balance; toBalance: Balance }> {
    // Add validation
    if (!fromUserId || !toUserId || typeof fromUserId !== 'string' || typeof toUserId !== 'string') {
      throw new BadRequestException('Invalid user IDs: must be non-empty strings');
    }
    if (fromUserId === toUserId) {
      throw new BadRequestException('Cannot transfer funds to the same user');
    }
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if both users exist
      const [fromUser, toUser] = await Promise.all([
        this.userRepository.findOne({ where: { id: fromUserId } }),
        this.userRepository.findOne({ where: { id: toUserId } }),
      ]);

      if (!fromUser) {
        throw new BadRequestException(`Sender user with id ${fromUserId} not found`);
      }
      if (!toUser) {
        throw new BadRequestException(`Recipient user with id ${toUserId} not found`);
      }

      // Get current balances
      const [fromBalance, toBalance] = await Promise.all([
        queryRunner.manager.findOne(Balance, { where: { userId: fromUserId } }),
        queryRunner.manager.findOne(Balance, { where: { userId: toUserId } }),
      ]);

      if (!fromBalance) {
        throw new BadRequestException(`Balance for sender ${fromUserId} not found`);
      }
      if (!toBalance) {
        throw new BadRequestException(`Balance for recipient ${toUserId} not found`);
      }

      // Check if currencies match
      if (fromBalance.currency !== toBalance.currency) {
        throw new BadRequestException('Currency mismatch between sender and recipient');
      }

      const availableAmount = fromBalance.amount - fromBalance.lockedAmount;
      if (availableAmount < amount) {
        throw new BadRequestException(`Insufficient funds. Available: ${availableAmount}, Requested: ${amount}`);
      }

      // Create transfer transactions
      const transferOutTransaction = await this.transactionService.createTransaction(
        queryRunner.manager,
        fromUserId,
        TransactionType.TRADE_DEBIT,
        amount,
        {
          description: description || `Transfer to user ${toUserId}`,
          transferTo: toUserId,
        },
      );

      const transferInTransaction = await this.transactionService.createTransaction(
        queryRunner.manager,
        toUserId,
        TransactionType.TRADE_CREDIT,
        amount,
        {
          description: description || `Transfer from user ${fromUserId}`,
          transferFrom: fromUserId,
        },
      );

      // Update balances
      fromBalance.amount -= amount;
      fromBalance.totalWithdrawn += amount;
      fromBalance.lastTransactionAt = new Date();

      toBalance.amount += amount;
      toBalance.totalEarned += amount;
      toBalance.lastTransactionAt = new Date();

      const [updatedFromBalance, updatedToBalance] = await Promise.all([
        queryRunner.manager.save(fromBalance),
        queryRunner.manager.save(toBalance),
      ]);

      // Complete transactions
      transferOutTransaction.status = 'completed';
      transferOutTransaction.balanceAfter = fromBalance.amount;
      transferOutTransaction.processedAt = new Date();

      transferInTransaction.status = 'completed';
      transferInTransaction.balanceAfter = toBalance.amount;
      transferInTransaction.processedAt = new Date();

      await Promise.all([
        queryRunner.manager.save(transferOutTransaction),
        queryRunner.manager.save(transferInTransaction),
      ]);

      await queryRunner.commitTransaction();

      // Invalidate cache
      await Promise.all([
        this.cache.del(`balance:${fromUserId}`),
        this.cache.del(`balance:${toUserId}`),
      ]);

      this.logger.log(`Transferred ${amount} ${fromBalance.currency} from ${fromUserId} to ${toUserId}`);
      return { fromBalance: updatedFromBalance, toBalance: updatedToBalance };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to transfer funds from ${fromUserId} to ${toUserId}:`, error.message);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getBalanceHistory(userId: string, page: number = 1, limit: number = 20): Promise<{
    transactions: Transaction[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;

    const [transactions, total] = await this.transactionRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      transactions,
      total,
      page,
      limit,
    };
  }

  async invalidateCache(userId: string): Promise<void> {
    await this.cache.del(`balance:${userId}`);
    this.logger.debug(`Cache invalidated for user balance: ${userId}`);
  }

  async ensureBalanceExists(userId: string, currency: string = 'USD'): Promise<void> {
    const balance = await this.getBalance(userId);
    if (!balance) {
      await this.createBalance(userId, currency);
    }
  }
}