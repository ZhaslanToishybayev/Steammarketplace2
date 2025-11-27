import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, IsIn, IsBoolean, IsArray, IsString, MinLength, MaxLength } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class GetInventoryDto extends PaginationDto {
  @ApiProperty({
    description: 'Steam App ID for filtering (730: CS:GO/CS2, 570: Dota 2, 440: TF2, 252490: Rust)',
    example: 730,
    required: false,
    enum: [730, 570, 440, 252490]
  })
  @IsOptional()
  @IsInt()
  @IsIn([730, 570, 440, 252490])
  @Type(() => Number)
  appId?: number;

  @ApiProperty({
    description: 'Filter by tradable items',
    example: true,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  tradable?: boolean;

  @ApiProperty({
    description: 'Filter by marketable items',
    example: true,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  marketable?: boolean;

  @ApiProperty({
    description: 'Filter by rarity levels',
    example: ['Covert', 'Classified'],
    required: false,
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  rarity?: string[];

  @ApiProperty({
    description: 'Filter by item types',
    example: ['Rifle', 'Knife'],
    required: false,
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  type?: string[];

  @ApiProperty({
    description: 'Search by item name',
    example: 'AK-47',
    required: false,
    minLength: 2,
    maxLength: 100
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  search?: string;

  @ApiProperty({
    description: 'Field to sort by',
    example: 'createdAt',
    required: false,
    enum: ['name', 'rarity', 'createdAt', 'lastSyncedAt']
  })
  @IsOptional()
  @IsString()
  @IsIn(['name', 'rarity', 'createdAt', 'lastSyncedAt'])
  sortBy?: string;

  @ApiProperty({
    description: 'Sort order',
    example: 'DESC',
    required: false,
    enum: ['ASC', 'DESC']
  })
  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';

  @ApiProperty({
    description: 'Minimum price filter (requires pricing integration)',
    example: 10.0,
    required: false,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minPrice?: number;

  @ApiProperty({
    description: 'Maximum price filter (requires pricing integration)',
    example: 100.0,
    required: false,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxPrice?: number;
}