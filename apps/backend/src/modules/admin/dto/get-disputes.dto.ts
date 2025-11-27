import { IsOptional, IsEnum, IsString, IsDate, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DisputeStatus, DisputePriority, DisputeCategory } from '../entities/trade-dispute.entity';

export class GetDisputesDto extends PaginationDto {
  @IsOptional()
  @IsEnum(DisputeStatus)
  @ApiPropertyOptional({
    enum: DisputeStatus,
    description: 'Filter by dispute status',
  })
  status?: DisputeStatus;

  @IsOptional()
  @IsEnum(DisputePriority)
  @ApiPropertyOptional({
    enum: DisputePriority,
    description: 'Filter by dispute priority',
  })
  priority?: DisputePriority;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    type: String,
    description: 'Filter by assigned admin ID',
  })
  assignedAdminId?: string;

  @IsOptional()
  @IsEnum(DisputeCategory)
  @ApiPropertyOptional({
    enum: DisputeCategory,
    description: 'Filter by dispute category',
  })
  category?: DisputeCategory;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @ApiPropertyOptional({
    type: Date,
    description: 'Start date for filtering',
  })
  dateFrom?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @ApiPropertyOptional({
    type: Date,
    description: 'End date for filtering',
  })
  dateTo?: Date;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    type: String,
    description: 'Field to sort by',
    default: 'createdAt',
  })
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
    default: 'DESC',
  })
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}