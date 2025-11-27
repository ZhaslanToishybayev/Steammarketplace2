import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class ApplyReferralCodeDto {
  @ApiProperty({
    description: 'Referral code to apply',
    example: 'STEAM2024ABC',
    minLength: 6,
    maxLength: 20,
    pattern: '^[A-Z0-9]+$',
  })
  @IsString()
  @Length(6, 20)
  @Matches(/^[A-Z0-9]+$/, { message: 'Referral code must contain only uppercase letters and numbers' })
  code: string;
}