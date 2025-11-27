import { IsUUID, IsEnum, IsString, IsArray, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DisputeCategory } from '../entities/trade-dispute.entity';

export class CreateDisputeDto {
  @IsUUID()
  @ApiProperty({
    type: 'string',
    format: 'uuid',
    description: 'Trade ID for which the dispute is created',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  tradeId: string;

  @IsEnum(DisputeCategory)
  @ApiProperty({
    enum: DisputeCategory,
    description: 'Category of the dispute',
    example: DisputeCategory.SCAM,
  })
  category: DisputeCategory;

  @IsString()
  @MinLength(20)
  @ApiProperty({
    type: String,
    description: 'Detailed reason for the dispute',
    minLength: 20,
    example: 'The item I received was not as described in the trade agreement.',
  })
  reason: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({
    type: [String],
    description: 'Evidence supporting the dispute (URLs or descriptions)',
    example: ['https://example.com/evidence1.jpg', 'https://example.com/evidence2.jpg'],
  })
  evidence?: string[];
}