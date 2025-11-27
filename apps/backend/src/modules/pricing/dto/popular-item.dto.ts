import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber } from 'class-validator';
import { Expose } from 'class-transformer';

export class PopularItemDto {
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

  @ApiProperty({ description: 'Trading volume in last 24 hours', example: 150 })
  @IsNumber()
  @Expose()
  volume: number;

  @ApiProperty({ description: 'Current price', example: 250.5 })
  @IsNumber()
  @Expose()
  currentPrice: number;

  @ApiProperty({ description: 'Price change in last 24 hours', example: 25.5 })
  @IsNumber()
  @Expose()
  priceChange24h: number;

  @ApiProperty({ description: 'Price change percentage in last 24 hours', example: 11.5 })
  @IsNumber()
  @Expose()
  priceChangePercent24h: number;
}