import { IsString, IsNumber, IsArray, IsOptional, IsEnum, IsBoolean, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { TradeType } from '../entities/trade-offer.entity';

export class TradeItemDto {
  @IsString()
  @IsOptional()
  assetId?: string;

  @IsString()
  @IsNotEmpty()
  classId: string;

  @IsString()
  @IsNotEmpty()
  instanceId: string;

  @IsNumber()
  amount: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsNumber()
  @IsOptional()
  steamValue?: number;

  @IsNumber()
  @IsOptional()
  marketValue?: number;

  @IsNumber()
  @IsOptional()
  ourPrice?: number;
}

export class CreateTradeOfferDto {
  @IsString()
  @IsOptional()
  targetSteamId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TradeItemDto)
  @IsOptional()
  offeredAssetIds?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TradeItemDto)
  @IsOptional()
  receivedItems?: TradeItemDto[];

  @IsString()
  @IsOptional()
  message?: string;

  @IsEnum(TradeType)
  @IsOptional()
  type?: TradeType;

  @IsString()
  @IsOptional()
  parentTradeId?: string;
}

export class AcceptTradeOfferDto {
  @IsString()
  @IsNotEmpty()
  tradeId: string;
}

export class DeclineTradeOfferDto {
  @IsString()
  @IsNotEmpty()
  tradeId: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class CancelTradeOfferDto {
  @IsString()
  @IsNotEmpty()
  tradeId: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class GetTradeOffersDto {
  @IsEnum(['sent', 'received'])
  @IsOptional()
  type?: 'sent' | 'received';

  @IsString()
  @IsOptional()
  status?: string;

  @IsNumber()
  @IsOptional()
  limit?: number;

  @IsNumber()
  @IsOptional()
  offset?: number;
}