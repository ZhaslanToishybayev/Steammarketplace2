import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Redis } from 'ioredis';
import { InjectRedis } from '@liaoliaots/nestjs-redis';

import { TradeDispute } from '../entities/trade-dispute.entity';
import { Trade } from '../../trading/entities/trade.entity';
import { TradeService } from '../../trading/services/trade.service';
import { TradeStatus } from '../../trading/entities/trade.entity';
import { AuditLogService } from './audit-log.service';
import { AuditTargetType } from '../entities/audit-log.entity';
import { DisputeStatus, DisputePriority, DisputeCategory, ResolutionType } from '../entities/trade-dispute.entity';
import { DisputeNotFoundException, DisputeAlreadyResolvedException, TradeDisputeAlreadyExistsException, TradeNotFoundException } from '../exceptions/admin.exception';
import { TransactionService } from '../../wallet/services/transaction.service';
import { TransactionType } from '../../wallet/entities/transaction.entity';

export interface DisputeFilters {
  status?: DisputeStatus;
  priority?: DisputePriority;
  assignedAdminId?: string;
  category?: DisputeCategory;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

@Injectable()
export class TradeDisputeService {
  private readonly CACHE_TTL = 600; // 10 minutes

  constructor(
    @InjectRepository(TradeDispute)
    private tradeDisputeRepository: Repository<TradeDispute>,
    @InjectRepository(Trade)
    private tradeRepository: Repository<Trade>,
    private tradeService: TradeService,
    private auditLogService: AuditLogService,
    private transactionService: TransactionService,
    @InjectRedis() private redis: Redis,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
  ) {}

  async createDispute(
    userId: string,
    tradeId: string,
    category: DisputeCategory,
    reason: string,
    evidence?: string[],
  ): Promise<TradeDispute> {
    // Verify trade exists
    const trade = await this.tradeRepository.findOne({ where: { id: tradeId } });
    if (!trade) {
      throw new TradeNotFoundException(tradeId);
    }

    // Check if dispute already exists for this trade
    const existingDispute = await this.tradeDisputeRepository.findOne({
      where: { tradeId },
    });

    if (existingDispute) {
      throw new TradeDisputeAlreadyExistsException(tradeId);
    }

    const dispute = this.tradeDisputeRepository.create({
      tradeId,
      userId,
      reportedBy: userId,
      status: DisputeStatus.OPEN,
      priority: DisputePriority.MEDIUM, // Default priority
      category,
      reason,
      evidence: evidence || [],
      adminNotes: null,
      resolution: null,
      resolutionType: null,
    });

    await this.tradeDisputeRepository.save(dispute);

    // Invalidate cache
    await this.invalidateDisputeCache();

    this.logger.log('Trade dispute created', {
      disputeId: dispute.id,
      tradeId,
      userId,
      category,
    });

    return dispute;
  }

  async getDisputes(
    filters: DisputeFilters,
    pagination: PaginationOptions = {},
  ): Promise<{ data: TradeDispute[]; total: number; page: number; limit: number }> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = pagination;

    const queryBuilder = this.tradeDisputeRepository.createQueryBuilder('dispute');

    // Apply filters
    if (filters.status) {
      queryBuilder.andWhere('dispute.status = :status', { status: filters.status });
    }

    if (filters.priority) {
      queryBuilder.andWhere('dispute.priority = :priority', { priority: filters.priority });
    }

    if (filters.assignedAdminId) {
      queryBuilder.andWhere('dispute.assignedAdminId = :assignedAdminId', {
        assignedAdminId: filters.assignedAdminId,
      });
    }

    if (filters.category) {
      queryBuilder.andWhere('dispute.category = :category', { category: filters.category });
    }

    if (filters.dateFrom && filters.dateTo) {
      queryBuilder.andWhere('dispute.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      });
    }

    // Join with related entities
    queryBuilder
      .leftJoinAndSelect('dispute.trade', 'trade')
      .leftJoinAndSelect('dispute.reporter', 'reporter')
      .leftJoinAndSelect('dispute.assignedAdmin', 'assignedAdmin');

    // Apply pagination
    const totalCount = await queryBuilder.getCount();
    const data = await queryBuilder
      .orderBy(`dispute.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data,
      total: totalCount,
      page,
      limit,
    };
  }

  async getDisputeById(disputeId: string): Promise<TradeDispute | null> {
    return this.tradeDisputeRepository.findOne({
      where: { id: disputeId },
      relations: ['trade', 'reporter', 'assignedAdmin'],
    });
  }

  async assignDispute(
    adminId: string,
    disputeId: string,
    assignedAdminId: string,
  ): Promise<TradeDispute> {
    const dispute = await this.getDisputeById(disputeId);
    if (!dispute) {
      throw new DisputeNotFoundException(disputeId);
    }

    const updateData: Partial<TradeDispute> = {
      assignedAdminId,
      status: DisputeStatus.IN_PROGRESS,
    };

    await this.tradeDisputeRepository.update(disputeId, updateData);

    // Invalidate cache
    await this.invalidateDisputeCache();

    // Log audit
    await this.auditLogService.logAction(
      adminId,
      'dispute.assign',
      AuditTargetType.DISPUTE,
      disputeId,
      { assignedAdminId: dispute.assignedAdminId, status: dispute.status },
      { assignedAdminId, status: DisputeStatus.IN_PROGRESS },
      { assignedAdminId },
    );

    this.logger.log('Dispute assigned', {
      adminId,
      disputeId,
      assignedAdminId,
    });

    return this.getDisputeById(disputeId) as Promise<TradeDispute>;
  }

  async updateDisputePriority(
    adminId: string,
    disputeId: string,
    priority: DisputePriority,
  ): Promise<TradeDispute> {
    const dispute = await this.getDisputeById(disputeId);
    if (!dispute) {
      throw new DisputeNotFoundException(disputeId);
    }

    await this.tradeDisputeRepository.update(disputeId, { priority });

    // Invalidate cache
    await this.invalidateDisputeCache();

    // Log audit
    await this.auditLogService.logAction(
      adminId,
      'dispute.update_priority',
      AuditTargetType.DISPUTE,
      disputeId,
      { priority: dispute.priority },
      { priority },
      {},
    );

    this.logger.log('Dispute priority updated', { adminId, disputeId, priority });

    return this.getDisputeById(disputeId) as Promise<TradeDispute>;
  }

  async addAdminNotes(
    adminId: string,
    disputeId: string,
    notes: string,
  ): Promise<TradeDispute> {
    const dispute = await this.getDisputeById(disputeId);
    if (!dispute) {
      throw new DisputeNotFoundException(disputeId);
    }

    const timestamp = new Date().toISOString();
    const newNote = `[${timestamp}] ${adminId}: ${notes}`;

    const updatedNotes = dispute.adminNotes
      ? `${dispute.adminNotes}\n\n${newNote}`
      : newNote;

    await this.tradeDisputeRepository.update(disputeId, { adminNotes: updatedNotes });

    // Log audit
    await this.auditLogService.logAction(
      adminId,
      'dispute.add_notes',
      AuditTargetType.DISPUTE,
      disputeId,
      { adminNotes: dispute.adminNotes },
      { adminNotes: updatedNotes },
      { notes },
    );

    this.logger.log('Admin notes added to dispute', { adminId, disputeId });

    return this.getDisputeById(disputeId) as Promise<TradeDispute>;
  }

  async resolveDispute(
    adminId: string,
    disputeId: string,
    resolutionType: ResolutionType,
    resolution: string,
    disputedAmount?: number,
  ): Promise<TradeDispute> {
    const dispute = await this.getDisputeById(disputeId);
    if (!dispute) {
      throw new DisputeNotFoundException(disputeId);
    }

    if (dispute.status === DisputeStatus.RESOLVED) {
      throw new DisputeAlreadyResolvedException(disputeId);
    }

    // Get the associated trade
    const trade = await this.tradeRepository.findOne({ where: { id: dispute.tradeId } });
    if (!trade) {
      throw new TradeNotFoundException(dispute.tradeId);
    }

    // Wrap dispute update and trade action in a transaction
    await this.tradeDisputeRepository.manager.transaction(async (transactionalEntityManager) => {
      // Perform trade action based on resolution type
      switch (resolutionType) {
        case ResolutionType.CANCEL:
          if ([TradeStatus.PENDING, TradeStatus.SENT].includes(trade.status)) {
            await this.tradeService.cancelTrade(dispute.tradeId, trade.userId);
          } else {
            throw new Error('Trade cannot be cancelled in its current status');
          }
          break;

        case ResolutionType.FORCE_COMPLETE:
          if (trade.status === TradeStatus.ACCEPTED) {
            await this.tradeService.completeTrade(dispute.tradeId);
          } else {
            throw new Error('Trade cannot be force completed in its current status');
          }
          break;

        case ResolutionType.REFUND:
          // Calculate refund amount (use disputedAmount if provided, otherwise full trade value)
          const refundAmount = disputedAmount || trade.totalValue;

          if (refundAmount <= 0) {
            throw new Error('Refund amount must be greater than 0');
          }

          // Create a refund transaction
          await this.transactionService.createTransaction(
            transactionalEntityManager,
            trade.userId,
            TransactionType.REFUND,
            refundAmount,
            {
              description: `Dispute refund for ${disputeId}`,
              metadata: {
                disputeId,
                tradeId: dispute.tradeId,
                resolution,
                originalTradeValue: trade.totalValue,
                refundAmount,
              },
            },
          );

          // Update trade metadata to mark it as refunded
          await transactionalEntityManager.update(Trade, dispute.tradeId, {
            metadata: {
              ...trade.metadata,
              refunded: true,
              refundedAt: new Date(),
              refundedByDispute: disputeId,
              refundAmount,
            },
          });
          break;

        case ResolutionType.NO_ACTION:
          // No trade action needed
          break;

        default:
          throw new Error(`Unknown resolution type: ${resolutionType}`);
      }

      // Update dispute status
      const updateData: Partial<TradeDispute> = {
        status: DisputeStatus.RESOLVED,
        resolutionType,
        resolution,
        resolvedAt: new Date(),
        resolvedBy: adminId,
      };

      await transactionalEntityManager.update(TradeDispute, disputeId, updateData);
    });

    // Invalidate cache
    await this.invalidateDisputeCache();

    // Log audit
    await this.auditLogService.logAction(
      adminId,
      'dispute.resolve',
      AuditTargetType.DISPUTE,
      disputeId,
      {
        status: dispute.status,
        resolutionType: dispute.resolutionType,
        resolution: dispute.resolution,
      },
      { status: DisputeStatus.RESOLVED, resolutionType, resolution },
      { resolutionType, resolution, tradeId: dispute.tradeId, disputedAmount },
    );

    this.logger.log('Dispute resolved', {
      adminId,
      disputeId,
      resolutionType,
      resolution,
      tradeId: dispute.tradeId,
      disputedAmount,
    });

    return this.getDisputeById(disputeId) as Promise<TradeDispute>;
  }

  async rejectDispute(
    adminId: string,
    disputeId: string,
    reason: string,
  ): Promise<TradeDispute> {
    const dispute = await this.getDisputeById(disputeId);
    if (!dispute) {
      throw new DisputeNotFoundException(disputeId);
    }

    if (dispute.status === DisputeStatus.RESOLVED) {
      throw new DisputeAlreadyResolvedException(disputeId);
    }

    const updateData: Partial<TradeDispute> = {
      status: DisputeStatus.REJECTED,
      resolution: reason,
      resolvedAt: new Date(),
    };

    await this.tradeDisputeRepository.update(disputeId, updateData);

    // Invalidate cache
    await this.invalidateDisputeCache();

    // Log audit
    await this.auditLogService.logAction(
      adminId,
      'dispute.reject',
      AuditTargetType.DISPUTE,
      disputeId,
      {
        status: dispute.status,
        resolution: dispute.resolution,
      },
      { status: DisputeStatus.REJECTED, resolution: reason },
      { reason },
    );

    this.logger.log('Dispute rejected', { adminId, disputeId, reason });

    return this.getDisputeById(disputeId) as Promise<TradeDispute>;
  }

  async getDisputeStatistics(): Promise<{
    total: number;
    byStatus: Record<DisputeStatus, number>;
    byPriority: Record<DisputePriority, number>;
    byCategory: Record<DisputeCategory, number>;
  }> {
    const cacheKey = 'dispute_statistics';
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const disputes = await this.tradeDisputeRepository.find();

    const byStatus = disputes.reduce((acc, dispute) => {
      acc[dispute.status] = (acc[dispute.status] || 0) + 1;
      return acc;
    }, {} as Record<DisputeStatus, number>);

    const byPriority = disputes.reduce((acc, dispute) => {
      acc[dispute.priority] = (acc[dispute.priority] || 0) + 1;
      return acc;
    }, {} as Record<DisputePriority, number>);

    const byCategory = disputes.reduce((acc, dispute) => {
      acc[dispute.category] = (acc[dispute.category] || 0) + 1;
      return acc;
    }, {} as Record<DisputeCategory, number>);

    const statistics = {
      total: disputes.length,
      byStatus,
      byPriority,
      byCategory,
    };

    // Cache the statistics
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(statistics));

    return statistics;
  }

  private async invalidateDisputeCache(): Promise<void> {
    const patterns = ['dispute_statistics'];
    for (const pattern of patterns) {
      await this.redis.del(pattern);
    }
  }
}