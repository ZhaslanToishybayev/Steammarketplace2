import { IsNumber, IsPositive, IsString, IsBoolean, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RefundTradeDto {
  @IsNumber()
  @IsPositive()
  @ApiProperty({
    type: Number,
    description: 'Amount to refund',
    minimum: 0.01,
    example: 50.00,
  })
  amount: number;

  @IsString()
  @MinLength(10)
  @ApiProperty({
    type: String,
    description: 'Reason for the refund',
    minLength: 10,
    example: 'Item not received as described',
  })
  reason: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether to refund to user balance or original payment method',
    default: true,
  })
  refundToBalance?: boolean = true;
}