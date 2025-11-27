import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trade } from './trade.entity';
import { TradeService } from './trade.service';
import { TradeController } from './trade.controller';
import { SteamTradeService } from './steam-trade.service';
import { UserModule } from '../user/user.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trade]),
    UserModule,
    InventoryModule
  ],
  controllers: [TradeController],
  providers: [TradeService, SteamTradeService],
  exports: [TradeService]
})
export class TradeModule {}