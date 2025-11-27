import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsBoolean, IsOptional, IsEnum, IsDate } from 'class-validator';
import { Exclude, Expose } from 'class-transformer';

export class UserDto {
  @ApiProperty({ description: 'User UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID('4')
  id: string;

  @ApiProperty({ description: 'Steam ID', example: '76561198012345678' })
  steamId: string;

  @ApiProperty({ description: 'Username from Steam', example: 'SteamUser123' })
  username: string;

  @ApiProperty({ description: 'Avatar URL', example: 'https://steamcdn-a.akamaihd.net/steamcommunity/Public/images/avatars/xx.jpg', required: false })
  avatar?: string;

  @ApiProperty({ description: 'Profile URL', example: 'https://steamcommunity.com/profiles/76561198012345678', required: false })
  profileUrl?: string;

  @ApiProperty({ description: 'User role', example: 'admin', enum: ['user', 'moderator', 'admin'] })
  role: string;

  @ApiProperty({ description: 'Whether user has admin privileges', example: true })
  isAdmin: boolean;

  @ApiProperty({ description: 'Steam trade URL', example: 'https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=abcdefg', required: false })
  tradeUrl?: string;

  @ApiProperty({ description: 'Whether trade URL is valid', example: true })
  isTradeUrlValid: boolean;

  @ApiProperty({ description: 'Last login timestamp', required: false })
  lastLoginAt?: Date;

  @ApiProperty({ description: 'Account creation timestamp' })
  createdAt: Date;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT access token', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ description: 'JWT refresh token', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh...' })
  refreshToken: string;

  @ApiProperty({ description: 'Access token expiration time in seconds', example: 604800 })
  expiresIn: number;

  @ApiProperty({ description: 'Token type', example: 'Bearer' })
  tokenType: string;

  @ApiProperty({ description: 'User information' })
  user: UserDto;
}

/**
 * Type guard to check if an object is a valid UserDto
 */
export function isUserDto(obj: any): obj is UserDto {
  return obj && typeof obj.id === 'string' && typeof obj.steamId === 'string';
}