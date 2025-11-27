import { ApiProperty } from '@nestjs/swagger';
import { Expose, Exclude } from 'class-transformer';
import { BotStatus } from '../entities/bot.entity';

export class BotResponseDto {
  @ApiProperty({
    description: 'Bot ID',
    example: 'uuid-here'
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Steam ID',
    example: '12345678901234567',
    required: false
  })
  @Expose()
  steamId?: string;

  @ApiProperty({
    description: 'Steam account username',
    example: 'steam_bot_123'
  })
  @Expose()
  accountName: string;

  @ApiProperty({
    description: 'Trade URL',
    example: 'https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=abcdefg',
    required: false
  })
  @Expose()
  tradeUrl?: string;

  @ApiProperty({
    description: 'Whether bot is active',
    example: true
  })
  @Expose()
  isActive: boolean;

  @ApiProperty({
    description: 'Whether bot is online',
    example: true
  })
  @Expose()
  isOnline: boolean;

  @ApiProperty({
    description: 'Whether bot is currently busy',
    example: false
  })
  @Expose()
  isBusy: boolean;

  @ApiProperty({
    description: 'Bot status',
    example: 'idle',
    enum: BotStatus
  })
  @Expose()
  status: BotStatus;

  @ApiProperty({
    description: 'Status message',
    example: 'Ready for trading',
    required: false
  })
  @Expose()
  statusMessage?: string;

  @ApiProperty({
    description: 'Maximum concurrent trades',
    example: 5
  })
  @Expose()
  maxConcurrentTrades: number;

  @ApiProperty({
    description: 'Current number of active trades',
    example: 0
  })
  @Expose()
  currentTradeCount: number;

  @ApiProperty({
    description: 'Total completed trades',
    example: 150
  })
  @Expose()
  totalTradesCompleted: number;

  @ApiProperty({
    description: 'Last login date',
    example: '2023-12-01T10:00:00.000Z',
    required: false
  })
  @Expose()
  lastLoginAt?: Date;

  @ApiProperty({
    description: 'Last trade date',
    example: '2023-12-01T10:30:00.000Z',
    required: false
  })
  @Expose()
  lastTradeAt?: Date;

  @ApiProperty({
    description: 'Bot creation date',
    example: '2023-11-01T09:00:00.000Z'
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2023-12-01T10:30:00.000Z'
  })
  @Expose()
  updatedAt: Date;

  // Exclude sensitive data from API responses
  @Exclude()
  password?: string;

  @Exclude()
  sharedSecret?: string;

  @Exclude()
  identitySecret?: string;

  @Exclude()
  steamGuardCode?: string;

  @Exclude()
  apiKey?: string;
}