import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional } from 'class-validator';
import { Expose } from 'class-transformer';

export class ItemPriceDto {
  @ApiProperty({ description: 'Item ID (classId)', example: '123456789' })
  @IsString()
  @Expose()
  itemId: string;

  @ApiProperty({ description: 'Market hash name', example: 'AK-47 | Redline (Factory New)' })
  @IsString()
  @Expose()
  marketHashName: string;

  @ApiProperty({ description: 'Application ID', example: 730 })
  @IsNumber()
  @Expose()
  appId: number;

  @ApiProperty({ description: 'Base price from external APIs', example: 250.5 })
  @IsNumber()
  @Expose()
  basePrice: number;

  @ApiProperty({ description: 'Adjusted price with item-specific calculations', example: 285.75 })
  @IsNumber()
  @Expose()
  adjustedPrice: number;

  @ApiProperty({ description: 'Currency code', example: 'USD', default: 'USD' })
  @IsString()
  @Expose()
  currency: string = 'USD';

  @ApiProperty({ description: 'Price source', example: 'aggregated', enum: ['steam_market', 'csgofloat', 'buff163', 'aggregated'] })
  @IsString()
  @Expose()
  source: string;

  @ApiProperty({ description: 'Trading volume', example: 150, required: false })
  @IsOptional()
  @IsNumber()
  @Expose()
  volume?: number;

  @ApiProperty({ description: 'Last updated timestamp', example: '2023-12-01T10:30:00.000Z' })
  @Expose()
  lastUpdated: Date;
}