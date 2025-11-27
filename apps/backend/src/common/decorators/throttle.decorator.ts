import { SetMetadata } from '@nestjs/common';

/**
 * Decorator for setting custom rate limits
 * @param limit - Maximum number of requests
 * @param ttl - Time window in seconds
 */
export function Throttle(limit: number, ttl: number = 60) {
  return SetMetadata('throttle', { limit, ttl });
}

/**
 * Decorator to skip rate limiting for specific endpoints
 */
export function SkipThrottle() {
  return SetMetadata('skip_throttle', true);
}