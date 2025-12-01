# Manual Steam Integration Testing Checklist

This checklist provides step-by-step browser-based testing instructions with checkboxes for each verification step. Use this checklist to thoroughly test the Steam integration functionality.

## 📋 Pre-Test Setup

**Before starting the tests, complete these setup steps:**

- [ ] **Verify Docker Services Running**
  ```bash
  docker ps
  ```
  - [ ] `postgres` container is running
  - [ ] `mongodb` container is running
  - [ ] `redis` container is running
  - [ ] `backend` container is running
  - [ ] `frontend` container is running

- [ ] **Confirm Environment Variables**
  Verify these are set in `apps/backend/.env`:
  - [ ] `STEAM_API_KEY=E1FC69B3707FF57C6267322B0271A86B`
  - [ ] `BOT_ENCRYPTION_KEY` is set (32+ characters)
  - [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` are set
  - [ ] `STEAM_REALM=http://localhost:3001`
  - [ ] `STEAM_RETURN_URL=http://localhost:3001/api/auth/steam/return`

- [ ] **Clear Browser Data**
  - [ ] Clear browser cache
  - [ ] Clear localStorage (`Application > Local Storage` in DevTools)
  - [ ] Open browser DevTools (Network and Console tabs)

- [ ] **Test Backend Health**
  ```bash
  curl http://localhost:3001/api/health
  ```
  - [ ] All services show "up" status

---

## 🧪 Test 1: Steam OAuth Login

**Objective:** Verify Steam OAuth authentication flow works correctly.

- [ ] **Navigate to Login Page**
  - [ ] Open `http://localhost:3000/auth/login`
  - [ ] Page loads successfully
  - [ ] "Sign in with Steam" button is visible and styled correctly

- [ ] **Initiate Steam OAuth**
  - [ ] Click "Sign in with Steam" button
  - [ ] Browser redirects to `https://steamcommunity.com/openid/login`
  - [ ] **Network tab:** POST to `/api/auth/steam` with 302 redirect

- [ ] **Complete Steam Authentication**
  - [ ] Enter Steam credentials
  - [ ] Complete any 2FA/authentication steps
  - [ ] Grant permission for profile access

- [ ] **Handle Steam Callback**
  - [ ] Automatic redirect to `http://localhost:3000/auth/callback`
  - [ ] **Network tab:** POST to `/api/auth/steam/return` with 200 response
  - [ ] Success message appears on callback page

- [ ] **Verify Token Storage**
  - [ ] Open DevTools > Application > Local Storage
  - [ ] Verify `authToken` exists and contains valid JWT
  - [ ] Verify `refreshToken` exists and contains valid JWT

- [ ] **Confirm Successful Login**
  - [ ] Automatic redirect to `/dashboard` or main page
  - [ ] No errors in browser console
  - [ ] User profile information displays correctly

**Expected Result:** Steam OAuth flow completes without errors, user is logged in with Steam profile data.

---

## 🧪 Test 2: User Profile Verification

**Objective:** Verify user data is correctly stored and retrieved from the database.

- [ ] **Check User Profile**
  - [ ] Navigate to profile page or user settings
  - [ ] Verify Steam ID is displayed
  - [ ] Verify Steam username is displayed
  - [ ] Verify avatar images are loading

- [ ] **Verify Database Storage**
  ```bash
  docker exec -it postgres psql -U steam_user -d steam_marketplace -c "
  SELECT id, steam_id, username, avatar, avatar_medium, avatar_full, is_admin, last_login_at
  FROM users
  ORDER BY created_at DESC
  LIMIT 1;
  "
  ```
  - [ ] User record exists with Steam data
  - [ ] `last_login_at` timestamp is recent
  - [ ] `is_admin` is true if first user

- [ ] **Test Authenticated Endpoint**
  ```bash
  # Replace <token> with token from localStorage
  curl -H "Authorization: Bearer <token>" http://localhost:3001/api/auth/me
  ```
  - [ ] Returns user profile with Steam data
  - [ ] Response includes steamId, username, avatars

**Expected Result:** User data is correctly stored in PostgreSQL and retrievable via API.

---

## 🧪 Test 3: Admin Bot Addition

**Objective:** Verify bot management functionality works with provided credentials.

- [ ] **Access Admin Panel**
  - [ ] Navigate to `http://localhost:3000/admin/bots`
  - [ ] Page loads without 403 Forbidden error
  - [ ] Admin privileges confirmed

- [ ] **Add Bot Account**
  - [ ] Click "Add Bot" button
  - [ ] Fill form with these credentials:

    ```
    Account Name: Sgovt1
    Password: Szxc123!
    Shared Secret: LVke3WPKHWzT8pCNSemh2FMuJ90=
    Identity Secret: fzCjA+NZa0b3yOeEMhln81qgNM4=
    API Key: E1FC69B3707FF57C6267322B0271A86B
    Max Concurrent Trades: 5
    ```

- [ ] **Submit Bot Form**
  - [ ] Click "Add Bot" to submit
  - [ ] Success toast notification appears
  - [ ] **Network tab:** POST to `/api/bots` with 201 response

- [ ] **Verify Bot Creation**
  - [ ] Bot appears in the bots table
  - [ ] Account name shows "Sgovt1"
  - [ ] Status badge shows "IDLE" or "ONLINE"
  - [ ] `isActive: true` and `isOnline: true` in table

- [ ] **Check Database Storage**
  ```bash
  docker exec -it postgres psql -U steam_user -d steam_marketplace -c "
  SELECT id, account_name, is_online, is_active, status, total_trades_completed, current_trade_count
  FROM bots
  WHERE account_name = 'Sgovt1';
  "
  ```
  - [ ] Bot record exists with correct data
  - [ ] Credentials are encrypted (not plaintext)

**Expected Result:** Bot account is successfully created with encrypted credentials and shows appropriate status.

---

## 🧪 Test 4: Bot Status Monitoring

**Objective:** Verify bot login functionality and status monitoring.

- [ ] **Monitor Initial Status**
  - [ ] Refresh `/admin/bots` page
  - [ ] Bot shows "IDLE" (yellow) or "ONLINE" (green) status
  - [ ] `isOnline: true` and `isActive: true`

- [ ] **Check Backend Logs**
  ```bash
  docker logs -f backend | grep -i "bot\|steam"
  ```
  - [ ] Look for "Bot login successful" messages
  - [ ] Look for "Steam bot connected" messages
  - [ ] No login errors or authentication failures

- [ ] **Test Force Login (if needed)**
  - [ ] If bot shows offline, click "Force Login"
  - [ ] Wait 10-30 seconds
  - [ ] Status changes to "ONLINE"
  - [ ] New log entries show successful login

- [ ] **Verify Bot Statistics**
  - [ ] `totalTradesCompleted: 0` (new bot)
  - [ ] `currentTradeCount: 0` (no active trades)
  - [ ] Bot is ready for trading

**Expected Result:** Bot successfully logs into Steam and shows online status.

---

## 🧪 Test 5: Trade URL Validation

**Objective:** Verify trade URL validation functionality and format requirements.

- [ ] **Navigate to Profile Settings**
  - [ ] Go to `http://localhost:3000/profile` or user settings
  - [ ] Page loads with trade URL field and validation feedback
  - [ ] Field shows proper formatting hints

- [ ] **Test Valid Trade URL**
  - [ ] Enter valid trade URL: `https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=AbCdEfGh`
  - [ ] Field shows validation success (green indicator)
  - [ ] No validation error messages displayed

- [ ] **Test Invalid Trade URL Formats**
  - [ ] Test missing token: `https://steamcommunity.com/tradeoffer/new/?partner=123456789`
  - [ ] Test invalid partner: `https://steamcommunity.com/tradeoffer/new/?partner=invalid&token=AbCdEfGh`
  - [ ] Test wrong domain: `https://example.com/tradeoffer/new/?partner=123456789&token=AbCdEfGh`
  - [ ] Test wrong path: `https://steamcommunity.com/market/tradeoffer/new/?partner=123456789&token=AbCdEfGh`
  - [ ] All invalid formats show appropriate error messages

- [ ] **Test Trade URL API Endpoint**
  ```bash
  curl -X PATCH http://localhost:3001/api/auth/trade-url \
    -H "Authorization: Bearer <token>" \
    -H "Content-Type: application/json" \
    -d '{"tradeUrl": "https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=AbCdEfGh"}'
  ```
  - [ ] Returns 200 response with success message
  - [ ] No validation errors for valid format

- [ ] **Verify Trade URL Storage**
  ```bash
  docker exec -it postgres psql -U steam_user -d steam_marketplace -c "
  SELECT id, steam_id, trade_url, updated_at
  FROM users
  WHERE steam_id = 'your-steam-id';
  "
  ```
  - [ ] Trade URL is stored in database
  - [ ] Updated timestamp is recent
  - [ ] URL format is preserved correctly

**Expected Result:** Trade URL validation works correctly with proper format checking and error handling.

---

## 🧪 Test 6: Inventory Sync

**Objective:** Verify Steam inventory synchronization functionality.

- [ ] **Navigate to Inventory**
  - [ ] Go to `http://localhost:3000/inventory`
  - [ ] Page loads with "Sync Inventory" button
  - [ ] No items displayed initially (empty state)

- [ ] **Trigger Inventory Sync**
  - [ ] Click "Sync Inventory" button
  - [ ] Loading spinner appears
  - [ ] **Network tab:** POST to `/api/inventory/sync`

- [ ] **Monitor Sync Progress**
  ```bash
  docker logs -f backend | grep -i "inventory\|sync"
  ```
  - [ ] "Starting inventory sync for user"
  - [ ] "Fetching Steam inventory for user"
  - [ ] "Processing [count] inventory items"
  - [ ] "Inventory sync completed for user"

- [ ] **Verify Inventory Items**
  - [ ] Items appear in the inventory grid (3-5 minutes)
  - [ ] Items show images, names, and rarity colors
  - [ ] Item count matches Steam inventory
  - [ ] No broken images or missing data

- [ ] **Check Database Storage**
  ```bash
  # PostgreSQL inventory table
  docker exec -it postgres psql -U steam_user -d steam_marketplace -c "
  SELECT COUNT(*) as inventory_count
  FROM inventory
  WHERE user_id = (SELECT id FROM users WHERE steam_id = 'your-steam-id');
  "

  # MongoDB items collection
  docker exec -it mongodb mongosh steam_marketplace --eval "
  db.items.countDocuments()
  "
  ```
  - [ ] Items stored in PostgreSQL inventory table
  - [ ] Items stored in MongoDB items collection

- [ ] **Test Inventory Features**
  - [ ] Search functionality works
  - [ ] Rarity filters work
  - [ ] Item type filters work
  - [ ] All features work with synced data

**Expected Result:** Inventory sync completes successfully, items are displayed and functional.

---

## 🧪 Test 6: Error Handling

**Objective:** Verify proper error handling for common failure scenarios.

- [ ] **Test Invalid Steam API Key**
  - [ ] Temporarily change `STEAM_API_KEY` in `.env` to invalid value
  - [ ] Restart backend
  - [ ] Attempt Steam login
  - [ ] Verify appropriate error message is displayed
  - [ ] Restore correct API key

- [ ] **Test Invalid Bot Credentials**
  - [ ] Try adding bot with invalid credentials
  - [ ] Verify validation errors in AddBotModal
  - [ ] Form prevents submission with invalid data

- [ ] **Test Private Steam Profile**
  - [ ] If possible, test with private Steam profile
  - [ ] Verify "Private Inventory" error message
  - [ ] Appropriate user feedback is provided

**Expected Result:** Error scenarios are handled gracefully with appropriate user feedback.

---

## ✅ Success Criteria

**All checkboxes must be marked for successful Steam integration testing:**

### Authentication & Backend
- [ ] Steam OAuth login works without errors
- [ ] User profile created with Steam data in PostgreSQL
- [ ] JWT tokens generated and stored in localStorage
- [ ] Authenticated API endpoints accessible
- [ ] No errors in browser console or backend logs

### Bot Management
- [ ] Admin panel accessible with proper permissions
- [ ] Bot account added successfully with provided credentials
- [ ] Bot shows "Online" status in admin panel
- [ ] Bot credentials are encrypted in database
- [ ] Backend logs show successful Steam bot login

### Trade URL Validation
- [ ] Valid trade URLs are accepted and stored correctly
- [ ] Invalid trade URL formats show appropriate error messages
- [ ] Trade URL validation follows Steam's format requirements
- [ ] Partner parameter is validated as numeric
- [ ] Token parameter is validated as alphanumeric
- [ ] Trade URL is securely stored in database

### Inventory System
- [ ] Inventory sync completes without errors
- [ ] Items appear in frontend grid with images and data
- [ ] Items stored in both PostgreSQL and MongoDB
- [ ] Search and filter functionality works
- [ ] Sync completes within reasonable time (3-5 minutes)

### Technical Requirements
- [ ] All API endpoints return 200/201 responses
- [ ] Database connections remain healthy
- [ ] Redis caching operations work
- [ ] No timeout or connectivity issues
- [ ] Proper error handling for edge cases

---

## ❌ Failure Scenarios

**Document any failures encountered:**

### Common Issues to Watch For:
- **Steam OAuth Loop:** Check `STEAM_REALM` and `STEAM_RETURN_URL` configuration
- **Bot Offline:** Verify bot credentials and Steam Guard settings
- **Inventory Sync Failed:** Check Steam profile privacy and API rate limits
- **Database Errors:** Verify Docker services and connection strings
- **JWT Errors:** Check token expiration and secret keys

### Troubleshooting Steps:
1. Check browser console for JavaScript errors
2. Review backend logs for detailed error messages
3. Verify all environment variables are set correctly
4. Ensure all Docker services are healthy
5. Consult [TROUBLESHOOTING_STEAM_INTEGRATION.md](../TROUBLESHOOTING_STEAM_INTEGRATION.md)

---

## 📝 Test Notes

**Record test execution details:**

- **Test Date:** _______________
- **Test Environment:** Development / Staging / Production
- **Steam Account Used:** _______________
- **Test Duration:** _______________
- **Issues Encountered:**
  - ________________________________________
  - ________________________________________
- **Additional Notes:**
  - ________________________________________
  - ________________________________________

**Tester Signature:** _______________

---

## 🔄 Next Steps

**After completing this checklist:**

- [ ] Run automated verification: `npm run verify:steam-integration`
- [ ] Validate environment: `npm run validate:env`
- [ ] Document any issues found
- [ ] Update troubleshooting documentation if needed
- [ ] Prepare for production deployment if testing successful