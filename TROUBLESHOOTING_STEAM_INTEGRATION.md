# Troubleshooting Steam Integration Issues

This guide provides solutions for common issues encountered during Steam integration testing and deployment.

## 📋 Table of Contents

1. [Steam OAuth Issues](#steam-oauth-issues)
2. [Bot Management Issues](#bot-management-issues)
3. [Inventory Sync Issues](#inventory-sync-issues)
4. [Database Issues](#database-issues)
5. [Frontend Issues](#frontend-issues)
6. [General Debugging](#general-debugging)
7. [Useful Commands](#useful-commands)

---

## 🔐 Steam OAuth Issues

### Problem: "Invalid Steam API Key" Error

**Symptoms:**
- Steam login fails with API key error
- Backend logs show Steam API authentication failures

**Solutions:**
1. **Verify STEAM_API_KEY in `.env`:**
   ```bash
   # Check if API key is set
   grep STEAM_API_KEY apps/backend/.env

   # Verify it matches your key from: https://steamcommunity.com/dev/apikey
   ```

2. **Check for formatting issues:**
   - Remove any quotes around the key
   - Ensure no extra spaces or newlines
   - Verify the key is exactly: `E1FC69B3707FF57C6267322B0271A86B`

3. **Restart backend after changes:**
   ```bash
   docker-compose restart backend
   ```

**Code Reference:** `apps/backend/src/modules/auth/strategies/steam.strategy.ts:29`

---

### Problem: Redirect Loop on Steam Login

**Symptoms:**
- Browser redirects back to login page repeatedly
- No progress to Steam authentication

**Solutions:**
1. **Verify Steam OAuth URLs:**
   ```bash
   # Check these environment variables
   grep STEAM_REALM apps/backend/.env
   grep STEAM_RETURN_URL apps/backend/.env
   ```

2. **Expected values:**
   ```
   STEAM_REALM=http://localhost:3001
   STEAM_RETURN_URL=http://localhost:3001/api/auth/steam/return
   ```

3. **Check for trailing slashes:**
   - Remove any trailing slashes from URLs
   - Ensure exact match with actual callback URL

4. **Verify backend is accessible:**
   ```bash
   curl http://localhost:3001/api/health
   ```

**Code Reference:** `apps/backend/src/modules/auth/auth.controller.ts`

---

### Problem: "Could not extract Steam ID" Error

**Symptoms:**
- Steam login completes but user creation fails
- Error about Steam profile extraction

**Solutions:**
1. **Check Steam profile privacy:**
   - Ensure Steam profile is set to "Public"
   - Visit: https://steamcommunity.com/my/edit/settings
   - Set "My Profile" to "Public"

2. **Verify Steam OpenID response:**
   ```bash
   # Check backend logs for detailed error
   docker logs backend | grep -i "steam\|openid"
   ```

3. **Test with different Steam account:**
   - Try with a different Steam account
   - Ensure account has public profile and inventory

**Code Reference:** `apps/backend/src/modules/auth/strategies/steam.strategy.ts:29`

---

### Problem: JWT Token Not Stored in localStorage

**Symptoms:**
- Successful Steam login but no tokens stored
- User appears logged out after page refresh

**Solutions:**
1. **Check browser console for errors:**
   - Open DevTools > Console
   - Look for JavaScript errors during callback

2. **Verify callback page execution:**
   ```javascript
   // Check if this code executes in callback page
   localStorage.setItem('authToken', token);
   localStorage.setItem('refreshToken', refreshToken);
   ```

3. **Check CORS settings:**
   - Verify backend allows credentials from frontend origin
   - Check `CORS_ORIGIN` environment variable

4. **Clear browser data:**
   - Clear localStorage completely
   - Clear cookies and cache
   - Try incognito/private browsing mode

**Code Reference:** `apps/frontend/src/app/auth/callback/page.tsx:70`

---

## 🤖 Bot Management Issues

### Problem: Bot Shows "Offline" Status

**Symptoms:**
- Bot created but shows offline status
- No "Bot login successful" in logs

**Solutions:**
1. **Verify bot credentials format:**
   ```bash
   # Shared secret and identity secret must be exactly 28 characters
   # Base64 format: A-Z, a-z, 0-9, +, /, =
   Shared Secret: LVke3WPKHWzT8pCNSemh2FMuJ90=  # ✅ 28 chars
   Identity Secret: fzCjA+NZa0b3yOeEMhln81qgNM4=  # ✅ 28 chars
   ```

2. **Check Steam Guard:**
   - Bot account must have Steam Guard enabled
   - Use Steam Desktop Authenticator or mobile authenticator
   - Verify secrets are from authenticator app, not backup codes

3. **Verify bot account status:**
   - Ensure bot account is not trade-banned
   - Check if account has email confirmation
   - Verify account is not limited

4. **Check backend logs:**
   ```bash
   docker logs backend | grep -i "bot login"
   ```

5. **Test Force Login:**
   - Click "Force Login" button in admin panel
   - Wait 30 seconds for login attempt
   - Check logs for results

**Code Reference:** `apps/backend/src/modules/trading/services/bot-manager.service.ts`

---

### Problem: "Invalid shared secret" Validation Error

**Symptoms:**
- AddBotModal shows validation error for secrets
- Form prevents submission

**Solutions:**
1. **Verify secret format:**
   - Exactly 28 characters including padding
   - Base64 characters only (A-Z, a-z, 0-9, +, /, =)
   - No quotes, spaces, or extra characters

2. **Get secrets from Steam Authenticator:**
   - Install Steam Desktop Authenticator
   - Set up authenticator on bot account
   - Export secrets from the app
   - Use the exported shared_secret and identity_secret

3. **Example valid secrets:**
   ```
   Shared Secret: LVke3WPKHWzT8pCNSemh2FMuJ90=  # ✅
   Identity Secret: fzCjA+NZa0b3yOeEMhln81qgNM4=  # ✅
   ```

**Code Reference:** `apps/frontend/src/app/admin/bots/components/AddBotModal.tsx`

---

### Problem: Bot Created but Not Appearing in Table

**Symptoms:**
- Form submission succeeds but bot doesn't appear
- No errors shown

**Solutions:**
1. **Refresh the page:**
   - Hard refresh (Ctrl+F5 or Cmd+R)
   - Clear browser cache

2. **Check database directly:**
   ```bash
   docker exec -it postgres psql -U steam_user -d steam_marketplace -c "
   SELECT id, account_name, is_online, is_active, status
   FROM bots
   ORDER BY created_at DESC
   LIMIT 5;
   "
   ```

3. **Verify admin permissions:**
   - Check if user has ADMIN role
   - Verify JWT token is valid
   - Check Network tab for 403 responses

4. **Check API response:**
   ```bash
   # Test bots endpoint directly
   curl -H "Authorization: Bearer <admin-token>" http://localhost:3001/api/bots
   ```

---

### Problem: "Bot encryption key required" Error

**Symptoms:**
- Error about encryption key during bot operations
- Bot functionality not working

**Solutions:**
1. **Set BOT_ENCRYPTION_KEY:**
   ```bash
   # Generate strong encryption key
   openssl rand -hex 32

   # Add to .env file
   BOT_ENCRYPTION_KEY=<generated-key>
   ```

2. **Verify key strength:**
   - Minimum 32 characters
   - Use random hex or base64 string
   - Do not use weak or default keys

3. **Restart backend:**
   ```bash
   docker-compose restart backend
   ```

4. **Verify environment variable:**
   ```bash
   grep BOT_ENCRYPTION_KEY apps/backend/.env
   ```

**Code Reference:** `apps/backend/src/modules/trading/services/bot-manager.service.ts:29`

---

## 🎮 Inventory Sync Issues

### Problem: "Private inventory" Error

**Symptoms:**
- Inventory sync fails with privacy error
- No items fetched from Steam

**Solutions:**
1. **Make Steam profile public:**
   - Go to https://steamcommunity.com/my/edit/settings
   - Set "My Profile" to "Public"
   - Set "Inventory" to "Public"
   - Set "Game Details" to "Public"

2. **Wait for Steam cache update:**
   - Steam caches privacy settings for 5-10 minutes
   - Wait before retrying inventory sync
   - Verify privacy at: https://steamcommunity.com/profiles/<steamid>/inventory/

3. **Test inventory access:**
   ```bash
   # Replace with your Steam ID
   curl "http://api.steampowered.com/ISteamUser/GetPlayerOwnedGames/v0001/?key=<api_key>&steamid=<steam_id>&format=json"
   ```

---

### Problem: Inventory Sync Stuck/Never Completes

**Symptoms:**
- Sync starts but never finishes
- Loading spinner continues indefinitely
- No items appear

**Solutions:**
1. **Check backend logs:**
   ```bash
   docker logs -f backend | grep -i "inventory\|sync"
   ```

2. **Verify Steam API rate limits:**
   - Steam API: 5 requests/second, 200 requests/minute
   - Check if limits are exceeded
   - Wait and retry after cooldown

3. **Check Redis connection:**
   ```bash
   docker exec -it redis redis-cli ping
   ```

4. **Check MongoDB connection:**
   ```bash
   docker exec -it mongodb mongosh steam_marketplace --eval "db.adminCommand('ping')"
   ```

5. **Restart sync process:**
   - Click "Refresh" or "Sync Inventory" again
   - Check Bull queue status at `/api/health`

**Code Reference:** `apps/backend/src/modules/inventory/services/inventory.service.ts`

---

### Problem: Items Not Displaying After Sync

**Symptoms:**
- Sync completes successfully but no items shown
- Empty inventory grid

**Solutions:**
1. **Verify sync completion in logs:**
   ```bash
   docker logs backend | grep "Inventory sync completed"
   ```

2. **Check database storage:**
   ```bash
   # Check PostgreSQL inventory table
   docker exec -it postgres psql -U steam_user -d steam_marketplace -c "
   SELECT COUNT(*) FROM inventory WHERE user_id = (SELECT id FROM users LIMIT 1);
   "

   # Check MongoDB items collection
   docker exec -it mongodb mongosh steam_marketplace --eval "db.items.countDocuments()"
   ```

3. **Clear browser cache:**
   - Hard refresh the inventory page
   - Clear browser cache and localStorage
   - Try incognito mode

4. **Check item images:**
   - Verify Steam CDN URLs are accessible
   - Check if images load in browser
   - Look for CORS issues with image loading

---

### Problem: "Steam API timeout" Error

**Symptoms:**
- Sync fails with timeout error
- Slow response from Steam API

**Solutions:**
1. **Increase timeout setting:**
   ```bash
   # Add to .env file
   STEAM_API_TIMEOUT=15000  # 15 seconds
   ```

2. **Check internet connection:**
   - Verify stable internet connection
   - Check if Steam Community is accessible

3. **Verify Steam service status:**
   - Check https://steamstat.us for service outages
   - Wait and retry if Steam services are down

4. **Test Steam API directly:**
   ```bash
   curl "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=<api_key>&steamids=<steam_id>&format=json"
   ```

---

## 🗄️ Database Issues

### Problem: "User not found" Error

**Symptoms:**
- Authentication fails with user not found
- Profile data missing

**Solutions:**
1. **Verify user creation:**
   ```bash
   docker exec -it postgres psql -U steam_user -d steam_marketplace -c "
   SELECT * FROM users ORDER BY created_at DESC LIMIT 5;
   "
   ```

2. **Check JWT token:**
   - Verify token contains valid userId
   - Decode token at jwt.io to check payload
   - Ensure token hasn't expired

3. **Re-login via Steam OAuth:**
   - Clear localStorage
   - Complete Steam login flow again
   - Verify user is created this time

---

### Problem: Database Connection Errors

**Symptoms:**
- Backend fails to start
- Database connection timeouts
- Health check shows database down

**Solutions:**
1. **Verify Docker containers:**
   ```bash
   docker ps
   # Ensure postgres, mongodb, redis are running
   ```

2. **Check database credentials:**
   ```bash
   # Verify these environment variables
   grep POSTGRES apps/backend/.env
   grep MONGODB_URI apps/backend/.env
   grep REDIS apps/backend/.env
   ```

3. **Test database connections:**
   ```bash
   # Test PostgreSQL
   docker exec -it postgres psql -U steam_user -d steam_marketplace -c "SELECT 1;"

   # Test MongoDB
   docker exec -it mongodb mongosh steam_marketplace --eval "db.adminCommand('ping')"

   # Test Redis
   docker exec -it redis redis-cli ping
   ```

4. **Restart database services:**
   ```bash
   docker-compose restart postgres mongodb redis
   ```

---

### Problem: Migration Errors

**Symptoms:**
- Backend startup fails with migration errors
- Database schema issues

**Solutions:**
1. **Run migrations manually:**
   ```bash
   cd apps/backend
   npm run db:migrate
   ```

2. **Check TypeORM settings:**
   ```bash
   # In development, you can use synchronize
   # But be careful in production
   grep -A 5 -B 5 "synchronize" ormconfig.json
   ```

3. **Verify database schema:**
   ```bash
   docker exec -it postgres psql -U steam_user -d steam_marketplace -c "
   \dt
   "
   ```

4. **Reset database (development only):**
   ```bash
   docker-compose down -v
   docker-compose up -d
   npm run db:migrate
   npm run db:seed
   ```

---

## 💻 Frontend Issues

### Problem: "Network Error" on API Calls

**Symptoms:**
- Frontend shows network errors
- API calls fail with connection issues

**Solutions:**
1. **Verify backend is running:**
   ```bash
   curl http://localhost:3001/api/health
   ```

2. **Check frontend environment:**
   ```bash
   # Verify in apps/frontend/.env.local
   grep NEXT_PUBLIC_API_URL apps/frontend/.env.local
   # Should be: http://localhost:3001
   ```

3. **Check CORS settings:**
   - Verify backend allows frontend origin
   - Check browser Network tab for CORS errors
   - Ensure credentials are included in requests

4. **Test API endpoints directly:**
   ```bash
   curl http://localhost:3001/api/auth/steam
   ```

---

### Problem: Infinite Loading on Pages

**Symptoms:**
- Pages show loading spinners indefinitely
- No content displayed

**Solutions:**
1. **Check browser console:**
   - Look for JavaScript errors
   - Check React Query devtools for query status
   - Verify API responses

2. **Verify API endpoints:**
   - Test API endpoints directly with curl
   - Check if they return expected data
   - Verify authentication headers

3. **Clear application state:**
   - Clear localStorage completely
   - Hard refresh the page
   - Try incognito mode

4. **Check React Query cache:**
   - Open React Query devtools
   - Check query status and errors
   - Invalidate and refetch queries

---

## 🔧 General Debugging

### Enable Verbose Logging

1. **Set debug log level:**
   ```bash
   # Add to apps/backend/.env
   LOG_LEVEL=debug
   ```

2. **Restart backend:**
   ```bash
   docker-compose restart backend
   ```

3. **Monitor logs:**
   ```bash
   docker logs -f backend
   ```

### Check Service Health

```bash
# Backend health endpoint
curl http://localhost:3001/api/health

# Expected response:
{
  "status": "ok",
  "services": {
    "database": "up",
    "redis": "up",
    "bull": "up"
  }
}
```

### Database Inspection Commands

```bash
# PostgreSQL users table
docker exec -it postgres psql -U steam_user -d steam_marketplace -c "
SELECT id, steam_id, username, is_admin, last_login_at
FROM users
ORDER BY created_at DESC;
"

# PostgreSQL bots table
docker exec -it postgres psql -U steam_user -d steam_marketplace -c "
SELECT id, account_name, is_online, is_active, status, last_login_at
FROM bots
ORDER BY created_at DESC;
"

# PostgreSQL inventory table
docker exec -it postgres psql -U steam_user -d steam_marketplace -c "
SELECT COUNT(*) as total_items
FROM inventory
WHERE user_id = (SELECT id FROM users LIMIT 1);
"

# MongoDB items collection
docker exec -it mongodb mongosh steam_marketplace --eval "
db.items.find().limit(5).forEach(printjson)
"
```

### Clear All Caches

```bash
# Clear Redis cache
docker exec -it redis redis-cli FLUSHALL

# Clear browser localStorage (via DevTools Console)
localStorage.clear()

# Clear browser cache (Ctrl+Shift+Delete)
```

### Reset Environment

```bash
# Stop all services
docker-compose down

# Remove volumes (WARNING: This deletes all data)
docker-compose down -v

# Restart services
docker-compose up -d

# Run migrations and seeds
cd apps/backend
npm run db:migrate
npm run db:seed

# Verify services
curl http://localhost:3001/api/health
```

---

## 🛠️ Useful Commands

### Service Management
```bash
# Start all services
docker-compose up -d

# View all logs
docker logs -f backend
docker logs -f frontend

# Restart specific service
docker-compose restart backend

# Check service status
docker ps
```

### Database Operations
```bash
# Check database status
npm run db:status

# Run migrations
npm run db:migrate

# Seed database
npm run db:seed

# Open PostgreSQL shell
docker exec -it postgres psql -U steam_user -d steam_marketplace
```

### Testing Commands
```bash
# Run Steam integration verification
npm run verify:steam-integration

# Validate environment
npm run validate:env

# Check backend health
curl http://localhost:3001/api/health
```

### Log Monitoring
```bash
# Monitor all backend logs
docker logs -f backend

# Monitor specific log types
docker logs backend | grep -i "error\|fail"
docker logs backend | grep -i "bot\|steam"
docker logs backend | grep -i "inventory\|sync"
```

---

## 📞 Getting Help

If you encounter issues not covered in this guide:

1. **Check the logs first** - Most issues are visible in backend logs
2. **Verify environment variables** - Missing or incorrect env vars cause most problems
3. **Test individual components** - Use the verification scripts to isolate issues
4. **Check Steam status** - Verify Steam services are operational
5. **Review code references** - Check the specific files mentioned in error messages

For additional support, refer to:
- [Steam Integration Test Guide](STEAM_INTEGRATION_TEST_GUIDE.md)
- [Manual Testing Checklist](tests/manual/steam-integration-checklist.md)
- [Automated Verification Script](scripts/verify-steam-integration.ts)