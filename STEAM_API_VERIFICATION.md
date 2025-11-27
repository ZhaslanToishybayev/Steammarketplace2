# Steam API Verification Guide

This guide helps you verify that the Steam Marketplace is using **real Steam APIs** and not mocks.

## Quick Verification Checklist

### 1. Environment Configuration
- [ ] `.env` file has real `STEAM_API_KEY` (not "your-steam-api-key")
- [ ] Bot credentials configured with real Steam account
- [ ] `NODE_ENV` is NOT set to use mocks

### 2. Backend Logs
Start backend and check logs for:
```
✅ "Fetching inventory for [steamId] from https://steamcommunity.com/inventory/..."
✅ "Making request to https://api.steampowered.com/..."
✅ "Bot [accountName] logged on successfully"
❌ "Returning cached inventory" (on first request)
❌ "Using mock data"
```

### 3. API Endpoints Test

#### Test Inventory Sync
```bash
curl -X POST http://localhost:3001/api/inventory/sync \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"appId": 730}'
```

Expected: Real items from your Steam inventory, not mock data.

#### Test Steam OAuth
```bash
curl http://localhost:3001/api/auth/steam
```

Expected: Redirect to `https://steamcommunity.com/openid/login`

### 4. Database Verification
Check PostgreSQL for real Steam IDs:
```sql
SELECT "steamId", "username" FROM "user" LIMIT 5;
```

Expected: 17-digit Steam IDs (e.g., `76561198012345678`), not mock IDs like `123456789`.

### 5. Trading Test
Create a trade and check logs:
```
✅ "Trade offer [offerId] sent successfully"
✅ "Bot [accountName] logged on successfully"
❌ "Using mock trade offer"
```

## Common Issues

### "Private Inventory" Error
- User's Steam inventory is private
- Solution: Make inventory public in Steam settings

### "Invalid Steam API Key"
- `STEAM_API_KEY` in `.env` is incorrect
- Solution: Get new key from https://steamcommunity.com/dev/apikey

### "Rate Limit Exceeded"
- Too many requests to Steam API
- Solution: Wait 1 minute, check `STEAM_API_RATE_LIMIT_PER_MINUTE` in `.env`

## Files Using Real Steam APIs

| File | Purpose | Steam API Used |
|------|---------|----------------|
| `inventory/services/steam-api.service.ts` | Inventory fetching | `steamcommunity.com/inventory/` |
| `auth/strategies/steam.strategy.ts` | Authentication | Steam OpenID |
| `trading/services/steam-trade.service.ts` | Trading | `steam-user`, `steam-tradeoffer-manager` |
| `pricing/services/pricing-api.service.ts` | Pricing | Steam Market API |

## Deprecated Files (NOT Used)
- `mock-server.js` - Deprecated, moved to `deprecated/`
- `test-data-seeder.ts` - Only for E2E tests

## Your Configuration
Bot: `Sgovt1` with secrets configured

These are **real credentials** and will connect to Steam's production APIs.

## Implementation Details

### Real API Integration Points

#### 1. Authentication Flow
```typescript
// apps/backend/src/modules/auth/strategies/steam.strategy.ts
// Uses real Steam OpenID - no mocks
passport.use(new SteamStrategy({
  returnURL: process.env.STEAM_RETURN_URL,
  realm: process.env.STEAM_REALM,
  apiKey: process.env.STEAM_API_KEY, // Real API key required
}));
```

#### 2. Inventory Fetching
```typescript
// apps/backend/src/modules/inventory/services/steam-api.service.ts
// Makes real HTTP requests to Steam Community API
const url = `${this.configService.get('STEAM_INVENTORY_API_URL')}/inventory/${steamId}/${appId}/2`;
const response = await this.httpService.axiosRef.get(url);
```

#### 3. Bot Trading
```typescript
// apps/backend/src/modules/trading/services/steam-trade.service.ts
// Uses real steam-user and steam-tradeoffer-manager
this.botClient.logOn({
  accountName: bot.accountName, // Real bot credentials
  password: decryptedPassword,
  twoFactorCode: steamTotp.generateAuthCode(bot.sharedSecret)
});
```

### Rate Limiting & Caching
- Steam API rate limits: 5 requests/second, 200/minute
- Redis caching: 30-minute TTL for inventory data
- Intelligent retry logic with exponential backoff

### Error Handling
- Graceful handling of private inventories
- Automatic retry for rate limit errors
- Fallback mechanisms for API failures

## Testing vs Production

### E2E Tests
- Use `test-data-seeder.ts` for realistic test data
- Never use mock-server.js (deprecated)
- Test against real database schemas

### Production
- All APIs connect to Steam's production endpoints
- Real user inventories and trade offers
- Live bot trading with real Steam accounts
- No mock data anywhere in the system

## Verification Commands

### Check for Mock References
```bash
# Search for any remaining mock references
grep -r "mock-server" apps/ tests/ --exclude-dir=node_modules
grep -r "mock data" apps/ tests/ --exclude-dir=node_modules

# Should only find deprecation notices in deprecated/ folder
```

### Verify Real API Usage
```bash
# Check backend dependencies for real Steam libraries
cd apps/backend
npm list steam-user steam-tradeoffer-manager steam-totp passport-steam

# Should show real packages, not mocks
```

### Monitor API Calls
```bash
# Start backend and watch for real API calls
npm run start:dev
# Look for "steamcommunity.com" and "api.steampowered.com" in logs
```

## Security Notes

- All Steam API keys are real production keys
- Bot credentials use AES-256-GCM encryption
- No mock data is stored or transmitted
- All trade operations use real Steam endpoints
- Production-ready rate limiting and error handling

## Migration from Mocks

If you were previously using mock-server.js:

1. **Remove any custom scripts** that referenced mock-server.js
2. **Update environment variables** to use real Steam API keys
3. **Configure real bot credentials** for trading functionality
4. **Test with real Steam accounts** instead of mock data
5. **Monitor logs** to confirm real API usage

The system is now fully production-ready with real Steam API integration.