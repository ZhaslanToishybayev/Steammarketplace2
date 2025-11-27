import { HttpException, HttpStatus } from '@nestjs/common';

export class AdminException extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(message, status);
  }
}

export class UserAlreadyBannedException extends AdminException {
  constructor(userId: string) {
    super(`User ${userId} is already banned`, HttpStatus.CONFLICT);
  }
}

export class UserNotBannedException extends AdminException {
  constructor(userId: string) {
    super(`User ${userId} is not currently banned`, HttpStatus.BAD_REQUEST);
  }
}

export class UserAlreadySuspendedException extends AdminException {
  constructor(userId: string) {
    super(`User ${userId} is already suspended`, HttpStatus.CONFLICT);
  }
}

export class UserNotSuspendedException extends AdminException {
  constructor(userId: string) {
    super(`User ${userId} is not currently suspended`, HttpStatus.BAD_REQUEST);
  }
}

export class DisputeNotFoundException extends AdminException {
  constructor(disputeId: string) {
    super(`Dispute ${disputeId} not found`, HttpStatus.NOT_FOUND);
  }
}

export class DisputeAlreadyResolvedException extends AdminException {
  constructor(disputeId: string) {
    super(`Dispute ${disputeId} is already resolved`, HttpStatus.CONFLICT);
  }
}

export class DisputeAlreadyRejectedException extends AdminException {
  constructor(disputeId: string) {
    super(`Dispute ${disputeId} is already rejected`, HttpStatus.CONFLICT);
  }
}

export class ConfigNotFoundException extends AdminException {
  constructor(key: string) {
    super(`Configuration key '${key}' not found`, HttpStatus.NOT_FOUND);
  }
}

export class ConfigNotEditableException extends AdminException {
  constructor(key: string) {
    super(`Configuration key '${key}' is not editable`, HttpStatus.CONFLICT);
  }
}

export class InvalidConfigValueException extends AdminException {
  constructor(key: string, valueType: string, value: any) {
    super(
      `Invalid value '${value}' for configuration key '${key}' with type '${valueType}'`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class ConfigValueValidationException extends AdminException {
  constructor(valueType: string, expectedType: string) {
    super(`Value must be a ${expectedType}`, HttpStatus.BAD_REQUEST);
  }
}

export class ConfigKeyAlreadyExistsException extends AdminException {
  constructor(key: string) {
    super(`Configuration key '${key}' already exists`, HttpStatus.CONFLICT);
  }
}

export class TradeNotFoundException extends AdminException {
  constructor(tradeId: string) {
    super(`Trade ${tradeId} not found`, HttpStatus.NOT_FOUND);
  }
}

export class TradeAlreadyCompletedException extends AdminException {
  constructor(tradeId: string) {
    super(`Trade ${tradeId} is already completed`, HttpStatus.CONFLICT);
  }
}

export class TradeAlreadyCanceledException extends AdminException {
  constructor(tradeId: string) {
    super(`Trade ${tradeId} is already canceled`, HttpStatus.CONFLICT);
  }
}

export class TradeDisputeAlreadyExistsException extends AdminException {
  constructor(tradeId: string) {
    super(`Dispute already exists for trade ${tradeId}`, HttpStatus.CONFLICT);
  }
}

export class UserAlreadyActiveException extends AdminException {
  constructor(userId: string) {
    super(`User ${userId} is already active`, HttpStatus.CONFLICT);
  }
}

export class UserAlreadyVerifiedException extends AdminException {
  constructor(userId: string) {
    super(`User ${userId} is already verified`, HttpStatus.CONFLICT);
  }
}

export class UserRoleUnchangedException extends AdminException {
  constructor(userId: string) {
    super(`User ${userId} already has the specified role`, HttpStatus.CONFLICT);
  }
}

export class InvalidTradeStatusForActionException extends AdminException {
  constructor(tradeId: string, action: string, status: string) {
    super(`Cannot perform '${action}' on trade ${tradeId} with status '${status}'`, HttpStatus.BAD_REQUEST);
  }
}

export class InsufficientPermissionsException extends AdminException {
  constructor(action: string, role: string) {
    super(`Insufficient permissions to perform '${action}' with role '${role}'`, HttpStatus.FORBIDDEN);
  }
}

export class AdminActionFailedException extends AdminException {
  constructor(action: string, details?: string) {
    super(
      `Admin action '${action}' failed${details ? `: ${details}` : ''}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}