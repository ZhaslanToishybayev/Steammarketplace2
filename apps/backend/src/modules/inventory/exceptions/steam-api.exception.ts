import { HttpException, HttpStatus } from '@nestjs/common';

export class SteamApiException extends HttpException {
  constructor(message: string, status: HttpStatus, details?: any) {
    super(
      {
        statusCode: status,
        message,
        error: 'Steam API Error',
        details,
      },
      status,
    );
  }
}

export class PrivateInventoryException extends SteamApiException {
  constructor(steamId: string) {
    super(
      'User inventory is private',
      HttpStatus.FORBIDDEN,
      { steamId, reason: 'private_inventory' }
    );
  }
}

export class RateLimitException extends SteamApiException {
  constructor(retryAfter?: number) {
    const message = retryAfter
      ? `Steam API rate limit exceeded. Retry after ${retryAfter} seconds.`
      : 'Steam API rate limit exceeded';

    super(
      message,
      HttpStatus.TOO_MANY_REQUESTS,
      { retryAfter, reason: 'rate_limit' }
    );
  }
}

export class InvalidSteamIdException extends SteamApiException {
  constructor(steamId: string) {
    super(
      'Invalid Steam ID',
      HttpStatus.BAD_REQUEST,
      { steamId, reason: 'invalid_steam_id' }
    );
  }
}

export class SteamApiTimeoutException extends SteamApiException {
  constructor(endpoint: string, timeout: number) {
    super(
      'Steam API request timeout',
      HttpStatus.GATEWAY_TIMEOUT,
      {
        endpoint,
        timeout,
        reason: 'timeout',
        message: `Request to ${endpoint} timed out after ${timeout}ms`
      }
    );
  }
}

export class SteamApiUnavailableException extends SteamApiException {
  constructor(endpoint: string) {
    super(
      'Steam API is currently unavailable',
      HttpStatus.SERVICE_UNAVAILABLE,
      { endpoint, reason: 'service_unavailable' }
    );
  }
}

export class InventoryNotFoundException extends SteamApiException {
  constructor(steamId: string, appId: number) {
    super(
      'Inventory not found',
      HttpStatus.NOT_FOUND,
      { steamId, appId, reason: 'not_found' }
    );
  }
}