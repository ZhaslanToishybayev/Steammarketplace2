import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './services/inventory.service';
import { SteamApiService } from '../auth/services/steam.service';
import { Inventory, SyncStatus } from './entities/inventory.entity';
import { User } from '../auth/entities/user.entity';
import { Item } from './entities/item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inventory, User, Item]),
    HttpModule,
  ],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    SteamApiService,
  ],
  exports: [
    InventoryService,
    SteamApiService,
  ],
})
export class InventoryModule {}