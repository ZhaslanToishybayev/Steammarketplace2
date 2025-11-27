import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
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
import { Public } from '../../../auth/decorators/public.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';
import { User } from '../../../auth/entities/user.entity';
import { Balance } from '../entities/balance.entity';
import { TransactionType } from '../entities/transaction.entity';
import { BalanceService } from '../services/balance.service';
import { TransactionService } from '../services/transaction.service';
import { CryptoPaymentService } from '../services/crypto-payment.service';
import { FiatPaymentService } from '../services/fiat-payment.service';
import {
  CreateDepositDto,
  CreateWithdrawalDto,
  TransferDto,
} from '../dto';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Wallet')
@ApiBearerAuth()
export class WalletController {
  constructor(
    private balanceService: BalanceService,
    private transactionService: TransactionService,
    private cryptoPaymentService: CryptoPaymentService,
    private fiatPaymentService: FiatPaymentService,
    private configService: ConfigService,
  ) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get current user balance' })
  @ApiResponse({ status: 200, type: Balance })
  async getBalance(@CurrentUser() user: User): Promise<Balance> {
    return this.balanceService.getBalance(user.id);
  }

  @Post('deposit')
  @ApiOperation({ summary: 'Create deposit' })
  @ApiBody({ type: CreateDepositDto })
  @ApiResponse({ status: 201, description: 'Deposit created successfully' })
  async createDeposit(
    @CurrentUser() user: User,
    @Body() createDto: CreateDepositDto,
  ): Promise<{
    transactionId: string;
    paymentUrl?: string;
    paymentAddress?: string;
    metadata?: Record<string, any>;
  }> {
    const { amount, currency, paymentMethod, cryptocurrency, returnUrl, metadata } = createDto;

    // Validate amount limits
    const minDeposit = this.configService.get<number>('MIN_DEPOSIT_AMOUNT', 1);
    const maxDeposit = this.configService.get<number>('MAX_DEPOSIT_AMOUNT', 10000);

    if (amount < minDeposit || amount > maxDeposit) {
      throw new Error(`Deposit amount must be between ${minDeposit} and ${maxDeposit}`);
    }

    // Create transaction record
    const transaction = await this.transactionService.createTransaction(
      user.id,
      TransactionType.DEPOSIT,
      amount,
      {
        paymentMethod,
        cryptocurrency,
        returnUrl,
        ...metadata,
      },
    );

    // Process deposit based on payment method
    if (paymentMethod === 'crypto') {
      const result = await this.cryptoPaymentService.createDeposit({
        userId: user.id,
        amount,
        currency,
        metadata: {
          transactionId: transaction.id,
          cryptocurrency,
          returnUrl,
          ...metadata,
        },
      });

      // Update transaction with external transaction ID if available
      if (result.metadata?.externalTransactionId) {
        await this.transactionService.updateTransactionMetadata(transaction.id, {
          externalTransactionId: result.metadata.externalTransactionId,
        });
      }

      // Enqueue deposit processing job
      await this.transactionService.processDeposit(transaction.id);

      return {
        transactionId: transaction.id,
        paymentUrl: result.paymentUrl,
        paymentAddress: result.paymentAddress,
        metadata: result.metadata,
      };
    } else {
      const result = await this.fiatPaymentService.createDeposit({
        userId: user.id,
        amount,
        currency,
        metadata: {
          transactionId: transaction.id,
          paymentMethod,
          returnUrl,
          ...metadata,
        },
      });

      // Update transaction with external transaction ID if available
      if (result.metadata?.externalTransactionId) {
        await this.transactionService.updateTransactionMetadata(transaction.id, {
          externalTransactionId: result.metadata.externalTransactionId,
        });
      }

      // Enqueue deposit processing job
      await this.transactionService.processDeposit(transaction.id);

      return {
        transactionId: transaction.id,
        paymentUrl: result.paymentUrl,
        metadata: result.metadata,
      };
    }
  }

  @Get('deposit/address/:cryptocurrency')
  @ApiOperation({ summary: 'Get crypto deposit address' })
  @ApiParam({ name: 'cryptocurrency', type: 'string', enum: ['BTC', 'ETH', 'USDT', 'LTC'] })
  @ApiResponse({ status: 200, description: 'Deposit address' })
  async getDepositAddress(
    @CurrentUser() user: User,
    @Param('cryptocurrency') cryptocurrency: string,
  ): Promise<{
    address: string;
    cryptocurrency: string;
    userId: string;
    expiresAt: Date;
  }> {
    const address = await this.cryptoPaymentService.createDepositAddress(
      user.id,
      cryptocurrency,
    );

    return {
      address,
      cryptocurrency,
      userId: user.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'Create withdrawal' })
  @ApiBody({ type: CreateWithdrawalDto })
  @ApiResponse({ status: 201, description: 'Withdrawal created successfully' })
  async createWithdrawal(
    @CurrentUser() user: User,
    @Body() createDto: CreateWithdrawalDto,
  ): Promise<{
    transactionId: string;
    payoutId?: string;
    metadata?: Record<string, any>;
  }> {
    const { amount, currency, paymentMethod, destination, cryptocurrency, metadata } = createDto;

    // Validate amount limits
    const minWithdrawal = this.configService.get<number>('MIN_WITHDRAWAL_AMOUNT', 10);
    const maxWithdrawal = this.configService.get<number>('MAX_WITHDRAWAL_AMOUNT', 10000);
    const dailyLimit = this.configService.get<number>('DAILY_WITHDRAWAL_LIMIT', 5000);

    if (amount < minWithdrawal || amount > maxWithdrawal) {
      throw new Error(`Withdrawal amount must be between ${minWithdrawal} and ${maxWithdrawal}`);
    }

    // Check daily limit (simplified - would need actual daily tracking)
    // const dailyWithdrawn = await this.transactionService.getUserDailyWithdrawal(user.id);
    // if (dailyWithdrawn + amount > dailyLimit) {
    //   throw new Error(`Daily withdrawal limit exceeded`);
    // }

    // Lock funds for withdrawal
    await this.balanceService.lockFunds(user.id, amount);

    // Create withdrawal transaction
    const transaction = await this.transactionService.createTransaction(
      user.id,
      TransactionType.WITHDRAWAL,
      amount,
      {
        paymentMethod,
        destination,
        cryptocurrency,
        ...metadata,
      },
    );

    // Process withdrawal based on payment method
    if (paymentMethod === 'crypto') {
      const result = await this.cryptoPaymentService.createWithdrawal({
        userId: user.id,
        amount,
        currency,
        destination,
        metadata: {
          transactionId: transaction.id,
          cryptocurrency,
          ...metadata,
        },
      });

      // Update transaction with external transaction ID if available
      if (result.metadata?.externalTransactionId) {
        await this.transactionService.updateTransactionMetadata(transaction.id, {
          externalTransactionId: result.metadata.externalTransactionId,
        });
      }

      // Enqueue withdrawal processing job
      await this.transactionService.processWithdrawal(transaction.id);

      return {
        transactionId: transaction.id,
        payoutId: result.payoutId,
        metadata: result.metadata,
      };
    } else {
      const result = await this.fiatPaymentService.createWithdrawal({
        userId: user.id,
        amount,
        currency,
        destination,
        metadata: {
          transactionId: transaction.id,
          paymentMethod,
          ...metadata,
        },
      });

      // Update transaction with external transaction ID if available
      if (result.metadata?.externalTransactionId) {
        await this.transactionService.updateTransactionMetadata(transaction.id, {
          externalTransactionId: result.metadata.externalTransactionId,
        });
      }

      // Enqueue withdrawal processing job
      await this.transactionService.processWithdrawal(transaction.id);

      return {
        transactionId: transaction.id,
        payoutId: result.payoutId,
        metadata: result.metadata,
      };
    }
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer funds between users' })
  @ApiBody({ type: TransferDto })
  @ApiResponse({ status: 200, description: 'Transfer completed successfully' })
  async transferFunds(
    @CurrentUser() fromUser: User,
    @Body() transferDto: TransferDto,
  ): Promise<{
    fromBalance: Balance;
    toBalance: Balance;
    transactionId: string;
  }> {
    const { toUserId, amount, description } = transferDto;

    if (amount <= 0) {
      throw new Error('Transfer amount must be greater than 0');
    }

    if (toUserId === fromUser.id) {
      throw new Error('Cannot transfer to yourself');
    }

    // Ensure both users have balances
    await this.balanceService.ensureBalanceExists(fromUser.id);
    await this.balanceService.ensureBalanceExists(toUserId);

    const result = await this.balanceService.transferFunds(
      fromUser.id,
      toUserId,
      amount,
      description,
    );

    return {
      fromBalance: result.fromBalance,
      toBalance: result.toBalance,
      transactionId: `transfer_${Date.now()}`,
    };
  }

  @Post('webhook/crypto')
  @Public()
  @ApiOperation({ summary: 'Crypto payment webhook' })
  @ApiBody({ description: 'Webhook payload' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleCryptoWebhook(@Body() payload: any): Promise<{ success: boolean }> {
    const result = await this.cryptoPaymentService.handleWebhook({
      payload,
      signature: payload.signature,
    });

    return { success: result.success };
  }

  @Post('webhook/stripe')
  @Public()
  @ApiOperation({ summary: 'Stripe payment webhook' })
  @ApiBody({ description: 'Stripe webhook payload' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleStripeWebhook(@Body() payload: any): Promise<{ success: boolean }> {
    const result = await this.fiatPaymentService.handleWebhook({
      payload,
      signature: payload['stripe-signature'],
    });

    return { success: result.success };
  }

  @Post('webhook/paypal')
  @Public()
  @ApiOperation({ summary: 'PayPal payment webhook' })
  @ApiBody({ description: 'PayPal webhook payload' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handlePayPalWebhook(@Body() payload: any): Promise<{ success: boolean }> {
    const result = await this.fiatPaymentService.handleWebhook({
      payload,
      signature: payload['auth-alg'],
    });

    return { success: result.success };
  }
}