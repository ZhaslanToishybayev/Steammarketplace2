import { User } from '../modules/auth/entities/user.entity';

/**
 * Global Express module augmentation to extend the Request interface
 * with custom properties used throughout the application.
 *
 * This provides type safety for custom properties that are added to
 * Express Request objects by various middleware, guards, and interceptors.
 *
 * The augmentation approach is used instead of interface extension to:
 * 1. Provide a single source of truth for Request type extensions
 * 2. Ensure consistency across the entire application
 * 3. Avoid conflicts between local and imported declarations
 * 4. Allow automatic type inference without explicit typing in every file
 *
 * Custom properties:
 * - user?: User - The authenticated user object (populated by JwtAuthGuard/SteamAuthGuard)
 * - userId?: string - Shorthand for user.id (populated by some guards)
 * - sessionID?: string - Session identifier for tracking (populated by session middleware)
 * - route?: { path: string } - Express route information (available on all HTTP requests)
 *
 * Reference: src/common/interfaces/request-with-user.interface.ts provides RequestWithUser
 * interface for contexts where user authentication is guaranteed.
 */

declare module 'express' {
  export interface Request {
    /**
     * The authenticated user object. This property is populated after successful
     * authentication by guards like JwtAuthGuard or SteamAuthGuard.
     * Optional because it may not be present on unauthenticated requests.
     */
    user?: User;

    /**
     * Shorthand for user.id. Some guards set this directly for performance reasons.
     * Optional because it depends on the authentication mechanism used.
     */
    userId?: string;

    /**
     * Session identifier for tracking user sessions across requests.
     * Populated by session management middleware.
     * Optional because session management may not be enabled for all request types.
     */
    sessionID?: string;

    /**
     * Express route information containing the route path.
     * Available on all HTTP requests after route matching.
     * Optional because it may not be present during early request lifecycle phases.
     */
    route?: {
      /**
       * The route path pattern (e.g., '/api/users/:id', '/api/auth/steam/callback')
       */
      path: string;
    };
  }
}