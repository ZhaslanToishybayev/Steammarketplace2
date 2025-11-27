import { SetMetadata } from '@nestjs/common';

/**
 * Decorator for setting cache TTL (Time To Live)
 * @param seconds - TTL in seconds
 */
export function CacheTTL(seconds: number) {
  return SetMetadata('cache_ttl', seconds);
}

/**
 * Decorator for cache invalidation
 * @param keys - Array of cache key patterns to invalidate
 */
export function CacheInvalidate(keys: string[]) {
  return SetMetadata('cache_invalidate', keys);
}