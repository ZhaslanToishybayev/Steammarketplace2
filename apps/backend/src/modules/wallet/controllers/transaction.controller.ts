import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../../auth/guards/admin.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { User } from '../../../auth/entities/user.entity';
import { Transaction } from '../entities/transaction.entity';
import { TransactionService } from '../services/transaction.service';
import { BalanceService } from '../services/balance.service';
import { TransactionType, TransactionStatus } from '../entities/transaction.entity';
import { GetTransactionsDto, CreateAdjustmentDto, UpdateTransactionStatusDto } from '../dto';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Transactions')
@ApiBearerAuth()
export class TransactionController {
  constructor(
    private transactionService: TransactionService,
    private balanceService: BalanceService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get user transactions with filtering' })
  @ApiQuery({ name: 'types', type: [String], required: false, description: 'Transaction types' })
  @ApiQuery({ name: 'status', type: [String], required: false, description: 'Transaction statuses' })
  @ApiQuery({ name: 'dateFrom', type: 'string', format: 'date', required: false })
  @ApiQuery({ name: 'dateTo', type: 'string', format: 'date', required: false })
  @ApiQuery({ name: 'page', type: 'number', required: false, default: 1 })
  @ApiQuery({ name: 'limit', type: 'number', required: false, default: 20 })
  @ApiResponse({ status: 200, type: [Transaction] })
  async getUserTransactions(
    @CurrentUser() user: User,
    @Query() getTransactionsDto: GetTransactionsDto,
  ): Promise<{
    transactions: Transaction[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { types, status, dateFrom, dateTo, page, limit, sortBy, sortOrder } = getTransactionsDto;

    return this.transactionService.getUserTransactions(
      user.id,
      {
        types: types as TransactionType[],
        statuses: status as TransactionStatus[],
        dateFrom,
        dateTo,
        sortBy,
        sortOrder,
      },
      { page, limit },
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiParam({ name: 'id', type: 'uuid', description: 'Transaction ID' })
  @ApiResponse({ status: 200, type: Transaction })
  async getTransaction(@Param('id') id: string): Promise<Transaction> {
    return this.transactionService.getTransaction(id);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get transaction statistics' })
  @ApiResponse({ status: 200, description: 'Transaction statistics' })
  async getTransactionStatistics(@CurrentUser() user: User): Promise<any> {
    return this.transactionService.getTransactionStatistics(user.id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel pending transaction' })
  @ApiParam({ name: 'id', type: 'uuid', description: 'Transaction ID' })
  @ApiResponse({ status: 200, type: Transaction })
  async cancelTransaction(@CurrentUser() user: User, @Param('id') id: string): Promise<Transaction> {
    const transaction = await this.transactionService.getTransaction(id);

    if (transaction.userId !== user.id) {
      throw new Error('You can only cancel your own transactions');
    }

    return this.transactionService.cancelTransaction(id);
  }

  // Admin endpoints

  @Get('admin/all')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get all transactions (Admin only)' })
  @ApiQuery({ name: 'types', type: [String], required: false })
  @ApiQuery({ name: 'status', type: [String], required: false })
  @ApiQuery({ name: 'userId', type: 'string', required: false })
  @ApiQuery({ name: 'page', type: 'number', required: false, default: 1 })
  @ApiQuery({ name: 'limit', type: 'number', required: false, default: 20 })
  @ApiResponse({ status: 200, type: [Transaction] })
  async getAllTransactions(
    @Query() filters: {
      types?: string[];
      status?: string[];
      userId?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{
    transactions: Transaction[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { types, status, userId, page = 1, limit = 20 } = filters;

    let query: any = {};
    if (userId) {
      query.userId = userId;
    }

    return this.transactionService.getUserTransactions(
      userId || '',
      {
        types: types as TransactionType[],
        statuses: status as TransactionStatus[],
      },
      { page, limit },
    );
  }

  @Put('admin/:id/status')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update transaction status (Admin only)' })
  @ApiParam({ name: 'id', type: 'uuid', description: 'Transaction ID' })
  @ApiBody({ type: UpdateTransactionStatusDto })
  @ApiResponse({ status: 200, type: Transaction })
  async updateTransactionStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateTransactionStatusDto,
  ): Promise<Transaction> {
    return this.transactionService.updateTransactionStatus(
      id,
      updateDto.status,
      updateDto.metadata,
    );
  }

  @Post('admin/adjust')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create admin balance adjustment (Admin only)' })
  @ApiBody({ type: CreateAdjustmentDto })
  @ApiResponse({ status: 200, type: Transaction })
  async createAdjustment(
    @CurrentUser() admin: User,
    @Body() adjustmentDto: CreateAdjustmentDto,
  ): Promise<Transaction> {
    const { userId, amount, reason, metadata } = adjustmentDto;

    // Ensure user exists
    const user = await this.balanceService.getBalance(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Create adjustment transaction
    const transaction = await this.transactionService.createTransaction(
      userId,
      amount >= 0 ? TransactionType.ADMIN_ADJUSTMENT : TransactionType.ADMIN_DEBIT,
      Math.abs(amount),
      {
        reason,
        adjustedBy: admin.id,
        processedBy: admin.id,
        ...metadata,
      },
    );

    // Complete the transaction
    const completedTransaction = await this.transactionService.completeTransaction(
      transaction.id,
    );

    return completedTransaction;
  }

  @Get('admin/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get transaction details (Admin only)' })
  @ApiParam({ name: 'id', type: 'uuid', description: 'Transaction ID' })
  @ApiResponse({ status: 200, type: Transaction })
  async getAdminTransaction(@Param('id') id: string): Promise<Transaction> {
    return this.transactionService.getTransaction(id);
  }

  @Delete('admin/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Delete transaction (Admin only)' })
  @ApiParam({ name: 'id', type: 'uuid', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Transaction deleted successfully' })
  async deleteTransaction(@Param('id') id: string): Promise<void> {
    const transaction = await this.transactionService.getTransaction(id);
    if (!transaction) {
      throw new Error(`Transaction ${id} not found`);
    }

    // Soft delete by setting status to cancelled
    await this.transactionService.updateTransactionStatus(id, TransactionStatus.CANCELLED);
  }
}