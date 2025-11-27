import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';

// Import existing modules
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { WalletModule } from '../wallet/wallet.module';
import { TradingModule } from '../trading/trading.module';
import { PricingModule } from '../pricing/pricing.module';
import { InventoryModule } from '../inventory/inventory.module';

// Import entities
import { AuditLog } from './entities/audit-log.entity';
import { TradeDispute } from './entities/trade-dispute.entity';
import { SystemConfig } from './entities/system-config.entity';
import { Report } from './entities/report.entity';
import { User } from '../auth/entities/user.entity';
import { Trade } from '../trading/entities/trade.entity';
import { Transaction } from '../wallet/entities/transaction.entity';
import { Bot } from '../trading/entities/bot.entity';

// Import services
import { AuditLogService } from './services/audit-log.service';
import { ReportService } from './services/report.service';
import { AdminDashboardService } from './services/admin-dashboard.service';
import { AdminUserService } from './services/admin-user.service';
import { TradeDisputeService } from './services/trade-dispute.service';
import { SystemConfigService } from './services/system-config.service';

// Import controllers
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { AdminUserController } from './controllers/admin-user.controller';
import { AdminTradeController } from './controllers/admin-trade.controller';
import { AdminConfigController } from './controllers/admin-config.controller';
import { AdminAuditController } from './controllers/admin-audit.controller';

// Import interceptors
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';

// Import processors
import { AdminOperationsProcessor } from './processors/admin-operations.processor';

// Import schedulers
import { AdminCleanupScheduler } from './schedulers/admin-cleanup.scheduler';

@Module({
  imports: [
    // Import existing modules
    AuthModule,
    UserModule,
    WalletModule,
    TradingModule,
    PricingModule,
    InventoryModule,

    // TypeORM entities
    TypeOrmModule.forFeature([
      AuditLog,
      TradeDispute,
      SystemConfig,
      Report,
      User,
      Trade,
      Transaction,
      Bot,
    ]),

    // Bull queues
    BullModule.registerQueue({
      name: 'admin-operations',
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: { type: 'exponential', delay: 3600000 },
      },
    }),

    // Schedule module for cron jobs
    ScheduleModule.forRoot(),
  ],
  controllers: [
    AdminDashboardController,
    AdminUserController,
    AdminTradeController,
    AdminConfigController,
    AdminAuditController,
  ],
  providers: [
    // Services
    AuditLogService,
    ReportService,
    AdminDashboardService,
    AdminUserService,
    TradeDisputeService,
    SystemConfigService,

    // Processors
    AdminOperationsProcessor,

    // Schedulers
    AdminCleanupScheduler,
  ],
  exports: [
    AuditLogService,
    AdminDashboardService,
    AdminUserService,
    TradeDisputeService,
    SystemConfigService,
  ],
})
export class AdminModule {}