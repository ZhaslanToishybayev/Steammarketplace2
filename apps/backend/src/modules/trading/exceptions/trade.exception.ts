import { HttpException, HttpStatus } from '@nestjs/common';

export class TradeException extends HttpException {
  constructor(message: string, statusCode: HttpStatus, private readonly details?: any) {
    super({
      message,
      statusCode,
      details,
      error: 'Trade Error'
    }, statusCode);
  }
}

export class TradeOfferException extends TradeException {
  constructor(message: string, private readonly originalError?: any) {
    super(message, HttpStatus.BAD_REQUEST, { originalError });
  }
}

export class BotOfflineException extends TradeException {
  constructor(message: string = 'Bot is currently offline') {
    super(message, HttpStatus.SERVICE_UNAVAILABLE);
  }
}

export class BotUnavailableException extends TradeException {
  constructor(message: string = 'No bots are currently available for trading') {
    super(message, HttpStatus.SERVICE_UNAVAILABLE);
  }
}

export class InvalidTradeUrlException extends TradeException {
  constructor(message: string = 'Invalid Steam trade URL') {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

export class ItemNotOwnedException extends TradeException {
  constructor(assetId: string, userId: string) {
    super(`Item with assetId ${assetId} is not owned by user ${userId}`, HttpStatus.FORBIDDEN);
  }
}

export class ItemNotTradableException extends TradeException {
  constructor(assetId: string) {
    super(`Item with assetId ${assetId} is not tradable`, HttpStatus.BAD_REQUEST);
  }
}

export class EscrowException extends TradeException {
  constructor(message: string = 'Trade hold/escrow detected', private readonly escrowDays?: number) {
    super(message, HttpStatus.BAD_REQUEST, { escrowDays });
  }
}

export class TradeLimitExceededException extends TradeException {
  constructor(limitType: 'hour' | 'day', currentCount: number, maxCount: number) {
    super(
      `Trade limit exceeded: ${currentCount}/${maxCount} trades per ${limitType}`,
      HttpStatus.TOO_MANY_REQUESTS,
      { limitType, currentCount, maxCount }
    );
  }
}

export class UserBannedException extends TradeException {
  constructor(userId: string, banReason?: string) {
    super(
      `User ${userId} is banned${banReason ? `: ${banReason}` : ''}`,
      HttpStatus.FORBIDDEN,
      { banReason }
    );
  }
}

export class TradeNotFoundException extends TradeException {
  constructor(tradeId: string) {
    super(`Trade with ID ${tradeId} not found`, HttpStatus.NOT_FOUND);
  }
}

export class TradeAlreadyProcessedException extends TradeException {
  constructor(tradeId: string, currentStatus: string) {
    super(
      `Trade ${tradeId} is already processed with status: ${currentStatus}`,
      HttpStatus.CONFLICT,
      { currentStatus }
    );
  }
}

export class TradeStatusException extends TradeException {
  constructor(tradeId: string, currentStatus: string, requestedAction: string) {
    super(
      `Cannot perform action '${requestedAction}' on trade ${tradeId} with status: ${currentStatus}`,
      HttpStatus.BAD_REQUEST,
      { currentStatus, requestedAction }
    );
  }
}

export class BotCapacityExceededException extends TradeException {
  constructor(botId: string, currentTrades: number, maxTrades: number) {
    super(
      `Bot ${botId} has reached maximum concurrent trades: ${currentTrades}/${maxTrades}`,
      HttpStatus.BAD_REQUEST,
      { currentTrades, maxTrades }
    );
  }
}

export class TradeValidationException extends TradeException {
  constructor(message: string, private readonly validationErrors?: any[]) {
    super(message, HttpStatus.BAD_REQUEST, { validationErrors });
  }
}

export class WebhookDeliveryException extends TradeException {
  constructor(message: string, private readonly webhookUrl?: string, private readonly statusCode?: number) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, {
      webhookUrl,
      statusCode
    });
  }
}

export class TradeProcessingException extends TradeException {
  constructor(message: string, private readonly tradeId?: string) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, { tradeId });
  }
}

export class SteamApiConnectionException extends TradeException {
  constructor(message: string, private readonly botId?: string) {
    super(message, HttpStatus.SERVICE_UNAVAILABLE, { botId });
  }
}

export class ConfirmationRequiredException extends TradeException {
  constructor(message: string = 'Steam Guard Mobile Authenticator confirmation required', private readonly confirmationData?: any) {
    super(message, HttpStatus.BAD_REQUEST, { confirmationData });
  }
}

export class TradeExpiredException extends TradeException {
  constructor(tradeId: string, expiredAt: Date) {
    super(
      `Trade ${tradeId} has expired at ${expiredAt.toISOString()}`,
      HttpStatus.GONE,
      { expiredAt }
    );
  }
}

export class TradeRetryLimitExceededException extends TradeException {
  constructor(tradeId: string, retryCount: number, maxRetries: number) {
    super(
      `Trade ${tradeId} has exceeded maximum retry attempts: ${retryCount}/${maxRetries}`,
      HttpStatus.BAD_REQUEST,
      { retryCount, maxRetries }
    );
  }
}