import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { Expose } from 'class-transformer';

export class TradeItemDto {
  @ApiProperty({ description: 'Item ID', example: '123456789' })
  @IsNumber()
  @Expose()
  itemId: string;

  @ApiProperty({ description: 'Class ID', example: '123456789' })
  @IsString()
  @Expose()
  classId: string;

  @ApiProperty({ description: 'Application ID', example: 730 })
  @IsNumber()
  @Expose()
  appId: number;

  @ApiProperty({ description: 'Amount of items', example: 1 })
  @IsNumber()
  @Expose()
  amount: number;
}

export class CalculateProfitDto {
  @ApiProperty({
    description: 'Items the user is giving away',
    type: [TradeItemDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TradeItemDto)
  itemsToGive: TradeItemDto[];

  @ApiProperty({
    description: 'Items the user is receiving',
    type: [TradeItemDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TradeItemDto)
  itemsToReceive: TradeItemDto[];
}

export class ProfitMarginResponseDto {
  @ApiProperty({ description: 'Total value of items being given', example: 250.5 })
  @Expose()
  totalGiveValue: number;

  @ApiProperty({ description: 'Total value of items being received', example: 300.0 })
  @Expose()
  totalReceiveValue: number;

  @ApiProperty({ description: 'Profit margin (received - given)', example: 49.5 })
  @Expose()
  profitMargin: number;

  @ApiProperty({ description: 'Profit percentage relative to items given', example: 19.8 })
  @Expose()
  profitPercentage: number;

  @ApiProperty({
    description: 'Detailed breakdown of items being given',
    type: [Object]
  })
  @Expose()
  itemsToGiveDetails: Array<{
    itemId: string;
    name: string;
    estimatedValue: number;
  }>;

  @ApiProperty({
    description: 'Detailed breakdown of items being received',
    type: [Object]
  })
  @Expose()
  itemsToReceiveDetails: Array<{
    itemId: string;
    name: string;
    estimatedValue: number;
  }>;

  @ApiProperty({ description: 'Calculation timestamp', example: '2023-12-01T10:30:00.000Z' })
  @Expose()
  calculatedAt: Date;
}