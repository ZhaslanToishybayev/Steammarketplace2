import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, LessThan, Not } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { BalanceService } from './balance.service';
import { TransactionService } from './transaction.service';
import { UserNotificationService } from '../../user/services/user-notification.service';
import { User } from '../../../auth/entities/user.entity';
import { Referral } from '../entities/referral.entity';
import { ReferralCode } from '../entities/referral-code.entity';
import { Transaction } from '../entities/transaction.entity';
import { TransactionType, TransactionStatus } from '../entities/transaction.entity';
import { ReferralStatus } from '../entities/referral.entity';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);
  private readonly REFERRAL_CACHE_TTL = 600; // 10 minutes

  constructor(
    @InjectRepository(Referral)
    private referralRepository: Repository<Referral>,
    @InjectRepository(ReferralCode)
    private referralCodeRepository: Repository<ReferralCode>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @Inject(CACHE_MANAGER)
    private cache: Cache,
    private dataSource: DataSource,
    private balanceService: BalanceService,
    private transactionService: TransactionService,
    private userNotificationService: UserNotificationService,
    private configService: ConfigService,
  ) {}

  async generateReferralCode(userId: string): Promise<ReferralCode> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if user exists
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new Error(`User with id ${userId} not found`);
      }

      // Check if user already has a referral code
      const existingCode = await this.referralCodeRepository.findOne({
        where: { userId },
      });

      if (existingCode) {
        await queryRunner.commitTransaction();
        return existingCode;
      }

      // Generate unique referral code
      let code: string;
      let isUnique = false;
      let attempts = 0;

      while (!isUnique && attempts < 10) {
        code = ReferralCode.generateCode(
          this.configService.get<number>('REFERRAL_CODE_LENGTH', 10),
        );

        const existingCode = await this.referralCodeRepository.findOne({
          where: { code },
        });

        if (!existingCode) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        throw new Error('Failed to generate unique referral code');
      }

      // Calculate expiry date
      const expiryDays = this.configService.get<number>('REFERRAL_EXPIRY_DAYS', 365);
      const expiresAt = expiryDays ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000) : null;

      const referralCode = this.referralCodeRepository.create({
        userId,
        code,
        isActive: true,
        usageCount: 0,
        maxUsages: null, // unlimited
        bonusPercentage: this.configService.get<number>('REFERRAL_BONUS_PERCENTAGE', 5.00),
        expiresAt,
      });

      const savedCode = await queryRunner.manager.save(referralCode);

      await queryRunner.commitTransaction();

      this.logger.log(`Referral code generated for user ${userId}: ${code}`);
      return savedCode;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to generate referral code for user ${userId}:`, error.message);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getReferralCode(userId: string): Promise<ReferralCode | null> {
    const cacheKey = `referral:code:${userId}`;
    const cachedCode = await this.cache.get<ReferralCode>(cacheKey);

    if (cachedCode) {
      this.logger.debug(`Cache hit for referral code: ${userId}`);
      return cachedCode;
    }

    const referralCode = await this.referralCodeRepository.findOne({
      where: { userId, isActive: true },
    });

    if (referralCode) {
      await this.cache.set(cacheKey, referralCode, this.REFERRAL_CACHE_TTL);
    }

    return referralCode;
  }

  async validateReferralCode(code: string): Promise<ReferralCode | null> {
    const cacheKey = `referral:validate:${code}`;
    const cachedCode = await this.cache.get<ReferralCode>(cacheKey);

    if (cachedCode) {
      this.logger.debug(`Cache hit for referral code validation: ${code}`);
      return cachedCode;
    }

    const referralCode = await this.referralCodeRepository.findOne({
      where: { code, isActive: true },
      relations: ['user'],
    });

    if (!referralCode || !referralCode.isUsable) {
      return null;
    }

    await this.cache.set(cacheKey, referralCode, this.REFERRAL_CACHE_TTL);
    return referralCode;
  }

  async applyReferralCode(newUserId: string, code: string): Promise<Referral> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if new user exists
      const newUser = await this.userRepository.findOne({ where: { id: newUserId } });
      if (!newUser) {
        throw new Error(`New user with id ${newUserId} not found`);
      }

      // Validate referral code
      const referralCode = await this.referralCodeRepository.findOne({
        where: { code, isActive: true },
        relations: ['user'],
      });

      if (!referralCode) {
        throw new Error('Invalid referral code');
      }

      if (!referralCode.isUsable) {
        throw new Error('Referral code is not usable');
      }

      // Check if user is already referred
      const existingReferral = await this.referralRepository.findOne({
        where: { refereeId: newUserId },
      });

      if (existingReferral) {
        throw new Error('User is already referred by someone else');
      }

      // Check if user is trying to refer themselves
      if (referralCode.userId === newUserId) {
        throw new Error('Cannot refer yourself');
      }

      const referrerId = referralCode.userId;

      // Check if referrer exists and is valid
      const referrer = await this.userRepository.findOne({ where: { id: referrerId } });
      if (!referrer) {
        throw new Error('Referrer not found');
      }

      // Create referral
      const referral = this.referralRepository.create({
        referrerId,
        refereeId: newUserId,
        referralCodeId: referralCode.id,
        status: 'pending',
        bonusAmount: this.configService.get<number>('REFERRAL_BONUS_AMOUNT', 5.00),
        refereeBonusAmount: this.configService.get<number>('REFERRAL_REFEREE_BONUS_AMOUNT', 2.00),
        requirementsMet: false,
        bonusPaid: false,
        expiresAt: referralCode.expiresAt,
        metadata: {
          appliedCode: code,
        },
      });

      const savedReferral = await queryRunner.manager.save(referral);

      // Increment usage count
      referralCode.usageCount += 1;
      await queryRunner.manager.save(referralCode);

      await queryRunner.commitTransaction();

      // Invalidate cache
      await Promise.all([
        this.cache.del(`referral:code:${referrerId}`),
        this.cache.del(`referral:validate:${code}`),
      ]);

      // Send notification to referrer
      try {
        await this.userNotificationService.sendReferralNotification(
          referrerId,
          savedReferral.id,
          'friend_registered',
        );
      } catch (notificationError) {
        this.logger.warn(`Failed to send referral notification:`, notificationError.message);
      }

      this.logger.log(`Referral code ${code} applied by user ${newUserId} for referrer ${referrerId}`);
      return savedReferral;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to apply referral code ${code} for user ${newUserId}:`, error.message);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getReferrals(
    userId: string,
    pagination: { page?: number; limit?: number } = { page: 1, limit: 20 },
  ): Promise<{
    referrals: Referral[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [referrals, total] = await this.referralRepository.findAndCount({
      where: { referrerId: userId },
      relations: ['referee', 'referralCode'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      referrals,
      total,
      page,
      limit,
    };
  }

  async checkReferralRequirements(referralId: string): Promise<boolean> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const referral = await queryRunner.manager.findOne(Referral, {
        where: { id: referralId },
        relations: ['referee'],
      });

      if (!referral) {
        throw new Error(`Referral ${referralId} not found`);
      }

      if (referral.requirementsMet) {
        await queryRunner.commitTransaction();
        return true;
      }

      // Check if requirements are met
      const requirementsMet = await this.checkUserRequirements(referral.refereeId);

      if (requirementsMet) {
        referral.requirementsMet = true;
        referral.requirementsMetAt = new Date();
        referral.status = ReferralStatus.ACTIVE;

        await queryRunner.manager.save(referral);

        this.logger.log(`Referral requirements met for referral ${referralId}`);
      }

      await queryRunner.commitTransaction();
      return requirementsMet;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to check referral requirements for ${referralId}:`, error.message);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async payReferralBonus(referralId: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const referral = await queryRunner.manager.findOne(Referral, {
        where: { id: referralId },
        relations: ['referrer', 'referee'],
      });

      if (!referral) {
        throw new Error(`Referral ${referralId} not found`);
      }

      if (!referral.requirementsMet) {
        throw new Error('Referral requirements not met');
      }

      if (referral.bonusPaid) {
        throw new Error('Referral bonus already paid');
      }

      if (referral.status !== ReferralStatus.ACTIVE) {
        throw new Error('Referral is not active');
      }

      // Ensure balances exist
      await this.balanceService.ensureBalanceExists(referral.referrerId);
      await this.balanceService.ensureBalanceExists(referral.refereeId);

      // Create transactions for bonuses
      const referrerTransaction = await this.transactionService.createTransaction(
        queryRunner.manager,
        referral.referrerId,
        TransactionType.REFERRAL_BONUS,
        referral.bonusAmount,
        {
          description: `Referral bonus for ${referral.referee.username}`,
          referralId,
        },
      );

      const refereeTransaction = await this.transactionService.createTransaction(
        queryRunner.manager,
        referral.refereeId,
        TransactionType.REFERRAL_BONUS,
        referral.refereeBonusAmount,
        {
          description: `Referral bonus for joining via ${referral.referrer.username}`,
          referralId,
        },
      );

      // Complete transactions
      await this.transactionService.completeTransaction(referrerTransaction.id);
      await this.transactionService.completeTransaction(refereeTransaction.id);

      // Update referral status
      referral.bonusPaid = true;
      referral.bonusPaidAt = new Date();
      referral.status = ReferralStatus.COMPLETED;

      await queryRunner.manager.save(referral);

      await queryRunner.commitTransaction();

      // Send notifications
      try {
        await this.userNotificationService.sendReferralNotification(
          referral.referrerId,
          referralId,
          'bonus_earned',
          referral.bonusAmount,
          'USD',
        );

        await this.userNotificationService.sendReferralNotification(
          referral.refereeId,
          referralId,
          'bonus_earned',
          referral.refereeBonusAmount,
          'USD',
        );
      } catch (notificationError) {
        this.logger.warn(`Failed to send bonus notifications:`, notificationError.message);
      }

      this.logger.log(`Referral bonus paid for referral ${referralId}`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to pay referral bonus for ${referralId}:`, error.message);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getReferralStatistics(userId: string): Promise<{
    totalReferrals: number;
    activeReferrals: number;
    completedReferrals: number;
    pendingReferrals: number;
    totalReferralEarnings: number;
    pendingEarnings: number;
  }> {
    const cacheKey = `referral:statistics:${userId}`;
    const cachedStats = await this.cache.get(cacheKey);

    if (cachedStats) {
      this.logger.debug(`Cache hit for referral statistics: ${userId}`);
      return cachedStats;
    }

    const [
      totalReferrals,
      activeReferrals,
      completedReferrals,
      pendingReferrals,
      totalReferralEarnings,
      pendingEarnings,
    ] = await Promise.all([
      this.referralRepository.count({ where: { referrerId: userId } }),
      this.referralRepository.count({
        where: { referrerId: userId, status: ReferralStatus.ACTIVE },
      }),
      this.referralRepository.count({
        where: { referrerId: userId, status: ReferralStatus.COMPLETED },
      }),
      this.referralRepository.count({
        where: { referrerId: userId, status: ReferralStatus.PENDING },
      }),
      this.transactionRepository
        .createQueryBuilder('transaction')
        .select('COALESCE(SUM(transaction.amount), 0)', 'total')
        .where('transaction.userId = :userId', { userId })
        .andWhere('transaction.type = :type', { type: TransactionType.REFERRAL_BONUS })
        .getRawOne(),
      this.referralRepository
        .createQueryBuilder('referral')
        .select('COALESCE(SUM(referral.bonusAmount), 0)', 'pending')
        .where('referral.referrerId = :userId', { userId })
        .andWhere('referral.requirementsMet = :requirementsMet', { requirementsMet: true })
        .andWhere('referral.bonusPaid = :bonusPaid', { bonusPaid: false })
        .getRawOne(),
    ]);

    const statistics = {
      totalReferrals,
      activeReferrals,
      completedReferrals,
      pendingReferrals,
      totalReferralEarnings: parseFloat(totalReferralEarnings.total) || 0,
      pendingEarnings: parseFloat(pendingEarnings.pending) || 0,
    };

    await this.cache.set(cacheKey, statistics, this.REFERRAL_CACHE_TTL);
    return statistics;
  }

  async updateReferralStatus(referralId: string, status: string): Promise<Referral> {
    const referral = await this.referralRepository.findOne({ where: { id: referralId } });

    if (!referral) {
      throw new Error(`Referral ${referralId} not found`);
    }

    referral.status = status;
    const updatedReferral = await this.referralRepository.save(referral);

    this.logger.log(`Referral ${referralId} status updated to ${status}`);
    return updatedReferral;
  }

  private async checkUserRequirements(userId: string): Promise<boolean> {
    try {
      const requirements = {
        firstTrade: this.configService.get<boolean>('REFERRAL_REQUIREMENT_FIRST_TRADE', true),
        minTradeValue: this.configService.get<number>('REFERRAL_REQUIREMENT_MIN_TRADE_VALUE', 10.00),
      };

      if (!requirements.firstTrade) {
        return true;
      }

      // Check if user has completed at least one trade with minimum value
      const completedTradesCount = await this.dataSource.getRepository(Transaction).count({
        where: {
          userId,
          type: TransactionType.TRADE_CREDIT,
          status: TransactionStatus.COMPLETED,
          amount: requirements.minTradeValue ? MoreThanOrEqual(requirements.minTradeValue) : undefined,
        },
      });

      return completedTradesCount > 0;
    } catch (error) {
      this.logger.error(`Failed to check user requirements for ${userId}:`, error.message);
      return false;
    }
  }

  async getPendingReferrals(): Promise<Referral[]> {
    return this.referralRepository.find({
      where: { status: ReferralStatus.PENDING },
    });
  }

  async getEligibleForBonusReferrals(): Promise<Referral[]> {
    return this.referralRepository.find({
      where: {
        requirementsMet: true,
        bonusPaid: false,
      },
    });
  }

  async getExpirableReferrals(now: Date): Promise<Referral[]> {
    return this.referralRepository.find({
      where: {
        expiresAt: LessThan(now),
        status: Not(ReferralStatus.COMPLETED),
      },
    });
  }
    async getAllReferrals(filters: {
    referrerId?: string;
    refereeId?: string;
    status?: ReferralStatus;
    page?: number;
    limit?: number;
  }): Promise<{
    referrals: Referral[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { referrerId, refereeId, status, page = 1, limit = 20 } = filters;

    const query = this.referralRepository.createQueryBuilder('referral')
      .leftJoinAndSelect('referral.referrer', 'referrer')
      .leftJoinAndSelect('referral.referee', 'referee')
      .leftJoinAndSelect('referral.referralCode', 'referralCode');

    if (referrerId) {
      query.andWhere('referral.referrerId = :referrerId', { referrerId });
    }

    if (refereeId) {
      query.andWhere('referral.refereeId = :refereeId', { refereeId });
    }

    if (status) {
      query.andWhere('referral.status = :status', { status });
    }

    const [referrals, total] = await query
      .orderBy('referral.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      referrals,
      total,
      page,
      limit,
    };
  }
}