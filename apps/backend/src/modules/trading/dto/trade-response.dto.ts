import { ApiProperty } from '@nestjs/swagger';
import { Expose, Exclude } from 'class-transformer';
import { TradeStatus, TradeType, TradeDirection } from '../entities/trade.entity';

export class TradeItemResponseDto {
  @ApiProperty({
    description: 'Trade item ID',
    example: 'uuid-here'
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Asset ID from Steam',
    example: '123456789'
  })
  @Expose()
  assetId: string;

  @ApiProperty({
    description: 'Class ID from Steam',
    example: '123456789'
  })
  @Expose()
  classId: string;

  @ApiProperty({
    description: 'Instance ID from Steam',
    example: '123456789'
  })
  @Expose()
  instanceId: string;

  @ApiProperty({
    description: 'Steam App ID',
    example: 730
  })
  @Expose()
  appId: number;

  @ApiProperty({
    description: 'Context ID from Steam',
    example: '2'
  })
  @Expose()
  contextId: string;

  @ApiProperty({
    description: 'Amount of items',
    example: 1
  })
  @Expose()
  amount: number;

  @ApiProperty({
    description: 'Direction of item flow',
    example: 'give'
  })
  @Expose()
  direction: 'give' | 'receive';

  @ApiProperty({
    description: 'Item name',
    example: 'AK-47 | Redline (Factory New)'
  })
  @Expose()
  itemName: string;

  @ApiProperty({
    description: 'Market name',
    example: 'AK-47 | Redline (Factory New)'
  })
  @Expose()
  itemMarketName?: string;

  @ApiProperty({
    description: 'Item icon URL',
    example: 'https://steamcommunity-a.akamaihd.net/economy/image/class/730/...'
  })
  @Expose()
  itemIconUrl?: string;

  @ApiProperty({
    description: 'Item rarity',
    example: 'Covert'
  })
  @Expose()
  itemRarity?: string;

  @ApiProperty({
    description: 'Item type',
    example: 'Rifle'
  })
  @Expose()
  itemType?: string;

  @ApiProperty({
    description: 'Estimated value',
    example: 250.50
  })
  @Expose()
  estimatedValue?: number;
}

export class TradeResponseDto {
  @ApiProperty({
    description: 'Trade ID',
    example: 'uuid-here'
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Steam trade offer ID',
    example: '123456789',
    required: false
  })
  @Expose()
  tradeOfferId?: string;

  @ApiProperty({
    description: 'User ID',
    example: 'uuid-here'
  })
  @Expose()
  userId: string;

  @ApiProperty({
    description: 'Bot ID',
    example: 'uuid-here'
  })
  @Expose()
  botId?: string;

  @ApiProperty({
    description: 'Trade type',
    example: 'deposit',
    enum: TradeType
  })
  @Expose()
  type: TradeType;

  @ApiProperty({
    description: 'Trade status',
    example: 'completed',
    enum: TradeStatus
  })
  @Expose()
  status: TradeStatus;

  @ApiProperty({
    description: 'Trade direction',
    example: 'incoming'
  })
  @Expose()
  direction: TradeDirection;

  @ApiProperty({
    description: 'Optional message',
    example: 'Please confirm quickly',
    required: false
  })
  @Expose()
  message?: string;

  @ApiProperty({
    description: 'User trade URL',
    example: 'https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=abcdefg'
  })
  @Expose()
  userTradeUrl: string;

  @ApiProperty({
    description: 'Items to give to the bot',
    type: [TradeItemResponseDto]
  })
  @Expose()
  itemsToGive: TradeItemResponseDto[];

  @ApiProperty({
    description: 'Items to receive from the bot',
    type: [TradeItemResponseDto]
  })
  @Expose()
  itemsToReceive: TradeItemResponseDto[];

  @ApiProperty({
    description: 'Total items to give',
    example: 2
  })
  @Expose()
  totalItemsToGive: number;

  @ApiProperty({
    description: 'Total items to receive',
    example: 0
  })
  @Expose()
  totalItemsToReceive: number;

  @ApiProperty({
    description: 'Escrow days',
    example: 0
  })
  @Expose()
  escrowDays: number;

  @ApiProperty({
    description: 'Whether trade has escrow',
    example: false
  })
  @Expose()
  hasEscrow: boolean;

  @ApiProperty({
    description: 'Trade expiration date',
    example: '2023-12-31T23:59:59.999Z',
    required: false
  })
  @Expose()
  expiresAt?: Date;

  @ApiProperty({
    description: 'Trade sent date',
    example: '2023-12-01T10:30:00.000Z',
    required: false
  })
  @Expose()
  sentAt?: Date;

  @ApiProperty({
    description: 'Trade accepted date',
    example: '2023-12-01T10:35:00.000Z',
    required: false
  })
  @Expose()
  acceptedAt?: Date;

  @ApiProperty({
    description: 'Trade completed date',
    example: '2023-12-01T10:40:00.000Z',
    required: false
  })
  @Expose()
  completedAt?: Date;

  @ApiProperty({
    description: 'Trade cancelled date',
    example: '2023-12-01T10:32:00.000Z',
    required: false
  })
  @Expose()
  cancelledAt?: Date;

  @ApiProperty({
    description: 'Trade failed date',
    example: '2023-12-01T10:31:00.000Z',
    required: false
  })
  @Expose()
  failedAt?: Date;

  @ApiProperty({
    description: 'Error message if trade failed',
    example: 'Bot offline',
    required: false
  })
  @Expose()
  errorMessage?: string;

  @ApiProperty({
    description: 'Number of retry attempts',
    example: 0
  })
  @Expose()
  retryCount: number;

  @ApiProperty({
    description: 'Trade creation date',
    example: '2023-12-01T10:25:00.000Z'
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'Trade last update date',
    example: '2023-12-01T10:40:00.000Z'
  })
  @Expose()
  updatedAt: Date;
}