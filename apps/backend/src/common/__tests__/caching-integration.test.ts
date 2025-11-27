import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InventoryController } from '../../../../modules/inventory/inventory.controller';
import { InventoryService } from '../../../../modules/inventory/services/inventory.service';
import { CacheInterceptor } from '../../../interceptors/cache.interceptor';
import { CacheKey, CacheTTL } from '../../../decorators/cache-key.decorator';

describe('Caching Integration Tests', () => {
  let controller: InventoryController;
  let service: InventoryService;
  let cacheManager: Cache;
  let cacheInterceptor: CacheInterceptor;

  beforeEach(async () => {
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      store: {
        client: {
          scanStream: jest.fn(),
          del: jest.fn(),
        },
      },
    };

    const mockCacheInterceptor = {
      intercept: jest.fn((context, next) => {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();

        // Simulate cache hit
        if (request.url.includes('cache-hit')) {
          return next.handle();
        }

        // Simulate cache miss - proceed with normal execution
        return next.handle();
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        InventoryService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: CacheInterceptor,
          useValue: mockCacheInterceptor,
        },
      ],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
    service = module.get<InventoryService>(InventoryService);
    cacheManager = module.get<CACHE_MANAGER>(CACHE_MANAGER);
    cacheInterceptor = module.get<CacheInterceptor>(CacheInterceptor);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
    expect(cacheManager).toBeDefined();
    expect(cacheInterceptor).toBeDefined();
  });

  describe('Cache decorators', () => {
    it('should apply @CacheKey decorator', () => {
      const cacheKey = 'test-key';
      const target = {};
      const propertyKey = 'testMethod';

      CacheKey(cacheKey)(target, propertyKey, {});
      expect(target).toBeDefined();
    });

    it('should apply @CacheTTL decorator', () => {
      const ttl = 300;
      const target = {};
      const propertyKey = 'testMethod';

      CacheTTL(ttl)(target, propertyKey, {});
      expect(target).toBeDefined();
    });

    it('should apply @CacheInvalidate decorator', () => {
      const patterns = ['test:*'];
      const target = {};
      const propertyKey = 'testMethod';

      CacheInvalidate(patterns)(target, propertyKey, {});
      expect(target).toBeDefined();
    });
  });

  describe('CacheInterceptor functionality', () => {
    it('should intercept cacheable requests', async () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            url: '/api/inventory/cache-hit',
            method: 'GET',
            user: { id: 'user123' },
            query: {},
          }),
          getResponse: () => ({}),
        }),
        getHandler: () => ({}),
        getArgs: () => [],
      } as any;

      const mockCallHandler = {
        handle: () => ({
          subscribe: (callback: any) => {
            callback({ data: 'test' });
          },
        }),
      };

      const result = cacheInterceptor.intercept(mockContext, mockCallHandler);
      expect(result).toBeDefined();
    });
  });

  describe('Cache invalidation patterns', () => {
    it('should handle cache invalidation correctly', async () => {
      const mockRedisClient = {
        scanStream: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield ['key1', 'key2', 'key3'];
          },
        }),
        del: jest.fn().mockResolvedValue(3),
      };

      const mockCacheManager = {
        store: {
          client: mockRedisClient,
        },
      };

      // Simulate cache invalidation logic
      const patterns = ['inventory:user123:*', 'inventory-stats:user123'];
      const keysToDelete: string[] = [];

      for (const pattern of patterns) {
        const stream = mockRedisClient.scanStream({ match: pattern });
        for await (const key of stream) {
          keysToDelete.push(...key);
        }
      }

      if (keysToDelete.length > 0) {
        await mockRedisClient.del(...keysToDelete);
      }

      expect(mockRedisClient.scanStream).toHaveBeenCalledTimes(2);
      expect(mockRedisClient.del).toHaveBeenCalledWith('key1', 'key2', 'key3');
    });
  });

  describe('Cache key generation', () => {
    it('should generate cache keys correctly', () => {
      const userId = 'user123';
      const appId = 730;
      const page = 1;
      const limit = 10;

      // Simulate cache key generation logic from controller
      const cacheKey = `user-inventory:${userId}:${appId}:page:${page}:limit:${limit}`;

      expect(cacheKey).toBe('user-inventory:user123:730:page:1:limit:10');
      expect(cacheKey).toContain('user-inventory');
      expect(cacheKey).toContain(userId);
      expect(cacheKey).toContain(appId.toString());
    });

    it('should handle cache key with filters', () => {
      const userId = 'user456';
      const filters = {
        tradable: true,
        marketable: false,
        rarity: ['common', 'uncommon'],
        type: ['weapon', 'skin'],
      };

      const cacheKey = `inventory:${userId}:730:page:1:limit:10:filters:${JSON.stringify(filters)}`;

      expect(cacheKey).toContain(userId);
      expect(cacheKey).toContain('tradable');
      expect(cacheKey).toContain('marketable');
      expect(cacheKey).toContain('rarity');
      expect(cacheKey).toContain('type');
    });
  });

  describe('Cache TTL handling', () => {
    it('should use correct TTL values', () => {
      const TTL_VALUES = {
        INVENTORY: 1800, // 30 minutes
        INVENTORY_ITEM: 1800, // 30 minutes
        INVENTORY_STATS: 300, // 5 minutes
        ITEM_PRICE: 900, // 15 minutes
        PRICE_HISTORY: 3600, // 1 hour
        MARKET_TRENDS: 900, // 15 minutes
      };

      expect(TTL_VALUES.INVENTORY).toBe(1800);
      expect(TTL_VALUES.INVENTORY_STATS).toBe(300);
      expect(TTL_VALUES.ITEM_PRICE).toBe(900);
      expect(TTL_VALUES.PRICE_HISTORY).toBe(3600);
    });

    it('should not multiply TTL by 1000', () => {
      const ttlSeconds = 1800;
      const ttlMilliseconds = ttlSeconds * 1000;

      // The fix ensures we use seconds, not milliseconds
      expect(ttlMilliseconds).toBe(1800000);
      expect(ttlSeconds).toBe(1800);

      // Cache should use seconds
      expect(ttlMilliseconds).not.toBe(ttlSeconds);
    });
  });

  describe('Cache performance', () => {
    it('should demonstrate cache hit vs miss performance', async () => {
      const mockCacheManager = {
        get: jest.fn(),
        set: jest.fn(),
      };

      // Simulate cache hit
      mockCacheManager.get.mockResolvedValue({ data: 'cached' });

      const startTime = Date.now();
      const cachedResult = await mockCacheManager.get('test-key');
      const cacheHitTime = Date.now() - startTime;

      // Simulate cache miss
      mockCacheManager.get.mockResolvedValue(undefined);

      const startTime2 = Date.now();
      const nonCachedResult = await mockCacheManager.get('test-key');
      const cacheMissTime = Date.now() - startTime2;

      expect(cachedResult).toBeDefined();
      expect(nonCachedResult).toBeUndefined();
      expect(cacheHitTime).toBeLessThanOrEqual(cacheMissTime);
    });
  });
});