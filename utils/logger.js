const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(info => {
    const { timestamp, level, message, ...meta } = info;
    const correlationId = meta.correlationId || '-';
    const userId = meta.userId || '-';
    const sessionId = meta.sessionId || '-';
    const requestId = meta.requestId || '-';

    // Format log entry
    let logEntry = `${timestamp} [${level.toUpperCase()}] [${correlationId}] ${message}`;

    // Add metadata
    if (Object.keys(meta).length > 0) {
      // Remove sensitive fields
      const safeMeta = { ...meta };
      delete safeMeta.password;
      delete safeMeta.token;
      delete safeMeta.secret;
      delete safeMeta.credentials;

      logEntry += ` ${JSON.stringify(safeMeta)}`;
    }

    return logEntry;
  })
);

// Colorized format for console (development)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(info => {
    const { timestamp, level, message, ...meta } = info;
    const correlationId = meta.correlationId || '-';

    let logEntry = `${timestamp} [${level}] [${correlationId}] ${message}`;

    if (Object.keys(meta).length > 0) {
      const safeMeta = { ...meta };
      delete safeMeta.password;
      delete safeMeta.token;
      delete safeMeta.secret;
      delete safeMeta.credentials;

      logEntry += ` ${JSON.stringify(safeMeta, null, 2)}`;
    }

    return logEntry;
  })
);

// Create Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: {
    service: 'steam-marketplace',
    version: process.env.npm_package_version || '1.0.0'
  },
  format: logFormat,
  transports: [
    // All logs to combined.log
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      tailable: true
    }),

    // Errors to error.log
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 20,
      tailable: true
    }),

    // Security events to security.log
    new winston.transports.File({
      filename: path.join(logsDir, 'security.log'),
      level: 'warn',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 20,
      tailable: true,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),

    // Performance logs to performance.log
    new winston.transports.File({
      filename: path.join(logsDir, 'performance.log'),
      level: 'info',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      tailable: true,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),

    // Audit logs to audit.log
    new winston.transports.File({
      filename: path.join(logsDir, 'audit.log'),
      level: 'info',
      maxsize: 20 * 1024 * 1024, // 20MB
      maxFiles: 50,
      tailable: true,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ],

  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10
    })
  ],

  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10
    })
  ]
});

// Console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'debug'
  }));
}

// Console transport for production (limited output)
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
    level: 'info'
  }));
}

// ==============================================================================
// ENHANCED LOGGING METHODS
// ==============================================================================

/**
 * Log HTTP request with context
 */
logger.logRequest = (req, res, responseTime) => {
  const meta = {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.get('user-agent'),
    ip: req.ip || req.connection.remoteAddress,
    correlationId: req.correlationId,
    userId: req.user?.id,
    sessionId: req.sessionID,
    contentLength: res.get('content-length') || 0
  };

  const level = res.statusCode >= 400 ? 'error' : 'info';
  logger.log(level, `${req.method} ${req.url} - ${res.statusCode}`, meta);
};

/**
 * Log database query with context
 */
logger.logDbQuery = (operation, collection, duration, status, metadata = {}) => {
  logger.info(`DB ${operation} on ${collection}`, {
    type: 'database',
    operation,
    collection,
    duration: `${duration}ms`,
    status,
    ...metadata
  });
};

/**
 * Log cache operation
 */
logger.logCacheOperation = (operation, key, duration, status, hit = null) => {
  const meta = {
    type: 'cache',
    operation,
    key,
    duration: `${duration}ms`,
    status
  };

  if (hit !== null) {
    meta.hit = hit;
  }

  const logLevel = status === 'error' ? 'warn' : 'debug';
  logger.log(logLevel, `Cache ${operation} ${key}`, meta);
};

/**
 * Log authentication event
 */
logger.logAuth = (event, userId, result, metadata = {}) => {
  const level = result === 'success' ? 'info' : 'warn';

  logger.log(level, `Auth ${event} - ${result}`, {
    type: 'authentication',
    event,
    userId,
    result,
    ...metadata
  });

  // Security logging
  if (result === 'failure') {
    logger.security('Authentication failure', {
      event,
      userId,
      ...metadata
    });
  }
};

/**
 * Log security event
 */
logger.security = (message, metadata = {}) => {
  logger.warn(message, {
    type: 'security',
    ...metadata
  });
};

/**
 * Log business event
 */
logger.business = (event, metadata = {}) => {
  logger.info(`Business: ${event}`, {
    type: 'business',
    event,
    ...metadata
  });
};

/**
 * Log performance metric
 */
logger.performance = (operation, duration, metadata = {}) => {
  logger.info(`Performance: ${operation}`, {
    type: 'performance',
    operation,
    duration: `${duration}ms`,
    ...metadata
  });
};

/**
 * Log trade event
 */
logger.trade = (action, tradeId, userId, metadata = {}) => {
  logger.info(`Trade ${action}`, {
    type: 'trade',
    action,
    tradeId,
    userId,
    ...metadata
  });
};

/**
 * Log Steam API call
 */
logger.steamApi = (endpoint, duration, status, metadata = {}) => {
  const level = status === 'error' ? 'warn' : 'debug';

  logger.log(level, `Steam API: ${endpoint}`, {
    type: 'steam_api',
    endpoint,
    duration: `${duration}ms`,
    status,
    ...metadata
  });
};

/**
 * Log payment event
 */
logger.payment = (event, amount, currency, userId, metadata = {}) => {
  logger.info(`Payment: ${event}`, {
    type: 'payment',
    event,
    amount,
    currency,
    userId,
    ...metadata
  });
};

/**
 * Log audit event
 */
logger.audit = (action, userId, resource, metadata = {}) => {
  logger.info(`Audit: ${action}`, {
    type: 'audit',
    action,
    userId,
    resource,
    ...metadata
  });
};

/**
 * Log system event
 */
logger.system = (event, metadata = {}) => {
  logger.info(`System: ${event}`, {
    type: 'system',
    event,
    ...metadata
  });
};

/**
 * Create child logger with metadata
 */
logger.child = (metadata) => {
  const childLogger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    defaultMeta: {
      ...logger.defaultMeta,
      ...metadata
    },
    format: logFormat,
    transports: logger.transports
  });

  // Add enhanced methods to child logger
  childLogger.logRequest = logger.logRequest.bind(logger);
  childLogger.logDbQuery = logger.logDbQuery.bind(logger);
  childLogger.logCacheOperation = logger.logCacheOperation.bind(logger);
  childLogger.logAuth = logger.logAuth.bind(logger);
  childLogger.security = logger.security.bind(logger);
  childLogger.business = logger.business.bind(logger);
  childLogger.performance = logger.performance.bind(logger);
  childLogger.trade = logger.trade.bind(logger);
  childLogger.steamApi = logger.steamApi.bind(logger);
  childLogger.payment = logger.payment.bind(logger);
  childLogger.audit = logger.audit.bind(logger);
  childLogger.system = logger.system.bind(logger);

  return childLogger;
};

// ==============================================================================
// MIDDLEWARE
// ==============================================================================

/**
 * Express middleware for request logging
 */
logger.requestMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const correlationId = req.headers['x-correlation-id'] ||
                        req.headers['x-request-id'] ||
                        Math.random().toString(36).substring(2, 15);

  // Attach correlation ID to request
  req.correlationId = correlationId;

  // Log request start
  logger.debug(`Incoming ${req.method} ${req.url}`, {
    type: 'request_start',
    method: req.method,
    url: req.url,
    correlationId,
    userAgent: req.get('user-agent'),
    ip: req.ip
  });

  // Override res.end to log when response finishes
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;

    // Log the request
    logger.logRequest(req, res, duration);

    // Call original end
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Middleware for adding user context
 */
logger.userContext = (req, res, next) => {
  if (req.user) {
    req.userId = req.user.id;
    req.sessionId = req.sessionID;
  }
  next();
};

module.exports = logger;