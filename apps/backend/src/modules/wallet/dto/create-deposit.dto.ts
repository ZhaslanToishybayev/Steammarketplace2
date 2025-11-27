import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsIn,
  Min,
  Max,
  IsUrl,
  IsObject,
} from 'class-validator';

export class CreateDepositDto {
  @ApiProperty({
    description: 'Deposit amount',
    example: 100.00,
    minimum: 1,
    maximum: 10000,
  })
  @IsNumber()
  @Min(1)
  @Max(10000)
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'USD',
    enum: ['USD', 'EUR', 'RUB'],
  })
  @IsString()
  @IsIn(['USD', 'EUR', 'RUB'])
  currency: string;

  @ApiProperty({
    description: 'Payment method',
    example: 'crypto',
    enum: ['crypto', 'card', 'paypal'],
  })
  @IsString()
  @IsIn(['crypto', 'card', 'paypal'])
  paymentMethod: string;

  @ApiProperty({
    description: 'Cryptocurrency (required if paymentMethod is crypto)',
    example: 'USDT',
    enum: ['BTC', 'ETH', 'USDT', 'LTC'],
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsIn(['BTC', 'ETH', 'USDT', 'LTC'])
  cryptocurrency?: string;

  @ApiProperty({
    description: 'Return URL for redirect after payment',
    example: 'https://example.com/payment/success',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  returnUrl?: string;

  @ApiProperty({
    description: 'Additional metadata',
    example: { description: 'Deposit for trading', paymentMethod: 'crypto' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}