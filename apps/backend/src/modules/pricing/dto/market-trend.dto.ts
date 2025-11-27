import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum } from 'class-validator';
import { Expose } from 'class-transformer';

export class MarketTrendDto {
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

  @ApiProperty({ description: 'Price change in last 7 days', example: 50.0, required: false })
  @IsOptional()
  @IsNumber()
  @Expose()
  priceChange7d?: number;

  @ApiProperty({ description: 'Price change percentage in last 7 days', example: 25.0, required: false })
  @IsOptional()
  @IsNumber()
  @Expose()
  priceChangePercent7d?: number;

  @ApiProperty({ description: 'Trading volume', example: 150, required: false })
  @IsOptional()
  @IsNumber()
  @Expose()
  volume?: number;

  @ApiProperty({
    description: 'Price trend direction',
    enum: ['rising', 'falling', 'stable'],
    example: 'rising'
  })
  @IsEnum(['rising', 'falling', 'stable'])
  @Expose()
  trend: 'rising' | 'falling' | 'stable';
}

export class MarketTrendsResponseDto {
  @ApiProperty({ description: 'Top gainers in the market' })
  @Expose()
  topGainers: MarketTrendDto[];

  @ApiProperty({ description: 'Top losers in the market' })
  @Expose()
  topLosers: MarketTrendDto[];

  @ApiProperty({ description: 'Application ID', example: 730 })
  @IsNumber()
  @Expose()
  appId: number;

  @ApiProperty({ description: 'Report generation timestamp', example: '2023-12-01T10:30:00.000Z' })
  @Expose()
  generatedAt: Date;
}