# Sentry Monitoring Setup

## 📋 Overview

Sentry is integrated into the system for real-time error tracking and performance monitoring. It captures exceptions, tracks performance, and provides detailed insights into errors across the application.

## 🔧 Configuration

### 1. Environment Variables

Add to your `.env` file:

```bash
# Sentry DSN (Data Source Name) - Get from Sentry dashboard
SENTRY_DSN=https://your-dsn@sentry.io/project-id

# Environment
NODE_ENV=production
```

### 2. Sentry Configuration File

Located at `config/sentry.js`:

```javascript
const Sentry = require('@sentry/node');

const initializeSentry = () => {
  Sentry.init({
    dsn: process.env.SENTRY_DSN || '',
    enabled: !!process.env.SENTRY_DSN || process.env.NODE_ENV === 'production',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    captureUnhandledRejections: true,
    environment: process.env.NODE_ENV || 'development',
    beforeSend(event) {
      // Filter out health check errors
      if (event.request && event.request.url && event.request.url.includes('/health')) {
        return null;
      }
      return event;
    },
  });
  return Sentry;
};
```

## 🚀 Integration Points

### 1. Application Middleware (app.js)

```javascript
// Sentry request and tracing handlers
if (process.env.SENTRY_DSN || process.env.NODE_ENV === 'production') {
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

// Sentry error handler (after errorHandler middleware)
if (process.env.SENTRY_DSN || process.env.NODE_ENV === 'production') {
  app.use(Sentry.Handlers.errorHandler());
}
```

### 2. Error Handler Middleware (middleware/errorHandler.js)

```javascript
const errorHandler = (err, req, res, next) => {
  // Log to Sentry
  if (Sentry) {
    Sentry.captureException(err, {
      tags: {
        url: req.url,
        method: req.method
      },
      extra: {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
  }
  // ... rest of error handling
};
```

### 3. Trade Offer Service (services/tradeOfferService.js)

```javascript
// Capture trade offer errors
if (Sentry) {
  Sentry.captureException(error, {
    tags: {
      service: 'tradeOfferService',
      action: 'createOffer',
      partnerSteamId: partnerSteamId
    },
    extra: {
      myAssetIds,
      theirAssetIds,
      listingId
    }
  });
}
```

## 📊 Monitoring Features

### 1. Error Tracking
- ✅ Unhandled exceptions
- ✅ Promise rejections
- ✅ Trade offer errors
- ✅ Database errors
- ✅ Authentication errors

### 2. Performance Monitoring
- ✅ Request tracing
- ✅ Database query performance
- ✅ API endpoint performance
- ✅ Trade offer lifecycle tracking

### 3. Custom Tags
- `service`: Service name (tradeOfferService, auth, etc.)
- `action`: Action being performed (createOffer, acceptTrade, etc.)
- `url`: Request URL
- `method`: HTTP method

### 4. Custom Context
- `user`: User information (id, steamId)
- `ip`: Client IP address
- `extra`: Additional context data

## 🏗️ Sentry Dashboard Setup

### 1. Create Sentry Account
1. Go to https://sentry.io
2. Create a new project
3. Select Node.js
4. Copy the DSN

### 2. Configure Alarms

#### Critical Errors
```javascript
// Set up alerts for:
- Trade offer failures > 5 per hour
- Database connection errors
- Authentication failures > 10 per minute
- Steam API errors > 3 per hour
```

#### Performance Issues
```javascript
// Set up alerts for:
- Response time > 2 seconds
- Error rate > 5%
- Database queries > 500ms
```

### 3. Release Tracking
```bash
# Tag deployments
SENTRY_RELEASE=2.0.0 npm start
```

## 📈 Metrics Tracking

### Key Metrics to Monitor
1. **Error Rate**
   - Total errors per hour
   - Error rate by service
   - Error rate by endpoint

2. **Performance**
   - Response time (p50, p95, p99)
   - Database query time
   - Trade offer completion rate

3. **Business Metrics**
   - Successful trades
   - Failed trades
   - User registration rate
   - API usage

## 🔍 Query Examples

### Find All Trade Offer Errors
```
service:tradeOfferService action:createOffer
```

### Find Errors by User
```
user.steamId:76561198782060203
```

### Find Errors in Last Hour
```
timestamp:-1h
```

### Find Slow Requests
```
transaction.duration:>2000ms
```

## 🛠️ Testing Sentry

### 1. Test Error Reporting
```javascript
// In any route
app.get('/test-error', (req, res) => {
  throw new Error('Test error for Sentry');
});
```

### 2. Test Performance Tracking
```javascript
// Manual transaction
const transaction = Sentry.startTransaction({
  op: 'test',
  name: 'Test Transaction'
});

try {
  // Some code
  transaction.setStatus('ok');
} catch (err) {
  transaction.setStatus('internal_error');
  throw err;
} finally {
  transaction.finish();
}
```

### 3. Test User Context
```javascript
Sentry.setUser({
  id: user._id,
  steamId: user.steamId,
  email: user.email
});
```

## 📝 Best Practices

### 1. DO
- ✅ Add context to all errors
- ✅ Use proper tags for categorization
- ✅ Filter out noise (health checks)
- ✅ Track business metrics
- ✅ Set up alerts for critical issues

### 2. DON'T
- ❌ Log sensitive data (passwords, tokens)
- ❌ Log PII without proper handling
- ❌ Ignore errors in try-catch
- ❌ Log health check errors
- ❌ Use Sentry for debugging in development

## 🔐 Security

### 1. PII Handling
```javascript
// Strip PII from error reports
beforeSend(event) {
  if (event.user) {
    delete event.user.email;
    delete event.user.ip;
  }
  return event;
}
```

### 2. Sensitive Data
```javascript
// Never log
- Passwords
- API keys
- Steam tokens
- Credit card numbers
- Personal identification info
```

## 📦 Deployment Checklist

- [ ] SENTRY_DSN configured in production
- [ ] Environment set to 'production'
- [ ] Health check errors filtered
- [ ] PII properly handled
- [ ] Alert rules configured
- [ ] Performance budgets set
- [ ] Release tracking enabled

## 🚨 Alert Rules

### Critical (Page immediately)
1. Error rate > 10% in 5 minutes
2. Trade offer failures > 20% in 10 minutes
3. Database connection lost
4. All bots offline

### Warning (Slack/Email)
1. Error rate > 5% in 15 minutes
2. Response time > 2s for 10 minutes
3. Trade completion rate < 90%
4. High API usage (rate limiting)

## 📚 Resources

- [Sentry Documentation](https://docs.sentry.io/platforms/node/)
- [Node.js Integration](https://docs.sentry.io/platforms/node/guides/express/)
- [Performance Monitoring](https://docs.sentry.io/performance/)
- [Custom Instrumentation](https://docs.sentry.io/performance/instrumentation/)

## 🎯 Next Steps

1. Set up Sentry account and project
2. Configure DSN in production environment
3. Set up alert rules in Sentry dashboard
4. Test error reporting
5. Monitor and optimize based on insights