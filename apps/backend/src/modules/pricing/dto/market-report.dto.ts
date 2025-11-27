import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber } from 'class-validator';
import { Expose } from 'class-transformer';
import { MarketTrendDto } from './market-trend.dto';
import { VolatileItemDto } from './volatile-item.dto';
import { PopularItemDto } from './popular-item.dto';

export class PriceDistributionDto {
  @ApiProperty({ description: 'Price ranges', example: ['$1', '$1-$5', '$5-$10', '$10-$50', '$50-$100', '$100-$500', '$500+'] })
  ranges: string[];

  @ApiProperty({ description: 'Number of items in each range', example: [5000, 3000, 2000, 1000, 500, 200, 50] })
  counts: number[];
}

export class MarketReportDto {
  @ApiProperty({ description: 'Application ID', example: 730 })
  @IsString()
  @Expose()
  appId: number;

  @ApiProperty({ description: 'Total number of items in market', example: 15000 })
  @IsNumber()
  @Expose()
  totalItems: number;

  @ApiProperty({ description: 'Average price across all items', example: 15.5 })
  @IsNumber()
  @Expose()
  averagePrice: number;

  @ApiProperty({ description: 'Median price across all items', example: 8.2 })
  @IsNumber()
  @Expose()
  medianPrice: number;

  @ApiProperty({ description: 'Total trading volume in last 24 hours', example: 50000 })
  @IsNumber()
  @Expose()
  totalVolume: number;

  @ApiProperty({ description: 'Price distribution across ranges' })
  @Expose()
  priceDistribution: PriceDistributionDto;

  @ApiProperty({ description: 'Top 10 gainers in last 24 hours' })
  @Expose()
  topGainers: MarketTrendDto[];

  @ApiProperty({ description: 'Top 10 losers in last 24 hours' })
  @Expose()
  topLosers: MarketTrendDto[];

  @ApiProperty({ description: 'Top 10 most volatile items' })
  @Expose()
  volatileItems: VolatileItemDto[];

  @ApiProperty({ description: 'Top 10 most popular items by volume' })
  @Expose()
  popularItems: PopularItemDto[];

  @ApiProperty({ description: 'Report generation timestamp', example: '2023-12-01T10:30:00.000Z' })
  @Expose()
  generatedAt: Date;
}