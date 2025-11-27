import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { IsValidTradeUrl } from '../validators/trade-url.validator';

export class UpdateTradeUrlDto {
  @ApiProperty({
    description: 'Steam trade URL for receiving trade offers',
    example: 'https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=abcdefg12345'
  })
  @IsString()
  @IsNotEmpty()
  @IsValidTradeUrl()
  tradeUrl: string;
}