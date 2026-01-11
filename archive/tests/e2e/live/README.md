# Live E2E Tests

This directory contains live end-to-end tests that interact with real Steam APIs and bot accounts. These tests are designed to validate the complete integration flow in a staging environment.

## 🚨 Important Warning

**These tests make real API calls to Steam and can perform actual trades. They should ONLY be run in dedicated staging environments with test accounts.**

## Overview

The live test suite includes:

- **Steam OAuth Authentication**: Tests real Steam login flow
- **Inventory Sync**: Fetches actual items from Steam inventories
- **Trade Execution**: Creates and processes real trade offers with full lifecycle
- **Mobile Auth Confirmation**: Validates Steam Guard confirmation flow
- **WebSocket Real-time Updates**: Tests live event emission and client updates
- **Price Updates**: Monitors real-time price changes from Steam Market
- **Bot Connectivity**: Validates bot status and functionality

## 🆕 New Test Suite: Complete E2E Flow

### `04-complete-e2e-flow.spec.ts` - Ultimate Integration Testing

The Complete E2E Flow Test provides comprehensive validation of the entire Steam Marketplace user journey, integrating all major features into a single cohesive test. This test serves as the ultimate validation of system integration and user experience quality.

#### Test Coverage

**Phase 1: Steam Authentication Flow**
- Real Steam OAuth login with actual Steam APIs
- Trade URL validation and setup
- Session persistence verification
- JWT token management

**Phase 2: Inventory Management**
- Live inventory sync from Steam API (CS:GO, Dota 2, TF2, Rust)
- Item metadata validation (prices, rarity, float values)
- Filtering and search functionality
- Pagination for large inventories

**Phase 3: Market Browsing**
- Real-time market data from Steam Market, CSGOFloat, Buff163
- Price sorting and filtering
- Item detail views with price history
- Category-based navigation

**Phase 4: Trade Creation & Bot Handling**
- Item selection from inventory
- Bot assignment and trade offer creation
- Trade status progression monitoring (PENDING → SENT → ACCEPTED → COMPLETED)
- Mobile Auth confirmation via Steam Guard
- WebSocket real-time status updates

**Phase 5: Wallet Operations**
- Balance verification and transaction history
- Deposit and withdrawal workflows
- Insufficient balance error handling
- Real-time balance updates after trades

**Phase 6: Admin Dashboard**
- Admin authentication and dashboard access
- System metrics monitoring (users, trades, revenue)
- Bot management and status verification
- User management and audit logs

**Phase 7: Real-time Updates**
- WebSocket connection establishment and stability
- Live trade status updates
- Price change notifications
- Balance and inventory updates

**Phase 8: Error Scenarios**
- Invalid trade URL handling
- Insufficient balance scenarios
- Bot offline detection
- Network failure recovery
- Rate limiting responses
- Session expiration handling

**Phase 9: Log Monitoring**
- Backend log collection during test execution
- Error detection and analysis
- Performance bottleneck identification
- Trade lifecycle logging verification

**Phase 10: Performance Monitoring**
- Page load time validation (< 3 seconds average)
- API response time monitoring (< 1 second average)
- Trade completion time tracking (< 5 minutes)
- Memory usage monitoring
- Network request optimization

#### Features Tested
- ✅ Steam OAuth login with real Steam accounts
- ✅ Real-time inventory sync from Steam
- ✅ Trade creation with actual Steam items
- ✅ Bot acceptance using real Steam bot credentials
- ✅ Mobile Auth confirmation via Steam Guard
- ✅ Trade completion and status updates
- ✅ WebSocket real-time event emission
- ✅ Error handling and retry logic
- ✅ Performance monitoring and threshold validation
- ✅ Comprehensive log analysis
- ✅ Admin dashboard functionality
- ✅ Wallet operations and balance tracking
- ✅ Market browsing with live pricing
- ✅ System health monitoring

#### Monitoring and Reporting

The complete E2E test includes advanced monitoring capabilities:

- **Real-time Log Collection**: Captures backend logs during execution
- **Performance Metrics**: Tracks page load times, API response times, memory usage
- **Error Pattern Detection**: Automatically identifies error patterns and anomalies
- **System Health Monitoring**: Monitors database connections, bot status, WebSocket connectivity
- **Comprehensive Reporting**: Generates HTML and JSON reports with detailed analysis

#### Test Duration
- **Execution Time**: 15-20 minutes
- **Setup Time**: 5 minutes
- **Cleanup Time**: 2 minutes
- **Total Time**: 22-27 minutes

### `03-real-e2e-trading.spec.ts` - Comprehensive Trade Flow Testing

A comprehensive test suite that validates the complete trading flow from Steam login through trade completion with real-time WebSocket updates:

#### Test Scenarios

1. **Complete Trade Flow Test**
   - Steam OAuth login using pre-authenticated storage
   - Real-time inventory sync from Steam
   - Trade creation with actual Steam items
   - Bot acceptance using real Steam credentials
   - Mobile Auth confirmation via Steam Guard
   - Trade completion verification
   - WebSocket event monitoring

2. **Mobile Auth Confirmation Test**
   - Validates Steam Guard confirmation flow
   - Monitors backend logs for confirmation attempts
   - Verifies trade progresses past "sent" status

3. **WebSocket Events Test**
   - Tests real-time event emission during trade lifecycle
   - Verifies event order and payload correctness
   - Validates room subscriptions (user rooms, trade rooms)

4. **Error Handling Test**
   - Invalid trade URL handling
   - Bot offline simulation
   - Steam API timeout scenarios
   - Proper error message validation

## Prerequisites

### Environment Variables

All credentials must be set as environment variables:

```bash
# Enable live testing
export NODE_ENV=staging
export ENABLE_LIVE_TESTS=true

# Application URLs
export LIVE_TEST_BASE_URL=https://staging.example.com
export LIVE_TEST_API_URL=https://staging-api.example.com/api
export LIVE_TEST_WS_URL=ws://localhost:3001

# Steam API credentials
export STEAM_API_KEY=your_steam_api_key
export TEST_USER_STEAM_ID=76561198012345678
export TEST_USER_USERNAME=testuser123
export TEST_USER_DISPLAY_NAME="Test User"
export TEST_USER_TRADE_URL=https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=abcdefg
export TEST_USER_API_KEY=user_steam_api_key

# Test bot credentials
export TEST_BOT_STEAM_ID=76561198087654321
export TEST_BOT_USERNAME=testbot123
export TEST_BOT_PASSWORD=botpassword123
export TEST_BOT_SHARED_SECRET=your28charbotsharedsecret==
export TEST_BOT_IDENTITY_SECRET=your28charbotidentitysecret==
export TEST_BOT_TRADE_URL=https://steamcommunity.com/tradeoffer/new/?partner=987654321&token=hijklmn
export TEST_BOT_API_KEY=bot_steam_api_key
export TEST_BOT_ID=bot_backend_id

# Bot configuration
export BOT_ENCRYPTION_KEY=your_bot_encryption_key
```

### Test Accounts

#### Test User Account
- Dedicated Steam account with minimal-value items (< $1)
- 2FA enabled with backup codes
- Valid trade URL configured
- Privacy settings allow inventory access
- Steam API key for market data access

#### Test Bot Account
- Dedicated Steam bot account with items for trading
- Mobile authenticator configured with valid secrets
- Shared and identity secrets generated (28 characters, base64)
- Trade URL set up for receiving offers
- Configured in backend with proper credentials
- Steam API key for trade operations

## Running Tests

### Prerequisites Check
```bash
# Validate environment configuration
node -e "require('./tests/e2e/live/live-test-config.ts').validateLiveTestConfig(require('./tests/e2e/live/live-test-config.ts').default)"

# Validate specific credentials
node -e "console.log('Bot creds missing:', require('./tests/e2e/live/live-test-config.ts').validateBotCredentials())"
node -e "console.log('User creds missing:', require('./tests/e2e/live/live-test-config.ts').validateUserCredentials())"
```

### Execute Tests
```bash
# Run complete E2E flow test (recommended)
npm run test:e2e:live:complete

# Run complete E2E flow test with visible browser
npm run test:e2e:live:complete:headed

# Run complete E2E flow test in debug mode
npm run test:e2e:live:complete:debug

# Run all live tests
npm run test:e2e:live:all

# Run specific test files
npx playwright test tests/e2e/live/04-complete-e2e-flow.spec.ts
npx playwright test tests/e2e/live/03-real-e2e-trading.spec.ts

# Run with debugging
npx playwright test tests/e2e/live/ --debug

# Run with video recording
npx playwright test tests/e2e/live/ --video=on

# Run with trace recording
npx playwright test tests/e2e/live/ --trace=on

# Run with specific browser
npx playwright test tests/e2e/live/ --project=chromium
```

### Test Execution Limits
- **Maximum trade value**: $10 USD (complete E2E test)
- **Maximum items per trade**: 3 (complete E2E test)
- **Daily trade limit**: 10 trades maximum
- **Test duration**: 30 minutes maximum
- **Trade timeout**: 5 minutes for full cycle
- **Confirmation timeout**: 1 minute for Mobile Auth

## Test Structure

### Configuration
- `live-test-config.ts` - Enhanced configuration with real credentials validation
- `03-real-e2e-trading.spec.ts` - Comprehensive trade flow test suite

### Test Files
- `01-live-steam-integration.spec.ts` - Basic Steam integration tests
- `02-live-minimal-flow.spec.ts` - Minimal flow validation
- `03-real-e2e-trading.spec.ts` - Complete trade flow with WebSocket testing
- `04-complete-e2e-flow.spec.ts` - **NEW**: Ultimate integration test with comprehensive monitoring

### Documentation
- `../manual/live-testing-checklist.md` - Comprehensive testing checklist
- `../manual/complete-e2e-checklist.md` - Complete E2E flow testing checklist
- `../../WEBSOCKET_E2E_DOCS.md` - Detailed WebSocket and E2E documentation

## Expected Behavior

### Successful Test Indicators
- ✅ Steam OAuth redirects work correctly
- ✅ Real Steam inventory is fetched with actual items
- ✅ Bot shows as online and available for trading
- ✅ Trade offer is created and sent successfully
- ✅ Bot accepts trade offer automatically
- ✅ Mobile Auth confirmation occurs (if required)
- ✅ Trade completes with proper status updates
- ✅ WebSocket events emitted for each status change
- ✅ Frontend receives real-time updates
- ✅ Price updates reflect actual market data
- ✅ WebSocket connections establish and maintain
- ✅ Performance thresholds are met (page load < 3s, API response < 1s)
- ✅ Error scenarios are handled gracefully
- ✅ Admin dashboard shows correct system metrics
- ✅ Wallet operations complete successfully
- ✅ Log monitoring shows no critical errors

### WebSocket Events Monitored
- `trade:sent` - Trade offer sent to bot
- `trade:accepted` - Trade accepted by bot
- `trade:completed` - Trade completed successfully
- `trade:declined` - Trade declined by bot/user
- `trade:failed` - Trade failed with error details
- `trade:update` - General trade status updates

### Safety Features
- Automatic test timeouts prevent hanging
- Trade value limits prevent expensive test trades
- Account activity monitoring for security
- Emergency stop procedures for issues
- Auto-cleanup of pending trades after tests
- Bot release from trades after completion
- Comprehensive error recovery mechanisms
- System health monitoring with alerts

## Troubleshooting

### Common Issues

#### WebSocket Connection Failures
```bash
# Check WebSocket URL configuration
echo "WS_URL: $LIVE_TEST_WS_URL"

# Test WebSocket connection manually
node -e "
const io = require('socket.io-client');
const socket = io('$LIVE_TEST_WS_URL', { auth: { token: 'YOUR_JWT_TOKEN' } });
socket.on('connect', () => console.log('✅ WebSocket connected'));
socket.on('connect_error', (err) => console.error('❌ WebSocket error:', err));
socket.on('auth:error', (err) => console.error('❌ Auth error:', err));
setTimeout(() => socket.close(), 5000);
"
```

#### Bot Login Failures
```bash
# Check bot credentials format
echo "Shared secret length: ${#TEST_BOT_SHARED_SECRET}"
echo "Identity secret length: ${#TEST_BOT_IDENTITY_SECRET}"

# Verify bot status via API
curl "${LIVE_TEST_API_URL}/admin/bots" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json"

# Check backend logs for bot login errors
docker-compose logs backend | grep -i "bot.*login.*error"
```

#### Trade Polling Issues
```bash
# Check Bull queue status
redis-cli -n 2 LLEN "bull:trade-polling:wait"
redis-cli -n 2 LLEN "bull:trade-polling:active"

# Monitor polling scheduler
docker-compose logs backend | grep -i "pollActiveTrades"
```

#### Mobile Auth Confirmation Failures
```bash
# Verify identitySecret format (must be 28 characters, base64)
echo "$TEST_BOT_IDENTITY_SECRET" | wc -c

# Check Steam Guard status on bot account
# Manual verification required via Steam Mobile App
```

### Debug Mode
```bash
# Enable verbose logging
export DEBUG=*
export PLAYWRIGHT_DEBUG=1
export LOG_LEVEL=debug

# Run with browser visible
npx playwright test tests/e2e/live/03-real-e2e-trading.spec.ts --headed

# Save test traces for debugging
npx playwright test tests/e2e/live/03-real-e2e-trading.spec.ts --trace=on

# View trace after test
npx playwright show-trace trace.zip
```

### Monitoring WebSocket Events
```javascript
// In browser console during test
window.socketEvents = [];
const socket = io('ws://localhost:3001', {
  auth: { token: localStorage.getItem('accessToken') }
});

socket.on('trade:sent', (data) => {
  window.socketEvents.push({ event: 'trade:sent', data, timestamp: new Date() });
  console.log('📡 Trade sent:', data);
});

socket.on('trade:accepted', (data) => {
  window.socketEvents.push({ event: 'trade:accepted', data, timestamp: new Date() });
  console.log('📡 Trade accepted:', data);
});

// View all events after test
console.log('All events:', window.socketEvents);
```

## Security Considerations

### Credential Management
- Never commit credentials to version control
- Use environment variables only
- Rotate credentials regularly (monthly)
- Limit access to essential personnel
- Store secrets in secure vaults/CI systems

### Account Safety
- Use accounts with minimal-value items only
- Enable 2FA on all test accounts
- Monitor account activity daily
- Set up alerts for unusual activity
- Keep backup codes secure
- Use separate accounts for different test environments

### Environment Isolation
- Dedicated staging environment only
- Isolated network configuration
- Separate database instances
- No production data access
- Restricted external API access

### Monitoring and Alerts

#### Key Metrics to Monitor
- Test execution success rate (> 90% expected)
- Steam API response times (< 5s average)
- Bot connectivity status (online 99% of time)
- Trade execution times (< 2 minutes)
- WebSocket connection success rate (> 95%)
- Error rates by endpoint
- Page load times (< 3 seconds average)
- API response times (< 1 second average)
- System memory usage (< 500MB peak)
- Database connection health

#### Alert Conditions
- Test failure rate > 10%
- API response time > 30s
- Bot offline for > 5 minutes
- Trade execution failure
- Authentication errors > 3 per hour
- WebSocket connection failures > 5 per hour
- Performance threshold violations > 5
- Critical errors > 0
- Memory usage > 800MB
- Database connection failures

## Maintenance

### Regular Tasks
- [ ] Rotate test account credentials monthly
- [ ] Validate Steam API compatibility weekly
- [ ] Update test timeouts based on performance
- [ ] Clean up test environment resources daily
- [ ] Review and update test data weekly
- [ ] Monitor bot account health daily
- [ ] Check WebSocket connection metrics hourly
- [ ] Review performance metrics and thresholds weekly
- [ ] Validate monitoring and alerting systems weekly
- [ ] Update test scripts based on application changes
- [ ] Review and update error scenario coverage monthly
- [ ] Validate reporting and artifact generation monthly

### Account Management
- [ ] Monitor test account balances weekly
- [ ] Verify bot account status weekly
- [ ] Update Steam Guard codes as needed
- [ ] Review and clean up test items monthly
- [ ] Validate trade URLs monthly
- [ ] Check bot credential expiration dates
- [ ] Monitor account activity for security issues
- [ ] Validate 2FA configurations regularly

## Emergency Procedures

### Test Account Issues
1. **Lock suspicious activity**: Use Steam's account recovery
2. **Disable bot temporarily**: Deactivate in backend admin panel
3. **Rotate credentials**: Update all secrets and keys immediately
4. **Review logs**: Check for security breaches in backend logs
5. **Notify team**: Alert development team of security issues

### Environment Issues
1. **Stop all tests**: Kill test processes immediately
2. **Isolate environment**: Block external access
3. **Investigate**: Review system logs and metrics
4. **Recover**: Restore from known good state
5. **Validate**: Run health checks before resuming

### Data Issues
1. **Stop data modifications**: Pause all write operations
2. **Assess damage**: Compare against known good state
3. **Restore if needed**: Use database snapshots
4. **Validate integrity**: Run consistency checks
5. **Notify stakeholders**: Report data issues immediately

## Contributing

### Adding New Tests
1. Follow existing test patterns and naming conventions
2. Include proper error handling and cleanup
3. Add appropriate timeouts for live API calls
4. Document any new credentials needed
5. Update this README and checklist
6. Test thoroughly in isolated environment first

### Test Guidelines
- Use descriptive test names that explain the scenario
- Include proper cleanup in afterEach hooks
- Add appropriate assertions for success and failure cases
- Document expected behavior and edge cases
- Include error recovery steps
- Add WebSocket event validation where applicable

### WebSocket Testing Guidelines
- Always validate WebSocket connection establishment
- Test event emission and reception
- Verify event payload correctness
- Test room subscription/unsubscription
- Include reconnection testing
- Monitor connection stability

## Resources

### Steam API Documentation
- [Steam Web API](https://developer.valvesoftware.com/wiki/Steam_Web_API)
- [Trade Offer API](https://developer.valvesoftware.com/wiki/Steam_Trade_Offer_API)
- [Steam Guard Mobile Authenticator](https://support.steampowered.com/kb_article.php?ref=5608-FHFH-3930)

### Playwright Documentation
- [Playwright Test](https://playwright.dev/docs/test-intro)
- [API Testing](https://playwright.dev/docs/api-testing)
- [WebSocket Testing](https://playwright.dev/docs/test-web-sockets)

### Socket.io Documentation
- [Socket.io Client](https://socket.io/docs/v4/client-api/)
- [WebSocket Authentication](https://socket.io/docs/v4/middle-ware/)

### Internal Documentation
- [WebSocket Implementation](../../WEBSOCKET_E2E_DOCS.md)
- [Bot Configuration](../../docs/bot-configuration.md)
- [Security Guidelines](../../docs/security-guidelines.md)
- [Environment Setup](../../docs/environment-setup.md)

---

**⚠️ Remember: These tests interact with real Steam accounts and APIs. Always exercise caution and follow security best practices.**

**🆕 The new `03-real-e2e-trading.spec.ts` provides comprehensive testing of the complete trading flow with real-time WebSocket updates. This is the primary test suite for validating live Steam integration.**