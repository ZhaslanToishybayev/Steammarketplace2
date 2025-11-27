# Frontend API vs Backend Controller Analysis

## Summary
This document analyzes the mismatch between frontend API methods defined in `/apps/frontend/src/lib/api.ts` and the actual backend endpoints available in the NestJS application.

## Analysis by API Module

### 1. `itemAPI` - MAJOR MISMATCH ⚠️

**Frontend Methods:**
- `getAll()` - `/items` (with extensive filtering)
- `getById(id)` - `/items/{id}`
- `create(data)` - `/items` (POST)
- `update(id, data)` - `/items/{id}` (PUT)
- `delete(id)` - `/items/{id}` (DELETE)
- `search(query)` - `/items/search`
- `getByCategory(category)` - `/items/category/{category}`
- `getInventory()` - `/inventory` (with filtering)
- `syncInventory()` - `/inventory/sync`
- `getItem(id)` - `/inventory/{id}`
- `getItemPricing(id, timeRange)` - `/items/{id}/pricing`

**Backend Reality:**
- ✅ `/api/inventory` - GET (user inventory)
- ✅ `/api/inventory/:assetId` - GET (specific item)
- ✅ `/api/inventory/sync` - POST (sync inventory)
- ✅ `/api/pricing/item/:itemId` - GET (pricing)
- ❌ `/api/items` - No items CRUD endpoints exist
- ❌ `/api/items/search` - No search endpoint
- ❌ `/api/items/category/{category}` - No category endpoint
- ❌ `/api/items/{id}/pricing` - No direct pricing endpoint for items

**Issues:**
- Frontend assumes full CRUD operations on items, but backend only provides inventory access
- No item management endpoints exist in backend
- Search and category filtering not implemented
- Item pricing is handled through separate pricing service

### 2. `tradeAPI` - PARTIAL MISMATCH ⚠️

**Frontend Methods:**
- `getTrades()` - `/trades` (with extensive filtering)
- `getTrade(id)` - `/trades/{id}`
- `createTrade(data)` - `/trades` (POST)
- `respondToTrade(tradeId, action)` - `/trades/{tradeId}/respond`
- `cancelTrade(tradeId)` - `/trades/{tradeId}/cancel`
- `getTradeStatistics(timeRange)` - `/trades/statistics`
- Legacy methods: `getAll()`, `getById()`, `create()`, `respond()`, `cancel()`

**Backend Reality:**
- ✅ `/api/trades` - GET/POST
- ✅ `/api/trades/:id` - GET
- ✅ `/api/trades/:id/cancel` - POST
- ✅ `/api/trades/statistics` - GET
- ❌ `/api/trades/{tradeId}/respond` - No respond endpoint
- ❌ `/api/trades/{id}/response` - No response endpoint (legacy)
- ❌ `/api/trades/{id}/cancel` - Legacy cancel endpoint doesn't exist

**Issues:**
- Missing trade response endpoints
- Legacy methods don't match current API structure
- Some HTTP methods don't align (POST vs PUT)

### 3. `walletAPI` - MOSTLY MATCHES ✅

**Frontend Methods:**
- `getBalance()` - `/wallet/balance`
- `getTransactions()` - `/wallet/transactions`
- `getTransaction(id)` - `/wallet/transactions/{id}`
- `deposit(amount)` - `/wallet/deposit`
- `withdraw(amount, method)` - `/wallet/withdraw`
- `transfer(data)` - `/wallet/transfer`
- `getStatistics(timeRange)` - `/wallet/statistics`
- `getPaymentMethods()` - `/wallet/payment-methods`
- `getWithdrawalLimits()` - `/wallet/withdrawal-limits`
- `getPendingWithdrawals()` - `/wallet/pending-withdrawals`

**Backend Reality:**
- ✅ `/api/wallet/balance` - GET
- ✅ `/api/wallet/deposit` - POST
- ✅ `/api/wallet/withdraw` - POST
- ✅ `/api/wallet/transfer` - POST
- ❌ `/api/wallet/transactions` - No transactions endpoint (uses `/api/transactions`)
- ❌ `/api/wallet/statistics` - No statistics endpoint
- ❌ `/api/wallet/payment-methods` - No payment methods endpoint
- ❌ `/api/wallet/withdrawal-limits` - No limits endpoint
- ❌ `/api/wallet/pending-withdrawals` - No pending withdrawals endpoint

**Issues:**
- Transaction endpoints are under `/api/transactions`, not `/api/wallet/transactions`
- Missing several wallet utility endpoints

### 4. `notificationAPI` - MAJOR MISMATCH ⚠️

**Frontend Methods:**
- `getAll()` - `/notifications` (with filtering)
- `markAsRead(id)` - `/notifications/{id}/read`
- `markAllAsRead()` - `/notifications/read-all`
- `delete(id)` - `/notifications/{id}/delete`

**Backend Reality:**
- ❌ `/api/notifications` - No notifications endpoints exist
- ❌ `/api/user/notifications/preferences` - Only preferences, not actual notifications

**Issues:**
- Complete notification system missing from backend
- Only notification preferences are implemented

### 5. `botAPI` - FULL MATCH ✅

**Frontend Methods:**
- `getAll()` - `/bots` (with filtering)
- `getById(id)` - `/bots/{id}`
- `create(data)` - `/bots`
- `update(id, data)` - `/bots/{id}`
- `delete(id)` - `/bots/{id}`
- `activate(id)` - `/bots/{id}/activate`
- `deactivate(id)` - `/bots/{id}/deactivate`
- `forceLogin(id)` - `/bots/{id}/login`
- `refresh(id)` - `/bots/{id}/refresh`
- `getStatistics(id)` - `/bots/{id}/statistics`
- `getLogs(id)` - `/bots/{id}/logs`
- `getTrades(id)` - `/bots/{id}/trades`
- `getStats()` - `/bots/stats`
- `bulkActivate(ids)` - `/bots/bulk/activate`
- `bulkDeactivate(ids)` - `/bots/bulk/deactivate`

**Backend Reality:**
- ✅ All bot endpoints match exactly
- ✅ All HTTP methods align correctly
- ✅ Admin-only access properly implemented

### 6. `userAPI` - MOSTLY MATCHES ✅

**Frontend Methods:**
- `getProfile()` - `/user/profile`
- `updateProfile(data)` - `/user/profile`
- `getSettings()` - `/user/settings`
- `updateSettings(data)` - `/user/settings`
- `getStatistics()` - `/user/statistics`
- `getNotificationPreferences()` - `/user/notifications/preferences`
- `updateNotificationPreferences(data)` - `/user/notifications/preferences`

**Backend Reality:**
- ✅ `/api/user/profile` - GET/PUT
- ✅ `/api/user/settings` - GET/PUT
- ✅ `/api/user/statistics` - GET
- ✅ `/api/user/notifications/preferences` - GET/PUT

## Recommendations

### 1. Immediate Actions Required

1. **Remove or comment out unimplemented methods** in frontend API:
   - `itemAPI.create`, `update`, `delete`, `search`, `getByCategory`
   - `tradeAPI.respondToTrade`, legacy methods
   - Most `walletAPI` utility methods
   - All `notificationAPI` methods

2. **Fix URL mismatches**:
   - `walletAPI.getTransactions` should call `/api/transactions`
   - `walletAPI.getTransaction` should call `/api/transactions/{id}`

3. **Update method signatures** to match backend:
   - `tradeAPI.cancelTrade` uses POST, not DELETE
   - `tradeAPI.respondToTrade` should be `tradeAPI.respondToTrade` with POST

### 2. Backend Implementation Required

1. **Complete notification system** - Major missing functionality
2. **Item management system** - Full CRUD operations
3. **Wallet utility endpoints** - Statistics, payment methods, limits
4. **Trade response endpoints** - Accept/decline functionality

### 3. Long-term Solution

**Generate frontend API from OpenAPI spec** to prevent future drift:
- Use tools like `@rtk-query/codegen` or `openapi-generator`
- Ensure contract consistency
- Automated type generation
- Documentation synchronization

## Risk Assessment

- **High Risk**: `itemAPI` and `notificationAPI` have major gaps
- **Medium Risk**: `tradeAPI` missing response functionality
- **Low Risk**: `walletAPI` URL mismatches (easily fixable)
- **No Risk**: `botAPI` and `userAPI` are properly implemented