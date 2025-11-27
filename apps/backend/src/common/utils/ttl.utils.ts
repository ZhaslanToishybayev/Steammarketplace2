/**
 * TTL (Time To Live) utilities for consistent cache and job timing
 *
 * All TTL values should be in seconds when passed to cache-manager or Bull queues
 * to ensure consistent behavior across the application.
 */

export interface TTLConstants {
  // Cache TTLs in seconds
  readonly USER_PROFILE: number;        // 5 minutes
  readonly USER_SETTINGS: number;       // 10 minutes
  readonly USER_STATISTICS: number;     // 10 minutes
  readonly BOT_AVAILABILITY: number;    // 10 seconds
  readonly BOT_LIST: number;            // 10 seconds
  readonly PRICING_DATA: number;        // 15 minutes
  readonly PRICING_API_10MIN: number;  // 10 minutes
  readonly PRICING_API_20MIN: number;  // 20 minutes
  readonly REFERRAL_CODE: number;       // 10 minutes
  readonly BALANCE: number;             // 1 minute
  readonly TRANSACTION: number;         // 5 minutes
  readonly ADMIN_DASHBOARD: number;     // 5 minutes
  readonly SYSTEM_CONFIG: number;       // 1 hour
  readonly TRADE_DISPUTE: number;       // 10 minutes
  readonly INVENTORY: number;           // 30 minutes
  readonly INVENTORY_STATS: number;     // 5 minutes
  readonly ITEM_PRICE: number;          // 15 minutes
  readonly PRICE_HISTORY: number;       // 1 hour
}

/**
 * TTL constants in seconds
 */
export const TTL: TTLConstants = {
  USER_PROFILE: 300,           // 5 minutes
  USER_SETTINGS: 600,          // 10 minutes
  USER_STATISTICS: 600,        // 10 minutes
  BOT_AVAILABILITY: 10,        // 10 seconds
  BOT_LIST: 10,                // 10 seconds
  PRICING_DATA: 900,           // 15 minutes
  PRICING_API_10MIN: 600,      // 10 minutes
  PRICING_API_20MIN: 1200,     // 20 minutes
  REFERRAL_CODE: 600,          // 10 minutes
  BALANCE: 60,                 // 1 minute
  TRANSACTION: 300,            // 5 minutes
  ADMIN_DASHBOARD: 300,        // 5 minutes
  SYSTEM_CONFIG: 3600,         // 1 hour
  TRADE_DISPUTE: 600,          // 10 minutes
  INVENTORY: 1800,             // 30 minutes
  INVENTORY_STATS: 300,        // 5 minutes
  ITEM_PRICE: 900,             // 15 minutes
  PRICE_HISTORY: 3600,         // 1 hour
};

/**
 * Convert minutes to seconds for TTL
 * @param minutes Number of minutes
 * @returns Number of seconds
 */
export function minutesToSeconds(minutes: number): number {
  return minutes * 60;
}

/**
 * Convert hours to seconds for TTL
 * @param hours Number of hours
 * @returns Number of seconds
 */
export function hoursToSeconds(hours: number): number {
  return hours * 3600;
}

/**
 * Convert seconds to milliseconds (for legacy compatibility)
 * @deprecated Use seconds directly with cache-manager
 * @param seconds Number of seconds
 * @returns Number of milliseconds
 */
export function secondsToMilliseconds(seconds: number): number {
  return seconds * 1000;
}

/**
 * Validate TTL value is reasonable
 * @param ttl TTL value in seconds
 * @param context Context for error messages
 * @throws Error if TTL is invalid
 */
export function validateTTL(ttl: number, context: string = 'TTL'): void {
  if (typeof ttl !== 'number' || ttl <= 0) {
    throw new Error(`${context} must be a positive number`);
  }

  if (ttl > 86400) { // More than 24 hours
    console.warn(`${context}: Very large TTL value (${ttl}s) may cause memory issues`);
  }
}

/**
 * Get TTL from environment with fallback
 * @param envKey Environment variable key
 * @param fallback Fallback value in seconds
 * @returns TTL value in seconds
 */
export function getTTLFromEnv(envKey: string, fallback: number): number {
  const envValue = process.env[envKey];
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return fallback;
}