import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsArray, IsString, IsOptional, MinLength, MaxLength, IsUUID, IsNumber, Min, ValidateNested, ArrayMinSize, IsNotEmpty, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { TradeType } from '../entities/trade.entity';

export class TradeItemDto {
  @ApiProperty({
    description: 'Steam asset ID',
    example: '123456789',
    required: true
  })
  @IsString()
  @IsNotEmpty()
  assetId: string;

  @ApiProperty({
    description: 'Steam class ID',
    example: '123456789',
    required: false
  })
  @IsOptional()
  @IsString()
  classId?: string;

  @ApiProperty({
    description: 'Steam instance ID',
    example: '123456789',
    required: false
  })
  @IsOptional()
  @IsString()
  instanceId?: string;

  @ApiProperty({
    description: 'Steam App ID (730: CS:GO/CS2, 570: Dota 2, 440: TF2, 252490: Rust)',
    example: 730,
    required: true,
    enum: [730, 570, 440, 252490]
  })
  @IsNumber()
  @IsIn([730, 570, 440, 252490])
  appId: number;

  @ApiProperty({
    description: 'Steam context ID',
    example: '2',
    required: false
  })
  @IsOptional()
  @IsString()
  contextId?: string;

  @ApiProperty({
    description: 'Amount of items',
    example: 1,
    required: false,
    minimum: 1
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;

  @ApiProperty({
    description: 'Additional metadata',
    required: false
  })
  @IsOptional()
  metadata?: any;
}

export class CreateTradeDto {
  @ApiProperty({
    description: 'Type of trade',
    example: 'deposit',
    required: true,
    enum: TradeType
  })
  @IsEnum(TradeType)
  type: TradeType;

  @ApiProperty({
    description: 'Items to give to the bot (for deposit trades)',
    type: [TradeItemDto],
    required: false
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TradeItemDto)
  @ArrayMinSize(0)
  itemsToGive?: TradeItemDto[];

  @ApiProperty({
    description: 'Items to receive from the bot (for withdraw trades)',
    type: [TradeItemDto],
    required: false
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TradeItemDto)
  @ArrayMinSize(0)
  itemsToReceive?: TradeItemDto[];

  @ApiProperty({
    description: 'Optional message for the trade',
    example: 'Please confirm quickly',
    required: false,
    maxLength: 200
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  message?: string;

  @ApiProperty({
    description: 'User\'s Steam trade URL (optional if user has saved trade URL)',
    example: 'https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=abcdefg',
    required: false
  })
  @IsOptional()
  @IsString()
  userTradeUrl?: string;

  // Custom validation: At least one of itemsToGive or itemsToReceive should be provided
  // For deposit: itemsToGive is required
  // For withdraw: itemsToReceive is required
  // For p2p: either can be provided
}