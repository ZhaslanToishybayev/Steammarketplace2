import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

export interface StandardApiResponse<T> {
  data: T;
}

/**
 * TransformInterceptor standardizes JSON API responses but bypasses transformation
 * for non-JSON responses like file streams, SSE, or responses that are already
 * properly formatted.
 *
 * This interceptor should be used selectively for JSON API endpoints only.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, StandardApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<StandardApiResponse<T>> | Observable<StandardApiResponse<T>> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data) => {
        // Skip transformation for non-JSON responses
        if (!this.shouldTransform(data, response)) {
          return data;
        }

        // Skip transformation if response is already in the expected format
        if (this.isAlreadyFormatted(data)) {
          return data;
        }

        // Apply standard transformation for JSON responses
        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }

  private shouldTransform(data: any, response: Response): boolean {
    // Don't transform if response headers indicate non-JSON content
    const contentType = response.getHeader('Content-Type');
    if (contentType && typeof contentType === "string" && !contentType.includes("application/json")) {
      return false;
    }

    // Don't transform null, undefined, or primitive values that aren't objects
    if (data === null || data === undefined) {
      return false;
    }

    // Don't transform streams, buffers, or other non-plain objects
    if (
      typeof data === 'string' ||
      typeof data === 'number' ||
      typeof data === 'boolean' ||
      data instanceof Buffer ||
      (data.readable !== undefined && typeof data.pipe === 'function') // Stream detection
    ) {
      return false;
    }

    return true;
  }

  private isAlreadyFormatted(data: any): boolean {
    // Check if the response is already in the expected format
    return (
      typeof data === 'object' &&
      data !== null &&
      'success' in data &&
      ('data' in data || 'message' in data || 'error' in data) &&
      'timestamp' in data
    );
  }
}