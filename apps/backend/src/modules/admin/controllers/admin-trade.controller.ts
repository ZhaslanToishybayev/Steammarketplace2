import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Inject, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Response } from 'express';
import { Logger } from 'winston';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../trading/guards/admin.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { TradeService } from '../../trading/services/trade.service';
import { TradeDisputeService } from '../services/trade-dispute.service';
import { AuditLogService } from '../services/audit-log.service';
import { TransactionService } from '../../wallet/services/transaction.service';
import { TransactionType } from '../../wallet/entities/transaction.entity';
import { TradeStatus } from '../../trading/entities/trade.entity';
import { CreateDisputeDto } from '../dto/create-dispute.dto';
import { GetDisputesDto } from '../dto/get-disputes.dto';
import { ResolveDisputeDto } from '../dto/resolve-dispute.dto';
import { RefundTradeDto } from '../dto/refund-trade.dto';
import { AuditTargetType } from '../entities/audit-log.entity';
import { DisputeStatus, ResolutionType } from '../entities/trade-dispute.entity';

@Controller('admin/trades')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiTags('Admin Trade Management')
@ApiBearerAuth()
export class AdminTradeController {
  constructor(
    private tradeService: TradeService,
    private tradeDisputeService: TradeDisputeService,
    private auditLogService: AuditLogService,
    private transactionService: TransactionService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get all trades with filters',
    description: 'Retrieve list of trades with optional filtering and pagination. Admin only endpoint.',
  })
  @ApiResponse({ status: 200, description: 'Trades retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getAllTrades(@Query() query: any): Promise<any> {
    // This would use the existing TradeService.getAllTrades method
    const result = await this.tradeService.getAllTrades(query);
    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
      message: 'Trades retrieved successfully',
    };
  }

  @Get(':tradeId')
  @ApiOperation({
    summary: 'Get trade by ID',
    description: 'Retrieve detailed information for a specific trade. Admin only endpoint.',
  })
  @ApiParam({ name: 'tradeId', type: 'string', description: 'Trade ID' })
  @ApiResponse({ status: 200, description: 'Trade retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Trade not found' })
  async getTradeById(@Param('tradeId') tradeId: string): Promise<any> {
    const trade = await this.tradeService.getTradeById(tradeId);
    return {
      success: true,
      data: trade,
      message: 'Trade retrieved successfully',
    };
  }

  @Post(':tradeId/force-complete')
  @ApiOperation({
    summary: 'Force complete trade',
    description: 'Manually complete a trade that may be stuck or need admin intervention. Admin only endpoint.',
  })
  @ApiParam({ name: 'tradeId', type: 'string', description: 'Trade ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Reason for force completing the trade',
          example: 'Trade was stuck in processing state',
        },
      },
      required: ['reason'],
    },
  })
  @ApiResponse({ status: 200, description: 'Trade force completed successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Trade not found' })
  async forceCompleteTrade(
    @CurrentUser('id') adminId: string,
    @Param('tradeId') tradeId: string,
    @Body() body: { reason: string },
  ): Promise<any> {
    const trade = await this.tradeService.getTradeById(tradeId);

    // Complete the trade using existing service
    const completedTrade = await this.tradeService.completeTrade(tradeId, 'ADMIN_FORCE_COMPLETE');

    // Log audit
    await this.auditLogService.logAction(
      adminId,
      'trade.force_complete',
      AuditTargetType.TRADE,
      tradeId,
      { status: trade.status },
      { status: 'COMPLETED' },
      { reason: body.reason },
    );

    this.logger.log('Trade force completed', { adminId, tradeId, reason: body.reason });

    return {
      success: true,
      data: completedTrade,
      message: 'Trade force completed successfully',
    };
  }

  @Post(':tradeId/force-cancel')
  @ApiOperation({
    summary: 'Force cancel trade',
    description: 'Manually cancel a trade that may be stuck or need admin intervention. Admin only endpoint.',
  })
  @ApiParam({ name: 'tradeId', type: 'string', description: 'Trade ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Reason for force canceling the trade',
          example: 'Trade was stuck in processing state',
        },
      },
      required: ['reason'],
    },
  })
  @ApiResponse({ status: 200, description: 'Trade force canceled successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Trade not found' })
  async forceCancelTrade(
    @CurrentUser('id') adminId: string,
    @Param('tradeId') tradeId: string,
    @Body() body: { reason: string },
  ): Promise<any> {
    const trade = await this.tradeService.getTradeById(tradeId);

    // Cancel the trade using existing service
    const canceledTrade = await this.tradeService.cancelTrade(tradeId, 'ADMIN_FORCE_CANCEL', body.reason);

    // Log audit
    await this.auditLogService.logAction(
      adminId,
      'trade.force_cancel',
      AuditTargetType.TRADE,
      tradeId,
      { status: trade.status },
      { status: 'CANCELLED' },
      { reason: body.reason },
    );

    this.logger.log('Trade force canceled', { adminId, tradeId, reason: body.reason });

    return {
      success: true,
      data: canceledTrade,
      message: 'Trade force canceled successfully',
    };
  }

  @Post(':tradeId/refund')
  @ApiOperation({
    summary: 'Refund trade',
    description: 'Create a refund for a trade and update its status. Admin only endpoint.',
  })
  @ApiParam({ name: 'tradeId', type: 'string', description: 'Trade ID' })
  @ApiBody({ type: RefundTradeDto })
  @ApiResponse({ status: 200, description: 'Trade refunded successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Trade not found' })
  async refundTrade(
    @CurrentUser('id') adminId: string,
    @Param('tradeId') tradeId: string,
    @Body() refundTradeDto: RefundTradeDto,
  ): Promise<any> {
    const trade = await this.tradeService.getTradeById(tradeId);

    // Determine transaction type based on refundToBalance flag
    const transactionType = refundTradeDto.refundToBalance
      ? TransactionType.ADMIN_ADJUSTMENT
      : TransactionType.REFUND;

    // Create refund transaction
    const refundTransaction = await this.transactionService.createTransaction({
      userId: trade.userId,
      amount: refundTradeDto.amount,
      type: transactionType,
      description: `Refund for trade ${tradeId}: ${refundTradeDto.reason}`,
      metadata: {
        tradeId,
        adminId,
        reason: refundTradeDto.reason,
        refundToBalance: refundTradeDto.refundToBalance,
      },
    });

    // Note: TradeStatus enum doesn't have a REFUNDED status
    // We'll keep the trade status as-is and document that refunds are tracked via transactions
    // If needed, you could add a REFUNDED status to TradeStatus enum

    // Log audit
    await this.auditLogService.logAction(
      adminId,
      'trade.refund',
      AuditTargetType.TRADE,
      tradeId,
      { status: trade.status },
      { status: trade.status }, // Trade status remains unchanged
      {
        amount: refundTradeDto.amount,
        reason: refundTradeDto.reason,
        refundToBalance: refundTradeDto.refundToBalance,
        transactionId: refundTransaction.id,
        transactionType: transactionType,
      },
    );

    this.logger.log('Trade refunded', {
      adminId,
      tradeId,
      amount: refundTradeDto.amount,
      reason: refundTradeDto.reason,
      refundToBalance: refundTradeDto.refundToBalance,
    });

    return {
      success: true,
      data: {
        trade,
        refundTransaction,
      },
      message: 'Trade refunded successfully',
    };
  }

  // Dispute management endpoints

  @Get('disputes')
  @ApiOperation({
    summary: 'Get all trade disputes',
    description: 'Retrieve list of trade disputes with optional filtering and pagination. Admin only endpoint.',
  })
  @ApiResponse({ status: 200, description: 'Disputes retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getDisputes(@Query() getDisputesDto: GetDisputesDto): Promise<any> {
    const result = await this.tradeDisputeService.getDisputes(
      getDisputesDto,
      {
        page: getDisputesDto.page,
        limit: getDisputesDto.limit,
        sortBy: getDisputesDto.sortBy,
        sortOrder: getDisputesDto.sortOrder,
      },
    );

    return {
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
      message: 'Disputes retrieved successfully',
    };
  }

  @Get('disputes/:disputeId')
  @ApiOperation({
    summary: 'Get dispute by ID',
    description: 'Retrieve detailed information for a specific trade dispute. Admin only endpoint.',
  })
  @ApiParam({ name: 'disputeId', type: 'string', description: 'Dispute ID' })
  @ApiResponse({ status: 200, description: 'Dispute retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  async getDisputeById(@Param('disputeId') disputeId: string): Promise<any> {
    const dispute = await this.tradeDisputeService.getDisputeById(disputeId);
    if (!dispute) {
      return {
        success: false,
        message: 'Dispute not found',
      };
    }

    return {
      success: true,
      data: dispute,
      message: 'Dispute retrieved successfully',
    };
  }

  @Post('disputes/:disputeId/assign')
  @ApiOperation({
    summary: 'Assign dispute to admin',
    description: 'Assign a dispute to a specific admin for resolution. Admin only endpoint.',
  })
  @ApiParam({ name: 'disputeId', type: 'string', description: 'Dispute ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        assignedAdminId: {
          type: 'string',
          description: 'ID of the admin to assign the dispute to',
          example: 'admin-user-id-123',
        },
      },
      required: ['assignedAdminId'],
    },
  })
  @ApiResponse({ status: 200, description: 'Dispute assigned successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  async assignDispute(
    @CurrentUser('id') adminId: string,
    @Param('disputeId') disputeId: string,
    @Body() body: { assignedAdminId: string },
  ): Promise<any> {
    const dispute = await this.tradeDisputeService.assignDispute(
      adminId,
      disputeId,
      body.assignedAdminId,
    );

    return {
      success: true,
      data: dispute,
      message: 'Dispute assigned successfully',
    };
  }

  @Patch('disputes/:disputeId/priority')
  @ApiOperation({
    summary: 'Update dispute priority',
    description: 'Update the priority level of a trade dispute. Admin only endpoint.',
  })
  @ApiParam({ name: 'disputeId', type: 'string', description: 'Dispute ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        priority: {
          type: 'string',
          enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
          description: 'New priority level',
          example: 'HIGH',
        },
      },
      required: ['priority'],
    },
  })
  @ApiResponse({ status: 200, description: 'Dispute priority updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  async updateDisputePriority(
    @CurrentUser('id') adminId: string,
    @Param('disputeId') disputeId: string,
    @Body() body: { priority: string },
  ): Promise<any> {
    const dispute = await this.tradeDisputeService.updateDisputePriority(
      adminId,
      disputeId,
      body.priority as any,
    );

    return {
      success: true,
      data: dispute,
      message: 'Dispute priority updated successfully',
    };
  }

  @Post('disputes/:disputeId/notes')
  @ApiOperation({
    summary: 'Add admin notes to dispute',
    description: 'Add administrative notes to a trade dispute. Admin only endpoint.',
  })
  @ApiParam({ name: 'disputeId', type: 'string', description: 'Dispute ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        notes: {
          type: 'string',
          description: 'Administrative notes',
          example: 'User provided insufficient evidence for scam claim',
        },
      },
      required: ['notes'],
    },
  })
  @ApiResponse({ status: 200, description: 'Admin notes added successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  async addAdminNotes(
    @CurrentUser('id') adminId: string,
    @Param('disputeId') disputeId: string,
    @Body() body: { notes: string },
  ): Promise<any> {
    const dispute = await this.tradeDisputeService.addAdminNotes(
      adminId,
      disputeId,
      body.notes,
    );

    return {
      success: true,
      data: dispute,
      message: 'Admin notes added successfully',
    };
  }

  @Post('disputes/:disputeId/resolve')
  @ApiOperation({
    summary: 'Resolve trade dispute',
    description: 'Resolve a trade dispute with a specific resolution type and explanation. Admin only endpoint.',
  })
  @ApiParam({ name: 'disputeId', type: 'string', description: 'Dispute ID' })
  @ApiBody({ type: ResolveDisputeDto })
  @ApiResponse({ status: 200, description: 'Dispute resolved successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  @ApiResponse({ status: 409, description: 'Dispute is already resolved' })
  async resolveDispute(
    @CurrentUser('id') adminId: string,
    @Param('disputeId') disputeId: string,
    @Body() resolveDisputeDto: ResolveDisputeDto,
  ): Promise<any> {
    const dispute = await this.tradeDisputeService.resolveDispute(
      adminId,
      disputeId,
      resolveDisputeDto.resolutionType as ResolutionType,
      resolveDisputeDto.resolution,
      resolveDisputeDto.disputedAmount,
    );

    // Log audit
    await this.auditLogService.logAction(
      adminId,
      'dispute.resolve',
      AuditTargetType.DISPUTE,
      disputeId,
      { status: 'IN_PROGRESS' },
      { status: DisputeStatus.RESOLVED },
      { resolutionType: resolveDisputeDto.resolutionType, resolution: resolveDisputeDto.resolution },
    );

    this.logger.log('Dispute resolved', {
      adminId,
      disputeId,
      resolutionType: resolveDisputeDto.resolutionType,
      resolution: resolveDisputeDto.resolution,
    });

    return {
      success: true,
      data: dispute,
      message: 'Dispute resolved successfully',
    };
  }

  @Post('disputes/:disputeId/reject')
  @ApiOperation({
    summary: 'Reject trade dispute',
    description: 'Reject a trade dispute with an explanation. Admin only endpoint.',
  })
  @ApiParam({ name: 'disputeId', type: 'string', description: 'Dispute ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Reason for rejecting the dispute',
          example: 'Insufficient evidence provided by user',
        },
      },
      required: ['reason'],
    },
  })
  @ApiResponse({ status: 200, description: 'Dispute rejected successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  @ApiResponse({ status: 409, description: 'Dispute is already resolved' })
  async rejectDispute(
    @CurrentUser('id') adminId: string,
    @Param('disputeId') disputeId: string,
    @Body() body: { reason: string },
  ): Promise<any> {
    const dispute = await this.tradeDisputeService.rejectDispute(
      adminId,
      disputeId,
      body.reason,
    );

    // Log audit
    await this.auditLogService.logAction(
      adminId,
      'dispute.reject',
      AuditTargetType.DISPUTE,
      disputeId,
      { status: 'IN_PROGRESS' },
      { status: DisputeStatus.REJECTED },
      { reason: body.reason },
    );

    this.logger.log('Dispute rejected', { adminId, disputeId, reason: body.reason });

    return {
      success: true,
      data: dispute,
      message: 'Dispute rejected successfully',
    };
  }

  @Get('disputes/statistics')
  @ApiOperation({
    summary: 'Get dispute statistics',
    description: 'Retrieve comprehensive statistics about trade disputes. Admin only endpoint.',
  })
  @ApiResponse({ status: 200, description: 'Dispute statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getDisputeStatistics(): Promise<any> {
    const statistics = await this.tradeDisputeService.getDisputeStatistics();

    return {
      success: true,
      data: statistics,
      message: 'Dispute statistics retrieved successfully',
    };
  }
}