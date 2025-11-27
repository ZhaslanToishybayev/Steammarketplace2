import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber } from 'class-validator';
import { Expose } from 'class-transformer';

export class PriceRangeDto {
  @ApiProperty({ description: 'Minimum price', example: 200.0 })
  min: number;

  @ApiProperty({ description: 'Maximum price', example: 300.0 })
  max: number;

  @ApiProperty({ description: 'Current price', example: 250.5 })
  current: number;
}

export class VolatileItemDto {
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

  @ApiProperty({ description: 'Item icon URL', example: 'https://steamcommunity-a.akamaihd.net/economy/image/item.png', required: false })
  @IsString()
  @Expose()
  iconUrl?: string;

  @ApiProperty({ description: 'Price volatility (standard deviation)', example: 45.2 })
  @IsNumber()
  @Expose()
  volatility: number;

  @ApiProperty({ description: 'Price range information' })
  @Expose()
  priceRange: PriceRangeDto;

  @ApiProperty({ description: 'Average price over analysis period', example: 245.0 })
  @IsNumber()
  @Expose()
  averagePrice: number;

  @ApiProperty({ description: 'Current price', example: 250.5 })
  @IsNumber()
  @Expose()
  currentPrice: number;
}