import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { User, UserRole } from '../../auth/entities/user.entity';

export const ADMIN_PERMISSIONS = {
  BOT_MANAGEMENT: 'bot_management',
  TRADE_ADMIN: 'trade_admin',
  USER_MANAGEMENT: 'user_management',
  SYSTEM_MONITORING: 'system_monitoring'
} as const;

export type AdminPermission = keyof typeof ADMIN_PERMISSIONS;

/**
 * Decorator for marking routes as admin-only
 */
export const AdminOnly = () => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    const reflector = new Reflector();
    if (propertyKey && descriptor) {
      // Method decorator
      reflector.set('admin_only', true, descriptor.value);
    } else {
      // Class decorator
      reflector.set('admin_only', true, target);
    }
  };
};

/**
 * Decorator for marking routes with specific admin permissions
 */
export const RequiresPermission = (...permissions: AdminPermission[]) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    const reflector = new Reflector();
    if (propertyKey && descriptor) {
      // Method decorator
      reflector.set('required_permissions', permissions, descriptor.value);
    } else {
      // Class decorator
      reflector.set('required_permissions', permissions, target);
    }
  };
};

/**
 * Admin guard that provides multi-context support for HTTP, WebSocket, and RPC requests.
 *
 * This guard leverages the globally augmented Express Request type to safely
 * access the user property that is populated by authentication guards.
 *
 * Context Support:
 * - HTTP: Uses Express Request with augmented user property
 * - WebSocket: Uses WebSocket client data
 * - RPC: Uses RPC context data
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * Determine if the request should be allowed based on admin permissions
   *
   * The request object now has type-safe access to custom properties:
   * - request.user: Available via global Express module augmentation (populated by auth guards)
   *
   * @param context The execution context containing the request data
   * @returns boolean Whether the request should be allowed
   */
  canActivate(context: ExecutionContext): boolean {
    const contextType = context.getType();
    let request;

    if (contextType === 'http') {
      // For HTTP requests, use the augmented Express Request type
      request = context.switchToHttp().getRequest<Request>();
    } else if (contextType === 'ws') {
      // For WebSocket requests, use the client data
      request = context.switchToWs().getClient();
    } else if (contextType === 'rpc') {
      // For RPC requests, use the RPC context
      request = context.switchToRpc().getContext();
    } else {
      throw new ForbiddenException('Unsupported context type');
    }

    // The user property is now type-safe via global Express module augmentation
    const user: User = request.user;

    // Check if endpoint requires admin access
    const adminOnly = this.reflector.getAllAndOverride<boolean>('admin_only', [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredPermissions = this.reflector.getAllAndOverride<AdminPermission[]>('required_permissions', [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no admin requirements are specified, treat the presence of AdminGuard as admin-only by default
    if (!adminOnly && !requiredPermissions) {
      // Default to admin-only when AdminGuard is applied without explicit metadata
      const hasAdminAccess = user && this.checkAdminRole(user);
      if (!hasAdminAccess) {
        throw new ForbiddenException('Admin access required');
      }
      return true;
    }

    // Check if user is authenticated
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Check if user has admin role
    const isAdmin = this.checkAdminRole(user);
    const hasPermissions = requiredPermissions ? this.checkUserPermissions(user, requiredPermissions) : true;

    if (!isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    if (requiredPermissions && !hasPermissions) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }

  /**
   * Check if user has admin role
   *
   * @param user The user object to check
   * @returns boolean Whether the user has admin privileges
   */
  private checkAdminRole(user: User): boolean {
    // Check explicit admin role
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Check legacy isAdmin field
    if (user.isAdmin === true) {
      return true;
    }

    // Check moderator role (partial admin access)
    if (user.role === UserRole.MODERATOR) {
      return true;
    }

    return false;
  }

  /**
   * Check if user has required permissions
   *
   * @param user The user object to check
   * @param requiredPermissions Array of required permissions
   * @returns boolean Whether the user has all required permissions
   */
  private checkUserPermissions(user: User, requiredPermissions: AdminPermission[]): boolean {
    // Admin users have all permissions
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Moderator permissions (example)
    const moderatorPermissions: AdminPermission[] = [
      'TRADE_ADMIN',
      'SYSTEM_MONITORING'
    ];

    if (user.role === UserRole.MODERATOR) {
      return requiredPermissions.every(permission =>
        moderatorPermissions.includes(permission)
      );
    }

    return false;
  }

  /**
   * Get user's admin level
   *
   * @param user The user object to check
   * @returns The user's admin level ('none', 'moderator', or 'admin')
   */
  getUserAdminLevel(user: User): 'none' | 'moderator' | 'admin' {
    if (user.role === UserRole.ADMIN || user.isAdmin === true) {
      return 'admin';
    }

    if (user.role === UserRole.MODERATOR) {
      return 'moderator';
    }

    return 'none';
  }

  /**
   * Check if user can perform specific action
   *
   * @param user The user object to check
   * @param action The admin permission to verify
   * @returns boolean Whether the user can perform the action
   */
  canPerformAction(user: User, action: AdminPermission): boolean {
    return this.checkUserPermissions(user, [action]);
  }
}