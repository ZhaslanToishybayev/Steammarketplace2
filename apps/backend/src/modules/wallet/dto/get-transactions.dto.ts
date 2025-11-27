import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsUUID,
  IsOptional,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class GetTransactionsDto {
  @ApiProperty({
    description: 'Transaction types to filter by',
    example: ['deposit', 'withdrawal'],
    enum: ['deposit', 'withdrawal', 'trade_credit', 'trade_debit', 'referral_bonus', 'admin_adjustment', 'refund'],
    required: false,
  })
  @IsString({ each: true })
  @IsOptional()
  @IsIn([
    'deposit',
    'withdrawal',
    'trade_credit',
    'trade_debit',
    'referral_bonus',
    'admin_adjustment',
    'refund',
  ], { each: true })
  types?: string[];

  @ApiProperty({
    description: 'Transaction statuses to filter by',
    example: ['completed', 'pending'],
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    required: false,
  })
  @IsString({ each: true })
  @IsOptional()
  @IsIn(['pending', 'processing', 'completed', 'failed', 'cancelled'], { each: true })
  status?: string[];

  @ApiProperty({
    description: 'Start date for filtering',
    example: '2023-01-01',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value ? new Date(value) : undefined)
  dateFrom?: string;

  @ApiProperty({
    description: 'End date for filtering',
    example: '2023-12-31',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value ? new Date(value) : undefined)
  dateTo?: string;

  @ApiProperty({
    description: 'Sort by field',
    example: 'createdAt',
    enum: ['createdAt', 'amount', 'status'],
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsIn(['createdAt', 'amount', 'status'])
  sortBy?: string;

  @ApiProperty({
    description: 'Sort order',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: string;

  @ApiProperty({
    description: 'Page number',
    example: 1,
    default: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number;

  @ApiProperty({
    description: 'Page limit',
    example: 20,
    default: 20,
    maximum: 100,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;
}