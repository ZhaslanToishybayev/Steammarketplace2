import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString, IsOptional } from 'class-validator';

export class GetReferralsDto {
  @ApiProperty({
    description: 'Page number',
    required: false,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiProperty({
    description: 'Number of items per page',
    required: false,
    default: 20,
    example: 20,
  })
  @IsOptional()
  @IsNumberString()
  limit?: string;
}