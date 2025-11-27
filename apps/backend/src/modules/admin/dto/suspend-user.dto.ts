import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SuspendUserDto {
  @IsString()
  @MinLength(10)
  @ApiProperty({
    type: String,
    description: 'Reason for suspending the user',
    minLength: 10,
    example: 'Suspicious account activity detected',
  })
  reason: string;
}