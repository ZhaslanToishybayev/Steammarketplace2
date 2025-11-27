import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

/**
 * HTTP request logging interceptor that logs all incoming requests and responses.
 *
 * This interceptor leverages the globally augmented Express Request type to safely
 * access custom properties like user and sessionID that are added by authentication
 * guards and session middleware.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly winstonLogger: LoggerService) {}

  /**
   * Intercept HTTP requests and log request/response details
   *
   * The request object now has type-safe access to custom properties:
   * - request.user?.id: Available via global Express module augmentation (populated by auth guards)
   * - request.sessionID: Available via global Express module augmentation (populated by session middleware)
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const userAgent = request.get('User-Agent') || '';
    const { ip, method, path, body, query, params } = request;

    const startTime = Date.now();

    return next.handle().pipe(
      tap((responseData) => {
        const responseTime = Date.now() - startTime;
        const { statusCode } = response;

        // Log request details
        this.winstonLogger.log('HTTP Request', {
          timestamp: new Date().toISOString(),
          method,
          path,
          userAgent,
          ip,
          query: Object.keys(query).length > 0 ? query : undefined,
          params: Object.keys(params).length > 0 ? params : undefined,
          body: Object.keys(body).length > 0 ? body : undefined,
          statusCode,
          responseTime: `${responseTime}ms`,
          responseSize: JSON.stringify(responseData)?.length || 0,
          userId: request.user?.id || 'anonymous',
          sessionId: request.sessionID || 'no-session',
        });
      }),
    );
  }
}