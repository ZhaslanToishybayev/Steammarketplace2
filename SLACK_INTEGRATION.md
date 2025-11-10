# Slack Integration for Steam Marketplace

Comprehensive guide for setting up and using Slack notifications in the Steam Marketplace application.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Setup](#setup)
4. [Configuration](#configuration)
5. [API Endpoints](#api-endpoints)
6. [Usage Examples](#usage-examples)
7. [Integration with Logger](#integration-with-logger)
8. [Customization](#customization)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

## 🎯 Overview

The Slack integration service provides real-time notifications for critical events in the Steam Marketplace application. It supports multiple alert types, custom formatting, and automatic routing to appropriate channels based on alert severity and type.

### Architecture

```
┌─────────────────┐
│   Application   │
│   (Node.js)     │
└────────┬────────┘
         │
         │ SlackService.sendAlert()
         │
┌────────▼────────┐
│ Slack Incoming  │  (Webhook URL)
│   Webhook       │
└────────┬────────┘
         │
         │ HTTPS POST
         │
┌────────▼────────┐
│     Slack       │  (Channels)
│   Workspaces    │
└─────────────────┘
```

## ✨ Features

### Alert Types
- **Critical Alerts** - System down, high error rate, security breaches
- **Warning Alerts** - Performance degradation, resource limits
- **Info Alerts** - Deployments, updates, status changes
- **Success Alerts** - Successful operations, recoveries

### Specialized Alerts
- **Security Alerts** - Authentication failures, suspicious activity
- **Business Alerts** - Transaction metrics, marketplace KPIs
- **System Alerts** - Component status, performance issues
- **Performance Alerts** - Slow operations, high latency

### Rich Formatting
- Color-coded messages by severity
- Structured fields for easy scanning
- Emoji indicators for quick recognition
- Timestamp and context information
- Links to dashboards and runbooks

### Channel Routing
- Automatic routing based on alert type
- Custom channel configuration
- Multiple channel support
- Severity-based routing

## 🚀 Setup

### Step 1: Create Slack Incoming Webhook

1. Go to your Slack workspace
2. Navigate to **Settings & Administration** > **Manage apps**
3. Click **Build** > **Your Apps**
4. Click **Create New App** > **From scratch**
5. Enter app name: "Steam Marketplace"
6. Select your workspace
7. Click **Create App**

### Step 2: Configure Incoming Webhooks

1. In your app settings, go to **Incoming Webhooks**
2. Toggle **Activate Incoming Webhooks** to On
3. Click **Add New Webhook to Workspace**
4. Select the channel: `#alerts`
5. Click **Allow**
6. Copy the webhook URL (starts with `https://hooks.slack.com/services/`)

### Step 3: Set Up Channels (Optional)

Create dedicated channels for different alert types:

```bash
/alerts-general      - General notifications
/alerts-critical     - Critical system alerts
/alerts-warning      - Warning level alerts
/security            - Security events
/devops             - Infrastructure alerts
/product            - Business metrics
```

### Step 4: Configure Environment Variables

Create `.env` file:

```bash
# Slack Webhook URL
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Log level
LOG_LEVEL=info

# Environment
NODE_ENV=production
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `SLACK_WEBHOOK_URL` | Slack webhook URL | Yes | - |
| `LOG_LEVEL` | Logging level | No | info |
| `NODE_ENV` | Environment mode | No | development |

### Channel Configuration

Edit `services/slackService.js` to customize default channels:

```javascript
const severityConfig = {
  critical: { color: '#ff0000', emoji: '🚨', channel: '#alerts-critical' },
  warning: { color: '#ffff00', emoji: '⚠️', channel: '#alerts-warning' },
  info: { color: '#36a64f', emoji: 'ℹ️', channel: '#alerts' },
  success: { color: '#36a64f', emoji: '✅', channel: '#alerts' }
};
```

## 📡 API Endpoints

### Test Integration

**Endpoint:** `POST /api/slack/test`

Send a test notification to verify Slack integration.

**Request:**
```bash
curl -X POST http://localhost:3001/api/slack/test \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "message": "Test notification sent successfully"
}
```

### Send Custom Alert

**Endpoint:** `POST /api/slack/alert`

Send a custom alert with your own title, message, and formatting.

**Request:**
```bash
curl -X POST http://localhost:3001/api/slack/alert \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Custom Alert",
    "message": "This is a custom notification",
    "severity": "warning",
    "color": "#ffff00",
    "fields": [
      {
        "title": "Status",
        "value": "Active"
      }
    ],
    "channel": "#alerts"
  }'
```

### Send Security Alert

**Endpoint:** `POST /api/slack/security`

Send a security-related alert with automatic routing to #security channel.

**Request:**
```bash
curl -X POST http://localhost:3001/api/slack/security \
  -H "Content-Type: application/json" \
  -d '{
    "event": "Multiple Failed Logins",
    "description": "User attempted to login 10 times with invalid credentials",
    "severity": "high",
    "source": "login-service",
    "userId": "user123",
    "ip": "192.168.1.100",
    "additionalInfo": {
      "attempts": 10,
      "duration": "5 minutes"
    }
  }'
```

### Send Business Alert

**Endpoint:** `POST /api/slack/business`

Send a business metric alert with routing to #product channel.

**Request:**
```bash
curl -X POST http://localhost:3001/api/slack/business \
  -H "Content-Type: application/json" \
  -d '{
    "event": "Low Transaction Volume",
    "description": "Transaction volume has dropped below threshold",
    "metric": "transactions_per_minute",
    "value": 5,
    "threshold": 10,
    "trend": "decreasing",
    "url": "https://grafana.sgomarket.com/d/business"
  }'
```

### Send System Alert

**Endpoint:** `POST /api/slack/system`

Send a system/component alert with routing to #devops channel.

**Request:**
```bash
curl -X POST http://localhost:3001/api/slack/system \
  -H "Content-Type: application/json" \
  -d '{
    "component": "Database",
    "status": "degraded",
    "message": "Query response time increased",
    "metrics": {
      "avg_response_time": "500ms",
      "slow_queries": 15,
      "connections": 45
    },
    "url": "https://grafana.sgomarket.com/d/infrastructure"
  }'
```

### Get Service Status

**Endpoint:** `GET /api/slack/status`

Check if Slack integration is configured and working.

**Response:**
```json
{
  "success": true,
  "status": {
    "enabled": true,
    "webhookConfigured": true,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

## 💡 Usage Examples

### Using the Slack Service in Code

```javascript
const slackService = require('./services/slackService');

// Send a test notification
await slackService.test();

// Send a security alert
await slackService.sendSecurityAlert({
  event: 'Suspicious Activity',
  description: 'Multiple failed login attempts detected',
  severity: 'high',
  userId: 'user123',
  ip: '192.168.1.100'
});

// Send a business alert
await slackService.sendBusinessAlert({
  event: 'Sales Milestone',
  description: 'Reached $10,000 in daily sales',
  metric: 'daily_revenue',
  value: 10000,
  threshold: 5000,
  url: 'https://grafana.sgomarket.com/d/business'
});

// Send a system alert
await slackService.sendSystemAlert({
  component: 'API Server',
  status: 'degraded',
  message: 'High CPU usage detected',
  metrics: {
    cpu_usage: '85%',
    memory_usage: '70%',
    response_time: '250ms'
  }
});

// Send a performance alert
await slackService.sendPerformanceAlert({
  operation: 'Database Query',
  duration: 1200,
  threshold: 1000,
  percentiles: {
    50: 300,
    90: 800,
    95: 1200,
    99: 2000
  }
});

// Send a deployment notification
await slackService.sendDeploymentNotification({
  environment: 'production',
  version: '2.0.0',
  author: 'developer123',
  commit: 'a1b2c3d',
  url: 'https://app.sgomarket.com'
});
```

### Using the Logger Integration

```javascript
const logger = require('./utils/logger');

// The logger has built-in Slack integration methods

// Log authentication event (automatically sends to Slack on failure)
logger.logAuth('login', 'user123', 'success', { ip: '192.168.1.100' });
logger.logAuth('login', 'user456', 'failure', { reason: 'invalid_credentials' });

// Log security event
logger.security('Brute force attack detected', {
  source: 'login-service',
  ip: '192.168.1.100',
  attempts: 50
});

// Log business event
logger.business('Milestone reached', {
  metric: 'active_users',
  value: 10000
});

// Log performance event
logger.performance('Slow query detected', 1500, {
  query: 'findUserByEmail',
  collection: 'users'
});

// Log trade event
logger.trade('trade_completed', 'trade_123', 'user789', {
  item: 'AK-47 | Dragon Lore',
  value: '$5000'
});

// Log payment event
logger.payment('payment_received', 50.00, 'USD', 'user123', {
  method: 'stripe',
  transaction_id: 'tx_123'
});
```

## 🔗 Integration with Logger

The logger automatically sends Slack notifications for:

### Automatic Slack Alerts

1. **Authentication Failures**
   - Trigger: `logger.logAuth()` with result='failure'
   - Route: #security channel
   - Severity: Warning

2. **Security Events**
   - Trigger: `logger.security()`
   - Route: #security channel
   - Severity: High (configurable)

3. **Business Milestones**
   - Trigger: `logger.business()`
   - Route: #product channel
   - Severity: Info/Success

4. **Performance Issues**
   - Trigger: `logger.performance()` with duration > threshold
   - Route: #devops channel
   - Severity: Warning/Critical

### Manual Slack Notifications

For events that don't trigger automatically:

```javascript
const slackService = require('./services/slackService');

// Custom notification
await slackService.sendCustom({
  title: 'Maintenance Scheduled',
  message: 'System maintenance scheduled for tonight at 2 AM',
  severity: 'info',
  color: '#36a64f',
  fields: [
    { title: 'Start Time', value: '2024-01-15 02:00:00' },
    { title: 'Duration', value: '2 hours' },
    { title: 'Impact', value: 'Minimal' }
  ]
});
```

## 🎨 Customization

### Custom Alert Format

You can customize the alert format by modifying `services/slackService.js`:

```javascript
// Custom block format
const blocks = [
  {
    type: 'header',
    text: {
      type: 'plain_text',
      text: `🚨 ${title}`
    }
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*${message}*`
    }
  },
  {
    type: 'divider'
  }
];
```

### Custom Fields

Add custom fields to any alert:

```javascript
await slackService.sendCustom({
  title: 'Custom Alert',
  message: 'Alert with custom fields',
  fields: [
    { title: 'Field 1', value: 'Value 1' },
    { title: 'Field 2', value: 'Value 2' },
    { title: 'Field 3', value: 'Value 3' }
  ]
});
```

### Custom Colors

Use custom colors for different alert types:

```javascript
// Available colors
const colors = {
  red: '#ff0000',
  yellow: '#ffff00',
  green: '#36a64f',
  blue: '#2196F3',
  purple: '#9C27B0'
};

await slackService.sendCustom({
  title: 'Alert',
  message: 'Message',
  color: colors.blue
});
```

## 🐛 Troubleshooting

### Webhook URL Not Configured

**Error:**
```
Slack notifications disabled - no webhook URL configured
```

**Solution:**
1. Set `SLACK_WEBHOOK_URL` in `.env` file
2. Restart the application
3. Verify with `GET /api/slack/status`

### Webhook URL Invalid

**Error:**
```
Failed to send Slack message - 404 Not Found
```

**Solution:**
1. Verify webhook URL is correct
2. Check if webhook is still active in Slack
3. Regenerate webhook URL if needed

### Network Timeout

**Error:**
```
Failed to send Slack message - timeout
```

**Solution:**
1. Check network connectivity
2. Verify Slack API is accessible
3. Increase timeout in `services/slackService.js` (default: 5s)

### Rate Limiting

**Error:**
```
Slack API rate limit exceeded
```

**Solution:**
1. Reduce notification frequency
2. Batch multiple alerts
3. Check Slack's rate limits (80 requests/minute per webhook)

### Testing Connection

```bash
# Check service status
curl http://localhost:3001/api/slack/status

# Send test notification
curl -X POST http://localhost:3001/api/slack/test
```

### Debug Logging

Enable debug logging to see detailed information:

```bash
# In .env
LOG_LEVEL=debug

# Or when starting the app
LOG_LEVEL=debug node app.js
```

Check logs:

```bash
# View application logs
tail -f logs/combined.log

# View Slack-specific logs
grep "slack" logs/combined.log
```

## 📚 Best Practices

### 1. Use Appropriate Severity Levels

```javascript
// Good
logger.logAuth('login', userId, 'failure', { reason: 'invalid_password' });

// Bad - don't use critical for minor issues
logger.security('Minor issue', { severity: 'critical' });
```

### 2. Include Contextual Information

```javascript
// Good
await slackService.sendSecurityAlert({
  event: 'Brute Force Attack',
  description: '50 failed login attempts from IP 192.168.1.100',
  severity: 'high',
  userId: null,
  ip: '192.168.1.100',
  additionalInfo: {
    attempts: 50,
    timeframe: '5 minutes',
    userAgent: 'curl/7.68.0'
  }
});
```

### 3. Don't Spam Slack

```javascript
// Good - rate limit notifications
if (failedAttempts > 10 && lastAlert < Date.now() - 300000) {
  await slackService.sendSecurityAlert({...});
  lastAlert = Date.now();
}

// Bad - alerts for every failed attempt
await slackService.sendSecurityAlert({...}); // Don't do this!
```

### 4. Use Structured Logging

```javascript
// Good
logger.performance('query_execution', 1500, {
  query: 'findUserByEmail',
  collection: 'users',
  index: 'email_1',
  documents: 1
});

// Bad
logger.warn('Query slow');
```

### 5. Monitor Alert Volume

Track how many alerts are sent to avoid alert fatigue:

```javascript
const alertCount = {
  critical: 0,
  warning: 0,
  info: 0
};

// Increment counters
alertCount[severity]++;

// Log to monitoring
logger.info('Alert sent', {
  type: 'alert_stats',
  severity,
  count: alertCount[severity]
});
```

### 6. Include Runbook Links

```javascript
await slackService.sendCustom({
  title: 'Database Connection Pool Exhausted',
  message: 'All database connections are in use',
  fields: [
    { title: 'Runbook', value: 'https://runbooks.sgomarket.com/db-connection-pool' },
    { title: 'Dashboard', value: 'https://grafana.sgomarket.com/d/database' }
  ]
});
```

### 7. Use Different Channels

Route alerts to appropriate channels:

```javascript
// Security events -> #security
await slackService.sendSecurityAlert({...});

// Business metrics -> #product
await slackService.sendBusinessAlert({...});

// System issues -> #devops
await slackService.sendSystemAlert({...});
```

### 8. Test Regularly

```bash
# Automated test in CI/CD
curl -f -X POST http://localhost:3001/api/slack/test

# Manual test
curl -X POST http://localhost:3001/api/slack/test \
  -H "Content-Type: application/json"
```

### 9. Document Custom Alerts

Document all custom alert types:

```markdown
# Alert Documentation

## High Error Rate
- **Trigger**: Error rate > 5% for 5 minutes
- **Route**: #alerts-critical
- **Action**: Check error logs, restart service if needed
- **Runbook**: [Link to runbook]

## Low Cache Hit Rate
- **Trigger**: Cache hit rate < 60% for 10 minutes
- **Route**: #alerts-warning
- **Action**: Review cache strategy
- **Dashboard**: [Link to dashboard]
```

### 10. Secure Your Webhook

```bash
# Store webhook URL securely
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ

# Don't commit to version control
echo ".env" >> .gitignore

# Use environment variables in production
SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL}
```

## 🔐 Security Considerations

1. **Protect Webhook URL**
   - Never commit webhook URL to version control
   - Use environment variables
   - Rotate webhook URLs periodically

2. **Validate Input**
   - Sanitize all alert content
   - Remove sensitive data (passwords, tokens)
   - Limit message length

3. **Rate Limiting**
   - Implement rate limiting for custom alerts
   - Use alert throttling to prevent spam

4. **Access Control**
   - Protect Slack API endpoints with authentication
   - Use middleware to restrict access to admin users

5. **Audit Logging**
   - Log all Slack notifications sent
   - Track who sent custom alerts
   - Monitor alert frequency

## 📊 Monitoring Slack Integration

### Metrics to Track

1. **Alert Volume**
   ```javascript
   // Track number of alerts sent by severity
   metricsService.recordSlackAlerts(severity, count);
   ```

2. **Response Time**
   ```javascript
   // Track time to send notification
   const start = Date.now();
   await slackService.sendAlert(data);
   const duration = Date.now() - start;
   ```

3. **Error Rate**
   ```javascript
   // Track failed notifications
   if (!result.success) {
     metricsService.recordSlackErrors(errorType);
   }
   ```

### Dashboards

Create a Grafana dashboard to monitor:
- Number of alerts sent per hour/day
- Alert distribution by severity
- Success/failure rate
- Average response time
- Top alert sources

## 📞 Support

For issues or questions:
- Check logs: `grep "slack" logs/combined.log`
- Test connection: `GET /api/slack/status`
- Send test: `POST /api/slack/test`
- Review webhook configuration in Slack
