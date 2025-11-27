import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { Socket } from 'socket.io';

/**
 * Decorator for accessing the current authenticated user in route handlers.
 *
 * This decorator works with both HTTP and WebSocket contexts and leverages the
 * globally augmented Express Request type to safely access the user property.
 *
 * Usage Examples:
 * ```typescript
 * // Get the full user object
 * @Get('profile')
 * getProfile(@CurrentUser() user: User) {
 *   return user;
 * }
 *
 * // Get a specific user property
 * @Get('id')
 * getUserId(@CurrentUser('id') userId: string) {
 *   return userId;
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    // Handle HTTP context
    if (ctx.getType() === 'http') {
      // The request object now has type-safe access to user property via global augmentation
      const request: Request = ctx.switchToHttp().getRequest();
      const user = request.user;

      // Type guard to ensure user exists before accessing properties
      if (!user) {
        return undefined;
      }

      return data ? user?.[data] : user;
    }

    // Handle WebSocket context
    if (ctx.getType() === 'ws') {
      const client = ctx.switchToWs().getClient<Socket>();
      const user = (client.data as any)?.user;

      if (!user) {
        return undefined;
      }

      return data ? user?.[data] : user;
    }

    // Fallback for other contexts
    return undefined;
  },
);