import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateConfigDto {
  @IsString()
  @MinLength(1)
  @ApiProperty({
    type: String,
    description: 'New configuration value',
    example: 'true',
  })
  value: string;
}