import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

interface CacheKeyMetadata {
  prefix: string;
  keyGenerator?: (args: any[]) => string;
}

interface CacheInvalidateMetadata {
  patterns: string[];
}

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    @Inject(CACHE_MANAGER) private readonly cacheManager: any,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const handler = context.getHandler();
    const cacheKeyMetadata = this.reflector.get<CacheKeyMetadata>('cache_key', handler);
    const cacheTTL = this.reflector.get<number>('cache_ttl', handler);
    const cacheInvalidateMetadata = this.reflector.get<CacheInvalidateMetadata>('cache_invalidate', handler);

    // If no cache key metadata, proceed without caching
    if (!cacheKeyMetadata) {
      return next.handle();
    }

    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const args = context.getArgs();

    // Generate cache key
    const cacheKey = cacheKeyMetadata.keyGenerator
      ? cacheKeyMetadata.keyGenerator(args)
      : this.generateCacheKey(cacheKeyMetadata.prefix, args, request);

    try {
      // Try to get from cache
      const cachedValue = await this.cacheManager.get(cacheKey);
      if (cachedValue !== undefined) {
        this.logger.debug(`Cache HIT: ${cacheKey}`);
        return new Observable(observer => {
          observer.next(cachedValue);
          observer.complete();
        });
      }

      this.logger.debug(`Cache MISS: ${cacheKey}`);

      // Execute the method and cache the result
      return next.handle().pipe(
        tap(async (result) => {
          if (result !== undefined && result !== null) {
            const ttl = cacheTTL || 300; // Default 5 minutes
            await this.cacheManager.set(cacheKey, result, ttl);
            this.logger.debug(`Cache SET: ${cacheKey} (TTL: ${ttl}s)`);
          }

          // Invalidate cache patterns if specified
          if (cacheInvalidateMetadata && cacheInvalidateMetadata.patterns) {
            await this.invalidateCachePatterns(cacheInvalidateMetadata.patterns, args);
          }
        }),
      );
    } catch (error) {
      // Fallback to method execution without caching on Redis errors
      this.logger.warn(`Redis error, falling back to method execution: ${error.message}`);
      return next.handle();
    }
  }

  private async invalidateCachePatterns(patterns: string[], args: any[]): Promise<void> {
    try {
      for (const pattern of patterns) {
        const resolvedPattern = this.resolvePattern(pattern, args);
        if (this.cacheManager.store && this.cacheManager.store.getClient()) {
          const redisClient = this.cacheManager.store.getClient();
          const stream = redisClient.scanStream({
            match: resolvedPattern,
            count: 100
          });

          const keysToDelete: string[] = [];
          for await (const keys of stream) {
            if (Array.isArray(keys)) {
              keysToDelete.push(...keys);
            } else if (typeof keys === 'string') {
              keysToDelete.push(keys);
            }
          }

          if (keysToDelete.length > 0) {
            await redisClient.del(...keysToDelete);
            this.logger.debug(`Invalidated ${keysToDelete.length} cache keys for pattern: ${resolvedPattern}`);
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to invalidate cache patterns:`, error);
    }
  }

  private resolvePattern(pattern: string, args: any[]): string {
    // Replace {argIndex} placeholders with actual arguments
    let resolved = pattern;
    args.forEach((arg, index) => {
      if (typeof arg === 'string' || typeof arg === 'number') {
        resolved = resolved.replace(new RegExp(`\\{${index}\\}`, 'g'), String(arg));
      }
    });
    return resolved;
  }

  private generateCacheKey(prefix: string, args: any[], request?: any): string {
    const userId = request?.user?.id || 'anonymous';
    const queryParams = request?.query || {};
    const params = request?.params || {};

    // Extract relevant parameters for cache key
    const relevantArgs = args.filter(arg =>
      typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean'
    );

    const keyParts = [
      prefix,
      userId,
      ...relevantArgs,
      ...Object.values(params),
      ...Object.values(queryParams),
    ].filter(Boolean);

    return keyParts.join(':');
  }
}