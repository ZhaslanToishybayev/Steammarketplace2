# WebSocket Real-Time Updates & E2E Testing Documentation

## Overview

This implementation adds comprehensive WebSocket real-time updates and E2E testing capabilities to the Steam Marketplace backend, enabling real-time trade status monitoring and automated testing with live Steam integration.

## WebSocket Real-Time Updates

### Architecture

The WebSocket system uses `@nestjs/websockets` and `socket.io` to provide real-time updates for trade events:

```
Frontend (Next.js) ↔ Socket.io Client ↔ WebSocket Gateway ↔ Trade Services
```

### Components

#### 1. Events Gateway (`events.gateway.ts`)
- **Location**: `apps/backend/src/modules/events/events.gateway.ts`
- **Purpose**: Central WebSocket server handling all real-time events
- **Features**:
  - JWT authentication via `WsJwtAuthGuard`
  - Room management (user rooms, trade rooms)
  - Event emission for trade lifecycle
  - Connection/disconnection handling

#### 2. WebSocket JWT Auth Guard (`ws-jwt-auth.guard.ts`)
- **Location**: `apps/backend/src/modules/events/guards/ws-jwt-auth.guard.ts`
- **Purpose**: Authenticates WebSocket connections using JWT tokens
- **Features**:
  - Token extraction from socket handshake
  - User payload attachment to socket data
  - Error handling with descriptive messages

#### 3. Events Module (`events.module.ts`)
- **Location**: `apps/backend/src/modules/events/events.module.ts`
- **Purpose**: Encapsulates WebSocket functionality
- **Features**:
  - Imports JwtService and ConfigService
  - Exports EventsGateway for injection in other modules

### Configuration

#### Environment Variables (`.env.example`)
```bash
# WebSocket Configuration
WS_PORT=3001  # Same as backend PORT for unified server
WS_CORS_ORIGIN=http://localhost:3000,http://localhost:3001
WS_PATH=/socket.io  # Default Socket.io path
```

#### Frontend Configuration
```typescript
// .env.local
NEXT_PUBLIC_WS_URL=ws://localhost:3001

// Socket Provider
const socket = io(process.env.NEXT_PUBLIC_WS_URL, {
  auth: {
    token: localStorage.getItem('accessToken') || ''
  }
});
```

### Events Emitted

| Event | Description | Data |
|-------|-------------|------|
| `trade:sent` | Trade offer sent to bot | `{ tradeId, status, userId, offerId }` |
| `trade:accepted` | Trade accepted by bot | `{ tradeId, status, userId, offerId }` |
| `trade:completed` | Trade completed successfully | `{ tradeId, status, userId }` |
| `trade:declined` | Trade declined by bot/user | `{ tradeId, status, userId, reason }` |
| `trade:failed` | Trade failed due to error | `{ tradeId, status, userId, errorMessage }` |
| `trade:update` | General trade status update | `{ tradeId, status, userId, metadata }` |
| `balance:updated` | User balance changed | `{ userId, newBalance, change }` |
| `inventory:updated` | User inventory changed | `{ userId, newItems, removedItems }` |
| `notification` | General notifications | `{ userId, message, type }` |

### Room Management

- **User Rooms**: `user:{userId}` - All events for specific user
- **Trade Rooms**: `trade:{tradeId}` - Events for specific trade
- **Global Events**: Broadcast to all connected clients

### Integration Points

#### Trade Service Integration
```typescript
// In TradeService methods
this.eventsGateway.emitTradeSent(tradeId, {
  tradeId,
  status: TradeStatus.SENT,
  userId: trade.userId,
  offerId: tradeOfferId
});
```

#### Trade Polling Processor Integration
```typescript
// In TradePollingProcessor
this.eventsGateway.emitTradeAccepted(trade.id, {
  tradeId: trade.id,
  status: TradeStatus.ACCEPTED,
  userId: trade.userId
});
```

## E2E Testing with Live Steam Integration

### Test Suite Overview

The comprehensive E2E test suite (`03-real-e2e-trading.spec.ts`) validates the complete trading flow with real Steam APIs:

1. **Steam OAuth Login** → User authentication via Steam
2. **Inventory Sync** → Real-time inventory fetching from Steam
3. **Trade Creation** → Trade offer creation with real items
4. **Bot Acceptance** → Real bot acceptance using Steam credentials
5. **Mobile Auth Confirmation** → Steam Guard confirmation flow
6. **Trade Completion** → Final trade status verification
7. **WebSocket Events** → Real-time event monitoring

### Configuration

#### Live Test Configuration (`live-test-config.ts`)
```typescript
export const liveTestConfig = {
  // Application URLs
  baseUrl: 'https://staging.example.com',
  apiUrl: 'https://staging-api.example.com/api',
  wsUrl: 'ws://localhost:3001',

  // Steam API credentials
  steam: {
    testUser: {
      steamId: process.env.TEST_USER_STEAM_ID,
      tradeUrl: process.env.TEST_USER_TRADE_URL,
    },
    testBot: {
      steamId: process.env.TEST_BOT_STEAM_ID,
      sharedSecret: process.env.TEST_BOT_SHARED_SECRET,
      identitySecret: process.env.TEST_BOT_IDENTITY_SECRET,
      tradeUrl: process.env.TEST_BOT_TRADE_URL,
      password: process.env.TEST_BOT_PASSWORD,
    }
  },

  // Timeout configurations
  timeouts: {
    tradePolling: 300000,  // 5 minutes for full trade cycle
    confirmation: 60000,   // 1 minute for Mobile Auth
  },

  // Logging
  logging: {
    enableVerbose: true,
    logWebSocketEvents: true,
    logTradeStatusChanges: true,
  }
};
```

#### Required Environment Variables
```bash
# Enable live tests
ENABLE_LIVE_TESTS=true
NODE_ENV=staging

# Steam API
STEAM_API_KEY=your-real-steam-api-key

# Test User
TEST_USER_STEAM_ID=76561198012345678
TEST_USER_TRADE_URL=https://steamcommunity.com/tradeoffer/new/?partner=76561198012345678&token=abcdef

# Test Bot
TEST_BOT_USERNAME=testbot123
TEST_BOT_PASSWORD=botpassword123
TEST_BOT_STEAM_ID=76561198087654321
TEST_BOT_SHARED_SECRET=your28charbotsharedsecret==
TEST_BOT_IDENTITY_SECRET=your28charbotidentitysecret==
TEST_BOT_TRADE_URL=https://steamcommunity.com/tradeoffer/new/?partner=76561198087654321&token=ghijkl
TEST_BOT_API_KEY=your-bot-steam-api-key

# Database
POSTGRES_HOST=localhost
POSTGRES_DB=steam_marketplace_staging
# ... other DB configs

# WebSocket
LIVE_TEST_WS_URL=ws://localhost:3001
```

### Test Execution

#### NPM Scripts
```json
{
  "test:e2e:live": "NODE_ENV=staging ENABLE_LIVE_TESTS=true playwright test tests/e2e/live/03-real-e2e-trading.spec.ts --project=chromium",
  "test:e2e:live:debug": "NODE_ENV=staging ENABLE_LIVE_TESTS=true playwright test tests/e2e/live/03-real-e2e-trading.spec.ts --project=chromium --debug"
}
```

#### Running Tests
```bash
# Run live E2E tests
npm run test:e2e:live

# Run with debug mode
npm run test:e2e:live:debug

# Run specific test
npm run test:e2e:live -- --grep "Complete trade flow"
```

### Test Scenarios

#### 1. Complete Trade Flow Test
- **Duration**: 5 minutes (configurable)
- **Steps**:
  1. Steam OAuth login (using pre-authenticated storage state)
  2. Inventory sync from Steam
  3. Select low-value item for trade
  4. Create trade offer with bot
  5. Monitor trade status changes (pending → sent → accepted → completed)
  6. Verify WebSocket events received
  7. Validate final trade status

#### 2. Mobile Auth Confirmation Test
- **Duration**: 1 minute
- **Purpose**: Verify Steam Guard confirmation flow
- **Validation**: Monitor backend logs for confirmation attempts

#### 3. WebSocket Events Test
- **Purpose**: Verify real-time event emission
- **Events Monitored**: `trade:sent`, `trade:accepted`, `trade:completed`
- **Validation**: Event order and payload correctness

#### 4. Error Handling Test
- **Scenarios**:
  - Invalid trade URLs
  - Bot offline simulation
  - Steam API timeouts
- **Validation**: Proper error messages and retry logic

### Monitoring & Debugging

#### Backend Logs
```bash
# View backend logs
make logs-backend

# Filter for trade events
make logs-backend | grep -i "trade\|websocket\|steam"

# Monitor specific trade
make logs-backend | grep "tradeId:abc123"
```

#### Frontend Console
```javascript
// Monitor WebSocket events in browser console
window.socketEvents.forEach(event => {
  console.log(`${event.timestamp}: ${event.event} - ${JSON.stringify(event.data)}`);
});
```

#### Redis Monitoring
```bash
# Check Bull queues
redis-cli -n 2 KEYS 'bull:trade-*'

# Monitor WebSocket connections
redis-cli PUBSUB NUMSUB trade-updates
```

### Safety Features

#### Test Limits
- **Max trades per test**: 1 (conservative)
- **Max inventory syncs**: 1
- **Test duration**: 30 minutes maximum
- **Low-value items only**: Prevents expensive test trades

#### Cleanup
- **Auto-cleanup**: Pending trades cancelled after tests
- **Bot release**: Bots released from trades
- **Session cleanup**: WebSocket connections cleaned up

### CI/CD Integration

#### GitHub Actions Example
```yaml
- name: Run Live E2E Tests
  if: github.ref == 'refs/heads/staging'
  run: |
    npm run test:e2e:live
  env:
    ENABLE_LIVE_TESTS: true
    NODE_ENV: staging
    STEAM_API_KEY: ${{ secrets.STEAM_API_KEY }}
    # ... other secrets
  timeout-minutes: 30
```

#### Artifact Collection
- **Playwright traces**: `test-trace-*.zip`
- **Screenshots**: Failed test screenshots
- **Logs**: Backend and frontend logs
- **Network traces**: HTTP/WS traffic logs

## Troubleshooting

### Common Issues

#### 1. WebSocket Connection Failures
**Symptoms**: Frontend shows "Socket disconnected"
**Causes**:
- Invalid JWT token
- CORS misconfiguration
- Backend not running
- Network issues

**Solutions**:
```bash
# Check JWT token
localStorage.getItem('accessToken')

# Verify CORS configuration
curl -I -H "Origin: http://localhost:3000" http://localhost:3001

# Test WebSocket connection
node -e "
const io = require('socket.io-client');
const socket = io('ws://localhost:3001', { auth: { token: 'YOUR_TOKEN' } });
socket.on('connect', () => console.log('Connected'));
socket.on('connect_error', (err) => console.error('Error:', err));
"
```

#### 2. Bot Login Failures
**Symptoms**: Bot status stuck on "Offline"
**Causes**:
- Invalid credentials
- Steam Guard issues
- Network connectivity
- Bot already logged in elsewhere

**Solutions**:
```bash
# Check bot status
curl http://localhost:3001/api/admin/bots

# Verify bot credentials in admin panel
# Check backend logs for login errors
make logs-backend | grep -i "bot.*login.*error"
```

#### 3. Trade Polling Not Working
**Symptoms**: Trade status not updating
**Causes**:
- Polling scheduler disabled
- Bull queue issues
- Steam API rate limits
- Bot session expired

**Solutions**:
```bash
# Check polling scheduler
make logs-backend | grep "pollActiveTrades"

# Restart Bull queues
make restart

# Check Redis queues
redis-cli -n 2 LLEN "bull:trade-polling:wait"
```

#### 4. Mobile Auth Confirmation Failures
**Symptoms**: Trade stuck in "CreatedNeedsConfirmation"
**Causes**:
- Invalid identitySecret
- Steam Guard not enabled
- Confirmation already processed

**Solutions**:
```bash
# Verify identitySecret format (28 characters, base64)
echo $TEST_BOT_IDENTITY_SECRET | wc -c

# Check Steam confirmations manually
# Enable Mobile Authenticator on bot account
```

### Debug Commands

#### Backend Diagnostics
```bash
# Check bot status
curl http://localhost:3001/api/admin/bots

# Check trade status
curl http://localhost:3001/api/trades/{tradeId}

# View backend logs
make logs-backend | grep -i error

# Check Bull queue jobs
redis-cli -n 2 KEYS 'bull:trade-*'
```

#### Frontend Diagnostics
```javascript
// Test WebSocket connection
const socket = io('ws://localhost:3001', {
  auth: { token: localStorage.getItem('accessToken') }
});

// Monitor events
socket.on('trade:sent', console.log);
socket.on('trade:accepted', console.log);
socket.on('trade:completed', console.log);

// Check connection status
console.log('Socket connected:', socket.connected);
console.log('Socket disconnected:', socket.disconnected);
```

#### Network Diagnostics
```bash
# Test Steam API connectivity
curl "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=$STEAM_API_KEY&steamids=$STEAM_ID"

# Check trade URL validity
curl -I "$TEST_BOT_TRADE_URL"

# Test WebSocket with wscat
wscat -c ws://localhost:3001/socket.io/?EIO=4&transport=websocket
```

### Getting Help

1. **Check Logs First**: Always start with backend and frontend logs
2. **Enable Debug Logging**: Set `LOG_LEVEL=debug` in environment
3. **Save Traces**: For E2E test failures, save Playwright traces
4. **Check Steam Status**: Verify Steam API status at https://steamstat.us/
5. **Review Credentials**: Double-check all Steam credentials in admin panel
6. **Contact Support**: Provide trade ID, bot ID, error logs, and timestamps

## Best Practices

### Development
- Use low-value test items (< $1)
- Limit test frequency (max 5 trades/hour)
- Monitor bot balance and health
- Clean up pending trades after tests

### Production
- Monitor WebSocket connection counts
- Set up alerts for bot offline status
- Implement circuit breakers for Steam API
- Use rate limiting for trade creation

### Security
- Never commit real Steam credentials
- Use environment variables for all secrets
- Enable Steam Guard on all bot accounts
- Regularly rotate bot credentials

This comprehensive implementation provides robust WebSocket real-time updates and thorough E2E testing capabilities, ensuring reliable Steam marketplace operations with live Steam integration.