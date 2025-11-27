import { HttpException, HttpStatus } from '@nestjs/common';

export class WalletException extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(message, status);
  }
}

export class InsufficientFundsException extends WalletException {
  constructor(message: string = 'Insufficient funds') {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

export class InvalidPaymentMethodException extends WalletException {
  constructor(message: string = 'Invalid payment method') {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

export class PaymentProcessingException extends WalletException {
  constructor(message: string = 'Payment processing failed') {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export class WithdrawalLimitExceededException extends WalletException {
  constructor(message: string = 'Withdrawal limit exceeded') {
    super(message, HttpStatus.TOO_MANY_REQUESTS);
  }
}

export class InvalidReferralCodeException extends WalletException {
  constructor(message: string = 'Invalid referral code') {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

export class ReferralAlreadyAppliedException extends WalletException {
  constructor(message: string = 'Referral code already applied') {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

export class TransactionNotFoundException extends WalletException {
  constructor(message: string = 'Transaction not found') {
    super(message, HttpStatus.NOT_FOUND);
  }
}

export class TransactionAlreadyCompletedException extends WalletException {
  constructor(message: string = 'Transaction already completed') {
    super(message, HttpStatus.CONFLICT);
  }
}

export class TransactionAlreadyCancelledException extends WalletException {
  constructor(message: string = 'Transaction already cancelled') {
    super(message, HttpStatus.CONFLICT);
  }
}

export class BalanceLockException extends WalletException {
  constructor(message: string = 'Failed to lock balance') {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

export class BalanceUnlockException extends WalletException {
  constructor(message: string = 'Failed to unlock balance') {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

export class CryptoAddressValidationException extends WalletException {
  constructor(message: string = 'Invalid cryptocurrency address') {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

export class PaymentVerificationException extends WalletException {
  constructor(message: string = 'Payment verification failed') {
    super(message, HttpStatus.BAD_REQUEST);
  }
}