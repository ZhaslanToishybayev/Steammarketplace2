import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { User } from '../../../auth/entities/user.entity';
import { Trade } from '../../../trading/entities/trade.entity';
import { Transaction, TransactionStatus } from '../../../wallet/entities/transaction.entity';
import { Balance } from '../../../wallet/entities/balance.entity';
import { Referral } from '../../../wallet/entities/referral.entity';
import { BalanceService } from '../../../wallet/services/balance.service';
import { ConfigService } from '@nestjs/config';
import { UserStatisticsDto } from '../dto/user-statistics.dto';

@Injectable()
export class UserStatisticsService {
  private readonly logger = new Logger(UserStatisticsService.name);
  private readonly STATISTICS_CACHE_TTL = 600; // 10 minutes

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Trade)
    private tradeRepository: Repository<Trade>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Referral)
    private referralRepository: Repository<Referral>,
    @Inject(CACHE_MANAGER)
    private cache: Cache,
    private balanceService: BalanceService,
    private configService: ConfigService,
  ) {}

  async getUserStatistics(userId: string): Promise<UserStatisticsDto> {
    const cacheKey = `user:statistics:${userId}`;
    const cachedStatistics = await this.cache.get<UserStatisticsDto>(cacheKey);

    if (cachedStatistics) {
      this.logger.debug(`Cache hit for user statistics: ${userId}`);
      return cachedStatistics;
    }

    const [
      user,
      tradeStats,
      transactionStats,
      referralStats,
      accountAge,
    ] = await Promise.all([
      this.userRepository.findOne({ where: { id: userId } }),
      this.getTradeStatistics(userId),
      this.getTransactionStatistics(userId),
      this.getReferralStatistics(userId),
      this.getAccountAge(userId),
    ]);

    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }

    const statistics: UserStatisticsDto = {
      totalTrades: tradeStats.totalTrades,
      completedTrades: tradeStats.completedTrades,
      failedTrades: tradeStats.failedTrades,
      pendingTrades: tradeStats.pendingTrades,
      successRate: tradeStats.successRate,
      reputation: this.calculateReputation(
        tradeStats.completedTrades,
        tradeStats.failedTrades,
      ),
      totalValue: tradeStats.totalValue,
      averageTradeValue: tradeStats.averageTradeValue,
      totalDeposits: transactionStats.totalDeposits,
      totalWithdrawals: transactionStats.totalWithdrawals,
      currentBalance: transactionStats.currentBalance,
      accountAge,
      averageResponseTime: tradeStats.averageResponseTime,
      totalReferrals: referralStats.totalReferrals,
      totalReferralEarnings: referralStats.totalReferralEarnings,
    };

    const statisticsTtl = this.configService.get<number>('USER_STATISTICS_CACHE_TTL_SECONDS', 600);
    await this.cache.set(cacheKey, statistics, statisticsTtl);

    this.logger.debug(`Statistics calculated for user: ${userId}`);
    return statistics;
  }

  async getLeaderboard(limit: number = 10, sortBy: string = 'reputation'): Promise<UserStatisticsDto[]> {
    const cacheKey = `leaderboard:${sortBy}:${limit}`;
    const cachedLeaderboard = await this.cache.get<UserStatisticsDto[]>(cacheKey);

    if (cachedLeaderboard) {
      this.logger.debug(`Cache hit for leaderboard: ${sortBy}`);
      return cachedLeaderboard;
    }

    const users = await this.userRepository.find({
      where: { isActive: true },
      select: ['id'],
    });

    const userIds = users.map(user => user.id);
    const leaderboard: UserStatisticsDto[] = [];

    for (const userId of userIds) {
      try {
        const stats = await this.getUserStatistics(userId);
        leaderboard.push(stats);
      } catch (error) {
        this.logger.warn(`Failed to get statistics for user ${userId}:`, error.message);
      }
    }

    // Sort by specified criteria
    const sortedLeaderboard = leaderboard.sort((a, b) => {
      switch (sortBy) {
        case 'reputation':
          return b.reputation - a.reputation;
        case 'totalTrades':
          return b.totalTrades - a.totalTrades;
        case 'successRate':
          return b.successRate - a.successRate;
        default:
          return b.reputation - a.reputation;
      }
    }).slice(0, limit);

    const statisticsTtl = this.configService.get<number>('USER_STATISTICS_CACHE_TTL_SECONDS', 600);
    // Use TTL in seconds (consistent with cache-manager)
    await this.cache.set(cacheKey, sortedLeaderboard, statisticsTtl);

    this.logger.debug(`Leaderboard calculated: ${sortBy}, limit: ${limit}`);
    return sortedLeaderboard;
  }

  calculateReputation(completedTrades: number, failedTrades: number): number {
    // Reputation formula: (completedTrades * 10) - (failedTrades * 5)
    // Minimum 0, Maximum 1000
    const reputation = Math.max(0, Math.min(1000, (completedTrades * 10) - (failedTrades * 5)));

    return reputation;
  }

  private async getTradeStatistics(userId: string): Promise<{
    totalTrades: number;
    completedTrades: number;
    failedTrades: number;
    pendingTrades: number;
    successRate: number;
    totalValue: number;
    averageTradeValue: number;
    averageResponseTime: number;
  }> {
    const [
      totalTrades,
      completedTrades,
      failedTrades,
      pendingTrades,
      totalValue,
      averageTradeValue,
      averageResponseTime,
    ] = await Promise.all([
      this.tradeRepository.count({ where: { userId } }),
      this.tradeRepository.count({
        where: { userId, status: In(['completed', 'delivered']) },
      }),
      this.tradeRepository.count({
        where: { userId, status: In(['failed', 'cancelled']) },
      }),
      this.tradeRepository.count({
        where: { userId, status: In(['pending', 'accepted', 'sent']) },
      }),
      this.tradeRepository
        .createQueryBuilder('trade')
        .select('COALESCE(SUM(trade.totalValue), 0)', 'totalValue')
        .where('trade.userId = :userId', { userId })
        .getRawOne(),
      this.tradeRepository
        .createQueryBuilder('trade')
        .select('COALESCE(AVG(trade.totalValue), 0)', 'averageTradeValue')
        .where('trade.userId = :userId', { userId })
        .getRawOne(),
      this.tradeRepository
        .createQueryBuilder('trade')
        .select('COALESCE(AVG(EXTRACT(EPOCH FROM (trade.acceptedAt - trade.createdAt))), 0)', 'averageResponseTime')
        .where('trade.userId = :userId')
        .andWhere('trade.acceptedAt IS NOT NULL')
        .getRawOne(),
    ]);

    const successRate = totalTrades > 0 ? (completedTrades / totalTrades) * 100 : 0;

    return {
      totalTrades,
      completedTrades,
      failedTrades,
      pendingTrades,
      successRate,
      totalValue: parseFloat(totalValue.totalValue) || 0,
      averageTradeValue: parseFloat(averageTradeValue.averageTradeValue) || 0,
      averageResponseTime: parseFloat(averageResponseTime.averageResponseTime) || 0,
    };
  }

  private async getTransactionStatistics(userId: string): Promise<{
    totalDeposits: number;
    totalWithdrawals: number;
    currentBalance: number;
  }> {
    const [
      totalDeposits,
      totalWithdrawals,
    ] = await Promise.all([
      this.transactionRepository
        .createQueryBuilder('transaction')
        .select('COALESCE(SUM(transaction.amount), 0)', 'totalDeposits')
        .where('transaction.userId = :userId', { userId })
        .andWhere('transaction.type = :type', { type: 'deposit' })
        .andWhere('transaction.status = :status', { status: TransactionStatus.COMPLETED })
        .getRawOne(),
      this.transactionRepository
        .createQueryBuilder('transaction')
        .select('COALESCE(SUM(transaction.amount), 0)', 'totalWithdrawals')
        .where('transaction.userId = :userId', { userId })
        .andWhere('transaction.type = :type', { type: 'withdrawal' })
        .andWhere('transaction.status = :status', { status: TransactionStatus.COMPLETED })
        .getRawOne(),
    ]);

    // Get current balance from Balance entity
    let currentBalance = 0;
    try {
      const balance = await this.balanceService.getBalance(userId);
      if (balance) {
        currentBalance = balance.amount;
      }
    } catch (error) {
      this.logger.warn(`Failed to get balance for user ${userId}:`, error.message);
      // Fallback to simplified calculation
      currentBalance = (parseFloat(totalDeposits.totalDeposits) || 0) -
                       (parseFloat(totalWithdrawals.totalWithdrawals) || 0);
    }

    return {
      totalDeposits: parseFloat(totalDeposits.totalDeposits) || 0,
      totalWithdrawals: parseFloat(totalWithdrawals.totalWithdrawals) || 0,
      currentBalance,
    };
  }

  private async getReferralStatistics(userId: string): Promise<{
    totalReferrals: number;
    totalReferralEarnings: number;
  }> {
    const [
      totalReferrals,
      totalReferralEarnings,
    ] = await Promise.all([
      this.referralRepository.count({
        where: { referrerId: userId, status: 'completed' },
      }),
      this.transactionRepository
        .createQueryBuilder('transaction')
        .select('COALESCE(SUM(transaction.amount), 0)', 'totalReferralEarnings')
        .where('transaction.userId = :userId', { userId })
        .andWhere('transaction.type = :type', { type: 'referral_bonus' })
        .getRawOne(),
    ]);

    return {
      totalReferrals,
      totalReferralEarnings: parseFloat(totalReferralEarnings.totalReferralEarnings) || 0,
    };
  }

  private async getAccountAge(userId: string): Promise<number> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['createdAt'],
    });

    if (!user) {
      return 0;
    }

    const now = new Date();
    const created = new Date(user.createdAt);
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }
}