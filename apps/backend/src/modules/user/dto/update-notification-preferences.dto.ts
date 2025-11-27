import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @ApiProperty({
    description: 'Notify on trade accepted',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  notifyOnTradeAccepted?: boolean;

  @ApiProperty({
    description: 'Notify on trade declined',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  notifyOnTradeDeclined?: boolean;

  @ApiProperty({
    description: 'Notify on trade completed',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  notifyOnTradeCompleted?: boolean;

  @ApiProperty({
    description: 'Notify on deposit',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  notifyOnDeposit?: boolean;

  @ApiProperty({
    description: 'Notify on withdrawal',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  notifyOnWithdrawal?: boolean;

  @ApiProperty({
    description: 'Notify on referral bonus',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  notifyOnReferralBonus?: boolean;

  @ApiProperty({
    description: 'Notify on price changes',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  notifyOnPriceChange?: boolean;

  @ApiProperty({
    description: 'Price change threshold percentage',
    example: 10.0,
    minimum: 1,
    maximum: 100,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  priceChangeThreshold?: number;
}