/**
 * Winston Logger Configuration
 * Structured logging with JSON format for production
 */

const winston = require('winston');
const path = require('path');

// Custom format for development (colorized, readable)
const devFormat = winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
        const reqId = requestId ? `[${requestId.slice(0, 8)}]` : '';
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${level} ${reqId} ${message}${metaStr}`;
    })
);

// Production format (JSON for log aggregation)
const prodFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Determine log level
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Create logger
const logger = winston.createLogger({
    level: logLevel,
    format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
    defaultMeta: { service: 'steam-marketplace' },
    transports: [
        // Console output
        new winston.transports.Console(),
    ],
});

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
    const logsDir = process.env.LOG_DIR || './logs';

    logger.add(new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
    }));

    logger.add(new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 10,
    }));
}

// Request logging middleware
function requestLoggerMiddleware(req, res, next) {
    const start = Date.now();

    // Log after response
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            requestId: req.id,
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.get('user-agent'),
            ip: req.ip,
        };

        // Add user info if authenticated
        if (req.user?.steamId) {
            logData.userId = req.user.steamId;
        }

        // Log level based on status code
        if (res.statusCode >= 500) {
            logger.error('Request completed', logData);
        } else if (res.statusCode >= 400) {
            logger.warn('Request completed', logData);
        } else {
            logger.info('Request completed', logData);
        }
    });

    next();
}

// Child logger with request context
function createRequestLogger(requestId) {
    return logger.child({ requestId });
}

module.exports = {
    logger,
    requestLoggerMiddleware,
    createRequestLogger,
};
