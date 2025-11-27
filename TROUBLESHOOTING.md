# Steam Marketplace Troubleshooting Guide

## Overview

This comprehensive troubleshooting guide helps developers and operators diagnose and resolve common issues with the Steam Marketplace system, particularly focusing on WebSocket real-time updates and E2E testing with live Steam integration.

## Quick Start

### 1. Check System Health
```bash
# Check all services
make health-check

# View service logs
make logs-backend
make logs-frontend
make logs-database

# Check WebSocket connections
curl http://localhost:3001/socket.io/health
```

### 2. Verify Configuration
```bash
# Check environment variables
make env-check

# Validate Steam credentials
node -e "require('./tests/e2e/live/live-test-config.ts').validateLiveTestConfig(require('./tests/e2e/live/live-test-config.ts').default)"
```

### 3. Test Core Functionality
```bash
# Run basic health checks
npm run test:backend:health
npm run test:frontend:health

# Test WebSocket connectivity
node scripts/test-websocket.js
```

## 🔍 System Verification Issues

This section covers troubleshooting for the Complete System Integration Verification framework.

### System Verification Script Failures

**Symptom**: `npm run verify:system` fails with errors

**Common Causes and Solutions:**

#### 1. Environment & Infrastructure Failures
```bash
# Check Docker services
docker-compose ps
docker-compose logs postgres mongodb redis

# Verify ports are available
lsof -i :3000 -i :3001 -i :5432 -i :27017 -i :6379

# Validate environment variables
npm run validate:env
```

**Fix Docker Issues:**
```bash
# Restart all services
npm run docker:down
npm run docker:up
sleep 30  # Wait for services to start

# Check specific service health
curl http://localhost:3001/api/health
curl http://localhost:3000/
```

#### 2. Backend API Verification Failures
```bash
# Test API endpoints manually
curl -s http://localhost:3001/api/health | jq
curl -I http://localhost:3001/api/auth/steam

# Check backend logs
docker-compose logs backend

# Verify database connections
psql $DATABASE_URL -c "SELECT 1;"
mongo $MONGODB_URI --eval "db.runCommand({ping: 1})"
```

**Common Backend Issues:**
- **503 Service Unavailable**: Backend not started or crashed
- **500 Internal Server Error**: Database connection issues or configuration problems
- **401 Unauthorized**: JWT or authentication middleware issues
- **CORS errors**: Frontend-backend communication problems

#### 3. Database Seeding Problems
```bash
# Check table counts
psql $DATABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM item_prices;"

# Check MongoDB collections
mongo $MONGODB_URI --eval "db.items.count()"

# Re-run seeding if needed
npm run db:seed
```

**Seeding Issues:**
- **No items in database**: Steam API key invalid or seeding failed
- **Missing tables**: Database migrations not run
- **Orphaned data**: Foreign key constraint violations
- **Stale prices**: Price update jobs not running

#### 4. Steam Integration Errors
```bash
# Test Steam API connectivity
curl -s "https://api.steampowered.com/ISteamWebAPIUtil/GetServerInfo/v1/" | jq

# Validate Steam API key
echo "STEAM_API_KEY: ${STEAM_API_KEY:0:10}..."

# Check bot configuration
curl -s "http://localhost:3001/api/bots/status" -H "Authorization: Bearer $ADMIN_JWT"
```

**Steam Integration Issues:**
- **Invalid API key**: Obtain new key from Steam
- **OAuth redirect failures**: Check callback URLs in .env
- **Bot login failures**: Verify bot credentials and encryption
- **Inventory sync errors**: Check Steam profile privacy settings

#### 5. Frontend-Backend Integration Failures
```bash
# Test frontend server
curl -s http://localhost:3000 | head -5

# Test API proxy
curl -s http://localhost:3000/api/health | jq

# Check CORS headers
curl -I -H "Origin: http://localhost:3000" http://localhost:3001/api/health
```

**Integration Issues:**
- **Frontend not loading**: Next.js build or development server issues
- **API proxy failures**: Next.js config rewrites not working
- **CORS errors**: Frontend origin not in backend CORS allowlist
- **WebSocket connection failures**: Socket.io configuration issues

#### 6. Real-Time Features Failures
```bash
# Test WebSocket connection
wscat -c ws://localhost:3001

# Check Socket.io server
curl http://localhost:3001/socket.io/health

# Monitor real-time events
docker-compose logs backend | grep -i websocket
```

**WebSocket Issues:**
- **Connection refused**: WebSocket server not started
- **Authentication failures**: JWT token issues with WebSocket
- **Event not received**: Event emission/handling problems
- **Frequent disconnects**: Network or server configuration issues

#### 7. Performance Check Failures
```bash
# Test response times manually
time curl -s http://localhost:3001/api/health > /dev/null
time curl -s http://localhost:3000/ > /dev/null

# Check server resources
docker stats
free -h  # Memory usage
df -h     # Disk usage
```

**Performance Issues:**
- **Slow API responses**: Database query optimization needed
- **High memory usage**: Memory leaks or insufficient resources
- **High CPU usage**: Inefficient code or too much load
- **Database timeouts**: Connection pool or query issues

### Quick Diagnostic Commands

#### System Health Check
```bash
# Quick system status
echo "=== Docker Services ==="
docker-compose ps

echo "=== API Health ==="
curl -s http://localhost:3001/api/health | jq '.status'

echo "=== Frontend Status ==="
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/

echo "=== Database Connections ==="
psql $DATABASE_URL -c "SELECT 1;" && echo "PostgreSQL: OK"
mongo $MONGODB_URI --eval "db.runCommand({ping: 1})" && echo "MongoDB: OK"
redis-cli -u $REDIS_URL ping && echo "Redis: OK"
```

#### Individual Component Checks
```bash
# Backend only
npm run verify:api

# Steam integration only
npm run verify:steam

# Frontend-backend integration only
npm run verify:integration

# Database seeding only
npm run verify:seeding
```

#### Log Analysis
```bash
# View recent logs
docker-compose logs --tail=100 --since=10m backend frontend

# Search for errors
docker-compose logs backend | grep -i error
docker-compose logs frontend | grep -i error

# Monitor in real-time
docker-compose logs -f backend
```

### Common Error Patterns

#### Environment Variables Missing
```bash
Error: Environment variable not found: STEAM_API_KEY
# Solution: Set all required environment variables
cp apps/backend/.env.example apps/backend/.env
npm run validate:env -- --fix
```

#### Database Connection Failed
```bash
Error: Connection terminated unexpectedly
# Solution: Check database services and connection strings
docker-compose restart postgres mongodb
```

#### Port Already in Use
```bash
Error: listen EADDRINUSE: address already in use :::3001
# Solution: Kill conflicting processes
lsof -ti:3001 | xargs kill -9
```

#### CORS Policy Blocked
```bash
Access to fetch at 'http://localhost:3001/api/health' from origin 'http://localhost:3000' has been blocked by CORS policy
# Solution: Check CORS configuration in backend
```

#### WebSocket Connection Failed
```bash
Error: websocket error
# Solution: Check WebSocket server and network connectivity
```

### When to Use Manual vs Automated Verification

**Use Automated Verification (`npm run verify:system`) when:**
- Setting up a new environment
- Before production deployment
- After major changes
- Daily health checks

**Use Manual Verification when:**
- Automated tests fail and you need to debug
- Specific components need testing
- Custom scenarios not covered by automation
- Performance tuning and optimization

### Escalation Path

1. **Basic Issues** (Environment, Docker, Ports)
   - Check this troubleshooting guide
   - Run individual verification commands
   - Restart services

2. **Configuration Issues** (API keys, CORS, Auth)
   - Validate configuration files
   - Check environment variables
   - Test individual components

3. **Integration Issues** (Frontend-Backend, WebSocket)
   - Test components in isolation
   - Check network connectivity
   - Verify authentication setup

4. **Data Issues** (Database, Seeding, Migration)
   - Check database health
   - Re-run migrations/seeding
   - Validate data integrity

5. **Performance Issues** (Response times, Memory, CPU)
   - Monitor resource usage
   - Optimize queries and code
   - Scale infrastructure

For persistent issues, check the specific troubleshooting guides:
- [TROUBLESHOOTING_API.md](TROUBLESHOOTING_API.md)
- [TROUBLESHOOTING_STEAM_INTEGRATION.md](TROUBLESHOOTING_STEAM_INTEGRATION.md)

## WebSocket Connection Issues

### Symptom: Frontend shows "Socket disconnected" or "connect_error"

**Causes:**
- Invalid or expired JWT token
- CORS misconfiguration
- Backend not running or WebSocket server not started
- Network connectivity issues
- WebSocket server overload

**Solutions:**

#### 1. Check JWT Token
```javascript
// In browser console
console.log('JWT Token:', localStorage.getItem('accessToken'));
console.log('Token valid:', !!localStorage.getItem('accessToken'));

// Decode token to check expiration
const token = localStorage.getItem('accessToken');
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Token expires:', new Date(payload.exp * 1000));
  console.log('Current time:', new Date());
}
```

#### 2. Verify CORS Configuration
```bash
# Check backend CORS settings
curl -I -H "Origin: http://localhost:3000" http://localhost:3001

# Expected response headers:
# Access-Control-Allow-Origin: http://localhost:3000,http://localhost:3001
# Access-Control-Allow-Credentials: true
```

#### 3. Test WebSocket Connection
```bash
# Test WebSocket connection manually
node -e "
const io = require('socket.io-client');
const socket = io('ws://localhost:3001', {
  auth: { token: 'YOUR_JWT_TOKEN' },
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('✅ WebSocket connected');
  socket.close();
});

socket.on('connect_error', (error) => {
  console.error('❌ WebSocket connection error:', error.message);
});

socket.on('auth:error', (error) => {
  console.error('❌ Authentication error:', error);
});

setTimeout(() => {
  console.log('❌ WebSocket connection timeout');
  process.exit(1);
}, 5000);
"
```

#### 4. Check Backend WebSocket Server
```bash
# Verify WebSocket server is running
curl http://localhost:3001/api/health

# Check for WebSocket Gateway initialization
make logs-backend | grep -i "websocket\|gateway\|socket"

# Verify EventsModule is loaded
make logs-backend | grep -i "events.module\|events.gateway"
```

#### 5. Network and Firewall Issues
```bash
# Test basic connectivity
telnet localhost 3001

# Check if port is listening
netstat -tulpn | grep 3001

# Test with different transports
node -e "
const io = require('socket.io-client');
const socket = io('ws://localhost:3001', {
  transports: ['polling', 'websocket'],
  auth: { token: 'YOUR_JWT_TOKEN' }
});
"
```

## Bot Login Failures

### Symptom: Bot status stuck on "Offline", logs show "Login timeout" or "Steam user error"

**Causes:**
- Invalid bot credentials (username, password, sharedSecret, identitySecret)
- Steam Guard issues
- Network connectivity problems
- Bot already logged in elsewhere
- Steam API rate limiting
- Bot account restrictions

**Solutions:**

#### 1. Verify Bot Credentials
```bash
# Check bot credentials format
echo "Username: $TEST_BOT_USERNAME"
echo "Password length: ${#TEST_BOT_PASSWORD}"
echo "Shared secret length: ${#TEST_BOT_SHARED_SECRET} (should be 28)"
echo "Identity secret length: ${#TEST_BOT_IDENTITY_SECRET} (should be 28)"

# Validate base64 format
echo "$TEST_BOT_SHARED_SECRET" | base64 -d 2>/dev/null && echo "✅ Shared secret is valid base64"
echo "$TEST_BOT_IDENTITY_SECRET" | base64 -d 2>/dev/null && echo "✅ Identity secret is valid base64"
```

#### 2. Check Bot Status via API
```bash
# Get bot status
curl "http://localhost:3001/api/admin/bots" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json"

# Check specific bot
curl "http://localhost:3001/api/admin/bots/$BOT_ID" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json"
```

#### 3. Test Bot Login Manually
```bash
# Check Steam API connectivity
curl "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=$STEAM_API_KEY&steamids=$TEST_BOT_STEAM_ID"

# Test bot login via backend endpoint (if available)
curl "http://localhost:3001/api/admin/bots/$BOT_ID/login" \
  -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json"
```

#### 4. Check Backend Logs
```bash
# Monitor bot login attempts
make logs-backend | grep -i "bot.*login\|steam.*user.*error\|login.*timeout"

# Look for specific bot errors
make logs-backend | grep -i "$BOT_ID"

# Check Steam Guard challenges
make logs-backend | grep -i "steam.*guard\|two.*factor"
```

#### 5. Bot Account Issues
```bash
# Check if bot is already logged in elsewhere
# This requires manual verification via Steam client

# Verify bot has Mobile Authenticator
# Check Steam Mobile App for the bot account

# Ensure bot has valid trade URL
echo "Bot trade URL: $TEST_BOT_TRADE_URL"
echo "$TEST_BOT_TRADE_URL" | grep -E "^https://steamcommunity\.com/tradeoffer/new/\?partner=[0-9]+&token=[a-zA-Z0-9_-]+$" && echo "✅ Valid trade URL format"
```

## Trade Offer Not Sent

### Symptom: Trade stuck in "pending", no trade offer ID, logs show "Failed to send trade offer"

**Causes:**
- Bot offline or not available
- Invalid trade URL format
- Steam API rate limits exceeded
- Item ownership issues
- Bot session expired
- Insufficient bot balance

**Solutions:**

#### 1. Verify Bot Status
```bash
# Check bot availability
curl "http://localhost:3001/api/admin/bots" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" | jq '.data.bots[] | select(.id == "'"$BOT_ID"'")'

# Look for: isOnline: true, status: "Idle", isActive: true
```

#### 2. Validate Trade URL
```bash
# Test trade URL format
echo "Trade URL: $USER_TRADE_URL"
echo "$USER_TRADE_URL" | grep -E "^https://steamcommunity\.com/tradeoffer/new/\?partner=[0-9]+&token=[a-zA-Z0-9_-]+$" && echo "✅ Valid trade URL format"

# Test trade URL accessibility
curl -I "$USER_TRADE_URL" | head -1
```

#### 3. Check Steam API Rate Limits
```bash
# Monitor API calls
make logs-backend | grep -i "rate.*limit\|too.*many.*requests\|429"

# Check Steam API response times
make logs-backend | grep -i "steam.*api.*response\|api.*timeout"
```

#### 4. Verify Item Ownership
```bash
# Check user inventory
curl "http://localhost:3001/api/inventory" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json"

# Verify items exist and are tradable
# Check item metadata for tradable status
```

#### 5. Check Bot Session
```bash
# Look for session errors in logs
make logs-backend | grep -i "session.*expired\|bot.*session\|steam.*session"

# Check bot login timestamp
# Sessions typically last 24 hours
```

## Mobile Auth Confirmation Fails

### Symptom: Trade stuck in "sent" with "CreatedNeedsConfirmation", logs show "Failed to confirm trade offer"

**Causes:**
- Invalid identitySecret
- Steam Guard not enabled on bot account
- Confirmation already accepted/declined
- Bot session expired
- Steam API issues

**Solutions:**

#### 1. Verify identitySecret
```bash
# Check identitySecret format and length
echo "Identity secret: $TEST_BOT_IDENTITY_SECRET"
echo "Length: ${#TEST_BOT_IDENTITY_SECRET} (should be 28)"
echo "$TEST_BOT_IDENTITY_SECRET" | base64 -d 2>/dev/null && echo "✅ Valid base64 format"

# Test identity code generation
node -e "
const SteamTotp = require('steam-totp');
const code = SteamTotp.generateAuthCode('$TEST_BOT_IDENTITY_SECRET');
console.log('Generated identity code:', code);
console.log('Code length:', code.length);
"
```

#### 2. Check Steam Guard Status
```bash
# Manual verification required
# Log in to bot account via Steam Mobile App
# Verify Mobile Authenticator is active
# Check for any pending confirmations
```

#### 3. Monitor Confirmation Attempts
```bash
# Check backend logs for confirmation attempts
make logs-backend | grep -i "confirm.*trade.*offer\|identity.*secret\|steam.*guard"

# Look for confirmation success/failure
make logs-backend | grep -i "confirmation.*success\|confirmation.*failed"
```

#### 4. Test Confirmation Manually
```bash
# If possible, manually confirm via Steam Mobile App
# Check bot account for pending confirmations
# Verify the trade offer appears in Steam confirmation queue
```

## Trade Polling Not Updating

### Symptom: Trade status not changing, no WebSocket events, polling logs missing

**Causes:**
- Polling scheduler disabled or not running
- Bull queue issues or stuck jobs
- Bot session expired
- Steam API errors
- Database connection issues

**Solutions:**

#### 1. Check Polling Scheduler
```bash
# Verify scheduler is running
make logs-backend | grep -i "pollActiveTrades\|scheduler.*started\|cron.*job"

# Check for scheduler errors
make logs-backend | grep -i "scheduler.*error\|polling.*failed"
```

#### 2. Monitor Bull Queues
```bash
# Check Redis queues
redis-cli -n 2 KEYS 'bull:trade-*'
redis-cli -n 2 LLEN 'bull:trade-polling:wait'
redis-cli -n 2 LLEN 'bull:trade-polling:active'
redis-cli -n 2 LLEN 'bull:trade-polling:completed'
redis-cli -n 2 LLEN 'bull:trade-polling:failed'

# Restart queues if needed
make restart-queues
```

#### 3. Check Bot Session
```bash
# Verify bot session is active
make logs-backend | grep -i "bot.*session.*refresh\|session.*expired"

# Check bot login status
curl "http://localhost:3001/api/admin/bots/$BOT_ID" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" | jq '.lastLoginAt'
```

#### 4. Verify Steam API Access
```bash
# Test Steam API connectivity
curl "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=$STEAM_API_KEY&steamids=$STEAM_ID"

# Check for API errors
make logs-backend | grep -i "steam.*api.*error\|api.*timeout\|eresult"
```

## Inventory Sync Fails

### Symptom: Empty inventory, sync timeout, logs show "Failed to fetch inventory"

**Causes:**
- Private Steam inventory
- Steam API rate limits
- Invalid Steam ID format
- Network connectivity issues
- Steam Community downtime

**Solutions:**

#### 1. Check Steam Inventory Privacy
```bash
# Verify inventory is public
# Visit: https://steamcommunity.com/profiles/$STEAM_ID/inventory/
# Should be accessible without login

# Check privacy settings
# Steam Profile → Edit Profile → Privacy Settings → Inventory
```

#### 2. Validate Steam ID
```bash
# Check Steam ID format
echo "Steam ID: $STEAM_ID"
echo "$STEAM_ID" | grep -E "^[0-9]{17,19}$" && echo "✅ Valid Steam64 ID format"

# Convert Steam ID if needed
node -e "
const SteamID = require('steamid');
const steamID = new SteamID('$STEAM_ID');
console.log('Converted SteamID:', steamID.getSteamID64());
console.log('Valid:', steamID.isValid());
"
```

#### 3. Test Steam API
```bash
# Test inventory API directly
curl "https://steamcommunity.com/inventory/$STEAM_ID/730/2?l=english&count=5000"

# Test with specific app
curl "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=$STEAM_API_KEY&steamids=$STEAM_ID"
```

#### 4. Check Rate Limits
```bash
# Monitor API calls
make logs-backend | grep -i "rate.*limit\|too.*many\|429"

# Implement delays between sync requests
# Check sync frequency configuration
```

## Real-Time Events Not Received

### Symptom: Frontend doesn't show trade updates, WebSocket connected but no events

**Causes:**
- Not joined to correct trade room
- EventsGateway not emitting events
- User ID mismatch
- WebSocket connection interrupted
- Event filtering on frontend

**Solutions:**

#### 1. Verify Room Subscriptions
```javascript
// In browser console
// Check if connected to WebSocket
console.log('WebSocket connected:', window.socket?.connected);

// Join trade room manually
window.socket?.emit('join_trade_room', { tradeId: 'your-trade-id' });

// Listen for all events
window.socket?.onAny((eventName, ...args) => {
  console.log(`📡 Event: ${eventName}`, args);
});
```

#### 2. Check EventsGateway Emission
```bash
# Monitor EventsGateway logs
make logs-backend | grep -i "emitTrade\|EventsGateway\|websocket.*event"

# Look for specific trade events
make logs-backend | grep -i "trade.*sent\|trade.*accepted\|trade.*completed"

# Check for errors in event emission
make logs-backend | grep -i "Failed.*emit\|emit.*error"
```

#### 3. Verify User ID Matching
```bash
# Check trade ownership
curl "http://localhost:3001/api/trades/your-trade-id" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" | jq '.data.userId'

# Compare with JWT payload
node -e "
const jwt = require('jsonwebtoken');
const payload = jwt.decode('$JWT_TOKEN');
console.log('JWT userId:', payload.sub);
"
```

#### 4. Check Event Filtering
```javascript
// In browser console
// Verify event listeners are set up
console.log('Event listeners:', Object.keys(window.socket?._events || {}));

// Check for event filtering
window.socket?.on('trade:update', (data) => {
  console.log('Received trade:update:', data);
});

window.socket?.on('trade:sent', (data) => {
  console.log('Received trade:sent:', data);
});
```

## Common Error Codes

### Steam API Error Codes
- **EResult.InvalidPassword (5)**: Wrong bot password
- **EResult.RateLimitExceeded (84)**: Steam API rate limit, wait 5-10 minutes
- **EResult.Timeout (17)**: Steam API timeout, retry after 30 seconds
- **EResult.InvalidParameter (8)**: Invalid trade parameters

### Trade Offer States
- **TradeOfferState.Invalid (1)**: Invalid trade offer
- **TradeOfferState.Active (2)**: Trade offer active
- **TradeOfferState.Accepted (3)**: Trade offer accepted
- **TradeOfferState.Countered (4)**: Trade offer countered
- **TradeOfferState.Expired (5)**: Trade offer expired (14 days)
- **TradeOfferState.Canceled (6)**: Trade offer canceled
- **TradeOfferState.Declined (7)**: Trade offer declined
- **TradeOfferState.InvalidItems (8)**: Invalid items in trade
- **TradeOfferState.CreatedNeedsConfirmation (9)**: Requires Mobile Auth confirmation
- **TradeOfferState.CancelledBySecondFactor (10)**: Canceled by Steam Guard
- **TradeOfferState.InEscrow (11)**: Trade in escrow

## Debug Commands

### Backend Diagnostics
```bash
# Check all services health
make health-check

# View backend logs with filtering
make logs-backend | grep -i "error\|fail\|exception"

# Check specific trade
curl "http://localhost:3001/api/trades/TRADE_ID" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Check bot status
curl "http://localhost:3001/api/admin/bots" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Check WebSocket connections count
curl "http://localhost:3001/api/admin/stats" \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.websocketConnections'
```

### Frontend Diagnostics
```javascript
// In browser console
// Check authentication
console.log('JWT Token:', localStorage.getItem('accessToken'));
console.log('User ID:', JSON.parse(localStorage.getItem('user') || '{}').id);

// Test WebSocket connection
const socket = io('ws://localhost:3001', {
  auth: { token: localStorage.getItem('accessToken') }
});

socket.on('connect', () => console.log('✅ WebSocket connected'));
socket.on('connect_error', (err) => console.error('❌ WebSocket error:', err));
socket.onAny((event, data) => console.log(`📡 ${event}:`, data));

// Monitor network requests
window.addEventListener('beforeunload', () => {
  console.log('Active connections:', performance.getEntriesByType('navigation'));
});
```

### Redis Diagnostics
```bash
# Check Bull queues
redis-cli -n 2 KEYS 'bull:*'
redis-cli -n 2 LLEN 'bull:trade-processing:wait'
redis-cli -n 2 LLEN 'bull:trade-polling:wait'

# Check WebSocket pub/sub
redis-cli PUBSUB NUMSUB trade-updates

# Check general Redis health
redis-cli ping
redis-cli INFO memory
redis-cli INFO persistence
```

### Database Diagnostics
```bash
# Check PostgreSQL connections
psql -h localhost -U steam_user -d steam_marketplace -c "SELECT count(*) FROM pg_stat_activity;"

# Check for locked tables
psql -h localhost -U steam_user -d steam_marketplace -c "SELECT * FROM pg_locks WHERE granted = false;"

# Check trade status counts
psql -h localhost -U steam_user -d steam_marketplace -c "SELECT status, count(*) FROM trades GROUP BY status;"
```

## Getting Help

### When to Escalate
- **Security issues**: Bot account compromise, credential leaks
- **Production outages**: System-wide failures affecting users
- **Data corruption**: Trade or inventory data inconsistencies
- **Steam API issues**: Widespread Steam service problems

### Information to Provide
When reporting issues, include:
1. **Environment**: staging/production, deployment version
2. **Timestamp**: When issue occurred (UTC time)
3. **User/Bot IDs**: Affected accounts
4. **Trade IDs**: Specific trades involved
5. **Error logs**: Relevant log entries with timestamps
6. **Steps to reproduce**: How to trigger the issue
7. **Expected vs actual behavior**: What should happen vs what did happen

### Emergency Contacts
- **Development team**: [internal contact info]
- **Steam support**: https://help.steampowered.com/
- **Infrastructure team**: [internal contact info]

### Escalation Path
1. **Level 1**: Developer investigation (this guide)
2. **Level 2**: Senior developer/architect review
3. **Level 3**: Emergency hotfix deployment
4. **Level 4**: External support (Steam, cloud provider)

---

**⚠️ Always follow security best practices when troubleshooting live systems. Never expose credentials or sensitive data in logs or communications.**