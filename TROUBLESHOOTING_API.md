# API Troubleshooting Guide

This guide provides solutions to common issues encountered during API verification and testing.

## Quick Diagnostic Commands

### Check Backend Status
```bash
# Test if backend is running
curl -I http://localhost:3001/api/health

# View backend logs
cd apps/backend && npm run start:dev

# Check backend process
lsof -i :3001
```

### Check Database Status
```bash
# Check Docker services
docker compose ps

# View database logs
docker compose logs postgres
docker compose logs mongodb
docker compose logs redis

# Test database connections
npm run db:verify
npm run db:status
```

### Check Configuration
```bash
# View environment variables
cat apps/backend/.env | grep -v "PASSWORD\|SECRET\|KEY"

# Verify CORS configuration
grep CORS_ORIGIN apps/backend/.env

# Check Steam API configuration
grep STEAM apps/backend/.env
```

### Run Verification Tests
```bash
# Test all endpoints
npm run verify:api

# Test CORS configuration
npm run verify:cors

# Run all verifications
npm run verify:all

# View verification reports
cat scripts/reports/api-verification-*.json | jq
```

## Common API Verification Issues

### 1. Health Endpoint Returns 500

**Symptoms:**
- `curl http://localhost:3001/api/health` returns 500 Internal Server Error
- Backend logs show database connection errors

**Causes:**
- Database services not running
- Incorrect database credentials in .env
- Database not initialized

**Solutions:**
1. Check Docker services: `docker compose ps`
2. Verify all services are healthy
3. Check database credentials in .env match docker-compose.yml
4. Restart database services: `docker compose restart postgres mongodb redis`
5. Check backend logs for specific error messages
6. Verify database initialization: `npm run db:verify`

**Example Fix:**
```bash
# Check services
docker compose ps

# Restart databases
docker compose restart postgres mongodb redis

# Check logs
docker compose logs postgres

# Verify database
cd apps/backend && npm run db:verify
```

### 2. CORS Errors from Frontend

**Symptoms:**
- Browser console shows CORS policy errors
- Requests from localhost:3000 are blocked

**Causes:**
- CORS_ORIGIN not configured correctly
- Backend not restarted after .env changes
- Preflight requests failing

**Solutions:**
1. Verify CORS_ORIGIN in backend .env: `grep CORS_ORIGIN apps/backend/.env`
2. Ensure it includes frontend origin: `CORS_ORIGIN=http://localhost:3000,http://localhost:3001`
3. Restart backend: `cd apps/backend && npm run start:dev`
4. Test CORS headers: `npm run verify:cors`
5. Check main.ts CORS configuration

**Example Fix:**
```bash
# Check CORS configuration
grep CORS_ORIGIN apps/backend/.env

# Update if needed
echo "CORS_ORIGIN=http://localhost:3000,http://localhost:3001" >> apps/backend/.env

# Restart backend
cd apps/backend && npm run start:dev
```

### 3. 401 Unauthorized on Protected Endpoints

**Symptoms:**
- Requests to /api/inventory, /api/pricing return 401
- "Unauthorized" error message

**Causes:**
- Missing JWT token
- Invalid JWT token
- Token expired

**Solutions:**
1. Obtain fresh JWT token via Steam OAuth login
2. Verify token format: `Bearer <token>`
3. Check JWT_SECRET in .env matches what was used to generate token
4. Test with curl: `curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/auth/me`
5. Check token expiration (default 7 days)

**Example Fix:**
```bash
# Complete Steam OAuth flow in browser
# Copy token from browser DevTools > Application > Local Storage

# Test token
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  http://localhost:3001/api/auth/me
```

### 4. 403 Forbidden on Admin Endpoints

**Symptoms:**
- Requests to /api/bots return 403
- "Forbidden" error message

**Causes:**
- User does not have admin role
- First user not auto-promoted

**Solutions:**
1. Verify first user is admin: Check database users table
2. Manually promote user to admin if needed:
   ```sql
   UPDATE users SET role = 'admin' WHERE id = 'USER_ID';
   ```
3. Re-login to get new JWT with admin role
4. Test admin access: `curl -H "Authorization: Bearer ADMIN_TOKEN" http://localhost:3001/api/bots`

**Example Fix:**
```bash
# Check user roles in database
docker compose exec postgres psql -U steam_user -d steam_marketplace \
  -c "SELECT id, username, role FROM users;"

# Promote user to admin (replace USER_ID with actual ID)
docker compose exec postgres psql -U steam_user -d steam_marketplace \
  -c "UPDATE users SET role = 'admin' WHERE id = '123e4567-e89b-12d3-a456-426614174000';"
```

### 5. 404 Not Found on Endpoints

**Symptoms:**
- Endpoint returns 404
- "Cannot GET /api/endpoint" error

**Causes:**
- Incorrect endpoint path
- Backend not fully started
- Route not registered

**Solutions:**
1. Verify endpoint path in Swagger docs: http://localhost:3001/api/docs
2. Check backend logs for route registration
3. Ensure backend started successfully
4. Test status endpoint: `curl http://localhost:3001/api/status`
5. Verify global prefix is 'api' in main.ts

**Example Fix:**
```bash
# Check Swagger documentation
curl -I http://localhost:3001/api/docs

# Test status endpoint
curl http://localhost:3001/api/status

# Verify global prefix
grep "setGlobalPrefix" apps/backend/src/main.ts
```

### 6. 500 Internal Server Error

**Symptoms:**
- Endpoint returns 500
- Generic error message

**Causes:**
- Backend code error
- Database query error
- Missing configuration

**Solutions:**
1. Check backend console logs for stack trace
2. Verify all required environment variables are set
3. Check database seeding completed: `npm run db:status`
4. Test with verbose logging: `LOG_LEVEL=debug npm run start:dev`
5. Check specific endpoint logs in Winston logs

**Example Fix:**
```bash
# Start backend with debug logging
cd apps/backend
LOG_LEVEL=debug npm run start:dev

# Check environment variables
cat apps/backend/.env | grep -E "(STEAM_API_KEY|JWT_SECRET|DATABASE_URL)"

# Verify database seeding
npm run db:status
```

### 7. Rate Limiting Errors (429)

**Symptoms:**
- Requests return 429 Too Many Requests
- "Rate limit exceeded" error

**Causes:**
- Too many requests in short time
- Rate limiting configured too strictly

**Solutions:**
1. Wait for rate limit window to reset (default 60 seconds)
2. Adjust rate limits in .env for testing:
   ```
   THROTTLE_LIMIT=1000
   AUTH_RATE_LIMIT_MAX=50
   ```
3. Restart backend after .env changes
4. Use different test accounts to avoid rate limits

**Example Fix:**
```bash
# Add to .env for testing
echo "THROTTLE_LIMIT=1000" >> apps/backend/.env
echo "AUTH_RATE_LIMIT_MAX=50" >> apps/backend/.env

# Restart backend
cd apps/backend && npm run start:dev
```

### 8. Database Connection Errors

**Symptoms:**
- Health endpoint shows database status "down"
- Backend logs show connection refused

**Causes:**
- Database container not running
- Incorrect connection string
- Network issues

**Solutions:**
1. Check Docker containers: `docker compose ps`
2. View database logs: `docker compose logs postgres mongodb redis`
3. Verify connection strings in .env
4. Test database connectivity:
   ```bash
   # Postgres
   docker compose exec postgres psql -U steam_user -d steam_marketplace -c "SELECT 1;"

   # MongoDB
   docker compose exec mongodb mongosh steam_marketplace --eval "db.stats()"

   # Redis
   docker compose exec redis redis-cli ping
   ```
5. Restart database services if needed

**Example Fix:**
```bash
# Check container status
docker compose ps

# Test database connectivity
docker compose exec postgres psql -U steam_user -d steam_marketplace -c "SELECT 1;"

# Restart databases if needed
docker compose restart postgres mongodb redis
```

### 9. Steam API Errors

**Symptoms:**
- Inventory sync fails
- Pricing data not updating
- Steam OAuth fails

**Causes:**
- Invalid Steam API key
- Rate limiting from Steam
- Steam services down

**Solutions:**
1. Verify Steam API key: `grep STEAM_API_KEY apps/backend/.env`
2. Test API key: `curl "https://api.steampowered.com/ISteamWebAPIUtil/GetSupportedAPIList/v1/?key=YOUR_KEY"`
3. Check Steam API status: https://steamstat.us/
4. Wait for rate limit reset (Steam has strict limits)
5. Verify STEAM_REALM and STEAM_RETURN_URL in .env

**Example Fix:**
```bash
# Check Steam API key
grep STEAM_API_KEY apps/backend/.env

# Test API key (replace YOUR_KEY)
curl "https://api.steampowered.com/ISteamWebAPIUtil/GetSupportedAPIList/v1/?key=E1FC69B3707FF57C6267322B0271A86B"

# Check Steam API status
curl -s "https://steamstat.us/" | grep -E "(Status|API)"
```

### 10. Verification Script Fails

**Symptoms:**
- `npm run verify:api` shows failures
- Script times out or crashes

**Causes:**
- Backend not running
- Network issues
- Script configuration issues

**Solutions:**
1. Ensure backend is running: `curl http://localhost:3001/api/health`
2. Check script configuration (BASE_URL, timeout)
3. Run with verbose mode: `npm run verify:api:verbose`
4. Check script logs in reports directory
5. Test individual endpoints manually with curl

**Example Fix:**
```bash
# Check backend status
curl http://localhost:3001/api/health

# Run with verbose output
npm run verify:api:verbose

# Test individual endpoint
curl http://localhost:3001/api/health/detailed

# Check reports
ls scripts/reports/
cat scripts/reports/api-verification-latest.json
```

## Advanced Troubleshooting

### Debug Mode

Start backend with debug logging:

```bash
cd apps/backend
LOG_LEVEL=debug npm run start:dev
```

### Database Debugging

Check database state and connections:

```bash
# Check database connections
docker compose exec postgres psql -U steam_user -d steam_marketplace \
  -c "SELECT count(*) as connections, state FROM pg_stat_activity GROUP BY state;"

# Check table contents
docker compose exec postgres psql -U steam_user -d steam_marketplace \
  -c "SELECT * FROM users LIMIT 5;"

# Check MongoDB collections
docker compose exec mongodb mongosh steam_marketplace \
  --eval "show collections"

# Check Redis keys
docker compose exec redis redis-cli keys "*"
```

### Performance Issues

Monitor resource usage:

```bash
# Check backend process
ps aux | grep node

# Monitor memory usage
top -p $(pgrep -f "node.*main")

# Check database performance
docker stats

# Monitor logs for slow queries
cd apps/backend && npm run start:dev 2>&1 | grep -E "(slow|error|warn)"
```

### Network Issues

Test network connectivity:

```bash
# Test local connectivity
curl -v http://localhost:3001/api/health

# Test from different interface
curl -v http://127.0.0.1:3001/api/health

# Check port binding
netstat -tulpn | grep 3001

# Test CORS from different origin
curl -H "Origin: http://localhost:3000" http://localhost:3001/api/health
```

## Getting Help

If issues persist after trying these solutions:

1. **Check backend logs** for detailed error messages
2. **Review API_VERIFICATION_GUIDE.md** for correct usage
3. **Verify all previous implementation phases** were completed
4. **Check LAUNCH_GUIDE.md** for setup instructions
5. **Review VERIFICATION_CHECKLIST.md** for prerequisites

### Log Analysis

Backend logs are typically found in:
- Console output when running `npm run start:dev`
- Winston log files (if configured)
- Docker container logs: `docker compose logs backend`

### Common Log Patterns

Look for these patterns in logs:
- Database connection errors: `ECONNREFUSED`, `connection timeout`
- Authentication errors: `Unauthorized`, `Invalid token`
- CORS errors: `CORS policy`, `Origin not allowed`
- Rate limiting: `Too many requests`, `Rate limit exceeded`

### Environment Variables Checklist

Ensure all required environment variables are set:

```bash
# Required variables
STEAM_API_KEY
STEAM_REALM
STEAM_RETURN_URL
JWT_SECRET
JWT_REFRESH_SECRET
BOT_ENCRYPTION_KEY
DATABASE_URL
MONGODB_URL
REDIS_URL
CORS_ORIGIN
```

### Docker Troubleshooting

If using Docker:

```bash
# Check container health
docker compose ps

# View container logs
docker compose logs

# Restart all services
docker compose down && docker compose up -d

# Check Docker network
docker network ls
docker network inspect testsite_default
```

## Emergency Procedures

### Database Recovery

If database becomes corrupted:

```bash
# Backup current state
docker compose exec postgres pg_dump -U steam_user steam_marketplace > backup.sql

# Restart database
docker compose restart postgres

# Re-seed if needed
cd apps/backend && npm run db:seed
```

### Clearing Cache

If Redis cache causes issues:

```bash
# Clear Redis cache
docker compose exec redis redis-cli FLUSHALL

# Restart backend
cd apps/backend && npm run start:dev
```

### Resetting Migrations

If database migrations fail:

```bash
# Drop and recreate database
docker compose exec postgres psql -U steam_user -c "DROP DATABASE steam_marketplace;"
docker compose exec postgres psql -U steam_user -c "CREATE DATABASE steam_marketplace;"

# Re-run migrations and seeding
cd apps/backend && npm run db:seed
```