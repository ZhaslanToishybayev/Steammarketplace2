import { IsString, IsEnum, IsBoolean, IsOptional, MinLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConfigValueType } from '../entities/system-config.entity';

export class CreateConfigDto {
  @IsString()
  @MinLength(1)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'Key must contain only lowercase letters, numbers, and underscores',
  })
  @ApiProperty({
    type: String,
    description: 'Configuration key (alphanumeric with underscores)',
    pattern: '^[a-z0-9_]+$',
    example: 'maintenance_mode',
  })
  key: string;

  @IsString()
  @MinLength(1)
  @ApiProperty({
    type: String,
    description: 'Configuration value',
    example: 'false',
  })
  value: string;

  @IsEnum(ConfigValueType)
  @ApiProperty({
    enum: ConfigValueType,
    description: 'Type of the configuration value',
    example: ConfigValueType.BOOLEAN,
  })
  valueType: ConfigValueType;

  @IsString()
  @MinLength(1)
  @ApiProperty({
    type: String,
    description: 'Configuration category',
    example: 'system',
  })
  category: string;

  @IsString()
  @MinLength(10)
  @ApiProperty({
    type: String,
    description: 'Description of the configuration',
    minLength: 10,
    example: 'Enable or disable maintenance mode for the platform',
  })
  description: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether this configuration is visible to non-admin users',
    default: false,
  })
  isPublic?: boolean = false;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether this configuration can be edited',
    default: true,
  })
  isEditable?: boolean = true;
}