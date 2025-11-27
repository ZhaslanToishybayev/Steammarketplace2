import { Test, TestingModule } from '@nestjs/testing';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HealthController } from '../health.controller';
import { HealthService } from '../health.service';
import { CustomRedisHealthIndicator } from '../../indicators/custom-redis-health.indicator';
import { CustomBullHealthIndicator } from '../../indicators/custom-bull-health.indicator';
import { User } from '../../../../modules/auth/entities/user.entity.ts';

describe('HealthController', () => {
  let controller: HealthController;
  let service: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TerminusModule,
        HttpModule,
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          username: 'test',
          password: 'test',
          database: 'test',
          entities: [User],
          synchronize: false,
          autoLoadEntities: true,
        }),
        MongooseModule.forRoot('mongodb://localhost:27017/test'),
        BullModule.registerQueue({
          name: 'test-queue',
          redis: {
            host: 'localhost',
            port: 6379,
          },
        }),
      ],
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: CustomRedisHealthIndicator,
          useValue: {
            isHealthy: jest.fn().mockResolvedValue({ redis: { status: 'up' } }),
          },
        },
        {
          provide: CustomBullHealthIndicator,
          useValue: {
            isHealthy: jest.fn().mockResolvedValue({ queue: { status: 'up' } }),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            store: {
              client: {
                ping: jest.fn().mockResolvedValue('PONG'),
                info: jest.fn().mockResolvedValue(''),
              },
            },
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('health check endpoints', () => {
    it('should return health status', async () => {
      const result = await controller.health();
      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
    });

    it('should return readiness status', async () => {
      const result = await controller.ready();
      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
    });

    it('should return liveness status', async () => {
      const result = await controller.live();
      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
    });

    it('should return detailed health information', async () => {
      const result = await controller.detailed();
      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeDefined();
      expect(result.checks).toBeDefined();
    });
  });
});

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TerminusModule,
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          username: 'test',
          password: 'test',
          database: 'test',
          entities: [User],
          synchronize: false,
          autoLoadEntities: true,
        }),
        MongooseModule.forRoot('mongodb://localhost:27017/test'),
        BullModule.registerQueue({
          name: 'test-queue',
          redis: {
            host: 'localhost',
            port: 6379,
          },
        }),
      ],
      providers: [
        HealthService,
        {
          provide: CustomRedisHealthIndicator,
          useValue: {
            isHealthy: jest.fn().mockResolvedValue({ redis: { status: 'up' } }),
          },
        },
        {
          provide: CustomBullHealthIndicator,
          useValue: {
            isHealthy: jest.fn().mockResolvedValue({ queue: { status: 'up' } }),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            store: {
              client: {
                ping: jest.fn().mockResolvedValue('PONG'),
                info: jest.fn().mockResolvedValue(''),
              },
            },
          },
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('health checks', () => {
    it('should check readiness', async () => {
      const result = await service.checkReadiness();
      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
    });

    it('should check liveness', async () => {
      const result = await service.checkLiveness();
      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
    });

    it('should check general health', async () => {
      const result = await service.checkHealth();
      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
    });

    it('should get detailed health information', async () => {
      const result = await service.getDetailedHealth();
      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeDefined();
      expect(result.checks).toBeDefined();
      expect(result.checks.database).toBeDefined();
      expect(result.checks.queues).toBeDefined();
      expect(result.checks.system).toBeDefined();
      expect(result.checks.external).toBeDefined();
    });
  });
});