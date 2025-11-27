import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsIn,
  Min,
  Max,
  IsObject,
  IsOptional,
} from 'class-validator';

export class CreateWithdrawalDto {
  @ApiProperty({
    description: 'Withdrawal amount',
    example: 50.00,
    minimum: 10,
    maximum: 10000,
  })
  @IsNumber()
  @Min(10)
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
    description: 'Destination address/account',
    example: '0x744d70FDBE2Ba4CF95131626614a1763DF805B9E',
  })
  @IsString()
  destination: string;

  @ApiProperty({
    description: 'Cryptocurrency (required if paymentMethod is crypto)',
    example: 'USDT',
    enum: ['BTC', 'ETH', 'USDT', 'LTC'],
    required: false,
  })
  @IsString()
  @IsIn(['BTC', 'ETH', 'USDT', 'LTC'])
  cryptocurrency?: string;

  @ApiProperty({
    description: 'Additional metadata',
    example: { network: 'ethereum', description: 'Withdrawal to external wallet' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}