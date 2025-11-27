import { Request } from 'express';
import { SteamProfilePayload } from './steam-profile.interface';

/**
 * Request interface specifically for Steam OAuth callback endpoints
 *
 * This interface extends the Express Request interface but overrides the user
 * property to be specifically typed as SteamProfilePayload instead of the
 * general User entity. This provides type safety during Steam OAuth callbacks
 * while maintaining the correct typing elsewhere in the application.
 *
 * Usage:
 * ```typescript
 * @Get('steam/return')
 * async steamAuthCallback(@Req() req: RequestWithSteamProfile): Promise<AuthResponseDto> {
 *   const steamProfile = req.user; // Now properly typed as SteamProfilePayload
 *   // No need for type assertion
 * }
 * ```
 */
export interface RequestWithSteamProfile extends Omit<Request, 'user'> {
  /**
   * Steam profile data populated by SteamAuthGuard during OAuth callback
   *
   * This property contains temporary Steam profile information used for
   * authentication purposes. It should not be confused with the application
   * User entity which is populated by JwtAuthGuard for authenticated requests.
   *
   * Type: SteamProfilePayload | undefined
   * Populated by: SteamAuthGuard
   * Lifecycle: Only during Steam OAuth callback flow
   */
  user?: SteamProfilePayload;
}