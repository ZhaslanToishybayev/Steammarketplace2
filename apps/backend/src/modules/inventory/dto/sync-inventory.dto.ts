import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class SyncInventoryDto {
  @ApiProperty({
    description: 'Steam App ID (730: CS:GO/CS2, 570: Dota 2, 440: TF2, 252490: Rust)',
    example: 730,
    enum: [730, 570, 440, 252490]
  })
  @IsNotEmpty()
  @IsInt()
  @IsIn([730, 570, 440, 252490])
  @Type(() => Number)
  appId: number;

  @ApiProperty({
    description: 'Force sync even if recently synced',
    example: false,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  force?: boolean = false;
}