import { ApiProperty } from '@nestjs/swagger';

export class PlatformStatisticsDto {
  @ApiProperty({
    type: Number,
    description: 'Total number of users',
    example: 1500,
  })
  totalUsers: number;

  @ApiProperty({
    type: Number,
    description: 'Number of active users',
    example: 1200,
  })
  activeUsers: number;

  @ApiProperty({
    type: Number,
    description: 'Number of banned users',
    example: 50,
  })
  bannedUsers: number;

  @ApiProperty({
    type: Number,
    description: 'Total number of trades',
    example: 3500,
  })
  totalTrades: number;

  @ApiProperty({
    type: Number,
    description: 'Number of completed trades',
    example: 3000,
  })
  completedTrades: number;

  @ApiProperty({
    type: Number,
    description: 'Number of failed trades',
    example: 200,
  })
  failedTrades: number;

  @ApiProperty({
    type: Number,
    description: 'Number of pending trades',
    example: 300,
  })
  pendingTrades: number;

  @ApiProperty({
    type: Number,
    description: 'Total revenue generated',
    example: 15000.50,
  })
  totalRevenue: number;

  @ApiProperty({
    type: Number,
    description: 'Total number of bots',
    example: 10,
  })
  totalBots: number;

  @ApiProperty({
    type: Number,
    description: 'Number of online bots',
    example: 8,
  })
  onlineBots: number;

  @ApiProperty({
    type: Number,
    description: 'Number of offline bots',
    example: 2,
  })
  offlineBots: number;

  @ApiProperty({
    type: Number,
    description: 'Average trade value',
    example: 42.86,
  })
  avgTradeValue: number;

  @ApiProperty({
    type: Number,
    description: 'Trade success rate percentage',
    example: 85.71,
  })
  successRate: number;

  @ApiProperty({
    description: 'Period for which statistics are calculated',
  })
  period: {
    dateFrom?: Date;
    dateTo?: Date;
  };
}