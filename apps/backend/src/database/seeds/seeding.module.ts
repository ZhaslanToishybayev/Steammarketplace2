import { Module } from '@nestjs/common';
import { MarketSeeder } from './market-seeder';
import { InventoryModule } from '../../modules/inventory/inventory.module';
import { PricingModule } from '../../modules/pricing/pricing.module';

@Module({
  imports: [
    InventoryModule,
    PricingModule,
  ],
  providers: [
    MarketSeeder,
  ],
  exports: [
    MarketSeeder,
  ],
})
export class SeedingModule {}