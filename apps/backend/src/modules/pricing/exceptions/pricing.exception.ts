import { HttpException, HttpStatus } from '@nestjs/common';

export class PricingApiException extends HttpException {
  constructor(message: string, status: HttpStatus, metadata?: any) {
    super(
      {
        statusCode: status,
        message,
        error: 'Pricing API Error',
        metadata,
      },
      status,
    );
  }
}

export class PriceNotFoundException extends PricingApiException {
  constructor(marketHashName: string, appId: number) {
    super(
      `Price not found for item "${marketHashName}" (App ${appId})`,
      HttpStatus.NOT_FOUND,
      { marketHashName, appId, reason: 'price_not_found' }
    );
  }
}

export class PricingRateLimitException extends PricingApiException {
  constructor(source: string, retryAfter?: number) {
    const message = retryAfter
      ? `${source} API rate limit exceeded. Retry after ${retryAfter} seconds.`
      : `${source} API rate limit exceeded`;

    super(
      message,
      HttpStatus.TOO_MANY_REQUESTS,
      { source, retryAfter, reason: 'rate_limit' }
    );
  }
}

export class PricingApiTimeoutException extends PricingApiException {
  constructor(endpoint: string, timeout: number) {
    super(
      'Pricing API request timeout',
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

export class InvalidItemException extends PricingApiException {
  constructor(itemId: string, reason?: string) {
    super(
      `Invalid item: ${itemId}`,
      HttpStatus.BAD_REQUEST,
      { itemId, reason: reason || 'invalid_item' }
    );
  }
}

export class PriceCalculationException extends PricingApiException {
  constructor(message: string, itemId?: string) {
    super(
      `Price calculation failed: ${message}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      { itemId, reason: 'calculation_error' }
    );
  }
}