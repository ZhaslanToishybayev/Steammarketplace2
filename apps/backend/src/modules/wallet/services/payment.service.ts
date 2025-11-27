import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PaymentProviderMetadata {
  externalTransactionId?: string;
  paymentMethod?: string;
  provider?: string;
  metadata?: Record<string, any>;
}

export interface CreateDepositDto extends PaymentProviderMetadata {
  userId: string;
  amount: number;
  currency: string;
  description?: string;
}

export interface ProcessDepositDto {
  transactionId: string;
  externalTransactionId: string;
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
}

export interface CreateWithdrawalDto extends PaymentProviderMetadata {
  userId: string;
  amount: number;
  currency: string;
  destination: string;
  description?: string;
}

export interface ProcessWithdrawalDto {
  transactionId: string;
  externalTransactionId: string;
  amount: number;
  currency: string;
  destination: string;
  metadata?: Record<string, any>;
}

export interface VerifyPaymentDto {
  externalTransactionId: string;
  metadata?: Record<string, any>;
}

export interface HandleWebhookDto {
  payload: any;
  signature?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export abstract class PaymentService {
  protected readonly logger = new Logger(PaymentService.name);

  constructor(protected configService: ConfigService) {}

  // Abstract methods that must be implemented by concrete providers
  abstract createDeposit(data: CreateDepositDto): Promise<{
    transactionId: string;
    paymentUrl?: string;
    paymentAddress?: string;
    metadata?: Record<string, any>;
  }>;

  abstract processDeposit(data: ProcessDepositDto): Promise<{
    success: boolean;
    transactionId: string;
    externalTransactionId: string;
    metadata?: Record<string, any>;
  }>;

  abstract createWithdrawal(data: CreateWithdrawalDto): Promise<{
    transactionId: string;
    payoutId?: string;
    metadata?: Record<string, any>;
  }>;

  abstract processWithdrawal(data: ProcessWithdrawalDto): Promise<{
    success: boolean;
    transactionId: string;
    payoutId: string;
    metadata?: Record<string, any>;
  }>;

  abstract verifyPayment(data: VerifyPaymentDto): Promise<{
    success: boolean;
    status: string;
    amount: number;
    currency: string;
    metadata?: Record<string, any>;
  }>;

  abstract getPaymentStatus(transactionId: string): Promise<{
    status: string;
    amount: number;
    currency: string;
    metadata?: Record<string, any>;
  }>;

  abstract handleWebhook(data: HandleWebhookDto): Promise<{
    success: boolean;
    type: string;
    transactionId?: string;
    metadata?: Record<string, any>;
  }>;

  // Common utility methods
  protected generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected validateAmount(amount: number): void {
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
  }

  protected validateCurrency(currency: string): void {
    const supportedCurrencies = ['USD', 'EUR', 'GBP', 'RUB', 'CNY'];
    if (!supportedCurrencies.includes(currency.toUpperCase())) {
      throw new Error(`Unsupported currency: ${currency}`);
    }
  }

  protected formatDate(date: Date): string {
    return date.toISOString();
  }

  protected logPaymentEvent(event: string, data: any): void {
    this.logger.log(`${event}: ${JSON.stringify(data)}`);
  }

  protected handleError(operation: string, error: any): never {
    this.logger.error(`Payment ${operation} failed:`, error);
    throw error;
  }
}