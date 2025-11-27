import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { TradeController } from './trade.controller';
import { TradeService } from './services/trade.service';
import { TradeOffer } from './entities/trade-offer.entity';
import { User } from '../auth/entities/user.entity';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TradeOffer, User, InventoryItem]),
    HttpModule,
  ],
  controllers: [TradeController],
  providers: [TradeService],
  exports: [TradeService],
})
export class TradeModule {}