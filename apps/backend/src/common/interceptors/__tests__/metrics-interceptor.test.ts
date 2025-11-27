import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { Request, Response } from 'express';
import { MetricsInterceptor } from '../metrics.interceptor';
import { MetricsService } from '../../modules/metrics.service';

describe('MetricsInterceptor', () => {
  let interceptor: MetricsInterceptor;
  let metricsService: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsInterceptor,
        {
          provide: MetricsService,
          useValue: {
            recordHttpRequest: jest.fn(),
            updateSystemMetrics: jest.fn(),
          },
        },
      ],
    }).compile();

    interceptor = module.get<MetricsInterceptor>(MetricsInterceptor);
    metricsService = module.get<MetricsService>(MetricsService);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
    expect(metricsService).toBeDefined();
  });

  describe('intercept method', () => {
    it('should skip metrics collection for metrics endpoint', () => {
      const mockRequest = {
        path: '/api/metrics',
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
      expect(metricsService.updateSystemMetrics).not.toHaveBeenCalled();
    });

    it('should record HTTP metrics for successful requests', (done) => {
      const mockRequest = {
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
      const updateSpy = jest.spyOn(metricsService, 'updateSystemMetrics');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe(() => {
        expect(handleSpy).toHaveBeenCalled();
        expect(recordSpy).toHaveBeenCalledWith(
          'GET',
          '/api/users',
          200,
          expect.any(Number), // response time
          100, // request size
          200, // response size
        );
        expect(updateSpy).toHaveBeenCalledTimes(2); // Once before, once after
        done();
      });
    });

    it('should record HTTP metrics for error requests', (done) => {
      const mockRequest = {
        method: 'GET',
        headers: {
          'content-length': '50',
        },
        route: { path: '/api/users/invalid' },
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
      const updateSpy = jest.spyOn(metricsService, 'updateSystemMetrics');

      const result = interceptor.intercept(mockContext, mockCallHandler);

      result.subscribe({
        error: () => {
          expect(handleSpy).toHaveBeenCalled();
          expect(recordSpy).toHaveBeenCalledWith(
            'GET',
            '/api/users/invalid',
            500, // error status
            expect.any(Number), // response time
            50, // request size
            100, // response size
          );
          expect(updateSpy).toHaveBeenCalledTimes(2); // Once before, once after
          done();
        },
      });
    });

    it('should normalize route patterns correctly', (done) => {
      const mockRequest = {
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

    it('should handle multiple route parameter patterns', (done) => {
      const testCases = [
        {
          path: '/api/users/123',
          expectedRoute: '/api/users/:id',
        },
        {
          path: '/api/trades/550e8400-e29b-41d4-a716-446655440000',
          expectedRoute: '/api/trades/:uuid',
        },
        {
          path: '/api/inventory/507f1f77bcf86cd799439011',
          expectedRoute: '/api/inventory/:objectid',
        },
        {
          path: '/api/steam/11111111111111111',
          expectedRoute: '/api/steam/:steamId',
        },
      ];

      const recordSpy = jest.spyOn(metricsService, 'recordHttpRequest');

      testCases.forEach((testCase, index) => {
        const mockRequest = {
          method: 'GET',
          headers: {},
          route: { path: testCase.expectedRoute },
          path: testCase.path,
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

        const result = interceptor.intercept(mockContext, mockCallHandler);

        result.subscribe(() => {
          expect(recordSpy).toHaveBeenCalledWith(
            'GET',
            testCase.expectedRoute,
            200,
            expect.any(Number),
            undefined,
            undefined,
          );

          if (index === testCases.length - 1) {
            done();
          }
        });
      });
    });

    it('should handle requests without content-length header', (done) => {
      const mockRequest = {
        method: 'POST',
        headers: {}, // No content-length
        route: { path: '/api/users' },
        path: '/api/users',
      } as Request;

      const mockResponse = {
        statusCode: 201,
        getHeader: () => undefined, // No content-length
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
          'POST',
          '/api/users',
          201,
          expect.any(Number),
          undefined, // No request size
          undefined, // No response size
        );
        done();
      });
    });
  });
});