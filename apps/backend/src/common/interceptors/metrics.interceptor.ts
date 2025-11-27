import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { MetricsService } from '@common/modules/metrics.service';

/**
 * HTTP request metrics interceptor that collects performance and usage metrics.
 *
 * This interceptor leverages the globally augmented Express Request type to safely
 * access the route property that is available on all HTTP requests after route matching.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Intercept HTTP requests and collect metrics
   *
   * The request object now has type-safe access to custom properties:
   * - req.route?.path: Available via global Express module augmentation (populated by Express router)
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const now = Date.now();
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    // Skip metrics collection for the metrics endpoint itself to avoid recursion
    if (req.path === '/api/metrics' || req.path === '/api/metrics/health') {
      return next.handle();
    }

    // Record request start
    this.metricsService.updateSystemMetrics();

    return next.handle().pipe(
      tap({
        next: () => {
          const responseTime = (Date.now() - now) / 1000; // Convert to seconds

          // Record HTTP request metrics
          this.metricsService.recordHttpRequest(
            req.method,
            this.getRoutePattern(req),
            res.statusCode,
            responseTime,
            this.getRequestSize(req),
            this.getResponseSize(res)
          );

          // Update system metrics after request completion
          this.metricsService.updateSystemMetrics();
        },
        error: (error) => {
          const responseTime = (Date.now() - now) / 1000; // Convert to seconds

          // Record HTTP request metrics for errors
          this.metricsService.recordHttpRequest(
            req.method,
            this.getRoutePattern(req),
            error.status || 500,
            responseTime,
            this.getRequestSize(req),
            this.getResponseSize(res)
          );

          // Update system metrics after request completion
          this.metricsService.updateSystemMetrics();
        },
      }),
    );
  }

  /**
   * Extract and normalize route pattern for metrics collection
   *
   * This method safely accesses req.route?.path using the globally augmented
   * Express Request type. The route property is populated by Express after
   * successful route matching and contains the route pattern.
   *
   * Route normalization helps reduce metric cardinality by replacing
   * dynamic segments with parameter names.
   *
   * @param req The Express Request object
   * @returns Normalized route pattern (e.g., '/api/users/:id')
   */
  private getRoutePattern(req: Request): string {
    // Extract route pattern from the request
    // This could be enhanced to extract actual route patterns from NestJS
    const route = req.route?.path || req.path;

    // Normalize route to avoid high cardinality
    if (route.match(/\/\d+/)) {
      return route.replace(/\/\d+/g, '/:id');
    }
    if (route.match(/\/[a-f0-9-]{36}/)) {
      return route.replace(/\/[a-f0-9-]{36}/g, '/:uuid');
    }

    return route;
  }

  private getRequestSize(req: Request): number | undefined {
    const contentLength = req.headers['content-length'];
    return contentLength ? parseInt(contentLength, 10) : undefined;
  }

  private getResponseSize(res: Response): number | undefined {
    const contentLength = res.getHeader('content-length');
    return contentLength ? parseInt(contentLength as string, 10) : undefined;
  }
}