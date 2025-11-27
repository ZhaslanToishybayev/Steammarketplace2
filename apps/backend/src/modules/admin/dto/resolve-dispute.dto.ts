import { IsEnum, IsString, MinLength, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ResolutionType } from '../entities/trade-dispute.entity';

export class ResolveDisputeDto {
  @IsEnum(ResolutionType)
  @ApiProperty({
    enum: ResolutionType,
    description: 'Type of resolution to apply',
    example: ResolutionType.REFUND,
  })
  resolutionType: ResolutionType;

  @IsString()
  @MinLength(20)
  @ApiProperty({
    type: String,
    description: 'Explanation of the resolution decision',
    minLength: 20,
    example: 'After reviewing the evidence, the user will receive a full refund.',
  })
  resolution: string;

  @IsOptional()
  @IsNumber()
  @ApiProperty({
    type: Number,
    required: false,
    description: 'Amount to refund (for REFUND resolution type). If not provided, full trade value will be refunded.',
    minimum: 0,
    example: 50.00,
  })
  disputedAmount?: number;
}