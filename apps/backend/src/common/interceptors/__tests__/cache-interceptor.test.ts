import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { Request, Response } from 'express';
import { CacheInterceptor } from '../cache.interceptor';
import { MetricsService } from '../../modules/metrics.service';

describe('CacheInterceptor', () => {
  let interceptor: CacheInterceptor;
  let metricsService: MetricsService;
  let context: ExecutionContext;
  let callHandler: CallHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheInterceptor,
        {
          provide: MetricsService,
          useValue: {
            recordHttpRequest: jest.fn(),
            updateSystemMetrics: jest.fn(),
          },
        },
      ],
    }).compile();

    interceptor = module.get<CacheInterceptor>(CacheInterceptor);
    metricsService = module.get<MetricsService>(MetricsService);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
    expect(metricsService).toBeDefined();
  });

  describe('intercept method', () => {
    it('should skip metrics collection for metrics endpoint', () => {
      const mockRequest = {
        url: '/api/metrics',
        method: 'GET',
        headers: {},
        route: { path: '/api/metrics' },
      } as Request;

      const mockResponse = {} as Response;

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      } as ExecutionContext;

      const mockCallHandler = {
        handle: () => of({ data: 'test' }),
      } as CallHandler;

      const handleSpy = jest.spyOn(mockCallHandler, 'handle');

      interceptor.intercept(mockContext, mockCallHandler);

      expect(handleSpy).toHaveBeenCalled();
      expect(metricsService.recordHttpRequest).not.toHaveBeenCalled();
    });

    it('should record HTTP metrics for non-metrics endpoints', (done) => {
      const mockRequest = {
        url: '/api/users',
        method: 'GET',
        headers: {
          'content-length': '100',
        },
        route: { path: '/api/users' },
        path: '/api/users',
      } as Request;

      const mockResponse = {
        statusCode: 200,
        getHeader: () => '200',
      } as Response;

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      } as ExecutionContext;

      const mockCallHandler = {
        handle: () => of({ data: 'test' }),
      } as CallHandler;

      const handleSpy = jest.spyOn(mockCallHandler, 'handle');
      const recordSpy = jest.spyOn(metricsService, 'recordHttpRequest');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe(() => {
        expect(handleSpy).toHaveBeenCalled();
        expect(recordSpy).toHaveBeenCalledWith(
          'GET',
          '/api/users',
          200,
          expect.any(Number), // duration
          100, // request size
          200, // response size
        );
        done();
      });
    });

    it('should record HTTP metrics for error responses', (done) => {
      const mockRequest = {
        url: '/api/users/invalid',
        method: 'GET',
        headers: {
          'content-length': '50',
        },
        route: { path: '/api/users/:id' },
        path: '/api/users/invalid',
      } as Request;

      const mockResponse = {
        statusCode: 500,
        getHeader: () => '100',
      } as Response;

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      } as ExecutionContext;

      const mockCallHandler = {
        handle: () => {
          throw new Error('Test error');
        },
      } as CallHandler;

      const handleSpy = jest.spyOn(mockCallHandler, 'handle');
      const recordSpy = jest.spyOn(metricsService, 'recordHttpRequest');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          expect(handleSpy).toHaveBeenCalled();
          expect(recordSpy).toHaveBeenCalledWith(
            'GET',
            '/api/users/:id',
            500, // error status
            expect.any(Number), // duration
            50, // request size
            100, // response size
          );
          done();
        },
      });
    });

    it('should normalize route patterns correctly', (done) => {
      const mockRequest = {
        url: '/api/users/123',
        method: 'GET',
        headers: {},
        route: { path: '/api/users/:id' },
        path: '/api/users/123',
      } as Request;

      const mockResponse = {
        statusCode: 200,
        getHeader: () => undefined,
      } as Response;

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      } as ExecutionContext;

      const mockCallHandler = {
        handle: () => of({ data: 'test' }),
      } as CallHandler;

      const recordSpy = jest.spyOn(metricsService, 'recordHttpRequest');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe(() => {
        expect(recordSpy).toHaveBeenCalledWith(
          'GET',
          '/api/users/:id',
          200,
          expect.any(Number),
          undefined,
          undefined,
        );
        done();
      });
    });

    it('should handle UUID patterns in routes', (done) => {
      const mockRequest = {
        url: '/api/trades/550e8400-e29b-41d4-a716-446655440000',
        method: 'GET',
        headers: {},
        route: { path: '/api/trades/:uuid' },
        path: '/api/trades/550e8400-e29b-41d4-a716-446655440000',
      } as Request;

      const mockResponse = {
        statusCode: 200,
        getHeader: () => undefined,
      } as Response;

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      } as ExecutionContext;

      const mockCallHandler = {
        handle: () => of({ data: 'test' }),
      } as CallHandler;

      const recordSpy = jest.spyOn(metricsService, 'recordHttpRequest');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe(() => {
        expect(recordSpy).toHaveBeenCalledWith(
          'GET',
          '/api/trades/:uuid',
          200,
          expect.any(Number),
          undefined,
          undefined,
        );
        done();
      });
    });
  });
});