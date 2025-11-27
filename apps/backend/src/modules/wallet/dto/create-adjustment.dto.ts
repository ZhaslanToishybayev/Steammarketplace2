import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsUUID,
  MinLength,
  MaxLength,
  IsOptional,
  IsObject,
} from 'class-validator';

export class CreateAdjustmentDto {
  @ApiProperty({
    description: 'User ID to adjust balance for',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Adjustment amount (positive for credit, negative for debit)',
    example: 100.00,
  })
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: 'Reason for adjustment',
    example: 'Manual balance correction for user error',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  reason: string;

  @ApiProperty({
    description: 'Additional metadata',
    example: { adjustmentType: 'manual', processedBy: 'admin', source: 'user support' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}