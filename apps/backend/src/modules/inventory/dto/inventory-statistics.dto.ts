import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class InventoryStatisticsDto {
  @ApiProperty({
    description: 'Total number of items in inventory',
    example: 150
  })
  totalItems: number;

  @ApiProperty({
    description: 'Item count grouped by game',
    example: {
      730: { appId: 730, name: 'CS:GO', count: 150 },
      570: { appId: 570, name: 'Dota 2', count: 80 }
    },
    type: 'object',
    additionalProperties: {
      type: 'object',
      properties: {
        appId: { type: 'number' },
        name: { type: 'string' },
        count: { type: 'number' }
      }
    }
  })
  byGame: Record<number, { appId: number; name: string; count: number }>;

  @ApiProperty({
    description: 'Item count grouped by rarity',
    example: { 'Covert': 5, 'Classified': 15, 'Restricted': 30 },
    type: 'object',
    additionalProperties: { type: 'number' }
  })
  byRarity: Record<string, number>;

  @ApiProperty({
    description: 'Item count grouped by type',
    example: { 'Rifle': 20, 'Pistol': 15, 'Knife': 2 },
    type: 'object',
    additionalProperties: { type: 'number' }
  })
  byType: Record<string, number>;

  @ApiProperty({
    description: 'Number of tradable items',
    example: 140
  })
  tradableCount: number;

  @ApiProperty({
    description: 'Number of marketable items',
    example: 120
  })
  marketableCount: number;

  @ApiProperty({
    description: 'Timestamp of last inventory sync',
    example: '2023-11-23T10:30:00.000Z',
    required: false
  })
  @Type(() => Date)
  lastSyncedAt?: Date;

  @ApiProperty({
    description: 'Sync status for each game',
    example: {
      730: { appId: 730, status: 'synced', lastSyncedAt: '2023-11-23T10:30:00.000Z' },
      570: { appId: 570, status: 'pending', lastSyncedAt: '2023-11-23T09:30:00.000Z' }
    },
    type: 'object',
    additionalProperties: {
      type: 'object',
      properties: {
        appId: { type: 'number' },
        status: { type: 'string', enum: ['synced', 'pending', 'failed'] },
        lastSyncedAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  syncStatus: Record<number, { appId: number; status: string; lastSyncedAt: Date }>;
}