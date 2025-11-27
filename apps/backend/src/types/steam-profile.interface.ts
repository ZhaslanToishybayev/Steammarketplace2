/**
 * Interface representing the Steam profile data returned by SteamAuthGuard
 *
 * This interface defines the structure of the user object that is populated
 * by the Steam strategy after successful OAuth authentication. It contains
 * Steam-specific profile information that is used to validate/create users
 * in the application.
 *
 * The Steam profile is distinct from the application User entity and should
 * not be confused with it. The Steam profile is temporary data used during
 * authentication, while the User entity represents the persisted application user.
 */
export interface SteamProfilePayload {
  /**
   * The user's Steam ID (64-bit identifier)
   * This is the primary identifier used to link Steam accounts to application users
   */
  steamId: string;

  /**
   * The user's display name from Steam
   * This may be the Steam username or a custom profile name
   */
  username: string;

  /**
   * URL to the user's avatar image
   * This is typically a small/medium-sized profile picture
   */
  avatar: string | null;

  /**
   * URL to the user's medium-sized avatar image
   * Higher resolution than the standard avatar
   */
  avatarMedium: string | null;

  /**
   * URL to the user's full-sized avatar image
   * Highest resolution avatar available
   */
  avatarFull: string | null;

  /**
   * URL to the user's Steam profile page
   * This links to the user's public Steam community profile
   */
  profileUrl: string | null;
}