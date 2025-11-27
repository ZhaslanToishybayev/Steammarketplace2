import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleModule } from '@nestjs/schedule';
import { MetricsController } from '../metrics.controller';
import { MetricsService } from '../metrics.service';

describe('MetricsController', () => {
  let controller: MetricsController;
  let service: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      controllers: [MetricsController],
      providers: [MetricsService],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
    service = module.get<MetricsService>(MetricsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('metrics endpoints', () => {
    it('should return metrics', () => {
      const result = controller.getMetrics();
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should return health status', () => {
      const result = controller.getHealth();
      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(result.metrics_collected).toBe(true);
    });
  });
});

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [MetricsService],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('HTTP metrics', () => {
    it('should record HTTP request metrics', () => {
      const recordSpy = jest.spyOn(service, 'recordHttpRequest');
      service.recordHttpRequest('GET', '/test', 200, 0.1, 100, 200);
      expect(recordSpy).toHaveBeenCalledWith('GET', '/test', 200, 0.1, 100, 200);
    });
  });

  describe('business metrics', () => {
    it('should set user metrics', () => {
      const setSpy = jest.spyOn(service, 'setUsersTotal');
      service.setUsersTotal('active', 100);
      expect(setSpy).toHaveBeenCalledWith('active', 100);
    });

    it('should set inventory metrics', () => {
      const setSpy = jest.spyOn(service, 'setInventoriesTotal');
      service.setInventoriesTotal('730', 50);
      expect(setSpy).toHaveBeenCalledWith('730', 50);
    });

    it('should set trade metrics', () => {
      const setSpy = jest.spyOn(service, 'setTradesTotal');
      service.setTradesTotal('completed', 25);
      expect(setSpy).toHaveBeenCalledWith('completed', 25);
    });

    it('should set wallet metrics', () => {
      const setSpy = jest.spyOn(service, 'setWalletBalanceTotal');
      service.setWalletBalanceTotal('USD', 1000);
      expect(setSpy).toHaveBeenCalledWith('USD', 1000);
    });

    it('should set price metrics', () => {
      const setSpy = jest.spyOn(service, 'setPricesTotal');
      service.setPricesTotal('730', 1000);
      expect(setSpy).toHaveBeenCalledWith('730', 1000);
    });
  });

  describe('queue metrics', () => {
    it('should record queue job metrics', () => {
      const recordSpy = jest.spyOn(service, 'recordQueueJob');
      service.recordQueueJob('test-queue', 'completed');
      expect(recordSpy).toHaveBeenCalledWith('test-queue', 'completed');
    });

    it('should set active queue jobs', () => {
      const setSpy = jest.spyOn(service, 'setQueueJobsActive');
      service.setQueueJobsActive('test-queue', 5);
      expect(setSpy).toHaveBeenCalledWith('test-queue', 5);
    });

    it('should record queue job completion', () => {
      const recordSpy = jest.spyOn(service, 'recordQueueJobCompleted');
      service.recordQueueJobCompleted('test-queue');
      expect(recordSpy).toHaveBeenCalledWith('test-queue');
    });

    it('should record queue job failure', () => {
      const recordSpy = jest.spyOn(service, 'recordQueueJobFailed');
      service.recordQueueJobFailed('test-queue');
      expect(recordSpy).toHaveBeenCalledWith('test-queue');
    });

    it('should record queue processing duration', () => {
      const recordSpy = jest.spyOn(service, 'recordQueueProcessingDuration');
      service.recordQueueProcessingDuration('test-queue', 2.5);
      expect(recordSpy).toHaveBeenCalledWith('test-queue', 2.5);
    });
  });

  describe('cache metrics', () => {
    it('should record cache hit', () => {
      const recordSpy = jest.spyOn(service, 'recordCacheHit');
      service.recordCacheHit('redis');
      expect(recordSpy).toHaveBeenCalledWith('redis');
    });

    it('should record cache miss', () => {
      const recordSpy = jest.spyOn(service, 'recordCacheMiss');
      service.recordCacheMiss('redis');
      expect(recordSpy).toHaveBeenCalledWith('redis');
    });

    it('should set cache size', () => {
      const setSpy = jest.spyOn(service, 'setCacheSize');
      service.setCacheSize('redis', 1024);
      expect(setSpy).toHaveBeenCalledWith('redis', 1024);
    });
  });

  describe('database metrics', () => {
    it('should set database connection pool size', () => {
      const setSpy = jest.spyOn(service, 'setDbConnectionPoolSize');
      service.setDbConnectionPoolSize('postgres', 10);
      expect(setSpy).toHaveBeenCalledWith('postgres', 10);
    });

    it('should record database query duration', () => {
      const recordSpy = jest.spyOn(service, 'recordDbQuery');
      service.recordDbQuery('postgres', 'SELECT', 0.05);
      expect(recordSpy).toHaveBeenCalledWith('postgres', 'SELECT', 0.05);
    });

    it('should set database active connections', () => {
      const setSpy = jest.spyOn(service, 'setDbActiveConnections');
      service.setDbActiveConnections('postgres', 5);
      expect(setSpy).toHaveBeenCalledWith('postgres', 5);
    });
  });

  describe('system metrics', () => {
    it('should set system CPU usage', () => {
      const setSpy = jest.spyOn(service, 'setSystemCpuUsage');
      service.setSystemCpuUsage(25.5);
      expect(setSpy).toHaveBeenCalledWith(25.5);
    });

    it('should set system memory usage', () => {
      const setSpy = jest.spyOn(service, 'setSystemMemoryUsage');
      service.setSystemMemoryUsage('heapUsed', 52428800);
      expect(setSpy).toHaveBeenCalledWith('heapUsed', 52428800);
    });

    it('should set system uptime', () => {
      const setSpy = jest.spyOn(service, 'setSystemUptime');
      service.setSystemUptime(3600);
      expect(setSpy).toHaveBeenCalledWith(3600);
    });

    it('should update system metrics', () => {
      const updateSpy = jest.spyOn(service, 'updateSystemMetrics');
      service.updateSystemMetrics();
      expect(updateSpy).toHaveBeenCalled();
    });
  });

  describe('metrics output', () => {
    it('should return Prometheus metrics', () => {
      const result = service.getMetrics();
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('# HELP');
      expect(result).toContain('# TYPE');
    });

    it('should return metric registry', () => {
      const result = service.getRegistry();
      expect(result).toBeDefined();
      expect(result.registerMetric).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.getSingleMetric).toBeDefined();
    });
  });
});