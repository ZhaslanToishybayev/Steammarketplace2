import { ApiProperty } from '@nestjs/swagger';
import { Expose, Exclude } from 'class-transformer';

@Exclude()
export class UserStatisticsDto {
  @ApiProperty({
    description: 'Total number of trades',
    example: 150,
  })
  @Expose()
  totalTrades: number;

  @ApiProperty({
    description: 'Number of completed trades',
    example: 140,
  })
  @Expose()
  completedTrades: number;

  @ApiProperty({
    description: 'Number of failed trades',
    example: 10,
  })
  @Expose()
  failedTrades: number;

  @ApiProperty({
    description: 'Number of pending trades',
    example: 5,
  })
  @Expose()
  pendingTrades: number;

  @ApiProperty({
    description: 'Trade success rate percentage',
    example: 93.33,
  })
  @Expose()
  successRate: number;

  @ApiProperty({
    description: 'User reputation score (0-1000)',
    example: 750,
  })
  @Expose()
  reputation: number;

  @ApiProperty({
    description: 'Total value of completed trades',
    example: 2500.50,
  })
  @Expose()
  totalValue: number;

  @ApiProperty({
    description: 'Average trade value',
    example: 17.86,
  })
  @Expose()
  averageTradeValue: number;

  @ApiProperty({
    description: 'Total deposits made',
    example: 3000.00,
  })
  @Expose()
  totalDeposits: number;

  @ApiProperty({
    description: 'Total withdrawals made',
    example: 500.00,
  })
  @Expose()
  totalWithdrawals: number;

  @ApiProperty({
    description: 'Current account balance',
    example: 2500.00,
  })
  @Expose()
  currentBalance: number;

  @ApiProperty({
    description: 'Account age in days',
    example: 365,
  })
  @Expose()
  accountAge: number;

  @ApiProperty({
    description: 'Average response time in seconds',
    example: 45.5,
  })
  @Expose()
  averageResponseTime: number;

  @ApiProperty({
    description: 'Total number of referrals',
    example: 15,
  })
  @Expose()
  totalReferrals: number;

  @ApiProperty({
    description: 'Total referral earnings',
    example: 75.00,
  })
  @Expose()
  totalReferralEarnings: number;
}