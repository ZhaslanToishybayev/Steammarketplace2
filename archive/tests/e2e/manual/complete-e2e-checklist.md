# Complete E2E Testing Manual Checklist

This comprehensive manual testing checklist validates the complete end-to-end user journey through the Steam Marketplace application. Use this checklist to ensure all features work correctly and provide a seamless user experience.

## Pre-Test Setup

- [ ] Backend server running on localhost:3001
- [ ] Frontend application running on localhost:3000
- [ ] PostgreSQL database container healthy and accessible
- [ ] MongoDB container healthy and accessible
- [ ] Redis container healthy and accessible
- [ ] Steam API key properly configured
- [ ] Test bot credentials configured and bot online
- [ ] Test user Steam account accessible and configured
- [ ] Browser developer tools available for debugging
- [ ] Sufficient time allocated (30-45 minutes for complete flow)

## Phase 1: Steam Authentication

### Login Flow
- [ ] Navigate to `/auth/login` page
- [ ] Verify login page loads correctly with Steam login button
- [ ] Click "Login with Steam" button
- [ ] Verify redirect to Steam OAuth page
- [ ] Complete Steam authentication (if required)
- [ ] Verify redirect back to application with success message
- [ ] Verify user profile displayed in header/navigation
- [ ] Verify session persists after page refresh

### Trade URL Setup
- [ ] Check if trade URL setup prompt appears
- [ ] Enter valid trade URL in format: `https://steamcommunity.com/tradeoffer/new/?partner=12345678&token=ABCDEFGH`
- [ ] Verify trade URL validation passes
- [ ] Verify success message displayed
- [ ] Test invalid trade URL formats:
  - [ ] Missing partner parameter
  - [ ] Invalid token format
  - [ ] Malformed URL structure
- [ ] Verify appropriate error messages for invalid URLs

### Session Management
- [ ] Verify login state persists across browser tabs
- [ ] Verify session timeout handling (if applicable)
- [ ] Test logout functionality
- [ ] Verify complete session cleanup on logout

## Phase 2: Inventory Management

### Inventory Sync
- [ ] Navigate to `/inventory` page
- [ ] Verify inventory page loads correctly
- [ ] Click "Sync Inventory" button
- [ ] Verify loading indicator shows during sync process
- [ ] Wait for sync completion (may take 1-2 minutes)
- [ ] Verify success message displayed
- [ ] Verify items loaded with correct metadata:
  - [ ] Item names display correctly
  - [ ] Item images load properly
  - [ ] Prices/rarity indicators show
  - [ ] Float values (if applicable) display

### Item Filtering and Search
- [ ] Test filtering by game type:
  - [ ] CS:GO items
  - [ ] Dota 2 items
  - [ ] Team Fortress 2 items
  - [ ] Rust items
- [ ] Test filtering by item rarity:
  - [ ] Common items
  - [ ] Rare items
  - [ ] High-tier items
- [ ] Test price range filtering
- [ ] Test search functionality with keywords
- [ ] Verify pagination works for large inventories

### Item Selection
- [ ] Click on various inventory items
- [ ] Verify item details display correctly
- [ ] Verify item can be selected for trading
- [ ] Check item tradability status
- [ ] Verify selected items show in trade preview

## Phase 3: Market Browsing

### Market Page
- [ ] Navigate to `/market` page
- [ ] Verify market page loads correctly
- [ ] Wait for items to load from pricing API
- [ ] Verify items display with real prices
- [ ] Check price sources are indicated:
  - [ ] Steam Market prices
  - [ ] CSGOFloat prices
  - [ ] Buff163 prices (if available)

### Price Sorting and Filtering
- [ ] Test price sorting:
  - [ ] Low to high
  - [ ] High to low
- [ ] Test category filtering:
  - [ ] Rifles
  - [ ] Pistols
  - [ ] Knives
  - [ ] Gloves
  - [ ] Other categories
- [ ] Test quality/rarity filtering
- [ ] Test search functionality in market

### Item Details
- [ ] Click on market items to view details
- [ ] Verify item detail modal opens
- [ ] Check price history chart displays
- [ ] Verify price trends shown (up/down indicators)
- [ ] Test "Add to Trade" functionality from market

## Phase 4: Trade Creation & Execution

### Trade Setup
- [ ] Navigate to `/trade` page
- [ ] Verify trade page loads correctly
- [ ] Enter bot trade URL
- [ ] Verify trade URL validation
- [ ] Add items from inventory to trade
- [ ] Verify selected items show in trade preview
- [ ] Check profit calculation displays correctly

### Trade Creation
- [ ] Click "Create Trade" button
- [ ] Verify trade creation request sent
- [ ] Wait for trade ID response
- [ ] Verify trade ID displayed
- [ ] Check trade status shows as "PENDING"

### Bot Assignment and Processing
- [ ] Verify bot assignment occurs
- [ ] Wait for status change to "SENT"
- [ ] Verify trade offer sent to bot
- [ ] Monitor for status change to "ACCEPTED"
- [ ] Verify Mobile Auth confirmation process
- [ ] Wait for final status "COMPLETED"

### Status Monitoring
- [ ] Test real-time status updates via WebSocket
- [ ] Verify status progression: PENDING → SENT → ACCEPTED → COMPLETED
- [ ] Check for error states (DECLINED, FAILED, EXPIRED)
- [ ] Verify appropriate handling of each status

## Phase 5: Wallet Operations

### Balance Management
- [ ] Navigate to `/wallet` page
- [ ] Verify wallet page loads correctly
- [ ] Check current balance displays
- [ ] Verify transaction history shows
- [ ] Check balance updates after trade completion

### Deposit Process
- [ ] Click "Deposit" button
- [ ] Enter deposit amount
- [ ] Select payment method
- [ ] Complete deposit process
- [ ] Verify deposit confirmation
- [ ] Check balance updates correctly

### Withdrawal Process
- [ ] Click "Withdraw" button
- [ ] Enter withdrawal amount
- [ ] Test insufficient balance scenario
- [ ] Verify appropriate error message
- [ ] Test valid withdrawal request
- [ ] Verify withdrawal processing

## Phase 6: Admin Dashboard

### Admin Login
- [ ] Switch to admin user credentials
- [ ] Navigate to admin panel
- [ ] Verify admin authentication required
- [ ] Complete admin login if needed

### Dashboard Metrics
- [ ] Verify admin dashboard loads
- [ ] Check system metrics display:
  - [ ] Total users
  - [ ] Total trades
  - [ ] Revenue statistics
  - [ ] Bot status indicators
- [ ] Verify metrics update in real-time

### User Management
- [ ] Navigate to user management section
- [ ] Verify user list displays
- [ ] Test user search functionality
- [ ] Open user details modal
- [ ] Check user activity logs

### Bot Management
- [ ] Navigate to bot management section
- [ ] Verify bot list displays with status
- [ ] Check bot online/offline status
- [ ] Test bot activation/deactivation
- [ ] Verify bot configuration options

### Trade Management
- [ ] Navigate to trade management section
- [ ] Verify trade list displays with filters
- [ ] Apply various filters (status, date, user)
- [ ] Open trade details
- [ ] Test trade actions (view, cancel, etc.)

### Audit Logs
- [ ] Navigate to audit logs section
- [ ] Verify audit logs display
- [ ] Test log filtering
- [ ] Check log detail views
- [ ] Verify security events logged

## Phase 7: Real-time Updates

### WebSocket Connection
- [ ] Verify WebSocket connection established
- [ ] Check connection status indicator
- [ ] Test connection stability during navigation
- [ ] Verify reconnection after temporary disconnect

### Live Updates
- [ ] Monitor trade status updates in real-time
- [ ] Verify price updates received
- [ ] Check balance updates after transactions
- [ ] Test inventory updates after trade completion
- [ ] Verify notifications display for events

### Notifications
- [ ] Test success notifications
- [ ] Test error notifications
- [ ] Test warning notifications
- [ ] Verify notification persistence and dismissal
- [ ] Check notification settings/preferences

## Phase 8: Error Scenarios

### Input Validation
- [ ] Test invalid trade URL handling
- [ ] Test insufficient balance errors
- [ ] Test invalid item selection
- [ ] Verify clear error messages displayed
- [ ] Check error recovery options

### System Errors
- [ ] Test bot offline scenarios
- [ ] Test Steam API timeout handling
- [ ] Test rate limiting responses
- [ ] Verify graceful degradation
- [ ] Check retry mechanisms

### Network Issues
- [ ] Test network failure simulation
- [ ] Verify reconnection attempts
- [ ] Check offline mode handling
- [ ] Test connection restoration

### Data Validation
- [ ] Test concurrent trade limit enforcement
- [ ] Test expired session handling
- [ ] Test database connection loss
- [ ] Verify data integrity maintained
- [ ] Check rollback mechanisms

## Phase 9: Log Verification

### Backend Logs
- [ ] Monitor backend logs during test execution
- [ ] Verify no critical errors in logs
- [ ] Check trade creation logged
- [ ] Verify bot actions logged
- [ ] Check Mobile Auth confirmation logged
- [ ] Verify API calls logged with response times

### Frontend Logs
- [ ] Check browser console for errors
- [ ] Verify WebSocket events logged
- [ ] Check performance metrics captured
- [ ] Verify user interactions tracked

### Error Tracking
- [ ] Verify error scenarios logged appropriately
- [ ] Check error recovery attempts logged
- [ ] Verify system health metrics captured
- [ ] Check audit trail completeness

## Phase 10: Performance Checks

### Page Load Times
- [ ] Measure page load times for each major page:
  - [ ] Login page: < 3 seconds
  - [ ] Inventory page: < 5 seconds
  - [ ] Market page: < 3 seconds
  - [ ] Trade page: < 2 seconds
  - [ ] Wallet page: < 2 seconds
- [ ] Verify no significant performance degradation

### API Response Times
- [ ] Monitor API response times:
  - [ ] Auth endpoints: < 1 second
  - [ ] Inventory sync: < 30 seconds
  - [ ] Trade creation: < 5 seconds
  - [ ] Price updates: < 2 seconds
- [ ] Check for timeout issues

### Trade Completion Time
- [ ] Measure total trade completion time: < 5 minutes
- [ ] Verify status polling intervals appropriate
- [ ] Check for trade processing bottlenecks

### Memory Usage
- [ ] Monitor browser memory usage
- [ ] Check for memory leaks during extended use
- [ ] Verify memory cleanup on navigation

## Post-Test Cleanup

### Trade Cleanup
- [ ] Cancel any pending trades
- [ ] Verify no orphaned trade offers
- [ ] Check trade status cleanup

### Data Verification
- [ ] Verify database consistency
- [ ] Check for data corruption
- [ ] Verify audit trail integrity

### System Health
- [ ] Check system resource usage
- [ ] Review error logs for issues
- [ ] Verify all services still running
- [ ] Check for memory leaks or performance issues

### Artifact Collection
- [ ] Save test screenshots
- [ ] Export browser logs
- [ ] Capture network traces
- [ ] Document any issues found
- [ ] Archive test configuration used

## Notes Section

### Test Environment Details
- **Test Date**: _______________
- **Test Environment**: Development/Staging/Production
- **Browser Used**: _______________
- **Browser Version**: _______________
- **Test Duration**: _______________
- **Test User**: _______________
- **Test Bot**: _______________

### Issues Found
| Issue # | Component | Description | Severity | Status |
|---------|-----------|-------------|----------|--------| 1 |           |             |          |        |
| 2 |           |             |          |        |
| 3 |           |             |          |        |

### Performance Metrics
- **Average Page Load Time**: _______________
- **Average API Response Time**: _______________
- **Trade Completion Time**: _______________
- **Memory Usage Peak**: _______________
- **WebSocket Latency**: _______________

### Recommendations
1. ________________________________________________
2. ________________________________________________
3. ________________________________________________

### Test Sign-off
- **Tester Name**: _______________
- **Test Completed**: Yes/No
- **Issues Found**: Yes/No
- **Ready for Production**: Yes/No

---

**Note**: This checklist should be completed for each major release or when significant changes are made to the application. Any failed items should be documented and addressed before deployment.