import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Bot } from './entities/bot.entity';
import { Trade } from './entities/trade.entity';
import { TradeItem } from './entities/trade-item.entity';
import { WebhookSubscription } from './entities/webhook-subscription.entity';
import { WebhookLog } from './entities/webhook-log.entity';
import { TradingController } from './trading.controller';
import { BotController } from './bot.controller';
import { SteamTradeService } from './services/steam-trade.service';
import { BotManagerService } from './services/bot-manager.service';
import { TradeValidationService } from './services/trade-validation.service';
import { TradeService } from './services/trade.service';
import { TradeWebhookService } from './services/trade-webhook.service';
import { TradeProcessor } from './processors/trade.processor';
import { TradePollingProcessor } from './processors/trade-polling.processor';
import { TradePollingScheduler } from './schedulers/trade-polling.scheduler';
import { WebhookDeliveryProcessor } from './processors/webhook-delivery.processor';
import { AdminGuard } from './guards/admin.guard';
import { AuthModule } from '../auth/auth.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PricingModule } from '../pricing/pricing.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    // TypeORM entities
    TypeOrmModule.forFeature([
      Bot,
      Trade,
      TradeItem,
      WebhookSubscription,
      WebhookLog
    ]),

    // Bull queues
    BullModule.registerQueueAsync(
      {
        name: 'trade-processing',
        useFactory: (configService: ConfigService) => ({
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
          concurrency: configService.get<number>('TRADE_QUEUE_CONCURRENCY', 5),
        }),
        inject: [ConfigService],
      },
      {
        name: 'trade-polling',
        useFactory: (configService: ConfigService) => ({
          defaultJobOptions: {
            removeOnComplete: true,
            removeOnFail: true,
            attempts: 1, // Polling jobs should not retry
          },
          settings: {
            stalledInterval: 60000,
            maxStalledCount: 1,
            retryProcessDelay: 10000,
          },
          concurrency: configService.get<number>('TRADE_POLLING_QUEUE_CONCURRENCY', 10),
        }),
        inject: [ConfigService],
      },
      {
        name: 'webhook-delivery',
        useFactory: (configService: ConfigService) => ({
          defaultJobOptions: {
            removeOnComplete: true,
            removeOnFail: true,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
          },
          settings: {
            stalledInterval: 30000,
            maxStalledCount: 1,
            retryProcessDelay: 5000,
          },
          concurrency: 10, // Keep webhook delivery concurrency hard-coded for now
        }),
        inject: [ConfigService],
      }
    ),

    // HTTP client for webhooks
    HttpModule,

    // Schedule for cron jobs
    ScheduleModule.forRoot(),

    // Forward references to avoid circular dependencies
    forwardRef(() => AuthModule),
    forwardRef(() => InventoryModule),
    forwardRef(() => PricingModule),
    forwardRef(() => EventsModule),
  ],
  controllers: [
    TradingController,
    BotController
  ],
  providers: [
    // Services
    SteamTradeService,
    BotManagerService,
    TradeValidationService,
    TradeService,
    TradeWebhookService,

    // Processors
    TradeProcessor,
    TradePollingProcessor,
    WebhookDeliveryProcessor,

    // Schedulers
    TradePollingScheduler,

    // Guards
    AdminGuard,
  ],
  exports: [
    // Export services that other modules might need
    TradeService,
    BotManagerService,
    SteamTradeService,
    TradeValidationService,
    TradeWebhookService,

    // Export entities for other modules to use
    TypeOrmModule,
  ],
})
export class TradingModule {}