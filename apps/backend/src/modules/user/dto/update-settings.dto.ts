import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsIn,
} from 'class-validator';

export class UpdateSettingsDto {
  @ApiProperty({
    description: 'Enable email notifications',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  emailNotifications?: boolean;

  @ApiProperty({
    description: 'Enable push notifications',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  pushNotifications?: boolean;

  @ApiProperty({
    description: 'Enable trade notifications',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  tradeNotifications?: boolean;

  @ApiProperty({
    description: 'Enable price alert notifications',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  priceAlertNotifications?: boolean;

  @ApiProperty({
    description: 'Enable marketing emails',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  marketingEmails?: boolean;

  @ApiProperty({
    description: 'Enable two-factor authentication',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  twoFactorEnabled?: boolean;

  @ApiProperty({
    description: 'Auto-accept trades',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  autoAcceptTrades?: boolean;

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

  @ApiProperty({
    description: 'UI theme preference',
    example: 'auto',
    enum: ['light', 'dark', 'auto'],
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsIn(['light', 'dark', 'auto'])
  theme?: string;
}