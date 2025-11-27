import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './services/marketplace.service';
import { MarketplaceListing } from './entities/marketplace-listing.entity';
import { PriceHistory } from './entities/price-history.entity';
import { User } from '../auth/entities/user.entity';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { TradeOffer } from '../trade/entities/trade-offer.entity';
import { SteamService } from '../auth/services/steam.service';
import { InventoryService } from '../inventory/services/inventory.service';
import { TradeService } from '../trade/services/trade.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      MarketplaceListing,
      PriceHistory,
      User,
      InventoryItem,
      TradeOffer
    ]),
  ],
  controllers: [MarketplaceController],
  providers: [
    MarketplaceService,
    SteamService,
    InventoryService,
    TradeService,
  ],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}