import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateBotDto {
  @ApiProperty({
    description: 'Steam account username',
    example: 'steam_bot_123',
    required: true,
    minLength: 3,
    maxLength: 50
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  accountName: string;

  @ApiProperty({
    description: 'Steam account password',
    example: 'securepassword123',
    required: true,
    minLength: 8
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'Steam Guard shared secret (base64 encoded)',
    example: 'AQIDBAUGBwgJCgsMDQ4PEA==',
    required: true,
    length: 28
  })
  @IsString()
  @IsNotEmpty()
  sharedSecret: string;

  @ApiProperty({
    description: 'Steam Guard identity secret (base64 encoded)',
    example: 'AQIDBAUGBwgJCgsMDQ4PEA==',
    required: true,
    length: 28
  })
  @IsString()
  @IsNotEmpty()
  identitySecret: string;

  @ApiProperty({
    description: 'Current Steam Guard code (optional)',
    example: 'ABC123',
    required: false,
    length: 5
  })
  @IsOptional()
  @IsString()
  steamGuardCode?: string;

  @ApiProperty({
    description: 'Steam Web API key (optional)',
    example: 'your_steam_api_key_here',
    required: false
  })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiProperty({
    description: 'Maximum concurrent trades for this bot',
    example: 5,
    required: false,
    minimum: 1,
    maximum: 20
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  maxConcurrentTrades?: number;
}