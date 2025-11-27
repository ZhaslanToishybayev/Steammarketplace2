import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { forwardRef } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { ItemPrice } from './entities/item-price.entity';
import { PricingController } from './controllers/pricing.controller';
import { PriceService } from './services/price.service';
import { PricingApiService } from './services/pricing-api.service';
import { PriceCalculationService } from './services/price-calculation.service';
import { TrendAnalysisService } from './services/trend-analysis.service';
import { PriceUpdateProcessor } from './processors/price-update.processor';
import { TrendAnalysisProcessor } from './processors/trend-analysis.processor';
import { PriceUpdateScheduler } from './schedulers/price-update.scheduler';
import { InventoryModule } from '../inventory/inventory.module';
import { TradingModule } from '../trading/trading.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    // TypeORM entities
    TypeOrmModule.forFeature([ItemPrice]),

    // Bull queues
    BullModule.registerQueueAsync(
      {
        name: 'price-update',
        useFactory: (configService: ConfigService, cacheManager: Cache) => ({
          defaultJobOptions: {
            removeOnComplete: true,
            removeOnFail: true,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
          settings: {
            stalledInterval: 30000,
            maxStalledCount: 1,
            retryProcessDelay: 5000,
            sweepTimer: {
              delay: 300000,
              iterations: -1,
            },
          },
          concurrency: configService.get<number>('PRICE_UPDATE_QUEUE_CONCURRENCY', 5),
        }),
        inject: [ConfigService],
      },
      {
        name: 'trend-analysis',
        useFactory: (configService: ConfigService) => ({
          defaultJobOptions: {
            removeOnComplete: true,
            removeOnFail: true,
            attempts: 2,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
          },
          settings: {
            stalledInterval: 60000,
            maxStalledCount: 1,
            retryProcessDelay: 10000,
            sweepTimer: {
              delay: 600000,
              iterations: -1,
            },
          },
          concurrency: configService.get<number>('TREND_ANALYSIS_QUEUE_CONCURRENCY', 3),
        }),
        inject: [ConfigService],
      }
    ),

    // HTTP client for external pricing APIs
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),

    // Schedule for cron jobs
    ScheduleModule.forRoot(),

    // Forward references to avoid circular dependencies
    forwardRef(() => AuthModule),
    forwardRef(() => InventoryModule),
    forwardRef(() => TradingModule),
  ],
  controllers: [
    PricingController,
  ],
  providers: [
    // Services
    PriceService,
    PricingApiService,
    PriceCalculationService,
    TrendAnalysisService,

    // Processors
    PriceUpdateProcessor,
    TrendAnalysisProcessor,

    // Schedulers
    PriceUpdateScheduler,
  ],
  exports: [
    // Export services that other modules might need
    PriceService,
    PriceCalculationService,

    // Export entities for other modules to use
    TypeOrmModule,
  ],
})
export class PricingModule {}