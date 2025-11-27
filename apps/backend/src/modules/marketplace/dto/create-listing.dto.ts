import { IsString, IsNumber, IsArray, IsOptional, IsEnum, IsBoolean, ValidateNested, IsNotEmpty, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ListingType, Currency } from '../entities/marketplace-listing.entity';

export class MediaDto {
  @IsEnum(['image', 'video'])
  type: 'image' | 'video';

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsOptional()
  thumbnail?: string;

  @IsNumber()
  order: number;
}

export class CreateListingDto {
  @IsString()
  @IsOptional()
  itemId?: string;

  @IsString()
  @IsNotEmpty()
  itemName: string;

  @IsString()
  @IsOptional()
  itemDescription?: string;

  @IsString()
  @IsOptional()
  itemClassId?: string;

  @IsString()
  @IsOptional()
  itemInstanceId?: string;

  @IsString()
  @IsOptional()
  itemImage?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  itemType?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  itemRarity?: string;

  @IsString()
  @IsOptional()
  itemQuality?: string;

  @IsNumber()
  @IsOptional()
  quantity?: number;

  @IsNumber()
  @Min(0.01)
  price: number;

  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @IsEnum(ListingType)
  @IsOptional()
  type?: ListingType;

  @IsNumber()
  @IsOptional()
  @Min(0)
  startingPrice?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  reservePrice?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  buyoutPrice?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsOptional()
  attributes?: Record<string, any>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaDto)
  @IsOptional()
  media?: MediaDto[];

  @IsString()
  @IsOptional()
  condition?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  wearRating?: number;

  @IsBoolean()
  @IsOptional()
  autoRenew?: boolean;

  @IsBoolean()
  @IsOptional()
  instantSale?: boolean;

  @IsBoolean()
  @IsOptional()
  allowOffers?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minOffer?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  maxOffer?: number;
}

export class UpdateListingDto {
  @IsString()
  @IsOptional()
  itemDescription?: string;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsOptional()
  attributes?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  featured?: boolean;

  @IsString()
  @IsOptional()
  condition?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  wearRating?: number;

  @IsBoolean()
  @IsOptional()
  autoRenew?: boolean;

  @IsBoolean()
  @IsOptional()
  instantSale?: boolean;

  @IsBoolean()
  @IsOptional()
  allowOffers?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minOffer?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  maxOffer?: number;
}

export class BuyListingDto {
  @IsString()
  @IsNotEmpty()
  listingId: string;

  @IsString()
  @IsOptional()
  offerPrice?: number; // For offers
}

export class PlaceBidDto {
  @IsString()
  @IsNotEmpty()
  listingId: string;

  @IsNumber()
  @Min(0.01)
  bidAmount: number;
}

export class CancelListingDto {
  @IsString()
  @IsNotEmpty()
  listingId: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class GetListingsDto {
  @IsEnum(['fixed_price', 'auction', 'offer'])
  @IsOptional()
  type?: string;

  @IsEnum(['active', 'sold', 'cancelled', 'expired', 'pending_verification', 'suspended'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  itemType?: string;

  @IsString()
  @IsOptional()
  itemRarity?: string;

  @IsEnum(['USD', 'EUR', 'RUB'])
  @IsOptional()
  currency?: string;

  @IsNumber()
  @IsOptional()
  minPrice?: number;

  @IsNumber()
  @IsOptional()
  maxPrice?: number;

  @IsString()
  @IsOptional()
  sellerId?: string;

  @IsBoolean()
  @IsOptional()
  featured?: boolean;

  @IsBoolean()
  @IsOptional()
  allowOffers?: boolean;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsEnum(['ASC', 'DESC'])
  @IsOptional()
  sortOrder?: string;

  @IsNumber()
  @IsOptional()
  limit?: number;

  @IsNumber()
  @IsOptional()
  offset?: number;
}

export class GetPriceAnalyticsDto {
  @IsString()
  @IsNotEmpty()
  itemClassId: string;

  @IsNumber()
  @IsOptional()
  days?: number; // Default: 30
}