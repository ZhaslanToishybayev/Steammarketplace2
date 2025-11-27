import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum } from 'class-validator';
import { Expose } from 'class-transformer';

export class PriceAnomalyDto {
  @ApiProperty({ description: 'Item ID', example: '123456789' })
  @IsString()
  @Expose()
  itemId: string;

  @ApiProperty({ description: 'Market hash name', example: 'AK-47 | Redline (Factory New)' })
  @IsString()
  @Expose()
  marketHashName: string;

  @ApiProperty({ description: 'Item name', example: 'AK-47 Redline' })
  @IsString()
  @Expose()
  name: string;

  @ApiProperty({ description: 'Current price', example: 350.0 })
  @IsNumber()
  @Expose()
  currentPrice: number;

  @ApiProperty({ description: 'Expected price based on historical data', example: 250.0 })
  @IsNumber()
  @Expose()
  expectedPrice: number;

  @ApiProperty({ description: 'Deviation in standard deviations', example: 3.5 })
  @IsNumber()
  @Expose()
  deviation: number;

  @ApiProperty({ description: 'Deviation percentage', example: 40.0 })
  @IsNumber()
  @Expose()
  deviationPercent: number;

  @ApiProperty({
    description: 'Severity level of the anomaly',
    enum: ['low', 'medium', 'high'],
    example: 'high'
  })
  @IsEnum(['low', 'medium', 'high'])
  @Expose()
  severity: 'low' | 'medium' | 'high';

  @ApiProperty({ description: 'Detection timestamp', example: '2023-12-01T10:30:00.000Z' })
  @Expose()
  detectedAt: Date;
}