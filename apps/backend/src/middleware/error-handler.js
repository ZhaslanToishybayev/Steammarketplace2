/**
 * Centralized Error Handler Middleware
 * Catches all errors and returns consistent JSON responses.
 * 
 * Error types handled:
 * - ValidationError (400)
 * - AuthenticationError (401)
 * - ForbiddenError (403)
 * - NotFoundError (404)
 * - RateLimitError (429)
 * - InternalError (500)
 * 
 * @module middleware/error-handler
 */

// @ts-check

const { logger } = require('../utils/logger');

/**
 * Custom error classes for API responses
 */
class ApiError extends Error {
    /**
     * @param {string} message
     * @param {number} statusCode
     * @param {string} [code]
     */
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends ApiError {
    /**
     * @param {string} message
     * @param {Object} [details]
     */
    constructor(message, details = {}) {
        super(message, 400, 'VALIDATION_ERROR');
        this.details = details;
    }
}

class AuthenticationError extends ApiError {
    /**
     * @param {string} message
     */
    constructor(message = 'Authentication required') {
        super(message, 401, 'AUTHENTICATION_ERROR');
    }
}

class ForbiddenError extends ApiError {
    /**
     * @param {string} message
     */
    constructor(message = 'Access forbidden') {
        super(message, 403, 'FORBIDDEN');
    }
}

class NotFoundError extends ApiError {
    /**
     * @param {string} resource
     */
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}

class RateLimitError extends ApiError {
    /**
     * @param {number} [retryAfter]
     */
    constructor(retryAfter = 60) {
        super('Too many requests', 429, 'RATE_LIMIT_EXCEEDED');
        this.retryAfter = retryAfter;
    }
}

class ConflictError extends ApiError {
    /**
     * @param {string} message
     */
    constructor(message = 'Resource conflict') {
        super(message, 409, 'CONFLICT');
    }
}

/**
 * Error handler middleware
 * @param {Error & {statusCode?: number, code?: string, details?: Object, retryAfter?: number, isOperational?: boolean}} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function errorHandler(err, req, res, next) {
    // Default values
    let statusCode = err.statusCode || 500;
    let code = err.code || 'INTERNAL_ERROR';
    let message = err.message || 'An unexpected error occurred';

    // Log error
    const logLevel = statusCode >= 500 ? 'error' : 'warn';
    logger[logLevel]({
        message: err.message,
        code,
        statusCode,
        stack: statusCode >= 500 ? err.stack : undefined,
        requestId: req.id,
        path: req.path,
        method: req.method,
        userId: req.user?.steamId,
    });

    // Handle specific error types
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        code = 'INVALID_TOKEN';
        message = 'Invalid authentication token';
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        code = 'TOKEN_EXPIRED';
        message = 'Authentication token expired';
    } else if (err.code === 'ECONNREFUSED') {
        statusCode = 503;
        code = 'SERVICE_UNAVAILABLE';
        message = 'Service temporarily unavailable';
    }

    // Build response
    const response = {
        success: false,
        error: {
            code,
            message: process.env.NODE_ENV === 'production' && statusCode >= 500
                ? 'An unexpected error occurred'
                : message,
        },
        requestId: req.id,
        timestamp: new Date().toISOString(),
    };

    // Add details for validation errors
    if (err.details) {
        response.error.details = err.details;
    }

    // Add retry-after header for rate limit errors
    if (err.retryAfter) {
        res.set('Retry-After', String(err.retryAfter));
        response.error.retryAfter = err.retryAfter;
    }

    // Send response
    res.status(statusCode).json(response);
}

/**
 * 404 Not Found handler
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function notFoundHandler(req, res, next) {
    next(new NotFoundError(`Route ${req.method} ${req.path}`));
}

module.exports = {
    errorHandler,
    notFoundHandler,
    ApiError,
    ValidationError,
    AuthenticationError,
    ForbiddenError,
    NotFoundError,
    RateLimitError,
    ConflictError,
};
