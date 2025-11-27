import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsDate, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { Expose } from 'class-transformer';

export class PriceHistoryQueryDto {
  @ApiProperty({
    description: 'Start date for price history (ISO format)',
    example: '2023-11-01T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiProperty({
    description: 'End date for price history (ISO format)',
    example: '2023-12-01T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @ApiProperty({
    description: 'Time interval for price aggregation',
    enum: ['hour', 'day', 'week'],
    example: 'day',
    required: false,
  })
  @IsOptional()
  @IsEnum(['hour', 'day', 'week'])
  interval?: 'hour' | 'day' | 'week';
}

export class PriceHistoryDto {
  @ApiProperty({ description: 'Timestamp for price point', example: '2023-12-01T10:00:00.000Z' })
  @Expose()
  timestamp: Date;

  @ApiProperty({ description: 'Price at this timestamp', example: 250.5 })
  @Expose()
  price: number;

  @ApiProperty({ description: 'Trading volume at this timestamp', example: 150, required: false })
  @IsOptional()
  @Expose()
  volume?: number;
}