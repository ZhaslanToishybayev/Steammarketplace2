import { IsString, IsNumber, IsOptional, Min, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BanUserDto {
  @IsString()
  @MinLength(10)
  @ApiProperty({
    type: String,
    description: 'Reason for banning the user',
    minLength: 10,
    example: 'Violation of terms of service',
  })
  reason: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @ApiPropertyOptional({
    type: Number,
    description: 'Ban duration in hours (null for permanent ban)',
    minimum: 1,
    example: 24,
  })
  duration?: number;
}