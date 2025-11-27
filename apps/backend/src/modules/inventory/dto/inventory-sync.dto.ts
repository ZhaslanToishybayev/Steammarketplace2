import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class InventorySyncDto {
  @IsString()
  steamId: string;

  @IsNumber()
  @IsOptional()
  appId?: number = 730; // CS:GO by default

  @IsNumber()
  @IsOptional()
  contextId?: number = 2; // CS:GO context by default
}

export class SelectItemsDto {
  @IsString()
  steamId: string;

  @IsString({ each: true })
  assetIds: string[];

  @IsBoolean()
  selected: boolean = true;
}

export class InventoryStatsDto {
  @IsString()
  steamId: string;
}