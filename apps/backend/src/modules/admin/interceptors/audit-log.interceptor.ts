import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { AuditLogService } from '../services/audit-log.service';
import { AuditTargetType } from '../entities/audit-log.entity';
import { UserRole } from '../../auth/entities/user.entity';
import { SKIP_AUDIT_LOG_KEY, SkipAuditLog } from '../decorators/skip-audit-log.decorator';

/**
 * Audit logging interceptor that logs all admin actions for security and compliance.
 *
 * This interceptor leverages the globally augmented Express Request type to safely
 * access the user property that is populated by authentication guards.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private auditLogService: AuditLogService,
    private reflector: Reflector,
  ) {}

  /**
   * Intercept HTTP requests and log admin actions
   *
   * The request object now has type-safe access to custom properties:
   * - request.user: Available via global Express module augmentation (populated by auth guards)
   * - request.url, request.method, request.params, request.body, request.headers: Base Express Request properties
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      tap({
        next: async (response) => {
          try {
            const request = context.switchToHttp().getRequest<Request>();
            const user = request.user;

            // Skip if user doesn't exist or is not an admin
            if (!user || !this.isAdmin(user)) {
              return;
            }

            // Check if audit logging is disabled for this endpoint
            const skipAuditLog = this.reflector.getAllAndOverride<boolean>(SKIP_AUDIT_LOG_KEY, [
              context.getHandler(),
              context.getClass(),
            ]);

            if (skipAuditLog) {
              return;
            }

            // Only log admin routes
            if (!this.isAdminRoute(request.url)) {
              return;
            }

            // Extract action from HTTP method and route
            const action = this.extractAction(request.method, request.url, request.params);
            if (!action) {
              return;
            }

            // Extract target information
            const { targetType, targetId, targetIdentifier } = this.extractTargetInfo(
              request.method,
              request.url,
              request.params,
              request.body,
              response,
            );

            // Extract changes for PUT/PATCH requests
            const changes = this.extractChanges(request.method, request.body, response);

            // Log the audit action
            await this.auditLogService.logAction(
              user.id,
              action,
              targetType,
              targetId,
              changes.before,
              changes.after,
              {
                userAgent: request.headers['user-agent'],
                endpoint: request.url,
                method: request.method,
                statusCode: 200,
              },
              request,
            );
          } catch (error) {
            // Don't throw errors in interceptor, just log them
            console.error('Failed to log audit action:', error);
          }
        },
        error: async (error) => {
          try {
            const request = context.switchToHttp().getRequest<Request>();
            const user = request.user;

            // Skip if user doesn't exist or is not an admin
            if (!user || !this.isAdmin(user)) {
              return;
            }

            // Check if audit logging is disabled for this endpoint
            const skipAuditLog = this.reflector.getAllAndOverride<boolean>(SKIP_AUDIT_LOG_KEY, [
              context.getHandler(),
              context.getClass(),
            ]);

            if (skipAuditLog) {
              return;
            }

            // Only log admin routes
            if (!this.isAdminRoute(request.url)) {
              return;
            }

            // Log failed actions
            const action = this.extractAction(request.method, request.url, request.params);
            if (!action) {
              return;
            }

            const { targetType, targetId } = this.extractTargetInfo(
              request.method,
              request.url,
              request.params,
              request.body,
              null,
            );

            await this.auditLogService.logAction(
              user.id,
              `failed_${action}`,
              targetType,
              targetId,
              null,
              null,
              {
                userAgent: request.headers['user-agent'],
                endpoint: request.url,
                method: request.method,
                statusCode: error.status || 500,
                errorMessage: error.message,
                errorType: error.constructor.name,
              },
              request,
            );
          } catch (auditError) {
            // Don't throw errors in interceptor, just log them
            console.error('Failed to log audit action error:', auditError);
          }
        },
      }),
    );
  }

  private isAdmin(user: any): boolean {
    return user && (user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR);
  }

  private isAdminRoute(url: string): boolean {
    return url.includes('/admin/');
  }

  private extractAction(method: string, url: string, params: any): string | null {
    // Extract base action from URL
    const urlParts = url.split('/').filter(part => part && !part.startsWith(':') && !this.isUuid(part));

    if (urlParts.includes('admin')) {
      const adminIndex = urlParts.indexOf('admin');
      const actionParts = urlParts.slice(adminIndex + 1);

      if (actionParts.length >= 1) {
        const resource = actionParts[0];
        const action = actionParts.length > 1 ? actionParts[1] : 'list';

        switch (method) {
          case 'GET':
            return action === 'list' ? `${resource}.list` : `${resource}.get`;
          case 'POST':
            return action === 'list' ? `${resource}.create` : `${resource}.${action}`;
          case 'PUT':
            return `${resource}.update`;
          case 'PATCH':
            return `${resource}.patch`;
          case 'DELETE':
            return `${resource}.delete`;
          default:
            return `${resource}.${action}`;
        }
      }
    }

    return null;
  }

  private extractTargetInfo(
    method: string,
    url: string,
    params: any,
    body: any,
    response: any,
  ): { targetType: AuditTargetType; targetId: string; targetIdentifier: string } {
    const urlParts = url.split('/').filter(part => part && !part.startsWith(':'));

    // Look for UUIDs in params or URL
    let targetId = params.userId || params.tradeId || params.botId || params.configKey || params.disputeId;

    if (!targetId) {
      // Look for UUID in URL path
      for (const part of urlParts) {
        if (this.isUuid(part)) {
          targetId = part;
          break;
        }
      }
    }

    // Determine target type from URL
    let targetType: AuditTargetType = AuditTargetType.USER;
    let targetIdentifier = '';

    if (url.includes('/users/')) {
      targetType = AuditTargetType.USER;
      targetIdentifier = targetId || 'unknown';
    } else if (url.includes('/trades/')) {
      targetType = AuditTargetType.TRADE;
      targetIdentifier = targetId || 'unknown';
    } else if (url.includes('/bots/')) {
      targetType = AuditTargetType.BOT;
      targetIdentifier = targetId || 'unknown';
    } else if (url.includes('/config/')) {
      targetType = AuditTargetType.CONFIG;
      targetIdentifier = params.key || targetId || 'unknown';
    } else if (url.includes('/disputes/')) {
      targetType = AuditTargetType.DISPUTE;
      targetIdentifier = targetId || 'unknown';
    } else if (url.includes('/transactions/')) {
      targetType = AuditTargetType.TRANSACTION;
      targetIdentifier = targetId || 'unknown';
    }

    return { targetType, targetId: targetId || 'unknown', targetIdentifier };
  }

  private extractChanges(method: string, body: any, response: any): { before: any; after: any } {
    const changes = { before: null, after: null };

    if (method === 'PATCH' || method === 'PUT') {
      changes.after = body || {};
    }

    if (response && typeof response === 'object' && response.data) {
      changes.after = { ...changes.after, ...response.data };
    }

    return changes.after ? changes : { before: null, after: null };
  }

  private isUuid(str: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }
}