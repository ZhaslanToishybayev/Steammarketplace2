import { IsOptional, IsString, IsBoolean, Transform } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class GetConfigsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    type: String,
    description: 'Filter by configuration category',
    example: 'trading',
  })
  category?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  @ApiPropertyOptional({
    type: Boolean,
    description: 'Filter by public visibility',
  })
  isPublic?: boolean;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    type: String,
    description: 'Search in configuration key or description',
  })
  searchQuery?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    type: String,
    description: 'Field to sort by',
    default: 'key',
  })
  sortBy?: string = 'key';

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
    default: 'ASC',
  })
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}