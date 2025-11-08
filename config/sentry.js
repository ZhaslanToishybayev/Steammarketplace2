const Sentry = require('@sentry/node');

/**
 * Initialize Sentry error tracking
 */
const initializeSentry = () => {
  Sentry.init({
    dsn: process.env.SENTRY_DSN || '',

    // Only enable in production or when DSN is provided
    enabled: !!process.env.SENTRY_DSN || process.env.NODE_ENV === 'production',

    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Capture unhandled promise rejections
    captureUnhandledRejections: true,

    // Environment
    environment: process.env.NODE_ENV || 'development',

    // Additional options
    beforeSend(event) {
      // Filter out health check errors in production
      if (event.request && event.request.url && event.request.url.includes('/health')) {
        return null;
      }
      return event;
    },

    beforeSendTransaction(event) {
      // Don't send health check transactions
      if (event.transaction && event.transaction.includes('/health')) {
        return null;
      }
      return event;
    },
  });

  return Sentry;
};

/**
 * Middleware to wrap async route handlers with Sentry
 */
const withSentryErrorHandling = (handler) => {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      Sentry.captureException(error);
      next(error);
    }
  };
};

/**
 * Add request data to Sentry context
 */
const addSentryContext = (req) => {
  Sentry.configureScope((scope) => {
    scope.setTag('request_id', req.headers['x-request-id'] || 'unknown');
    scope.setUser({
      id: req.user?.id || req.user?._id,
      steamId: req.user?.steamId,
      ip: req.ip,
    });
  });
};

/**
 * Wrap Express route handlers with Sentry
 */
const sentryMiddleware = (req, res, next) => {
  Sentry.addBreadcrumb({
    category: 'http',
    message: `${req.method} ${req.url}`,
    level: 'info',
    data: {
      method: req.method,
      url: req.url,
      headers: req.headers,
    },
  });

  addSentryContext(req);
  next();
};

module.exports = {
  initializeSentry,
  withSentryErrorHandling,
  sentryMiddleware,
  Sentry
};
