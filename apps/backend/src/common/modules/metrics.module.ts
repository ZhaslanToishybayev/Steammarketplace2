import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { MetricsInterceptor } from '../interceptors/metrics.interceptor';
import { MetricsScheduler } from '../schedulers/metrics.scheduler';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [MetricsController],
  providers: [
    MetricsService,
    MetricsInterceptor,
    MetricsScheduler,
  ],
  exports: [MetricsService, MetricsInterceptor],
})
export class MetricsModule {}