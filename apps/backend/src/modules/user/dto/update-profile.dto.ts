import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateProfileDto } from './create-profile.dto';

export class UpdateProfileDto extends PartialType(CreateProfileDto) {
  // All fields from CreateProfileDto are optional in UpdateProfileDto
  // This is automatically handled by PartialType decorator
}