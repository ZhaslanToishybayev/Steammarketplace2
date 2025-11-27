import { IsArray, ArrayMinSize, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class ConfigUpdateItem {
  @Type(() => String)
  key: string;

  @Type(() => String)
  value: string;
}

export class BulkUpdateConfigDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ConfigUpdateItem)
  @ApiProperty({
    type: [ConfigUpdateItem],
    description: 'Array of configuration updates',
    example: [
      { key: 'maintenance_mode', value: 'true' },
      { key: 'max_trade_value', value: '1000' },
    ],
  })
  configs: ConfigUpdateItem[];
}