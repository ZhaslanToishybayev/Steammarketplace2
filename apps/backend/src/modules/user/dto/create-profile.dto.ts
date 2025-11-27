import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  MaxLength,
  MinLength,
  IsIn,
  IsBoolean,
  IsDateString,
} from 'class-validator';

export class CreateProfileDto {
  @ApiProperty({
    description: 'Display name for the profile',
    example: 'SteamGamer',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  displayName?: string;

  @ApiProperty({
    description: 'Profile biography',
    example: 'Professional CS:GO player and trader',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  bio?: string;

  @ApiProperty({
    description: 'Country code (ISO 3166-1 alpha-2)',
    example: 'US',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(2)
  country?: string;

  @ApiProperty({
    description: 'Preferred language',
    example: 'en',
    enum: ['en', 'ru', 'es', 'de', 'fr', 'zh'],
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsIn(['en', 'ru', 'es', 'de', 'fr', 'zh'])
  language?: string;

  @ApiProperty({
    description: 'Timezone',
    example: 'America/New_York',
    required: false,
  })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiProperty({
    description: 'Custom avatar URL',
    example: 'https://example.com/avatar.jpg',
    required: false,
  })
  @IsString()
  @IsOptional()
  avatarCustomUrl?: string;

  @ApiProperty({
    description: 'Whether profile is public',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isProfilePublic?: boolean;

  @ApiProperty({
    description: 'Whether to show trade history',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  showTradeHistory?: boolean;

  @ApiProperty({
    description: 'Whether to show inventory',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  showInventory?: boolean;

  @ApiProperty({
    description: 'Preferred currency',
    example: 'USD',
    enum: ['USD', 'EUR', 'RUB', 'CNY'],
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsIn(['USD', 'EUR', 'RUB', 'CNY'])
  preferredCurrency?: string;
}