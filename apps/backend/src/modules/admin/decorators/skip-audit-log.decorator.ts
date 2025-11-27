import { SetMetadata } from '@nestjs/common';

export const SKIP_AUDIT_LOG_KEY = 'skipAuditLog';

/**
 * Decorator to skip automatic audit logging for specific endpoints
 * Useful for GET endpoints that only read data and don't perform actions
 */
export const SkipAuditLog = () => SetMetadata(SKIP_AUDIT_LOG_KEY, true);