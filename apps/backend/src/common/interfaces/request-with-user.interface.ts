import { User } from '../../modules/auth/entities/user.entity';
import { Request } from 'express';

/**
 * Interface for requests that are guaranteed to have an authenticated user.
 *
 * This interface extends the base Express Request type (which is globally augmented
 * via src/types/express.d.ts) to provide stricter typing for contexts where user
 * authentication is required and guaranteed.
 *
 * The base Express Request is now globally augmented with the following properties:
 * - user?: User - The authenticated user object (optional on base Request)
 * - userId?: string - Shorthand for user.id (optional on base Request)
 * - sessionID?: string - Session identifier for tracking (optional on base Request)
 * - route?: { path: string } - Express route information (optional on base Request)
 *
 * Usage Examples:
 * ```typescript
 * // In a controller method protected by JwtAuthGuard
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile(@Req() req: RequestWithUser) {
 *   // req.user is guaranteed to exist and be typed as User
 *   return this.userService.findById(req.user.id);
 * }
 *
 * // In an interceptor where user might not be authenticated
 * intercept(context: ExecutionContext) {
 *   const request = context.switchToHttp().getRequest<Request>();
 *   // request.user is optional, use type guard if needed
 *   if (isAuthenticatedRequest(request)) {
 *     // request.user is now guaranteed to exist
 *   }
 * }
 * ```
 */
export interface RequestWithUser extends Request {
  /**
   * The authenticated user object. This property is guaranteed to exist
   * when using this interface, unlike the optional user property on the
   * base Request interface.
   */
  user: User;

  /**
   * Optional shorthand for user.id. Some guards set this directly for
   * performance reasons. When present, it should match user.id.
   */
  userId?: string;

  /**
   * Session identifier for tracking user sessions across requests.
   * Optional because session management may not be enabled for all
   * authentication flows.
   */
  sessionID?: string;
}

/**
 * Type guard to check if request has authenticated user
 *
 * This function narrows the type from Request to RequestWithUser,
 * ensuring that req.user exists and is not undefined.
 *
 * @param req The Express Request object to check
 * @returns True if the request has an authenticated user, false otherwise
 *
 * @example
 * ```typescript
 * const request = context.switchToHttp().getRequest<Request>();
 * if (isAuthenticatedRequest(request)) {
 *   // TypeScript now knows request.user exists and is typed as User
 *   console.log(request.user.username);
 * }
 * ```
 */
export function isAuthenticatedRequest(req: Request): req is RequestWithUser {
  return 'user' in req && req.user !== undefined;
}