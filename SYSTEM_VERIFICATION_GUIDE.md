# System Verification Guide

This comprehensive guide provides detailed instructions for verifying the complete Steam Marketplace system before production deployment. It covers all components, integration points, and verification workflows.

## 🎯 Overview

The Complete System Integration Verification framework ensures that all system components work together correctly before deployment. This guide covers 8 detailed verification phases:

1. **Infrastructure & Environment**
2. **Backend API Verification**
3. **Database Seeding & Data Integrity**
4. **Steam Integration**
5. **Frontend & Integration**
6. **Real-Time Features**
7. **Performance & Load Testing**
8. **End-to-End Flow Verification**

## 📋 Verification Checklist

### Phase 1: Infrastructure & Environment

**Goal**: Ensure all infrastructure components are properly configured and available.

#### ✅ Docker Services
```bash
# Start all services
npm run docker:up

# Verify services are running
docker-compose ps

# Expected output: postgres, mongodb, redis, backend, frontend should all be "Up"
```

**Success Criteria**:
- [ ] PostgreSQL database running and accepting connections
- [ ] MongoDB running and accessible
- [ ] Redis running for caching and sessions
- [ ] Backend API service running on port 3001
- [ ] Frontend service running on port 3000

#### ✅ Port Availability
```bash
# Check port availability
lsof -i :3000 -i :3001 -i :5432 -i :27017 -i :6379

# Or using netstat
netstat -tulpn | grep -E ':(3000|3001|5432|27017|6379)'
```

**Success Criteria**:
- [ ] Port 3000 available for frontend
- [ ] Port 3001 available for backend API
- [ ] Port 5432 available for PostgreSQL
- [ ] Port 27017 available for MongoDB
- [ ] Port 6379 available for Redis

#### ✅ Environment Variables
```bash
# Validate environment configuration
npm run validate:env

# Check specific variables
echo "STEAM_API_KEY: ${STEAM_API_KEY:0:10}..."
echo "JWT_SECRET: ${JWT_SECRET:0:10}..."
echo "DATABASE_URL: Set"
echo "MONGODB_URI: Set"
echo "REDIS_URL: Set"
```

**Success Criteria**:
- [ ] All required environment variables are set
- [ ] Steam API key is valid and accessible
- [ ] Database connection strings are correct
- [ ] JWT secrets are properly formatted
- [ ] CORS origins are configured correctly

### Phase 2: Backend API Verification

**Goal**: Validate all backend API endpoints, authentication, and database connections.

#### ✅ Health Endpoints
```bash
# Test basic health check
curl -s http://localhost:3001/api/health | jq

# Test detailed health check
curl -s http://localhost:3001/api/health/detailed | jq

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2024-01-01T00:00:00.000Z",
#   "uptime": 3600,
#   "database": "connected",
#   "redis": "connected"
# }
```

#### ✅ Public Endpoints
```bash
# Test API documentation
curl -s http://localhost:3001/api/docs

# Test metrics endpoint
curl -s http://localhost:3001/api/metrics | head -20

# Test status endpoint
curl -s http://localhost:3001/api/status | jq
```

#### ✅ Authentication Endpoints
```bash
# Test Steam OAuth redirect (should return 302)
curl -I http://localhost:3001/api/auth/steam

# Test protected endpoints (should return 401 without auth)
curl -s http://localhost:3001/api/inventory | jq
curl -s http://localhost:3001/api/pricing/item/1 | jq
```

#### ✅ Database Connections
```bash
# Check database connectivity through health endpoint
curl -s http://localhost:3001/api/health/detailed | jq '.database'

# Manual database connection tests
# PostgreSQL
psql $DATABASE_URL -c "SELECT version();"

# MongoDB
mongo $MONGODB_URI --eval "db.runCommand({ping: 1})"

# Redis
redis-cli -u $REDIS_URL ping
```

**Success Criteria**:
- [ ] Health endpoints return 200 status
- [ ] Public endpoints are accessible
- [ ] Protected endpoints return 401 without authentication
- [ ] Steam OAuth redirects correctly
- [ ] All database connections are healthy
- [ ] CORS headers are properly configured

### Phase 3: Database Seeding & Data Integrity

**Goal**: Verify database schema, seeded data, and data integrity constraints.

#### ✅ Schema Verification
```bash
# Check table existence
psql $DATABASE_URL -c "
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
"

# Check table counts
psql $DATABASE_URL -c "
SELECT
    table_name,
    (xpath('/row/cnt/text()', xml_count))[1]::text::int as row_count
FROM (
    SELECT
        table_name,
        query_to_xml(format('select count(*) as cnt from %I.%I', table_schema, table_name), false, true, '') as xml_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
) t;
"
```

#### ✅ Data Population
```bash
# Check critical table counts
psql $DATABASE_URL -c "
SELECT
    'users' as table_name,
    COUNT(*) as count
FROM users
UNION ALL
SELECT
    'item_prices' as table_name,
    COUNT(*) as count
FROM item_prices
UNION ALL
SELECT
    'trades' as table_name,
    COUNT(*) as count
FROM trades;
"

# Check MongoDB collections
mongo $MONGODB_URI --eval "
db.getCollectionNames().forEach(function(collection) {
    print(collection + ': ' + db[collection].count());
});
"

# Check items collection specifically
mongo $MONGODB_URI --eval "
print('Items count: ' + db.items.count());
printjson(db.items.findOne());
"
```

#### ✅ Price Data Validation
```bash
# Check recent price data
psql $DATABASE_URL -c "
SELECT
    COUNT(*) as total_prices,
    COUNT(DISTINCT markethashname) as unique_items,
    COUNT(*) FILTER (WHERE createdat > NOW() - INTERVAL '1 hour') as recent_prices,
    MIN(createdat) as oldest_price,
    MAX(createdat) as newest_price
FROM item_prices;
"

# Check price sources
psql $DATABASE_URL -c "
SELECT
    source,
    COUNT(*) as count
FROM item_prices
WHERE createdat > NOW() - INTERVAL '24 hours'
GROUP BY source
ORDER BY count DESC;
"
```

#### ✅ Data Integrity
```bash
# Check for orphaned records
psql $DATABASE_URL -c "
SELECT COUNT(*) as orphaned_trades
FROM trades
WHERE userid NOT IN (SELECT id FROM users);
"

# Check unique constraints
psql $DATABASE_URL -c "
SELECT steamid, COUNT(*) as duplicates
FROM users
GROUP BY steamid
HAVING COUNT(*) > 1;
"

# Check enum values
psql $DATABASE_URL -c "
SELECT status, COUNT(*) as count
FROM trades
WHERE status NOT IN ('pending', 'completed', 'cancelled', 'failed', 'expired')
GROUP BY status;
"
```

**Success Criteria**:
- [ ] All required tables exist (15+ tables)
- [ ] Users table has at least 1 admin user
- [ ] Item prices table has recent data (last 24 hours)
- [ ] MongoDB has 1000+ items seeded
- [ ] No orphaned records or constraint violations
- [ ] Price data from multiple sources
- [ ] Materialized views contain data (if implemented)

### Phase 4: Steam Integration

**Goal**: Verify Steam API connectivity, OAuth flow, and bot management.

#### ✅ Steam API Connectivity
```bash
# Test Steam API key validity
curl -s "https://api.steampowered.com/ISteamWebAPIUtil/GetServerInfo/v1/" | jq

# Test specific Steam API endpoints
curl -s "https://api.steampowered.com/ISteamEconomy/GetAssetClassInfo/v1/?key=${STEAM_API_KEY}&format=json&class_count=1&classid0=12345" | jq

# Expected: Valid JSON response with Steam data
```

#### ✅ Steam OAuth Flow
```bash
# Test OAuth configuration
curl -I "http://localhost:3001/api/auth/steam"

# Should return:
# HTTP/1.1 302 Found
# Location: https://steamcommunity.com/openid/login
```

#### ✅ Bot Management
```bash
# Check bot endpoints (requires admin JWT)
# First get an admin token (manual step)
curl -s "http://localhost:3001/api/bots" -H "Authorization: Bearer $ADMIN_JWT" | jq

# Check bot status
curl -s "http://localhost:3001/api/bots/status" -H "Authorization: Bearer $ADMIN_JWT" | jq
```

#### ✅ Inventory Sync
```bash
# Test inventory endpoint (requires user JWT)
curl -s "http://localhost:3001/api/inventory" -H "Authorization: Bearer $USER_JWT" | jq

# Should return user's Steam inventory items
```

**Success Criteria**:
- [ ] Steam API key is valid and responsive
- [ ] OAuth redirects to Steam correctly
- [ ] Bot management endpoints are accessible
- [ ] Inventory sync completes without errors
- [ ] Bot credentials are properly encrypted
- [ ] Trade URL validation works

### Phase 5: Frontend & Integration

**Goal**: Verify frontend functionality and frontend-backend integration.

#### ✅ Frontend Server
```bash
# Test frontend server
curl -s http://localhost:3000 | head -10

# Should return HTML with Next.js markers
# Look for: __NEXT_DATA__, _next/, etc.
```

#### ✅ API Proxy
```bash
# Test frontend API proxy
curl -s http://localhost:3000/api/health | jq

# Should return same response as direct backend call
curl -s http://localhost:3001/api/health | jq

# Compare responses
```

#### ✅ Page Loading
```bash
# Test critical pages load
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/auth/login
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/inventory
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/market
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/trade
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/admin
```

#### ✅ CORS Configuration
```bash
# Test CORS preflight
curl -s -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -I http://localhost:3001/api/health

# Should include CORS headers
```

**Success Criteria**:
- [ ] Frontend server responds with HTML
- [ ] API proxy routes requests correctly
- [ ] All critical pages return 200 status
- [ ] CORS headers are present on API responses
- [ ] No build or hydration errors
- [ ] React components initialize correctly

### Phase 6: Real-Time Features

**Goal**: Verify WebSocket connections and real-time event handling.

#### ✅ WebSocket Connection
```bash
# Test WebSocket connectivity
# Using wscat (install with: npm install -g wscat)
wscat -c ws://localhost:3001

# Should establish connection and show:
# connected (press CTRL+C to quit)
```

#### ✅ Event Emission
```bash
# Test event emission (manual step with WebSocket client)
# Connect to ws://localhost:3001
# Send: {"event": "test", "data": "ping"}
# Should receive appropriate response
```

#### ✅ Trade Status Updates
```bash
# Monitor WebSocket events during trade creation
# This requires creating a test trade and monitoring events
```

**Success Criteria**:
- [ ] WebSocket connection established successfully
- [ ] Events are emitted and received correctly
- [ ] Trade status updates are pushed in real-time
- [ ] Authentication works with WebSocket connections
- [ ] No connection drops or timeouts

### Phase 7: Performance & Load Testing

**Goal**: Verify system performance under expected load.

#### ✅ Response Time Testing
```bash
# Test API response times
for i in {1..10}; do
  time curl -s http://localhost:3001/api/health > /dev/null
done

# Test frontend response times
for i in {1..10}; do
  time curl -s http://localhost:3000/ > /dev/null
done
```

#### ✅ Concurrent Request Testing
```bash
# Test concurrent API requests
ab -n 100 -c 10 http://localhost:3001/api/health

# Test concurrent frontend requests
ab -n 100 -c 10 http://localhost:3000/
```

#### ✅ Memory Usage Monitoring
```bash
# Monitor memory usage during load
docker stats

# Check Node.js memory usage
ps aux | grep node
```

**Success Criteria**:
- [ ] Health endpoint responds in < 100ms
- [ ] Frontend pages load in < 3s
- [ ] API endpoints respond in < 2s
- [ ] System handles 10+ concurrent users
- [ ] Memory usage remains stable under load
- [ ] No memory leaks or excessive CPU usage

### Phase 8: End-to-End Flow Verification

**Goal**: Test complete user workflows from authentication to trade completion.

#### ✅ Complete User Flow
```bash
# Run automated E2E tests
npm run test:e2e:live:complete

# Or run specific flow tests
npm run test:e2e:live
```

**Manual Testing Steps**:

1. **User Registration/Login**
   - Navigate to http://localhost:3000
   - Click "Login with Steam"
   - Complete Steam OAuth flow
   - Verify user profile is created

2. **Inventory Sync**
   - Go to Inventory page
   - Trigger inventory sync
   - Verify items appear with correct data

3. **Market Browsing**
   - Navigate to Market page
   - Browse items with filters
   - View item details and price history

4. **Trade Creation**
   - Select items to trade
   - Create trade offer
   - Verify bot assignment

5. **Trade Completion**
   - Complete Steam trade offer
   - Verify trade status updates
   - Check balance changes

**Success Criteria**:
- [ ] Complete user flow completes without errors
- [ ] All pages load and function correctly
- [ ] Trade offers are created and processed
- [ ] Real-time updates work throughout the flow
- [ ] Error handling works correctly
- [ ] Performance is acceptable throughout

## 🔧 Manual Verification Commands

### Quick System Check
```bash
# Run complete system verification
npm run verify:system

# Run individual components
npm run verify:api
npm run verify:steam
npm run verify:integration
npm run verify:seeding
```

### Database Status
```bash
# Check database seeding completion (replaces db:status)
npm run verify:seeding

# Check individual database services
# PostgreSQL
psql $DATABASE_URL -c "SELECT version();"

# MongoDB
mongo $MONGODB_URI --eval "db.adminCommand('ping')"

# Redis
redis-cli -u $REDIS_URL ping

# Check database schema and tables (manual verification)
psql $DATABASE_URL -c "
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
"

# Check MongoDB collections (manual verification)
mongo $MONGODB_URI --eval "
db.getCollectionNames().forEach(function(collection) {
    print(collection + ': ' + db[collection].count());
});
"

### Service Health
```bash
# Check all services
docker-compose ps

# Check service logs
docker-compose logs --tail=50 backend frontend

# Check individual service health
curl http://localhost:3001/api/health
curl http://localhost:3000/
```

## 🚨 Troubleshooting Common Issues

### Infrastructure Issues

**Docker Services Not Starting**
```bash
# Check Docker status
systemctl status docker

# Restart Docker services
docker-compose down
docker-compose up -d

# Check service logs
docker-compose logs postgres mongodb redis
```

**Port Conflicts**
```bash
# Find processes using ports
lsof -i :3000 -i :3001 -i :5432

# Kill conflicting processes
kill -9 <PID>
```

### Database Issues

**Connection Failures**
```bash
# Test database connections manually
psql $DATABASE_URL -c "SELECT 1;"
mongo $MONGODB_URI --eval "db.adminCommand('ping')"

# Check database logs
docker-compose logs postgres mongodb
```

**Seeding Problems**
```bash
# Re-run seeding
npm run db:seed

# Check seeding logs
cd apps/backend && npm run start:dev

# Verify seeded data
psql $DATABASE_URL -c "SELECT COUNT(*) FROM item_prices;"
```

### API Issues

**Authentication Failures**
```bash
# Check JWT configuration
echo $JWT_SECRET | wc -c  # Should be > 32 characters

# Test authentication manually
curl -s http://localhost:3001/api/auth/steam
```

**CORS Errors**
```bash
# Check CORS configuration in backend
grep -r "cors" apps/backend/src/

# Test CORS manually
curl -I -H "Origin: http://localhost:3000" http://localhost:3001/api/health
```

### Frontend Issues

**Build Errors**
```bash
# Check frontend build
cd apps/frontend && npm run build

# Check for TypeScript errors
cd apps/frontend && npx tsc --noEmit
```

**API Proxy Issues**
```bash
# Test proxy configuration
curl http://localhost:3000/api/health

# Check Next.js config
cat apps/frontend/next.config.js
```

## 🚀 Production Deployment Checklist

Before deploying to production, ensure all verification phases pass:

### Infrastructure
- [ ] All Docker services configured for production
- [ ] SSL/TLS certificates installed
- [ ] Environment variables set for production
- [ ] Database backups configured
- [ ] Monitoring and logging enabled

### Security
- [ ] Strong JWT secrets and encryption keys
- [ ] Valid SSL certificates
- [ ] CORS configured for production domains
- [ ] Rate limiting enabled
- [ ] Security headers configured

### Performance
- [ ] Production database optimized
- [ ] Redis cache configured
- [ ] Static assets optimized
- [ ] CDN configured (if applicable)
- [ ] Load balancing configured

### Monitoring
- [ ] Health check endpoints accessible
- [ ] Log aggregation configured
- [ ] Performance monitoring enabled
- [ ] Error tracking configured
- [ ] Alerting rules set up

### Data
- [ ] Production database seeded
- [ ] Price data sources configured
- [ ] Bot accounts configured
- [ ] Admin users created
- [ ] Test data removed

## 📊 Performance Benchmarks

### Expected Response Times
- Health endpoints: < 100ms
- Simple API calls: < 500ms
- Complex queries: < 2s
- Page loads: < 3s
- Trade operations: < 5s

### Concurrent User Capacity
- Development: 5-10 concurrent users
- Staging: 50-100 concurrent users
- Production: 1000+ concurrent users

### Resource Usage
- CPU: < 70% under normal load
- Memory: < 80% of allocated RAM
- Disk: Monitor growth rate for logs and data
- Network: Monitor bandwidth usage

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
name: System Verification
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  system-verification:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm run install:all

      - name: Start services
        run: npm run docker:up

      - name: Wait for services
        run: sleep 60

      - name: System verification
        run: npm run verify:system
        env:
          NODE_ENV: test
          STEAM_API_KEY: ${{ secrets.STEAM_API_KEY }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          # ... other secrets

      - name: Cleanup
        run: npm run docker:down
```

This comprehensive verification guide ensures your Steam Marketplace system is thoroughly tested and ready for production deployment. Run through all phases systematically and address any failures before proceeding to the next phase.