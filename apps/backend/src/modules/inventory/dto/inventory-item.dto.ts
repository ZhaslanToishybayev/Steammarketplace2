import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class InventoryItemDto {
  @ApiProperty({
    description: 'UUID of the inventory record',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Steam asset ID',
    example: '123456789'
  })
  @Expose()
  assetId: string;

  @ApiProperty({
    description: 'Steam class ID',
    example: '123456'
  })
  @Expose()
  classId: string;

  @ApiProperty({
    description: 'Steam instance ID',
    example: '789'
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
    description: 'Item name',
    example: 'AK-47 | Redline (Factory New)'
  })
  @Expose()
  name: string;

  @ApiPropertyOptional({
    description: 'Market name',
    example: 'AK-47 Redline'
  })
  @Expose()
  marketName?: string;

  @ApiPropertyOptional({
    description: 'Market hash name',
    example: 'AK-47%20Redline'
  })
  @Expose()
  marketHashName?: string;

  @ApiPropertyOptional({
    description: 'Item type',
    example: 'Rifle'
  })
  @Expose()
  type?: string;

  @ApiPropertyOptional({
    description: 'Item rarity',
    example: 'Covert'
  })
  @Expose()
  rarity?: string;

  @ApiPropertyOptional({
    description: 'Item quality',
    example: 'Factory New'
  })
  @Expose()
  quality?: string;

  @ApiPropertyOptional({
    description: 'URL of the item icon',
    example: 'https://steamcommunity-a.akamaihd.net/economy/image/class/123/123456'
  })
  @Expose()
  iconUrl?: string;

  @ApiPropertyOptional({
    description: 'URL of the large item icon',
    example: 'https://steamcommunity-a.akamaihd.net/economy/image/class/123/123456/l256'
  })
  @Expose()
  iconUrlLarge?: string;

  @ApiPropertyOptional({
    description: 'Background color for the item',
    example: 'eb4b4b'
  })
  @Expose()
  backgroundColor?: string;

  @ApiProperty({
    description: 'Amount of items (for stackable items)',
    example: 1
  })
  @Expose()
  amount: number;

  @ApiProperty({
    description: 'Whether the item is tradable',
    example: true
  })
  @Expose()
  tradable: boolean;

  @ApiProperty({
    description: 'Whether the item is marketable',
    example: true
  })
  @Expose()
  marketable: boolean;

  @ApiPropertyOptional({
    description: 'Whether the item is a commodity',
    example: false
  })
  @Expose()
  commodity?: boolean;

  @ApiPropertyOptional({
    description: 'Wear level (CS:GO/CS2)',
    example: 'Factory New'
  })
  @Expose()
  wear?: string;

  @ApiPropertyOptional({
    description: 'Float value (CS:GO/CS2)',
    example: 0.05
  })
  @Expose()
  floatValue?: number;

  @ApiPropertyOptional({
    description: 'Paint seed (CS:GO/CS2)',
    example: 123
  })
  @Expose()
  paintSeed?: number;

  @ApiPropertyOptional({
    description: 'Paint index (CS:GO/CS2)',
    example: 456
  })
  @Expose()
  paintIndex?: number;

  @ApiPropertyOptional({
    description: 'Stickers on the item (CS:GO/CS2)',
    type: [Object],
    example: [
      {
        slot: 0,
        name: 'AK-47 | Redline Sticker',
        wear: 0.5
      }
    ]
  })
  @Expose()
  stickers?: any[];

  @ApiPropertyOptional({
    description: 'Hero for the item (Dota 2)',
    example: 'Invoker'
  })
  @Expose()
  hero?: string;

  @ApiPropertyOptional({
    description: 'Slot for the item (Dota 2)',
    example: 'weapon'
  })
  @Expose()
  slot?: string;

  @ApiPropertyOptional({
    description: 'Gems in the item (Dota 2)',
    type: [Object],
    example: [
      {
        name: 'Ruby Gem',
        color: 'red',
        effect: 'increases damage'
      }
    ]
  })
  @Expose()
  gems?: any[];

  @ApiPropertyOptional({
    description: 'Craftable status (TF2)',
    example: true
  })
  @Expose()
  craftable?: boolean;

  @ApiPropertyOptional({
    description: 'Killstreak level (TF2)',
    example: 'Special'
  })
  @Expose()
  killstreak?: string;

  @ApiPropertyOptional({
    description: 'Condition of the item (Rust)',
    example: 'Good'
  })
  @Expose()
  condition?: string;

  @ApiProperty({
    description: 'Time when the item was last synced',
    example: '2023-11-23T10:30:00.000Z'
  })
  @Expose()
  @Type(() => Date)
  lastSyncedAt: Date;

  @ApiPropertyOptional({
    description: 'Sync status',
    example: 'synced',
    enum: ['synced', 'pending', 'failed']
  })
  @Expose()
  syncStatus?: string;

  @ApiPropertyOptional({
    description: 'Sync error message',
    example: 'Private inventory'
  })
  @Expose()
  syncError?: string;

  @ApiPropertyOptional({
    description: 'Item descriptions',
    type: [Object],
    example: [
      {
        type: 'usability',
        value: 'Not Usable in Loadouts'
      }
    ]
  })
  @Expose()
  descriptions?: any[];

  @ApiPropertyOptional({
    description: 'Item tags',
    type: [Object],
    example: [
      {
        category: 'Rarity',
        internalName: 'Rarity_Rare_Equipment',
        localizedName: 'Covert'
      }
    ]
  })
  @Expose()
  tags?: any[];

  // Static factory method to create DTO from Inventory and Item entities
  static fromInventoryAndItem(inventory: any, item: any): InventoryItemDto {
    const dto = new InventoryItemDto();

    // Copy inventory fields
    dto.id = inventory.id;
    dto.assetId = inventory.assetId;
    dto.amount = inventory.amount;
    dto.tradable = inventory.tradable;
    dto.marketable = inventory.marketable;
    dto.commodity = inventory.commodity;
    dto.lastSyncedAt = inventory.lastSyncedAt;
    dto.syncStatus = inventory.syncStatus;
    dto.syncError = inventory.syncError;

    // Copy item fields
    dto.classId = item.classId || inventory.classId;
    dto.instanceId = item.instanceId || inventory.instanceId;
    dto.appId = item.appId || inventory.appId;
    dto.name = item.name;
    dto.marketName = item.marketName;
    dto.marketHashName = item.marketHashName;
    dto.type = item.type;
    dto.rarity = item.rarity;
    dto.quality = item.quality;
    dto.iconUrl = item.iconUrl;
    dto.iconUrlLarge = item.iconUrlLarge;
    dto.backgroundColor = item.backgroundColor;
    dto.wear = item.wear;
    dto.floatValue = item.floatValue;
    dto.paintSeed = item.paintSeed;
    dto.paintIndex = item.paintIndex;
    dto.stickers = item.stickers;
    dto.hero = item.hero;
    dto.slot = item.slot;
    dto.gems = item.gems;
    dto.craftable = item.craftable;
    dto.killstreak = item.killstreak;
    dto.condition = item.condition;
    dto.descriptions = item.descriptions;
    dto.tags = item.tags;

    return dto;
  }
}