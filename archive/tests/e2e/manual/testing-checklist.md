# E2E Testing Manual Testing Checklist

This document provides a comprehensive manual testing checklist for the Steam Marketplace E2E testing phase. Use this checklist to validate the complete user journey and ensure all features work correctly before production deployment.

## Testing Instructions

1. **Environment Setup**: Ensure all services are running (PostgreSQL, MongoDB, Redis, Backend, Frontend)
2. **Test Data**: Use the seeded test data or create your own test accounts
3. **Browser**: Test on Chrome, Firefox, and Safari
4. **Device Testing**: Test on Desktop, Tablet, and Mobile devices
5. **Network Conditions**: Test under normal and slow network conditions

## Authentication Testing

### Steam OAuth Login
- [ ] Navigate to `/auth/login`
- [ ] Click "Login with Steam" button
- [ ] Verify redirect to Steam login page
- [ ] Mock Steam authentication (use test credentials)
- [ ] Verify redirect back to dashboard after successful login
- [ ] Verify JWT tokens are stored in localStorage
- [ ] Verify user information is displayed correctly
- [ ] Verify first user gets admin role automatically

### Trade URL Setup
- [ ] Navigate to `/profile` after login
- [ ] Click on trade URL input field
- [ ] Enter valid Steam trade URL: `https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=abcdefg`
- [ ] Click "Save Trade URL" button
- [ ] Verify success message appears
- [ ] Verify URL is saved and displayed in the field
- [ ] Test invalid URL: `invalid-url`
- [ ] Verify validation error message appears
- [ ] Test edge cases: empty URL, malformed URL, missing token

### Session Management
- [ ] Login and navigate to different pages
- [ ] Refresh the page - verify user remains logged in
- [ ] Close browser tab and reopen - verify session persists
- [ ] Wait for JWT token expiry (simulate by clearing tokens)
- [ ] Verify automatic token refresh or redirect to login
- [ ] Click logout button
- [ ] Verify tokens are cleared from localStorage
- [ ] Verify redirect to landing page
- [ ] Verify cannot access protected routes after logout

## Inventory Testing

### Manual Sync Trigger
- [ ] Navigate to `/inventory`
- [ ] Click "Sync Inventory" button
- [ ] Verify loading state is shown
- [ ] Wait for sync completion (check status indicator)
- [ ] Verify success message appears
- [ ] Verify inventory items are displayed in grid format
- [ ] Verify sync timestamp is updated

### Multi-Game Inventory
- [ ] Verify items from CS:GO (App ID: 730) are displayed
- [ ] Verify items from Dota 2 (App ID: 570) are displayed
- [ ] Verify items from Team Fortress 2 (App ID: 440) are displayed
- [ ] Verify items from Rust (App ID: 252490) are displayed
- [ ] Use game filter dropdown to switch between games
- [ ] Verify correct items are shown for each game
- [ ] Verify item metadata is correct (name, rarity, wear, float, stickers)

### Filtering and Search
- [ ] Test game filter (CS:GO, Dota 2, TF2, Rust)
- [ ] Test tradability filter (Tradable, Non-tradable)
- [ ] Test rarity filter (Common, Uncommon, Rare, etc.)
- [ ] Test price range filter (set min/max values)
- [ ] Test search by item name
- [ ] Verify filters work together (combination testing)
- [ ] Clear all filters and verify all items return
- [ ] Verify search suggestions/autocomplete (if implemented)

### Pagination
- [ ] Verify pagination controls are visible
- [ ] Navigate to page 2, 3, etc.
- [ ] Verify correct items are shown on each page
- [ ] Test "Previous" and "Next" buttons
- [ ] Test direct page number selection
- [ ] Verify page information (e.g., "1-20 of 150 items")
- [ ] Test edge cases (last page, empty results)

### Cache Validation
- [ ] Perform initial inventory sync
- [ ] Immediately trigger another sync
- [ ] Verify second sync uses cache (faster response)
- [ ] Verify cache timeout works (wait and sync again)
- [ ] Check cache hit/miss metrics in monitoring

## Market Testing

### Market Listings
- [ ] Navigate to `/market`
- [ ] Verify item grid displays correctly
- [ ] Verify item images load properly
- [ ] Verify item prices are displayed
- [ ] Verify rarity badges/colors are shown
- [ ] Verify item descriptions are visible
- [ ] Test infinite scroll or pagination

### Price Display
- [ ] Verify prices from multiple sources are shown:
  - Steam Market price
  - CSGOFloat price (if applicable)
  - Buff163 price (if applicable)
- [ ] Click on item to view detailed price information
- [ ] Verify price history chart renders
- [ ] Verify current price is highlighted
- [ ] Test price update intervals (wait 15 minutes for high-priority items)

### Sorting and Filtering
- [ ] Test sort by price (low to high, high to low)
- [ ] Test sort by popularity
- [ ] Test sort by recent listings
- [ ] Test sort by item name
- [ ] Test game filter in market
- [ ] Test price range filter
- [ ] Test rarity filter
- [ ] Verify results update correctly after each sort/filter action

### Item Detail Modal
- [ ] Click on any item in the market
- [ ] Verify item detail modal opens
- [ ] Verify item name, description, and images
- [ ] Verify float value and wear condition
- [ ] Verify stickers and patterns (if any)
- [ ] Verify price history graph
- [ ] Verify buy/trade button functionality
- [ ] Close modal and verify it disappears completely

### Price Trends
- [ ] Navigate to trends section
- [ ] Verify "Top Gainers" section
- [ ] Verify "Top Losers" section
- [ ] Verify volatile items are highlighted
- [ ] Verify percentage changes are calculated correctly
- [ ] Test trend period filters (24h, 7d, 30d)

### Search Functionality
- [ ] Use search bar to search for specific items
- [ ] Verify autocomplete suggestions appear
- [ ] Click on search suggestions
- [ ] Verify search results are accurate
- [ ] Test search with partial names
- [ ] Test search with special characters
- [ ] Test search with no results

## Trading Testing

### Trade Initiation
- [ ] Navigate to `/trade`
- [ ] Verify inventory items are loaded
- [ ] Select items to offer from inventory
- [ ] Verify selected items appear in offer section
- [ ] Choose trade type (Deposit, Withdrawal, Trade)
- [ ] For withdrawal: enter amount and verify validation
- [ ] Verify profit/loss calculation is displayed
- [ ] Verify fee calculation is shown

### Trade Validation
- [ ] Try to create trade with no items selected
- [ ] Verify error message appears
- [ ] Try withdrawal with amount exceeding balance
- [ ] Verify insufficient balance error
- [ ] Try trade while under Steam trade hold
- [ ] Verify trade hold warning
- [ ] Try trade when no bots are available
- [ ] Verify bot unavailable error

### Trade Submission
- [ ] Select valid items and create trade
- [ ] Verify trade is queued (status: pending)
- [ ] Verify trade ID is generated
- [ ] Verify success message appears
- [ ] Navigate to trade history
- [ ] Verify trade appears in list

### Bot Assignment
- [ ] Verify bot is selected from available pool
- [ ] Verify bot status changes to "Assigned" or similar
- [ ] Check bot panel in admin section (if accessible)
- [ ] Verify bot shows as having active trades
- [ ] Test with multiple concurrent trades

### Trade Status Updates
- [ ] Create a trade and monitor status changes
- [ ] Verify real-time status updates (pending → sent → accepted → completed)
- [ ] Check WebSocket messages in browser console
- [ ] Verify notifications appear for status changes
- [ ] Test trade completion flow
- [ ] Verify inventory updates after trade completion
- [ ] Verify wallet balance updates (for deposit/withdrawal trades)

### Trade Cancellation
- [ ] Create a pending trade
- [ ] Click "Cancel Trade" button
- [ ] Verify confirmation dialog appears
- [ ] Confirm cancellation
- [ ] Verify trade status changes to "Cancelled"
- [ ] Verify items are returned to inventory
- [ ] Try to cancel completed trade (should fail)

## Wallet Testing

### Balance Display
- [ ] Navigate to `/dashboard` or wallet section
- [ ] Verify current balance is displayed
- [ ] Verify currency formatting is correct
- [ ] Verify balance updates in real-time
- [ ] Test with different currency formats

### Deposit Flow
- [ ] Click "Deposit" button
- [ ] Select payment method (Stripe, PayPal, Crypto)
- [ ] Enter deposit amount
- [ ] Verify minimum deposit validation (default: $10)
- [ ] Verify maximum deposit validation (default: $10,000)
- [ ] Submit deposit request
- [ ] Verify transaction is created with "pending" status
- [ ] Verify transaction appears in history
- [ ] Mock successful payment completion
- [ ] Verify balance is updated

### Withdrawal Flow
- [ ] Click "Withdraw" button
- [ ] Enter withdrawal amount
- [ ] Verify minimum withdrawal validation (default: $10)
- [ ] Verify daily limit validation (default: $5,000)
- [ ] Verify balance sufficiency check
- [ ] Verify withdrawal fee calculation (default: 2.5%)
- [ ] Submit withdrawal request
- [ ] Verify transaction created with "pending" status
- [ ] Mock withdrawal approval process
- [ ] Verify final balance update

### Transaction History
- [ ] Navigate to transaction history
- [ ] Verify all transaction types are shown (deposit, withdrawal, trade, fee)
- [ ] Test filtering by transaction type
- [ ] Test filtering by status (pending, completed, failed)
- [ ] Test date range filtering
- [ ] Verify pagination works
- [ ] Test export functionality (if implemented)

### Referral System
- [ ] Navigate to referral section
- [ ] Verify referral code is displayed
- [ ] Copy referral link
- [ ] Test applying a referral code
- [ ] Verify bonus is credited to both referrer and referee
- [ ] Verify referral requirements (first trade, minimum value)

### User Transfers
- [ ] Initiate transfer to another user
- [ ] Enter recipient username/ID
- [ ] Enter transfer amount
- [ ] Verify sender balance decreases
- [ ] Verify recipient balance increases
- [ ] Verify transaction is logged
- [ ] Test transfer validation (insufficient funds, invalid recipient)

## Admin Panel Testing

### Admin Access
- [ ] Login as admin user (first user is auto-promoted)
- [ ] Navigate to `/admin`
- [ ] Verify admin dashboard loads
- [ ] Verify platform statistics are shown (users, trades, revenue)
- [ ] Check admin-specific features are accessible

### User Management
- [ ] Navigate to `/admin/users`
- [ ] Verify user list displays with search and filters
- [ ] Click on user to view detailed information
- [ ] Test user search by username, email, Steam ID
- [ ] Test role management (USER → MODERATOR → ADMIN)
- [ ] Test user banning (temporary and permanent)
- [ ] Test user suspension
- [ ] Verify audit log entry is created for admin actions

### Bot Management
- [ ] Navigate to `/admin/bots`
- [ ] Verify bot list with status indicators
- [ ] Click "Add Bot" button
- [ ] Fill in bot details:
  - Account name
  - Password
  - Shared secret
  - Identity secret
  - Max concurrent trades
- [ ] Submit bot creation form
- [ ] Verify bot is created and status shows "Online"
- [ ] Test "Force Login" action
- [ ] Test bot deactivation/activation
- [ ] Verify bot status updates in real-time

### Trade Management
- [ ] Navigate to `/admin/trades`
- [ ] View all trades with filters (status, user, date)
- [ ] Click on trade to view detailed information
- [ ] Test "Force Complete" action
- [ ] Test "Force Cancel" action
- [ ] Test creating dispute for trade
- [ ] Test assigning dispute to admin
- [ ] Test dispute resolution with refund

### System Configuration
- [ ] Navigate to `/admin/config`
- [ ] View all configuration values
- [ ] Test updating a configuration value (e.g., MAX_TRADES_PER_HOUR)
- [ ] Verify change is persisted
- [ ] Test bulk configuration updates
- [ ] Verify configuration validation

### Audit Logs
- [ ] Navigate to `/admin/audit-logs`
- [ ] Verify all admin actions are logged
- [ ] Check timestamps are accurate
- [ ] Verify user information is included
- [ ] Verify action type is recorded
- [ ] Verify before/after snapshots (for configuration changes)
- [ ] Test filtering by date range
- [ ] Test filtering by user
- [ ] Test filtering by action type
- [ ] Test log export (JSON/CSV format)

## Real-time Updates Testing

### WebSocket Connection
- [ ] Open browser developer tools
- [ ] Navigate to any page and check WebSocket connection
- [ ] Verify connection to `ws://localhost:3001`
- [ ] Check connection status in console
- [ ] Verify no connection errors

### Trade Status Updates
- [ ] Open two browser tabs
- [ ] In tab 1, create a trade
- [ ] In tab 2, navigate to dashboard
- [ ] Verify trade status updates appear in real-time without refresh
- [ ] Test all status transitions (pending → sent → accepted → completed)

### Balance Updates
- [ ] Open two browser tabs
- [ ] In tab 1, trigger a deposit or withdrawal
- [ ] In tab 2, monitor balance display
- [ ] Verify balance updates automatically
- [ ] Check for any delay in updates

### Inventory Updates
- [ ] Complete a trade that adds items to inventory
- [ ] Navigate to inventory page
- [ ] Verify new items appear automatically
- [ ] Test item removal after trade completion

### Price Updates
- [ ] Monitor market page for several minutes
- [ ] Verify prices update periodically (every 15 minutes for high-priority items)
- [ ] Check for price change indicators (up/down arrows, color coding)
- [ ] Verify price history charts update

### Admin Notifications
- [ ] As admin, monitor for real-time alerts
- [ ] Trigger events that should generate notifications:
  - New disputes
  - Failed trades
  - Bot errors
  - High-value trades
- [ ] Verify notifications appear immediately

### Reconnection Handling
- [ ] Disable network connection temporarily
- [ ] Verify reconnection attempt is made
- [ ] Re-enable network connection
- [ ] Verify WebSocket reconnects successfully
- [ ] Verify any queued updates are delivered after reconnection
- [ ] Check for any data loss during disconnection

## Error Handling Testing

### Network Errors
- [ ] Disable network connection during API calls
- [ ] Verify error messages are displayed to user
- [ ] Re-enable network and verify recovery
- [ ] Test retry mechanisms work
- [ ] Verify user can continue using the application

### Validation Errors
- [ ] Test all form validations:
  - Invalid trade URL format
  - Negative deposit amount
  - Amount exceeding limits
  - Invalid email format
  - Weak passwords
- [ ] Verify error messages are clear and actionable
- [ ] Verify form fields are highlighted correctly
- [ [] Verify validation occurs on both client and server side

### Authentication Errors
- [ ] Test expired JWT token scenarios
- [ ] Verify automatic token refresh works
- [ ] Test invalid credentials
- [ ] Verify proper error messages
- [ ] Test session timeout handling

### Rate Limiting
- [ ] Rapidly trigger rate-limited endpoints
- [ ] Verify 429 Too Many Requests response
- [ ] Verify error message is shown to user
- [ ] Verify retry-after header is respected
- [ ] Test rate limits for different endpoints:
  - Trade URL updates (5/minute)
  - Login attempts
  - API calls per user

### Steam API Errors
- [ ] Simulate Steam API timeout
- [ ] Simulate Steam API 503 unavailable
- [ ] Simulate private inventory
- [ ] Verify graceful degradation
- [ ] Verify fallback to cached data
- [ ] Verify user-friendly error messages

### Database Errors
- [ ] Simulate database connection loss
- [ ] Verify error handling without data corruption
- [ ] Verify proper transaction rollback
- [ ] Test database constraint violations
- [ ] Verify application remains stable

### Bot Errors
- [ ] Simulate bot offline status
- [ ] Verify trade queuing for retry
- [ ] Verify user notification
- [ ] Verify admin alerting
- [ ] Test bot error recovery

### Concurrent Operations
- [ ] Test simultaneous trades from same user
- [ ] Test simultaneous balance updates
- [ ] Verify data consistency
- [ ] Verify proper locking mechanisms
- [ ] Check for race conditions
- [ ] Verify no duplicate transactions

## Performance Testing

### Page Load Times
- [ ] Measure page load times for key pages:
  - Dashboard
  - Inventory
  - Market
  - Trade
  - Admin panel
- [ ] Verify load times are acceptable (< 3 seconds)
- [ ] Test with different network speeds

### API Response Times
- [ ] Monitor API response times
- [ ] Verify most endpoints respond within 2 seconds
- [ ] Identify slow endpoints (> 5 seconds)
- [ ] Check database query performance

### Memory Usage
- [ ] Monitor browser memory usage
- [ ] Check for memory leaks during long sessions
- [ [] Verify memory usage is stable

### Concurrent Users
- [ ] Test with multiple users logged in simultaneously
- [ ] Verify system performance doesn't degrade significantly
- [ ] Check for resource contention issues

## Cross-browser Testing

### Chrome
- [ ] Test all major features in Chrome
- [ ] Check for any Chrome-specific issues
- [ ] Verify Chrome developer tools show no errors

### Firefox
- [ ] Test all major features in Firefox
- [ ] Check for any Firefox-specific issues
- [ ] Verify Firefox developer tools show no errors

### Safari
- [ ] Test all major features in Safari
- [ ] Check for any Safari-specific issues
- [ ] Verify Safari developer tools show no errors

### Edge
- [ ] Test all major features in Edge
- [ ] Check for any Edge-specific issues

## Mobile Testing

### Responsive Design
- [ ] Test on various mobile devices
- [ ] Verify responsive design works correctly
- [ ] Test touch interactions
- [ ] Verify mobile navigation works

### Mobile-specific Features
- [ ] Test mobile-optimized forms
- [ ] Verify mobile payment methods work
- [ ] Test mobile notifications
- [ ] Verify mobile performance is acceptable

## Accessibility Testing

### Keyboard Navigation
- [ ] Navigate using only keyboard
- [ ] Verify tab order is logical
- [ ] Test keyboard shortcuts
- [ ] Verify focus indicators are visible

### Screen Reader
- [ ] Test with screen reader enabled
- [ ] Verify all interactive elements have proper labels
- [ ] Check alt text for images
- [ ] Verify form labels are associated correctly

### Color and Contrast
- [ ] Verify sufficient color contrast
- [ ] Test with colorblind simulation
- [ ] Verify information isn't conveyed by color alone

## Security Testing

### Input Validation
- [ ] Test for SQL injection attempts
- [ ] Test for XSS attempts
- [ ] Test for CSRF protection
- [ ] Verify input sanitization

### Authentication Security
- [ ] Verify JWT tokens are secure
- [ ] Test session security
- [ ] Verify password requirements
- [ ] Test 2FA if implemented

### Data Protection
- [ ] Verify sensitive data is encrypted
- [ ] Check for data leakage in logs
- [ ] Verify proper data validation
- [ ] Test file upload security

## Documentation

Tester Name: _________________
Date: _________________
Environment: Development/Staging/Production
Browser: _________________
Device: _________________

## Issues Found

| Issue | Module | Severity | Description | Steps to Reproduce | Status |
|-------|--------|----------|-------------|-------------------|---------|
|       |        |          |             |                   |         |
|       |        |          |             |                   |         |
|       |        |          |             |                   |         |

## Test Summary

- Total Test Cases: _____
- Passed: _____
- Failed: _____
- Blocked: _____
- Pass Rate: _____%

## Sign-off

Tester: _________________ Date: _____
QA Lead: _________________ Date: _____
Product Owner: _________________ Date: _____