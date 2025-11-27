import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { SteamController } from './steam.controller';
import { SteamInventoryService } from './steam-inventory.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule
  ],
  controllers: [SteamController],
  providers: [SteamInventoryService],
  exports: [SteamInventoryService]
})
export class SteamModule {}