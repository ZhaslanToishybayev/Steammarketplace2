# Deprecated Files

This folder contains files that are no longer used in the application but are kept for historical reference.

## mock-server.js

- **Status**: Deprecated
- **Reason**: The real NestJS backend (`src/main.ts`) is used in production
- **Last Used**: Initial prototyping phase
- **Replacement**: `src/main.ts` with full NestJS modules
- **Created**: For early development and API prototyping
- **Removed**: Production usage replaced with real Steam APIs

### What Was This?

This was a simple Node.js HTTP server that provided mock API responses for:
- Inventory data (mock CS:GO items)
- Trading history (mock trades)
- User profiles (mock Steam users)
- Price data (mock market prices)

### Why Was It Deprecated?

1. **Real APIs**: The application now uses real Steam APIs via NestJS modules
2. **Production Ready**: All services now connect to actual Steam endpoints
3. **Better Architecture**: NestJS provides better structure, validation, and testing
4. **No Mocks**: Production environment uses 100% real Steam data

### Migration Path

| Mock Server | Real Implementation |
|-------------|-------------------|
| `/api/inventory` | `SteamApiService.getInventory()` |
| `/api/trading` | `SteamTradeService.createTrade()` |
| `/api/auth/steam` | `SteamStrategy` (OpenID) |
| `/api/users/profile` | `AuthService.validateUser()` |

### When to Delete

These files can be safely deleted after confirming:
- [ ] No references to `mock-server.js` exist in the codebase
- [ ] All team members are aware of the real API implementation
- [ ] Documentation has been updated to reflect real API usage
- [ ] Tests use `test-data-seeder.ts` instead of mock server

### Current Status

✅ **NOT USED** - The application runs on real Steam APIs
✅ **DEPRECATED** - Kept for reference only
✅ **REPLACED** - Real NestJS backend in `src/main.ts`