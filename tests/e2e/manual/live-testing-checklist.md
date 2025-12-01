# Live E2E Testing Checklist

This document outlines the requirements and procedures for running live E2E tests that interact with real Steam APIs and bot accounts.

## Overview

Live E2E tests are designed to validate the complete integration flow with Steam's actual APIs, including:
- Real Steam OAuth authentication
- Live inventory fetching from Steam
- Actual trade offers between real Steam accounts
- Real-time price updates from Steam Market
- Bot connectivity and trade execution

## ⚠️ Important Security Notes

### Test Environment Requirements
- **Dedicated Staging Environment**: Live tests must only run in isolated staging environments
- **Test Accounts Only**: Use dedicated Steam accounts with minimal-value items
- **Environment Variables**: All credentials must be stored in environment variables, never in code
- **Access Control**: Limit access to live test credentials to essential personnel only

### Security Best Practices
1. **Never use production credentials** in test environments
2. **Use accounts with no valuable items** to minimize risk
3. **Enable 2FA** on all test accounts
4. **Monitor test account activity** regularly
5. **Use dedicated IP addresses** for test environments
6. **Implement rate limiting** to avoid API abuse

## Prerequisites

### Environment Setup
```bash
# Required environment variables
export NODE_ENV=staging
export ENABLE_LIVE_TESTS=true
export LIVE_TEST_BASE_URL=https://staging.example.com
export LIVE_TEST_API_URL=https://staging-api.example.com/api
export LIVE_TEST_WS_URL=wss://staging-api.example.com
```

### Steam API Credentials
```bash
# Required Steam credentials
export STEAM_API_KEY=your_steam_api_key                    # 32-character API key
export TEST_USER_STEAM_ID=76561198012345678               # Test user's Steam64 ID
export TEST_USER_TRADE_URL=https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=abcdefg
export TEST_BOT_STEAM_ID=76561198087654321                 # Test bot's Steam64 ID
export TEST_BOT_SHARED_SECRET=your_bot_shared_secret       # 28-character base64
export TEST_BOT_IDENTITY_SECRET=your_bot_identity_secret   # 28-character base64
export TEST_BOT_TRADE_URL=https://steamcommunity.com/tradeoffer/new/?partner=987654321&token=hijklmn
export TEST_BOT_ID=bot_backend_id
```

### Bot Configuration
```bash
# Backend bot configuration
export BOT_ENCRYPTION_KEY=your_bot_encryption_key          # 32+ character encryption key
export TEST_BOT_PASSWORD=your_bot_password                 # Bot account password
```

### Database Configuration
```bash
# Database connections for staging
export POSTGRES_HOST=staging-postgres.example.com
export POSTGRES_DB=steam_marketplace_staging
export POSTGRES_USER=staging_user
export POSTGRES_PASSWORD=staging_password

export MONGODB_URI=mongodb://staging-mongo.example.com:27017/steam_marketplace_staging
export REDIS_HOST=staging-redis.example.com
export REDIS_PASSWORD=staging_redis_password
```

## Test Account Setup

### Test User Account
1. **Create dedicated Steam account** for testing
2. **Enable 2FA** with backup codes stored securely
3. **Set up trade URL** with valid partner ID and token
4. **Add minimal-value items** for testing (no valuable skins/items)
5. **Configure privacy settings** to allow inventory access

### Test Bot Account
1. **Create dedicated Steam bot account**
2. **Enable 2FA** and configure mobile authenticator
3. **Generate shared and identity secrets** using Steam Guard Mobile Authenticator
4. **Set up trade URL** for receiving trade offers
5. **Configure bot in backend** with proper credentials
6. **Test bot connectivity** before running live tests

### Bot Configuration in Backend
```typescript
// Example bot configuration for testing
{
  accountName: "test-bot-account",
  password: "test-bot-password",
  sharedSecret: "test_shared_secret_base64",
  identitySecret: "test_identity_secret_base64",
  tradeUrl: "https://steamcommunity.com/tradeoffer/new/?partner=987654321&token=hijklmn",
  maxConcurrentTrades: 1, // Limit for testing
  isActive: true,
  isOnline: true
}
```

## Running Live Tests

### 1. Pre-flight Checklist
- [ ] All required environment variables are set
- [ ] Test accounts are properly configured
- [ ] Bot is active and online in the backend
- [ ] Staging environment is healthy
- [ ] Database contains test data
- [ ] Network connectivity to Steam APIs is confirmed
- [ ] Rate limits are not exceeded

### 2. Execute Tests
```bash
# Run all live tests
npm run test:e2e:live

# Run specific test
npx playwright test tests/e2e/live/01-live-steam-integration.spec.ts

# Run with video recording
npx playwright test tests/e2e/live/ --video=on

# Run with trace recording
npx playwright test tests/e2e/live/ --trace=on
```

### 3. Monitor Test Execution
- [ ] Watch for authentication flows
- [ ] Monitor Steam API response times
- [ ] Check bot status and connectivity
- [ ] Verify trade execution (if enabled)
- [ ] Review logs for errors or timeouts

## Expected Test Results

### Successful Test Indicators
- ✅ Steam OAuth redirects work correctly
- ✅ Inventory sync fetches real Steam items
- ✅ Bot status shows as online and available
- ✅ Price updates reflect real market data
- ✅ WebSocket connections establish successfully
- ✅ Trade offers can be created (if enabled)

### Common Issues and Solutions

#### Authentication Failures
```bash
# Issue: Steam OAuth not redirecting
# Solution: Verify STEAM_API_KEY and trade URLs are correct

# Issue: Invalid session tokens
# Solution: Clear browser cache and restart test
```

#### Bot Connectivity Issues
```bash
# Issue: Bot shows as offline
# Solution: Check bot credentials and Steam Guard status

# Issue: Trade offers not being processed
# Solution: Verify bot is configured correctly in backend
```

#### API Rate Limiting
```bash
# Issue: Steam API calls failing
# Solution: Reduce test frequency or increase delays
```

## Safety Measures

### Trade Limitations
- **Maximum trade value**: $5 USD equivalent
- **Maximum items per trade**: 3 items
- **Daily trade limit**: 10 trades per test account
- **Test duration**: Maximum 30 minutes per test run

### Monitoring and Alerts
- **Real-time monitoring** of test account activity
- **Alerts for** unusual trade patterns or errors
- **Automatic shutdown** if limits are exceeded
- **Detailed logging** of all API interactions

### Rollback Procedures
- **Database snapshots** before test runs
- **Bot deactivation** procedures
- **Account lockout** protocols
- **Incident response** checklist

## Maintenance

### Regular Tasks
- [ ] Rotate test account credentials monthly
- [ ] Review and update test data quarterly
- [ ] Validate Steam API compatibility
- [ ] Update test timeouts based on performance
- [ ] Clean up test environment resources

### Account Management
- [ ] Monitor test account balances
- [ ] Verify bot account status weekly
- [ ] Update Steam Guard codes as needed
- [ ] Review and clean up test items

## Troubleshooting

### Debug Mode
```bash
# Enable verbose logging
export DEBUG=*
export PLAYWRIGHT_DEBUG=1

# Run single test in debug mode
npx playwright test tests/e2e/live/01-live-steam-integration.spec.ts --debug
```

### Common Error Codes
- **401**: Invalid Steam API key or authentication
- **429**: Rate limited by Steam API
- **500**: Backend service errors
- **Timeout**: Steam API response too slow

### Recovery Steps
1. **Check Steam API status** - https://steamstat.us
2. **Verify credentials** are still valid
3. **Restart test environment** if needed
4. **Contact Steam support** for API issues

## Documentation and Resources

### Steam API Documentation
- [Steam Web API](https://developer.valvesoftware.com/wiki/Steam_Web_API)
- [Steam OAuth Guide](https://steamcommunity.com/dev)
- [Trade Offer API](https://developer.valvesoftware.com/wiki/Steam_Trade_Offer_API)

### Internal Documentation
- [Bot Configuration Guide](../docs/bot-configuration.md)
- [Environment Setup](../docs/environment-setup.md)
- [Security Guidelines](../docs/security-guidelines.md)

### Emergency Contacts
- **DevOps Team**: devops@example.com
- **Security Team**: security@example.com
- **Steam Integration Lead**: steam-lead@example.com

---

**Last Updated**: [Current Date]
**Next Review**: [30 days from last update]
**Approved By**: [Security Team Lead]