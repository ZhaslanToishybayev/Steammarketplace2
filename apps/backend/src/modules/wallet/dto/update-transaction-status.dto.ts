import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsObject, IsString } from 'class-validator';
import { TransactionStatus } from '../../entities/transaction.entity';

export class UpdateTransactionStatusDto {
  @ApiProperty({
    description: 'New transaction status',
    enum: TransactionStatus,
    example: 'completed',
  })
  @IsEnum(TransactionStatus)
  status: TransactionStatus;

  @ApiProperty({
    description: 'Additional metadata for the status update',
    required: false,
    example: { processedAt: '2023-01-01T00:00:00Z', payoutId: 'payout_123' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}