import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { CustomRedisHealthIndicator } from '../indicators/custom-redis-health.indicator';
import { CustomBullHealthIndicator } from '../indicators/custom-bull-health.indicator';

@Module({
  imports: [
    TerminusModule,
    HttpModule,
    TypeOrmModule,
    MongooseModule,
    BullModule,
    CacheModule,
  ],
  controllers: [HealthController],
  providers: [
    HealthService,
    CustomRedisHealthIndicator,
    CustomBullHealthIndicator,
  ],
  exports: [HealthService],
})
export class HealthModule {}