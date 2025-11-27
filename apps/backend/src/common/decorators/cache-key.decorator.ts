import { SetMetadata } from '@nestjs/common';

/**
 * Decorator for generating cache keys based on method parameters
 * @param prefix - Cache key prefix
 * @param keyGenerator - Optional custom key generator function
 */
export function CacheKey(prefix: string, keyGenerator?: (args: any[]) => string) {
  return SetMetadata('cache_key', { prefix, keyGenerator });
}

/**
 * Interface for cache key metadata
 */
export interface CacheKeyMetadata {
  prefix: string;
  keyGenerator?: (args: any[]) => string;
}