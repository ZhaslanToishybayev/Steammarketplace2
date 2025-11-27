import { IsOptional, IsUUID, IsString, IsEnum, IsDate, Transform } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { AuditTargetType } from '../entities/audit-log.entity';

export class GetAuditLogsDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({
    type: 'string',
    format: 'uuid',
    description: 'Filter by admin ID',
  })
  adminId?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    type: String,
    description: 'Filter by action type',
    example: 'user.ban',
  })
  action?: string;

  @IsOptional()
  @IsEnum(AuditTargetType)
  @ApiPropertyOptional({
    enum: AuditTargetType,
    description: 'Filter by target type',
  })
  targetType?: AuditTargetType;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({
    type: 'string',
    format: 'uuid',
    description: 'Filter by target ID',
  })
  targetId?: string;

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