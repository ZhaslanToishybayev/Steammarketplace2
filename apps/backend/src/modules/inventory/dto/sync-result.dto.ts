import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SyncResultDto {
  @ApiProperty({
    description: 'Whether the sync was successful',
    example: true
  })
  success: boolean;

  @ApiProperty({
    description: 'Steam App ID that was synced',
    example: 730
  })
  appId: number;

  @ApiProperty({
    description: 'Number of new items added to inventory',
    example: 5
  })
  itemsAdded: number;

  @ApiProperty({
    description: 'Number of existing items updated',
    example: 10
  })
  itemsUpdated: number;

  @ApiProperty({
    description: 'Number of items removed from inventory',
    example: 2
  })
  itemsRemoved: number;

  @ApiProperty({
    description: 'Total items in inventory after sync',
    example: 150
  })
  totalItems: number;

  @ApiProperty({
    description: 'Timestamp of the sync operation',
    example: '2023-11-23T10:30:00.000Z'
  })
  @Type(() => Date)
  syncedAt: Date;

  @ApiProperty({
    description: 'Array of error messages if any occurred',
    example: [],
    required: false
  })
  errors: string[];

  @ApiProperty({
    description: 'Array of warning messages',
    example: ['Some items could not be processed'],
    required: false
  })
  warnings: string[];
}