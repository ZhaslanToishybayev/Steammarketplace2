import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsArray, IsString, IsOptional, IsUUID, IsNumber, Min, Max, IsDate, IsBoolean, IsIn } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { TradeStatus, TradeType } from '../entities/trade.entity';

export class GetTradesDto extends PaginationDto {
  @ApiProperty({
    description: 'Filter by trade status',
    example: ['completed', 'pending'],
    required: false,
    enum: Object.values(TradeStatus),
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TradeStatus, { each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  status?: TradeStatus[];

  @ApiProperty({
    description: 'Filter by trade type',
    example: ['deposit', 'withdraw'],
    required: false,
    enum: Object.values(TradeType),
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TradeType, { each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  type?: TradeType[];

  @ApiProperty({
    description: 'Filter by bot ID',
    example: 'uuid-here',
    required: false
  })
  @IsOptional()
  @IsUUID()
  botId?: string;

  @ApiProperty({
    description: 'Filter by escrow status',
    example: true,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  hasEscrow?: boolean;

  @ApiProperty({
    description: 'Filter trades created after this date',
    example: '2023-01-01T00:00:00.000Z',
    required: false
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateFrom?: Date;

  @ApiProperty({
    description: 'Filter trades created before this date',
    example: '2023-12-31T23:59:59.999Z',
    required: false
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateTo?: Date;

  @ApiProperty({
    description: 'Field to sort by',
    example: 'createdAt',
    required: false,
    enum: ['createdAt', 'updatedAt', 'sentAt', 'completedAt', 'totalItemsToGive', 'totalItemsToReceive']
  })
  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'updatedAt', 'sentAt', 'completedAt', 'totalItemsToGive', 'totalItemsToReceive'])
  sortBy?: string;

  @ApiProperty({
    description: 'Sort order',
    example: 'DESC',
    required: false,
    enum: ['ASC', 'DESC']
  })
  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}