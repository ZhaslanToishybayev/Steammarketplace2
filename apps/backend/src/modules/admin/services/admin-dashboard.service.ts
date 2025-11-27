import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Redis } from 'ioredis';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Cron, CronExpression } from '@nestjs/schedule';

import { User } from '../../auth/entities/user.entity';
import { Trade } from '../../trading/entities/trade.entity';
import { Transaction } from '../../wallet/entities/transaction.entity';
import { Bot } from '../../trading/entities/bot.entity';
import { TradeDispute } from '../entities/trade-dispute.entity';
import { UserRole } from '../../auth/entities/user.entity';
import { TradeStatus } from '../../trading/entities/trade.entity';
import { TransactionType } from '../../wallet/entities/transaction.entity';
import { DisputeStatus } from '../entities/trade-dispute.entity';

export interface PlatformStatistics {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  totalTrades: number;
  completedTrades: number;
  failedTrades: number;
  pendingTrades: number;
  totalRevenue: number;
  totalBots: number;
  onlineBots: number;
  offlineBots: number;
  avgTradeValue: number;
  successRate: number;
  period: {
    dateFrom?: Date;
    dateTo?: Date;
  };
}

export interface UserGrowthMetrics {
  period: string;
  data: Array<{
    date: string;
    newUsers: number;
    activeUsers: number;
    bannedUsers: number;
  }>;
}

export interface TradeMetrics {
  period: string;
  data: Array<{
    date: string;
    totalTrades: number;
    completedTrades: number;
    failedTrades: number;
    revenue: number;
  }>;
}

export interface BotHealthMetrics {
  bots: Array<{
    id: string;
    name: string;
    status: string;
    tradeCount: number;
    successRate: number;
    currentLoad: number;
    uptime: number;
    lastHeartbeat?: Date;
  }>;
  aggregate: {
    totalBots: number;
    onlineBots: number;
    offlineBots: number;
    avgUptime: number;
    avgSuccessRate: number;
    totalTradeCount: number;
  };
}

export interface SystemHealth {
  database: {
    postgresql: boolean;
    mongodb: boolean;
  };
  redis: boolean;
  queues: {
    healthy: boolean;
    queueNames: string[];
    totalJobs: number;
  };
  api: {
    responseTime: number;
    uptime: number;
  };
}

@Injectable()
export class AdminDashboardService {
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Trade)
    private tradeRepository: Repository<Trade>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Bot)
    private botRepository: Repository<Bot>,
    @InjectRepository(TradeDispute)
    private tradeDisputeRepository: Repository<TradeDispute>,
    @InjectRedis() private redis: Redis,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
  ) {}

  async getPlatformStatistics(
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<PlatformStatistics> {
    const cacheKey = `platform_statistics:${dateFrom?.toISOString() || ''}:${dateTo?.toISOString() || ''}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // User statistics
    const totalUsers = await this.userRepository.count();
    const activeUsers = await this.userRepository.count({ where: { isActive: true } });
    const bannedUsers = await this.userRepository.count({ where: { isBanned: true } });

    // Trade statistics
    const tradeQuery = this.tradeRepository.createQueryBuilder('trade');
    if (dateFrom && dateTo) {
      tradeQuery.andWhere('trade.createdAt BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo });
    }
    const totalTrades = await tradeQuery.getCount();

    const completedTrades = await this.tradeRepository.count({
      where: { status: TradeStatus.COMPLETED, ...(dateFrom && dateTo ? { createdAt: Between(dateFrom, dateTo) } : {}) },
    });

    const failedTrades = await this.tradeRepository.count({
      where: { status: In([TradeStatus.FAILED, TradeStatus.CANCELLED, TradeStatus.DECLINED]), ...(dateFrom && dateTo ? { createdAt: Between(dateFrom, dateTo) } : {}) },
    });

    const pendingTrades = await this.tradeRepository.count({
      where: { status: In([TradeStatus.PENDING, TradeStatus.SENT, TradeStatus.ACCEPTED]), ...(dateFrom && dateTo ? { createdAt: Between(dateFrom, dateTo) } : {}) },
    });

    // Revenue calculation
    const revenueTransactions = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'total')
      .where('transaction.type IN (:...types)', {
        types: [TransactionType.TRADE_FEE, TransactionType.ADMIN_ADJUSTMENT, TransactionType.SERVICE_FEE],
      })
      .andWhere(dateFrom && dateTo ? 'transaction.createdAt BETWEEN :dateFrom AND :dateTo' : '1=1', { dateFrom, dateTo })
      .getRawOne();

    const totalRevenue = parseFloat(revenueTransactions.total || '0');

    // Bot statistics
    const totalBots = await this.botRepository.count();
    const onlineBots = await this.botRepository.count({ where: { status: 'IDLE' } });
    const offlineBots = totalBots - onlineBots;

    // Average trade value
    const avgTradeValueResult = await this.tradeRepository
      .createQueryBuilder('trade')
      .select('AVG(trade.totalValue)', 'avgValue')
      .where(dateFrom && dateTo ? 'trade.createdAt BETWEEN :dateFrom AND :dateTo' : '1=1', { dateFrom, dateTo })
      .getRawOne();

    const avgTradeValue = parseFloat(avgTradeValueResult.avgValue || '0');

    // Success rate
    const successRate = totalTrades > 0 ? (completedTrades / totalTrades) * 100 : 0;

    const statistics: PlatformStatistics = {
      totalUsers,
      activeUsers,
      bannedUsers,
      totalTrades,
      completedTrades,
      failedTrades,
      pendingTrades,
      totalRevenue,
      totalBots,
      onlineBots,
      offlineBots,
      avgTradeValue,
      successRate,
      period: { dateFrom, dateTo },
    };

    // Cache the result
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(statistics));

    return statistics;
  }

  async getUserGrowthMetrics(period: 'day' | 'week' | 'month'): Promise<UserGrowthMetrics> {
    const cacheKey = `user_growth_metrics:${period}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const now = new Date();
    let startDate: Date;
    let interval: number;

    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours
        interval = 60; // 1 hour intervals
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days
        interval = 24 * 60; // 1 day intervals
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days
        interval = 24 * 60; // 1 day intervals
        break;
      default:
        throw new Error('Invalid period');
    }

    const data: Array<{ date: string; newUsers: number; activeUsers: number; bannedUsers: number }> = [];

    // Generate time intervals
    for (let date = new Date(startDate); date <= now; date = new Date(date.getTime() + interval * 60 * 1000)) {
      const endDate = new Date(date.getTime() + interval * 60 * 1000);

      const newUsers = await this.userRepository.count({
        where: { createdAt: Between(date, endDate) },
      });

      const activeUsers = await this.userRepository.count({
        where: {
          isActive: true,
          createdAt: Between(new Date(startDate), endDate),
        },
      });

      const bannedUsers = await this.userRepository.count({
        where: {
          isBanned: true,
          createdAt: Between(new Date(startDate), endDate),
        },
      });

      data.push({
        date: date.toISOString(),
        newUsers,
        activeUsers,
        bannedUsers,
      });
    }

    const metrics: UserGrowthMetrics = { period, data };

    // Cache the result
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(metrics));

    return metrics;
  }

  async getTradeMetrics(period: 'day' | 'week' | 'month'): Promise<TradeMetrics> {
    const cacheKey = `trade_metrics:${period}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const now = new Date();
    let startDate: Date;
    let interval: number;

    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours
        interval = 60; // 1 hour intervals
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days
        interval = 24 * 60; // 1 day intervals
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days
        interval = 24 * 60; // 1 day intervals
        break;
      default:
        throw new Error('Invalid period');
    }

    const data: Array<{ date: string; totalTrades: number; completedTrades: number; failedTrades: number; revenue: number }> = [];

    // Generate time intervals
    for (let date = new Date(startDate); date <= now; date = new Date(date.getTime() + interval * 60 * 1000)) {
      const endDate = new Date(date.getTime() + interval * 60 * 1000);

      const totalTrades = await this.tradeRepository.count({
        where: { createdAt: Between(date, endDate) },
      });

      const completedTrades = await this.tradeRepository.count({
        where: {
          status: TradeStatus.COMPLETED,
          createdAt: Between(date, endDate),
        },
      });

      const failedTrades = await this.tradeRepository.count({
        where: {
          status: In([TradeStatus.FAILED, TradeStatus.CANCELLED, TradeStatus.DECLINED]),
          createdAt: Between(date, endDate),
        },
      });

      // Calculate revenue for this period
      const revenueResult = await this.transactionRepository
        .createQueryBuilder('transaction')
        .select('SUM(transaction.amount)', 'total')
        .where('transaction.type IN (:...types)', {
          types: [TransactionType.TRADE_FEE, TransactionType.SERVICE_FEE],
        })
        .andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', { startDate: date, endDate })
        .getRawOne();

      const revenue = parseFloat(revenueResult.total || '0');

      data.push({
        date: date.toISOString(),
        totalTrades,
        completedTrades,
        failedTrades,
        revenue,
      });
    }

    const metrics: TradeMetrics = { period, data };

    // Cache the result
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(metrics));

    return metrics;
  }

  async getBotHealthMetrics(): Promise<BotHealthMetrics> {
    const cacheKey = 'bot_health_metrics';
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const bots = await this.botRepository.find();
    const now = new Date();

    const botMetrics = await Promise.all(
      bots.map(async (bot) => {
        // Calculate bot statistics
        const tradeCount = await this.tradeRepository.count({
          where: { botId: bot.id },
        });

        const successfulTrades = await this.tradeRepository.count({
          where: { botId: bot.id, status: TradeStatus.COMPLETED },
        });

        const successRate = tradeCount > 0 ? (successfulTrades / tradeCount) * 100 : 0;
        const currentLoad = await this.getCurrentBotLoad(bot.id);

        // Calculate uptime (simplified - would need more complex logic for real uptime)
        const uptime = bot.status === 'IDLE' ? 100 : bot.status === 'TRADING' ? 90 : 0;

        return {
          id: bot.id,
          name: bot.name,
          status: bot.status,
          tradeCount,
          successRate,
          currentLoad,
          uptime,
          lastHeartbeat: bot.lastHeartbeat,
        };
      }),
    );

    const aggregate = {
      totalBots: bots.length,
      onlineBots: botMetrics.filter(bot => bot.status === 'IDLE').length,
      offlineBots: botMetrics.filter(bot => bot.status === 'OFFLINE').length,
      avgUptime: botMetrics.reduce((sum, bot) => sum + bot.uptime, 0) / botMetrics.length,
      avgSuccessRate: botMetrics.reduce((sum, bot) => sum + bot.successRate, 0) / botMetrics.length,
      totalTradeCount: botMetrics.reduce((sum, bot) => sum + bot.tradeCount, 0),
    };

    const metrics: BotHealthMetrics = { bots: botMetrics, aggregate };

    // Cache the result
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(metrics));

    return metrics;
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const cacheKey = 'system_health';
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Check database connections
    const database = {
      postgresql: await this.checkDatabaseConnection(),
      mongodb: true, // Would need actual MongoDB connection check
    };

    // Check Redis connection
    const redis = await this.checkRedisConnection();

    // Check queue health
    const queues = {
      healthy: true, // Would need actual Bull queue health check
      queueNames: ['trade-processing', 'admin-operations'],
      totalJobs: 0,
    };

    // Check API health
    const api = {
      responseTime: await this.getApiResponseTime(),
      uptime: 99.9, // Would need actual uptime calculation
    };

    const health: SystemHealth = { database, redis, queues, api };

    // Cache the result
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(health));

    return health;
  }

  async getRevenueReport(dateFrom: Date, dateTo: Date): Promise<any> {
    const cacheKey = `revenue_report:${dateFrom.toISOString()}:${dateTo.toISOString()}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Get deposits
    const depositsResult = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'total')
      .where('transaction.type = :type', { type: TransactionType.DEPOSIT })
      .andWhere('transaction.createdAt BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .getRawOne();

    const deposits = parseFloat(depositsResult.total || '0');

    // Get withdrawals
    const withdrawalsResult = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'total')
      .where('transaction.type = :type', { type: TransactionType.WITHDRAWAL })
      .andWhere('transaction.createdAt BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .getRawOne();

    const withdrawals = parseFloat(withdrawalsResult.total || '0');

    // Get fees collected
    const feesResult = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'total')
      .where('transaction.type IN (:...types)', {
        types: [TransactionType.TRADE_FEE, TransactionType.SERVICE_FEE, TransactionType.ADMIN_ADJUSTMENT],
      })
      .andWhere('transaction.createdAt BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .getRawOne();

    const feesCollected = parseFloat(feesResult.total || '0');

    const report = {
      period: { dateFrom, dateTo },
      deposits,
      withdrawals,
      feesCollected,
      netRevenue: feesCollected - withdrawals,
    };

    // Cache the result
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(report));

    return report;
  }

  async getTopUsers(metric: 'trades' | 'revenue' | 'reputation', limit: number = 10): Promise<any[]> {
    const cacheKey = `top_users:${metric}:${limit}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    let query;
    switch (metric) {
      case 'trades':
        query = this.userRepository
          .createQueryBuilder('user')
          .select(['user.id', 'user.username', 'COUNT(trade.id) as tradeCount'])
          .leftJoin('user.trades', 'trade')
          .groupBy('user.id')
          .orderBy('tradeCount', 'DESC')
          .limit(limit);
        break;
      case 'revenue':
        query = this.userRepository
          .createQueryBuilder('user')
          .select(['user.id', 'user.username', 'SUM(transaction.amount) as totalRevenue'])
          .leftJoin('user.transactions', 'transaction')
          .where('transaction.type IN (:...types)', {
            types: [TransactionType.TRADE_FEE, TransactionType.SERVICE_FEE],
          })
          .groupBy('user.id')
          .orderBy('totalRevenue', 'DESC')
          .limit(limit);
        break;
      case 'reputation':
        // Would need reputation system implementation
        query = this.userRepository
          .createQueryBuilder('user')
          .select(['user.id', 'user.username'])
          .orderBy('user.createdAt', 'ASC') // Placeholder
          .limit(limit);
        break;
      default:
        throw new Error('Invalid metric');
    }

    const results = await query.getMany();
    const topUsers = results.map(user => ({
      id: user.id,
      username: user.username,
      metric: metric === 'trades' ? (user as any).tradeCount : metric === 'revenue' ? (user as any).totalRevenue : 0,
    }));

    // Cache the result
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(topUsers));

    return topUsers;
  }

  async getRecentActivity(limit: number = 20): Promise<any> {
    const cacheKey = `recent_activity:${limit}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Get recent trades
    const recentTrades = await this.tradeRepository
      .find({
        order: { createdAt: 'DESC' },
        take: Math.floor(limit / 4),
      });

    // Get recent disputes
    const recentDisputes = await this.tradeDisputeRepository
      .find({
        order: { createdAt: 'DESC' },
        take: Math.floor(limit / 4),
      });

    // Get recent user registrations
    const recentUsers = await this.userRepository
      .find({
        order: { createdAt: 'DESC' },
        take: Math.floor(limit / 4),
      });

    // Get recent admin actions (would need audit log implementation)
    const recentActions = []; // Placeholder

    const activity = {
      trades: recentTrades,
      disputes: recentDisputes,
      userRegistrations: recentUsers,
      adminActions: recentActions,
    };

    // Cache the result
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(activity));

    return activity;
  }

  async getAlerts(): Promise<any[]> {
    const alerts: any[] = [];

    // Check for offline bots
    const offlineBots = await this.botRepository.count({ where: { status: 'OFFLINE' } });
    if (offlineBots > 0) {
      alerts.push({
        type: 'CRITICAL',
        category: 'BOTS',
        message: `${offlineBots} bot(s) are offline`,
        timestamp: new Date(),
      });
    }

    // Check for failed trades threshold
    const failedTradesToday = await this.tradeRepository.count({
      where: {
        status: In([TradeStatus.FAILED, TradeStatus.CANCELLED, TradeStatus.DECLINED]),
        createdAt: Between(
          new Date(new Date().setHours(0, 0, 0, 0)),
          new Date(new Date().setHours(23, 59, 59, 999)),
        ),
      },
    });

    if (failedTradesToday > 10) { // Threshold
      alerts.push({
        type: 'WARNING',
        category: 'TRADING',
        message: `${failedTradesToday} failed trades today (above threshold)`,
        timestamp: new Date(),
      });
    }

    // Check for pending disputes threshold
    const pendingDisputes = await this.tradeDisputeRepository.count({
      where: { status: DisputeStatus.OPEN },
    });

    if (pendingDisputes > 20) { // Threshold
      alerts.push({
        type: 'WARNING',
        category: 'DISPUTES',
        message: `${pendingDisputes} pending disputes (above threshold)`,
        timestamp: new Date(),
      });
    }

    return alerts;
  }

  // Helper methods
  private async checkDatabaseConnection(): Promise<boolean> {
    try {
      await this.userRepository.query('SELECT 1');
      return true;
    } catch (error) {
      this.logger.error('Database connection check failed', { error });
      return false;
    }
  }

  private async checkRedisConnection(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      this.logger.error('Redis connection check failed', { error });
      return false;
    }
  }

  private async getApiResponseTime(): Promise<number> {
    const start = Date.now();
    try {
      await this.userRepository.count();
      return Date.now() - start;
    } catch (error) {
      return -1; // Error indicator
    }
  }

  private async getCurrentBotLoad(botId: string): Promise<number> {
    // Simplified implementation - would need actual load calculation
    return Math.floor(Math.random() * 100);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updateCaches(): Promise<void> {
    this.logger.log('Updating dashboard caches');
    // This method would be called by cron to pre-populate caches
    // Implementation would depend on specific requirements
  }
}