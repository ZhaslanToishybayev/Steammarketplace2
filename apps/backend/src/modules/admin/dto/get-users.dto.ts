import { IsOptional, IsEnum, IsBoolean, IsString, IsDate, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { UserRole } from '../../auth/entities/user.entity';

export class GetUsersDto extends PaginationDto {
  @IsOptional()
  @IsEnum(UserRole)
  @ApiPropertyOptional({
    enum: UserRole,
    description: 'Filter by user role',
  })
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  @ApiPropertyOptional({
    type: Boolean,
    description: 'Filter by active status',
  })
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  @ApiPropertyOptional({
    type: Boolean,
    description: 'Filter by banned status',
  })
  isBanned?: boolean;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    type: String,
    description: 'Search in username, email, or Steam ID',
  })
  searchQuery?: string;

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