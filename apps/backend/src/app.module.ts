import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { SteamModule } from './modules/steam/steam.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { TradeModule } from './modules/trade/trade.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    SteamModule,
    MarketplaceModule,
    TradeModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}