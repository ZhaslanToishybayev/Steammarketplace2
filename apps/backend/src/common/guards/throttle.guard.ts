import { Injectable, ExecutionContext, Logger, Inject } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Redis } from 'ioredis';

interface ThrottleMetadata {
  limit: number;
  ttl: number;
}

/**
 * Custom Redis-based ThrottleGuard
 *
 * This guard bypasses @nestjs/throttler storage completely and implements
 * its own Redis-based rate limiting logic. It is the single source of truth
 * for rate limiting in this application.
 *
 * Key differences from @nestjs/throttler:
 * - Uses Redis sorted sets for precise time-window tracking
 * - Implements custom rate limit rules per endpoint type
 * - Provides detailed logging and monitoring
 * - Handles Redis failures gracefully with fallback
 *
 * This guard leverages the globally augmented Express Request type to safely
 * access custom properties like user and route that are added by authentication
 * guards and Express router.
 */
@Injectable()
export class ThrottleGuard {
  private readonly logger = new Logger(ThrottleGuard.name);
  private redisClient: Redis;

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly reflector: Reflector,
  ) {
    this.redisClient = redis;
  }

  /**
   * Determine if the request should be allowed based on rate limiting rules
   *
   * The request object now has type-safe access to custom properties:
   * - req.user?.id: Available via global Express module augmentation (populated by auth guards)
   * - req.route?.path: Available via global Express module augmentation (populated by Express router)
   *
   * @param context The execution context containing the HTTP request
   * @returns Promise<boolean> Whether the request should be allowed
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const className = context.getClass().name;

    // Get custom throttle metadata
    const customThrottle = this.reflector.get<ThrottleMetadata>('throttle', handler);
    const skipThrottle = this.reflector.get<boolean>('skip_throttle', handler);

    if (skipThrottle) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse();

    // Determine rate limit based on endpoint type
    const { limit, ttl } = this.getRateLimit(req, customThrottle);

    // Generate unique key for the user/IP
    const key = this.generateKey(req);

    try {
      const { totalHits, secondsUntilExpires } = await this.incrementRequest(
        key,
        limit,
        ttl,
      );

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - totalHits));
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + secondsUntilExpires * 1000).toISOString());
      res.setHeader('Retry-After', secondsUntilExpires);

      if (totalHits > limit) {
        this.logger.warn(
          `Rate limit exceeded for ${key}: ${totalHits}/${limit} requests in ${ttl}s`,
        );

        // Set Retry-After header
        res.setHeader('Retry-After', secondsUntilExpires);

        throw new ThrottlerException(`Too many requests, please try again in ${secondsUntilExpires} seconds.`);
      }

      return true;
    } catch (error) {
      if (error instanceof ThrottlerException) {
        throw error;
      }

      // Fallback: log Redis error but allow request
      this.logger.warn(`Redis error in rate limiting: ${error.message}`);
      return true;
    }
  }

  /**
   * Get rate limit configuration based on request characteristics
   *
   * This method safely accesses req.route?.path using the globally augmented
   * Express Request type to determine the endpoint type and apply appropriate
   * rate limiting rules.
   *
   * @param req The Express Request object
   * @param customThrottle Optional custom throttle configuration
   * @returns Rate limit configuration object
   */
  private getRateLimit(req: Request, customThrottle?: ThrottleMetadata) {
    if (customThrottle) {
      return customThrottle;
    }

    const path = req.route?.path || req.path;
    const method = req.method;

    // Default rate limits based on endpoint type
    if (path.includes('/auth/') || path.includes('/login') || path.includes('/register')) {
      return { limit: 5, ttl: 60 }; // Auth endpoints: 5 req/min
    }

    if (method === 'GET') {
      return { limit: 100, ttl: 60 }; // Read endpoints: 100 req/min
    }

    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
      return { limit: 30, ttl: 60 }; // Write endpoints: 30 req/min
    }

    if (path.includes('/admin/')) {
      return { limit: 200, ttl: 60 }; // Admin endpoints: 200 req/min
    }

    return { limit: 100, ttl: 60 }; // Default
  }

  /**
   * Generate unique key for rate limiting based on user and IP
   *
   * This method safely accesses req.user?.id using the globally augmented
   * Express Request type to create user-specific rate limiting keys.
   *
   * @param req The Express Request object
   * @returns Unique key string for rate limiting
   */
  private generateKey(req: Request): string {
    const ip = this.getClientIpAddress(req);
    const userId = req.user?.id || 'anonymous';
    return `throttle:${ip}:${userId}`;
  }

  /**
   * Get client IP address with fallbacks for different proxy configurations
   *
   * This method accesses various request properties that are properly typed
   * through the base Express Request interface.
   *
   * @param req The Express Request object
   * @returns Client IP address as string
   */
  private getClientIpAddress(req: Request): string {
    return (
      req.headers['x-forwarded-for'] ||
      req.headers['x-real-ip'] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection as any)?.socket?.remoteAddress ||
      '127.0.0.1'
    ).toString().split(',')[0].trim();
  }

  private async incrementRequest(key: string, limit: number, ttl: number): Promise<{
    totalHits: number;
    secondsUntilExpires: number;
  }> {
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - ttl;

    // Remove old entries
    await this.redisClient.zremrangebyscore(key, '-inf', windowStart);

    // Count current requests in window
    const currentHits = await this.redisClient.zcard(key);

    if (currentHits < limit) {
      // Add current request
      await this.redisClient.zadd(key, now, `${now}-${Math.random()}`);
      await this.redisClient.expire(key, ttl);
    }

    const remainingSeconds = ttl - (now - windowStart);
    return {
      totalHits: currentHits + 1,
      secondsUntilExpires: Math.max(0, remainingSeconds),
    };
  }
}