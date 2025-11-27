import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../auth/entities/user.entity';

export class UpdateUserRoleDto {
  @IsEnum(UserRole)
  @ApiProperty({
    enum: UserRole,
    description: 'New role for the user',
    example: 'MODERATOR',
  })
  role: UserRole;
}