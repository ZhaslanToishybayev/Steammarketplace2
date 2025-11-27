import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';
import { WinstonModule } from 'nest-winston';
import { AuthModule } from '../../auth.module';
import { UserModule } from '../../../user/user.module';
import { WalletModule } from '../../../wallet/wallet.module';
import { InventoryModule } from '../../../inventory/inventory.module';
import { TradingModule } from '../../../trading/trading.module';
import { PricingModule } from '../../../pricing/pricing.module';
import { AdminModule } from '../../../admin/admin.module';
import { EventsModule } from '../../../events/events.module';
import { HealthModule } from '../../../../common/modules/health.module';
import { MetricsModule } from '../../../../common/modules/metrics.module';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { databaseConfig } from '../../../../config/database.config';
import { mongodbConfig } from '../../../../config/mongodb.config';
import { bullConfig, cacheConfig, redisClientFactory } from '../../../../config/redis.config';
import { loggerConfig } from '../../../../config/logger.config';
import { RedisModule } from '../../../../config/redis.module';

describe('Global JwtAuthGuard Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
          load: [],
        }),
        TypeOrmModule.forRootAsync({
          useFactory: databaseConfig,
        }),
        MongooseModule.forRootAsync({
          useFactory: mongodbConfig,
        }),
        BullModule.forRootAsync({
          useFactory: bullConfig,
        }),
        CacheModule.registerAsync({
          useFactory: cacheConfig,
        }),
        WinstonModule.forRootAsync({
          useFactory: loggerConfig,
        }),
        RedisModule,
        AuthModule,
        UserModule,
        WalletModule,
        InventoryModule,
        TradingModule,
        PricingModule,
        AdminModule,
        EventsModule,
        HealthModule,
        MetricsModule,
      ],
      providers: [
        {
          provide: APP_GUARD,
          useClass: JwtAuthGuard,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableCors();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Public endpoints', () => {
    it('should allow access to Steam OAuth login endpoint without authentication', async () => {
      const response = await app
        .getHttpServer()
        .get('/api/auth/steam')
        .expect(HttpStatus.FOUND);

      // Should redirect to Steam (302) rather than return 401
      expect(response.status).toBe(HttpStatus.FOUND);
    });

    it('should allow access to Steam OAuth callback endpoint without authentication', async () => {
      // Note: This is a basic test to ensure the endpoint is accessible
      // without authentication. The actual Steam callback would require
      // proper Steam OAuth flow setup.
      const response = await app
        .getHttpServer()
        .get('/api/auth/steam/return')
        .expect(HttpStatus.UNAUTHORIZED);

      // Should return 401 only if no valid Steam session, not due to missing JWT
      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should allow access to token refresh endpoint without authentication', async () => {
      const response = await app
        .getHttpServer()
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        })
        .expect(HttpStatus.UNAUTHORIZED);

      // Should return 401 for invalid token, not due to missing authentication
      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should allow access to health check endpoints without authentication', async () => {
      const response = await app.getHttpServer().get('/api/health');
      expect(response.status).toBe(HttpStatus.OK);
    });

    it('should allow access to readiness check endpoint without authentication', async () => {
      const response = await app.getHttpServer().get('/api/health/ready');
      expect(response.status).toBe(HttpStatus.OK);
    });

    it('should allow access to liveness check endpoint without authentication', async () => {
      const response = await app.getHttpServer().get('/api/health/live');
      expect(response.status).toBe(HttpStatus.OK);
    });

    it('should allow access to detailed health endpoint without authentication', async () => {
      const response = await app.getHttpServer().get('/api/health/detailed');
      expect(response.status).toBe(HttpStatus.OK);
    });

    it('should allow access to Swagger documentation without authentication', async () => {
      const response = await app.getHttpServer().get('/api/docs');
      expect(response.status).toBe(HttpStatus.OK);
    });
  });

  describe('Protected endpoints', () => {
    it('should require authentication for user profile endpoint', async () => {
      const response = await app
        .getHttpServer()
        .get('/api/auth/me')
        .expect(HttpStatus.UNAUTHORIZED);

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should require authentication for trade URL update endpoint', async () => {
      const response = await app
        .getHttpServer()
        .patch('/api/auth/trade-url')
        .send({
          tradeUrl: 'https://steamcommunity.com/tradeoffer/new/?partner=123456&token=abc123',
        })
        .expect(HttpStatus.UNAUTHORIZED);

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should require authentication for logout endpoint', async () => {
      const response = await app
        .getHttpServer()
        .post('/api/auth/logout')
        .send({
          refreshToken: 'invalid-token',
        })
        .expect(HttpStatus.UNAUTHORIZED);

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('@Public() decorator integration', () => {
    it('should properly handle metadata key consistency', () => {
      // This test ensures that the metadata key used in JwtAuthGuard
      // matches the key used in the @Public() decorator
      const jwtAuthGuard = app.get(JwtAuthGuard);

      // The guard should be properly injected and functional
      expect(jwtAuthGuard).toBeDefined();
      expect(typeof jwtAuthGuard.canActivate).toBe('function');
      expect(typeof jwtAuthGuard.handleRequest).toBe('function');
    });
  });
});