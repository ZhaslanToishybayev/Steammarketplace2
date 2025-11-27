# Interceptors Documentation

## Overview

This directory contains four NestJS interceptors that handle cross-cutting concerns for the Steam Marketplace Backend API:

1. **CacheInterceptor** - Handles Redis-based caching with automatic cache invalidation
2. **LoggingInterceptor** - Logs all HTTP requests and responses with Winston
3. **MetricsInterceptor** - Collects performance and usage metrics via MetricsService
4. **TransformInterceptor** - Standardizes JSON API responses with selective transformation

## NestJS 11 + RxJS 7.8.1 Patterns

All interceptors follow the correct NestJS 11 patterns with RxJS 7.8.1 compatibility:

### Standard Interceptor Signature

```typescript
intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
  // Implementation
  return next.handle().pipe(/* operators */);
}
```

### Required Imports

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
```

## Individual Interceptor Documentation

### 1. CacheInterceptor

**Purpose**: Provides Redis-based caching with automatic cache invalidation patterns.

**Key Features**:
- Uses NestJS cache-manager with Redis
- Supports custom cache key generation
- Implements cache invalidation patterns
- Handles Redis connection failures gracefully
- Type-safe cache metadata via Reflector

**Usage**:
```typescript
@UseInterceptors(CacheInterceptor)
@SetMetadata('cache_key', { prefix: 'user', keyGenerator: (args) => `user:${args[0]}` })
@SetMetadata('cache_ttl', 300) // 5 minutes
@SetMetadata('cache_invalidate', { patterns: ['user:*'] })
```

**Return Type**: `Promise<Observable<any>>` - Correctly handles async operations

**Error Handling**: Falls back to method execution without caching on Redis errors

### 2. LoggingInterceptor

**Purpose**: Logs all HTTP requests and responses using Winston logger.

**Key Features**:
- Type-safe access to Express Request properties via global augmentation
- Logs user ID, session ID, response time, and payload sizes
- Uses globally augmented Express Request interface
- Comprehensive request/response metadata logging

**Type Safety**: Leverages global Express augmentation from `src/types/express.d.ts`:

```typescript
// Global augmentation allows safe access to:
request.user?.id        // Authenticated user ID
request.sessionID       // Session identifier
```

**Return Type**: `Observable<any>` - Standard synchronous interceptor

### 3. MetricsInterceptor

**Purpose**: Collects performance and usage metrics for monitoring and analytics.

**Key Features**:
- Records HTTP request metrics (method, route, status, timing)
- Tracks request/response sizes
- Normalizes route patterns to reduce metric cardinality
- Updates system metrics on every request
- Handles both success and error scenarios

**Route Pattern Normalization**:
```typescript
// Examples:
/users/123          → /users/:id
/items/uuid-123     → /items/:uuid
```

**Return Type**: `Observable<any>` - Standard synchronous interceptor

### 4. TransformInterceptor

**Purpose**: Standardizes JSON API responses while preserving non-JSON responses.

**Key Features**:
- Selective transformation based on response type
- Bypasses transformation for streams, files, and already-formatted responses
- Adds consistent response structure: `{ success, data, timestamp }`
- Type-safe generic interface for different response types

**Response Format**:
```typescript
{
  success: true,
  data: /* original data */,
  timestamp: "2024-01-01T00:00:00.000Z"
}
```

**Return Type**: `Observable<Response<T> | T>` - Generic type supporting both transformed and passthrough responses

## Common Patterns

### Accessing Request/Response with Type Safety

All HTTP interceptors use the globally augmented Express types:

```typescript
import { Request, Response } from 'express';

intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
  const request = context.switchToHttp().getRequest<Request>();
  const response = context.switchToHttp().getResponse<Response>();

  // Type-safe access to custom properties
  const userId = request.user?.id;     // From auth guards
  const sessionId = request.sessionID; // From session middleware
  const route = request.route?.path;   // From Express router
}
```

### Creating Immediate Observables

For interceptors that need to return cached data immediately:

```typescript
import { Observable } from 'rxjs';

return new Observable(observer => {
  observer.next(cachedValue);
  observer.complete();
});
```

### RxJS Operator Usage

**tap()** - For side effects (logging, caching, metrics):
```typescript
return next.handle().pipe(
  tap((data) => {
    // Side effect operations
    this.logger.log('Request completed');
    this.metrics.record(data);
  })
);
```

**map()** - For data transformation:
```typescript
return next.handle().pipe(
  map((data) => {
    // Transform the response data
    return this.transformResponse(data);
  })
);
```

**catchError()** - For error handling:
```typescript
return next.handle().pipe(
  catchError((error) => {
    this.logger.error('Request failed', error);
    return throwError(() => error);
  })
);
```

## Testing Patterns

### Mocking ExecutionContext and CallHandler

```typescript
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';

describe('CacheInterceptor', () => {
  let interceptor: CacheInterceptor;
  let mockContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(() => {
    interceptor = new CacheInterceptor(mockReflector, mockCacheManager);

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of(mockResponseData))
    };

    mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse)
      }),
      getHandler: jest.fn().mockReturnValue(mockHandler),
      getArgs: jest.fn().mockReturnValue([])
    } as any;
  });

  it('should return cached data when available', async () => {
    // Test implementation
  });
});
```

### Testing Observable Chains

```typescript
import { TestScheduler } from 'rxjs/testing';

describe('LoggingInterceptor', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('should log request and response', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('-a|', { a: mockResponseData });
      const result$ = interceptor.intercept(mockContext, { handle: () => source$ });

      expectObservable(result$).toBe('-a|', { a: mockResponseData });
    });
  });
});
```

## Common Troubleshooting

### Observable Type Errors

**Issue**: TypeScript complains about Observable return types
**Solution**: Ensure correct RxJS imports and return type signatures:

```typescript
// Correct imports
import { Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';

// Correct return type
intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
  return next.handle().pipe(/* operators */);
}
```

### "No overload matches" Errors

**Issue**: CallHandler.handle() method signature mismatches
**Solution**: Verify NestJS version compatibility and import sources:

```typescript
// Ensure imports are from @nestjs/common
import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';

// Correct usage
return next.handle().pipe(
  tap((data) => { /* ... */ })
) as Observable<any>; // Explicit cast if needed
```

### Cache Interceptor Issues

**Issue**: Cache keys not generating correctly
**Solution**: Verify cache metadata decorators and key generation logic:

```typescript
@SetMetadata('cache_key', {
  prefix: 'user',
  keyGenerator: (args) => `user:${args[0]}`
})
```

### Transform Interceptor Issues

**Issue**: Non-JSON responses being transformed incorrectly
**Solution**: Verify content-type detection and bypass logic:

```typescript
private shouldTransform(data: any, response: Response): boolean {
  const contentType = response.getHeader('Content-Type');
  if (contentType && !contentType.includes('application/json')) {
    return false; // Bypass non-JSON responses
  }
  // ... other checks
}
```

## Best Practices

### Return Types
- Use `Observable<any>` for standard interceptors
- Use `Promise<Observable<any>>` for async operations (like CacheInterceptor)
- Use generic types like `Observable<Response<T> | T>` for typed responses

### Error Handling
- Always handle errors gracefully, especially for external dependencies
- Provide fallback behavior when services are unavailable
- Use appropriate RxJS operators (`catchError`, `retry`)

### Side Effects
- Use `tap()` operator for side effects (logging, caching, metrics)
- Avoid modifying the data stream in `tap()` - use `map()` for transformations
- Keep side effects synchronous when possible

### Performance
- Minimize operations in hot paths
- Use efficient cache key generation strategies
- Consider request/response size when logging metrics

## References

- [NestJS Interceptors Documentation](https://docs.nestjs.com/interceptors)
- [RxJS 7.8.1 Migration Guide](https://rxjs.dev/deprecations/pipes)
- [Express Request Type Augmentation](./../../../types/express.d.ts)
- [NestJS 11 Breaking Changes](https://docs.nestjs.com/recipes/migration-guide)