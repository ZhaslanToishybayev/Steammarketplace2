import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, Max, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateBotDto {
  @ApiProperty({
    description: 'Steam account password (optional, leave empty to keep current)',
    example: 'newsecurepassword123',
    required: false,
    minLength: 8
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiProperty({
    description: 'Steam Guard shared secret (optional)',
    example: 'AQIDBAUGBwgJCgsMDQ4PEA==',
    required: false,
    length: 28
  })
  @IsOptional()
  @IsString()
  sharedSecret?: string;

  @ApiProperty({
    description: 'Steam Guard identity secret (optional)',
    example: 'AQIDBAUGBwgJCgsMDQ4PEA==',
    required: false,
    length: 28
  })
  @IsOptional()
  @IsString()
  identitySecret?: string;

  @ApiProperty({
    description: 'Current Steam Guard code',
    example: 'ABC123',
    required: false,
    length: 5
  })
  @IsOptional()
  @IsString()
  steamGuardCode?: string;

  @ApiProperty({
    description: 'Steam Web API key',
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

  @ApiProperty({
    description: 'Whether the bot is active',
    example: true,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isActive?: boolean;
}