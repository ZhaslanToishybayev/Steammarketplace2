import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min, Max, IsOptional } from 'class-validator';

export class TransferDto {
  @ApiProperty({
    description: 'Recipient user ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  toUserId: string;

  @ApiProperty({
    description: 'Transfer amount',
    example: 50.00,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({
    description: 'Transfer description',
    example: 'Gift for helping with trade',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}