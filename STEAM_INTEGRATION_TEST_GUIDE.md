# Steam Integration Test Guide

This guide provides comprehensive step-by-step instructions for testing the complete Steam integration flow, from OAuth authentication to bot management and inventory synchronization.

## 📋 Prerequisites

Before starting the tests, ensure the following:

### Services Status
```bash
# Verify all Docker services are running
docker ps

# Expected services:
# - postgres
# - mongodb
# - redis
# - backend
# - frontend
```

### Environment Configuration
Verify these environment variables are set in `apps/backend/.env`:
- `STEAM_API_KEY=E1FC69B3707FF57C6267322B0271A86B`
- `BOT_ENCRYPTION_KEY` (32+ character encryption key)
- `JWT_SECRET` and `JWT_REFRESH_SECRET`
- `STEAM_REALM=http://localhost:3001`
- `STEAM_RETURN_URL=http://localhost:3001/api/auth/steam/return`

### Quick Verification
```bash
# Check backend health
curl http://localhost:3001/api/health

# Expected response: All services should show "up" status
```

## 🎯 Test Flow Overview

The complete Steam integration test consists of 6 phases:

1. **Frontend Steam Login** - OAuth authentication flow
2. **Backend Processing** - User creation and JWT generation
3. **Admin Bot Setup** - Bot account configuration
4. **Bot Status Verification** - Bot online status confirmation
5. **Trade URL Validation** - Trade URL format and functionality verification
6. **Inventory Sync** - Steam inventory synchronization

**Expected Total Time:** 15-20 minutes

---

## Phase 1: Frontend Steam Login

### Step 1.1: Navigate to Login Page
1. Open your browser and go to: `http://localhost:3000/auth/login`
2. Verify the page loads with a "Sign in with Steam" button
3. The button should have Steam branding and be prominently displayed

### Step 1.2: Initiate Steam OAuth
1. Click the "Sign in with Steam" button
2. **Expected:** Browser redirects to `https://steamcommunity.com/openid/login`
3. **Verify in Network tab:** POST request to `http://localhost:3001/api/auth/steam` with 302 redirect

### Step 1.3: Complete Steam Authentication
1. On the Steam login page, enter your Steam credentials
2. Complete any 2FA/authentication steps required by Steam
3. **Expected:** Steam will ask for permission to share your profile information

### Step 1.4: Handle Steam Callback
1. **Expected:** Automatic redirect to `http://localhost:3000/auth/callback`
2. **Verify in Network tab:** POST request to `/api/auth/steam/return` with 200 response
3. **Verify localStorage:** Contains `authToken` and `refreshToken` (Application > Local Storage)

### Step 1.5: Confirm Successful Login
1. **Expected:** Automatic redirect to `/dashboard` or main application page
2. **Verify:** No errors in browser console (Console tab)
3. **Verify:** User profile information is displayed correctly

**Phase 1 Success Criteria:**
- ✅ Redirected to Steam login page
- ✅ Successfully authenticated with Steam
- ✅ Callback handled without errors
- ✅ JWT tokens stored in localStorage
- ✅ Redirected to dashboard

---

## Phase 2: Backend Processing Verification

### Step 2.1: Verify User Creation
Check that the user was created in the PostgreSQL database:

```bash
# Connect to PostgreSQL and check users table
docker exec -it postgres psql -U steam_user -d steam_marketplace -c "
SELECT id, steam_id, username, avatar, avatar_medium, avatar_full, is_admin, last_login_at
FROM users
ORDER BY created_at DESC
LIMIT 5;
"
```

**Expected:** Your Steam profile data should be visible in the users table.

### Step 2.2: Verify JWT Token Structure
Decode the JWT token (from localStorage) using jwt.io or similar tool:

**Expected Token Contents:**
```json
{
  "userId": "user-id-from-database",
  "steamId": "your-steam-id-64",
  "username": "your-steam-username",
  "role": "ADMIN", // if first user
  "iat": "timestamp",
  "exp": "expiration-timestamp"
}
```

### Step 2.3: Test Authenticated Endpoints
```bash
# Replace <your-token> with the token from localStorage
curl -H "Authorization: Bearer <your-token>" \
     http://localhost:3001/api/auth/me

# Expected: Returns your user profile with steamId, username, avatars
```

**Phase 2 Success Criteria:**
- ✅ User record created in PostgreSQL with Steam data
- ✅ JWT token contains correct user information
- ✅ Authenticated endpoint returns user profile
- ✅ First user has ADMIN role (if applicable)

---

## Phase 3: Admin Bot Setup

### Step 3.1: Access Admin Panel
1. Navigate to `http://localhost:3000/admin/bots`
2. **Expected:** Admin bots page loads (no 403 Forbidden error)
3. **Verify:** You have admin privileges to access this page

### Step 3.2: Add Bot Account
1. Click the "Add Bot" button
2. Fill in the AddBotModal form with these credentials:

**Bot Account: Sgovt1**
```
Account Name: Sgovt1
Password: Szxc123!
Shared Secret: LVke3WPKHWzT8pCNSemh2FMuJ90=
Identity Secret: fzCjA+NZa0b3yOeEMhln81qgNM4=
API Key: E1FC69B3707FF57C6267322B0271A86B
Max Concurrent Trades: 5
```

### Step 3.3: Submit Bot Form
1. Click "Add Bot" to submit the form
2. **Expected:** Success toast notification appears
3. **Verify in Network tab:** POST request to `/api/bots` with 201 response
4. **Expected:** Bot appears in the bots table

### Step 3.4: Verify Bot Data
Check the bot was created in the database:

```bash
# Connect to PostgreSQL and check bots table
docker exec -it postgres psql -U steam_user -d steam_marketplace -c "
SELECT id, account_name, is_online, is_active, status, total_trades_completed, current_trade_count
FROM bots
WHERE account_name = 'Sgovt1';
"
```

**Phase 3 Success Criteria:**
- ✅ AddBotModal accepts the provided credentials
- ✅ Bot record created in PostgreSQL
- ✅ Bot appears in admin panel table
- ✅ Credentials are encrypted in database (not plaintext)
- ✅ Bot status shows as "IDLE" or "ONLINE"

---

## Phase 4: Bot Status Verification

### Step 4.1: Monitor Bot Status
1. On the admin bots page, observe the bot status
2. **Expected:** Status badge shows "IDLE" (yellow) or "ONLINE" (green)
3. **Expected:** `isOnline: true` and `isActive: true` in the table

### Step 4.2: Check Backend Logs
```bash
# Monitor bot-related logs
docker logs -f backend | grep -i "bot\|steam"

# Look for messages like:
# "Bot login successful: Sgovt1"
# "Bot status updated: ONLINE"
# "Steam bot connected: Sgovt1"
```

### Step 4.3: Test Force Login (if needed)
If the bot shows as offline:
1. Click the "Force Login" button next to the bot
2. Wait 10-30 seconds
3. **Expected:** Status changes to "ONLINE"
4. **Verify:** New log entries show successful login

### Step 4.4: Verify Bot Statistics
Check that the bot shows correct initial statistics:
- `totalTradesCompleted: 0` (new bot)
- `currentTradeCount: 0` (no active trades)
- `isOnline: true`
- `isActive: true`

**Phase 4 Success Criteria:**
- ✅ Bot shows "Online" status in admin panel
- ✅ Backend logs show successful Steam login
- ✅ Bot statistics are correctly displayed
- ✅ Force login works if needed

---

## Phase 5: Trade URL Validation

### Step 5.1: Navigate to Profile Settings
1. Go to `http://localhost:3000/profile` or user settings page
2. **Expected:** Profile page loads with user information and trade URL field
3. **Expected:** Trade URL field has validation feedback

### Step 5.2: Test Valid Trade URL
1. Enter a valid Steam trade URL in the trade URL field:
   ```
   https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=AbCdEfGh
   ```
2. **Expected:** Field shows validation success (green indicator)
3. **Expected:** No validation error messages

### Step 5.3: Test Invalid Trade URL Formats
Test these invalid formats and verify appropriate error messages:

1. **Missing token parameter:**
   ```
   https://steamcommunity.com/tradeoffer/new/?partner=123456789
   ```
   **Expected:** "Invalid Steam trade URL format" error

2. **Invalid partner format:**
   ```
   https://steamcommunity.com/tradeoffer/new/?partner=invalid&token=AbCdEfGh
   ```
   **Expected:** Validation error for non-numeric partner

3. **Wrong domain:**
   ```
   https://example.com/tradeoffer/new/?partner=123456789&token=AbCdEfGh
   ```
   **Expected:** Domain validation error

4. **Wrong path:**
   ```
   https://steamcommunity.com/market/tradeoffer/new/?partner=123456789&token=AbCdEfGh
   ```
   **Expected:** Path validation error

### Step 5.4: Test Trade URL API Endpoint
```bash
# Test the trade URL validation endpoint (replace <token>)
curl -X PATCH http://localhost:3001/api/auth/trade-url \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"tradeUrl": "https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=AbCdEfGh"}'

# Expected: 200 response with success message
```

### Step 5.5: Verify Trade URL Storage
Check that the trade URL is correctly stored in the database:

```bash
# Check PostgreSQL users table
docker exec -it postgres psql -U steam_user -d steam_marketplace -c "
SELECT id, steam_id, trade_url, updated_at
FROM users
WHERE steam_id = 'your-steam-id';
"
```

**Phase 5 Success Criteria:**
- ✅ Valid trade URLs are accepted and stored
- ✅ Invalid trade URL formats show appropriate error messages
- ✅ Trade URL validation follows Steam's format requirements
- ✅ API endpoint returns proper validation responses
- ✅ Trade URL is stored securely in the database

---

## Phase 6: Inventory Sync Test

### Step 6.1: Navigate to Inventory
1. Go to `http://localhost:3000/inventory`
2. **Expected:** Inventory page loads with "Sync Inventory" button
3. **Expected:** No items displayed initially (empty state)

### Step 6.2: Trigger Inventory Sync
1. Click the "Sync Inventory" button
2. **Expected:** Loading spinner appears
3. **Verify in Network tab:** POST request to `/api/inventory/sync`

### Step 6.3: Monitor Sync Progress
```bash
# Monitor inventory sync logs
docker logs -f backend | grep -i "inventory\|sync"

# Expected messages:
# "Starting inventory sync for user: [steam-id]"
# "Fetching Steam inventory for user: [steam-id]"
# "Processing [count] inventory items"
# "Inventory sync completed for user: [steam-id]"
```

### Step 6.4: Verify Inventory Items
After sync completes (3-5 minutes):

1. **Expected:** Items appear in the inventory grid
2. **Expected:** Items show images, names, and rarity colors
3. **Verify item count matches your Steam inventory**

Check database storage:

```bash
# Check PostgreSQL inventory table
docker exec -it postgres psql -U steam_user -d steam_marketplace -c "
SELECT COUNT(*) as inventory_count
FROM inventory
WHERE user_id = (SELECT id FROM users WHERE steam_id = 'your-steam-id');
"

# Check MongoDB items collection
docker exec -it mongodb mongosh steam_marketplace --eval "
db.items.countDocuments()
"
```

### Step 6.5: Test Inventory Features
1. Test search functionality
2. Test rarity filters
3. Test item type filters
4. **Expected:** All features work with synced data

**Phase 6 Success Criteria:**
- ✅ Inventory sync completes without errors
- ✅ Items appear in the frontend grid
- ✅ Items are stored in both PostgreSQL and MongoDB
- ✅ Item images load from Steam CDN
- ✅ Search and filters work correctly

---

## 🎉 Complete Test Success Criteria

All phases must pass for a successful Steam integration test:

### ✅ Authentication & Backend
- Steam OAuth login works correctly
- User profile created with Steam data
- JWT tokens generated and stored
- Authenticated endpoints accessible

### ✅ Bot Management
- Bot account added successfully with provided credentials
- Bot shows "Online" status
- Bot credentials encrypted in database
- Backend logs show successful Steam bot login

### ✅ Trade URL Validation
- Valid trade URLs are accepted and stored correctly
- Invalid trade URL formats show appropriate error messages
- Trade URL validation follows Steam's format requirements (steamcommunity.com/tradeoffer/new/)
- Partner parameter is validated as numeric
- Token parameter is validated as alphanumeric
- Trade URL is securely stored in the database

### ✅ Inventory System
- Inventory sync completes successfully
- Items fetched from Steam and displayed
- Data stored in both PostgreSQL and MongoDB
- Frontend inventory features work correctly

### ✅ Technical Requirements
- No errors in browser console
- No errors in backend logs
- All API endpoints return 200/201 responses
- Database connections healthy
- Redis caching working

---

## 🔧 Verification Commands

Quick commands to verify each component:

```bash
# Backend health check
curl http://localhost:3001/api/health

# Test authenticated endpoint (replace <token>)
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/auth/me

# Test bot endpoints (replace <token>)
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/bots

# Test inventory endpoints (replace <token>)
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/inventory

# Database status
npm run db:status

# Redis status
docker exec -it redis redis-cli ping
```

---

## 📚 Additional Resources

- **Manual Testing Checklist:** [tests/manual/steam-integration-checklist.md](tests/manual/steam-integration-checklist.md)
- **Troubleshooting Guide:** [TROUBLESHOOTING_STEAM_INTEGRATION.md](TROUBLESHOOTING_STEAM_INTEGRATION.md)
- **Automated Verification:** `npm run verify:steam-integration`

---

## 🔄 Next Steps

After successful testing:

1. **Production Deployment:** Update environment variables for production
2. **Additional Bots:** Add more bot accounts using the same process
3. **Monitoring:** Set up health checks and monitoring for production
4. **Scaling:** Consider load balancing and database optimization for high traffic

For issues encountered during testing, refer to the troubleshooting guide or run the automated verification script for detailed diagnostics.