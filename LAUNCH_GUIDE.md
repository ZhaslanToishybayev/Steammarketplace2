# 🚀 Steam Marketplace Launch Guide

## Prerequisites

Before launching the Steam Marketplace, ensure you have the following installed:

- **Node.js**: ≥18.0.0 (`node --version`)
- **Docker** and **Docker Compose**: (`docker --version`, `docker compose version`)
- **Available ports**: 3000 (frontend), 3001 (backend), 5432 (Postgres), 27017 (MongoDB), 6379 (Redis)

## Launch Sequence

### 1. Install Dependencies

```bash
cd /home/zhaslan/Downloads/testsite
make install
# Or manually:
cd apps/backend && npm install
cd ../frontend && npm install
```

### 2. Create Environment Files

#### Backend Configuration
```bash
# Copy the example environment file
cp apps/backend/.env.example apps/backend/.env

# Edit apps/backend/.env and ensure these key variables are set:
# - STEAM_API_KEY=E1FC69B3707FF57C6267322B0271A86B
# - JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
# - JWT_REFRESH_SECRET=b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2a3b4
# - BOT_ENCRYPTION_KEY=c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2a3b4
# - Database credentials (defaults work with Docker)
# - Redis password: redis_password
```

#### Frontend Configuration
```bash
# Copy the example environment file
cp apps/frontend/.env.local.example apps/frontend/.env.local

# Verify these key variables are set:
# - NEXT_PUBLIC_API_URL=http://localhost:3001/api
# - NEXT_PUBLIC_WS_URL=ws://localhost:3001
# - NEXT_PUBLIC_STEAM_API_KEY=E1FC69B3707FF57C6267322B0271A86B
```

### 3. Verify TypeScript Compilation

```bash
cd apps/backend

# Check for TypeScript errors (should show 0 errors)
npm run type-check

# Run linting
npm run lint

# Build the project (should complete successfully)
npm run build

# Verify dist/ folder was created
ls -la dist/
```

## Step 2.5: Complete Phase 3 TypeScript Fixes (If Needed)

If backend has TypeScript compilation errors:

```bash
cd apps/backend

# Check current error count
npm run phase3:count-errors

# If errors exist, run automated fixes
npm run phase3:full

# Verify build succeeds
npm run build

# Expected: Exit code 0, dist/ folder created
```

**If automated fixes don't resolve all errors**:
1. Review `PHASE3_VERIFICATION.md` for manual fix instructions
2. Check `phase3-errors.txt` for specific error details
3. Apply targeted fixes per error category
4. Re-run `npm run build` until successful

**Success Indicators**:
- ✅ `npm run build` completes without critical errors
- ✅ `dist/main.js` file exists and is >100KB
- ✅ No "Cannot find module" or "Property does not exist" errors
- ⚠️ Warnings are acceptable if build succeeds

**Troubleshooting**:
- **Build fails with import errors**: Run `npm run phase3:fix-imports:apply`
- **Unused variable errors**: Run `npm run phase3:fix-unused:apply`
- **Complex type errors**: Run `npm run phase3:add-assertions:apply` (temporary fix)
- **Still failing**: Check `apps/backend/PHASE3_VERIFICATION.md` for detailed steps

---

### 4. Start Infrastructure (Docker)

```bash
cd /home/zhaslan/Downloads/testsite

# Start database services
docker compose up -d postgres mongodb redis

# Wait 30 seconds for health checks
sleep 30

# Verify all services are healthy
docker compose ps
# All containers should show "healthy" status
```

### 4. Initialize Databases

After starting Docker services and before starting the backend, initialize the databases:

```bash
cd apps/backend

# Start backend once to auto-create tables (TypeORM synchronize=true in development)
npm run start:dev
```

**Wait for these messages in the logs:**
- `🚀 Steam Marketplace Backend is running on port 3001`
- `Database connection established`
- `MongoDB connected`
- Table creation logs (if this is the first run)

**Then stop the backend (Ctrl+C) and verify schema:**

```bash
# Check all tables and collections exist
npm run db:verify
```

Expected output:
```
✅ PostgreSQL Tables: users, refresh_tokens, bots, trades, trade_items, item_prices, etc.
✅ MongoDB Collections: items
🎉 All database objects verified successfully!
```

**Seed market data:**

```bash
# Populate with 1000+ CS:GO items from Steam Market
npm run db:seed
```

**Notes:**
- Takes 10-15 minutes to complete
- Requires valid `STEAM_API_KEY` in `.env` file
- Fetches real item data and price history
- Automatically respects Steam API rate limits

**Check database population:**

```bash
# View counts and statistics
npm run db:status
```

Shows entity counts, items by game, price sources, and activity timestamps.

### 5. Start Backend

```bash
cd apps/backend

# Start the NestJS development server
npm run start:dev
```

**Watch for these success messages in the logs:**
- `🚀 Steam Marketplace Backend is running on port 3001`
- `📚 Swagger documentation available at http://localhost:3001/api/docs`
- `Database connection established` (PostgreSQL)
- `MongoDB connected`
- `Redis connected`
- No database connection errors

### 6. Verify Backend Health

```bash
# Test health endpoint
curl http://localhost:3001/api/health
# Should return: {"status":"ok","info":{"database":{"status":"up"},...}}

# Test API documentation
curl http://localhost:3001/api/docs
# Should return HTML for Swagger UI

# Test metrics endpoint
curl http://localhost:3001/api/metrics
# Should return Prometheus metrics
```

### 7. Start Frontend

```bash
# In a separate terminal
cd apps/frontend

# Start the Next.js development server
npm run dev
```

**Success indicators:**
- Server listening on http://localhost:3000
- No build errors in console
- Hot reload enabled

### 8. Test Full Stack Integration

1. **Open http://localhost:3000** - Landing page should load
2. **Click "Login with Steam"** - Should redirect to Steam OAuth
3. **Check browser Network tab** - API calls to localhost:3001/api should succeed
4. **Visit http://localhost:3001/api/docs** - Swagger UI should be accessible
5. **Test WebSocket connection** - Should establish connection on ws://localhost:3001

## Troubleshooting

### Common Issues

**Port Conflicts:**
```bash
# Check which ports are in use
sudo lsof -i :3000 -i :3001 -i :5432 -i :27017 -i :6379

# Change PORT in apps/backend/.env if needed
PORT=3002
```

**Database Connection Errors:**
```bash
# Check Docker service logs
docker compose logs postgres mongodb redis

# Verify database containers are healthy
docker compose ps --filter health=healthy

# Restart problematic services
docker compose restart postgres

# Check database credentials in .env
grep POSTGRES apps/backend/.env
```

**Database initialization fails:**
```bash
# Verify tables were created
npm run db:verify

# Check TypeORM logs for entity errors
npm run start:dev 2>&1 | grep -i "synchronize\|entity\|table"

# Reset and re-initialize (WARNING: Deletes data)
docker compose down -v
docker compose up -d postgres mongodb redis
# Then repeat database initialization steps
```

**Seeding errors:**
```bash
# Verify STEAM_API_KEY is set and valid
grep STEAM_API_KEY apps/backend/.env
curl "https://api.steampowered.com/ISteamWebAPIUtil/GetSupportedAPIList/v1/"

# Check seeding with verbose output
npm run db:seed -- --verbose

# Handle rate limits (wait and retry)
sleep 60
npm run db:seed
```

**Tables not created:**
- Ensure `NODE_ENV=development` (auto-sync enabled by default)
- Check that entity files are properly exported
- Verify TypeORM configuration in `src/config/database.config.ts`
- Look for "synchronize" in database logs

For detailed database troubleshooting, see [Database Initialization Guide](apps/backend/src/database/README.md).

**TypeScript Errors:**
```bash
# Run verification script
npm run verify:user-entity

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**CORS Errors:**
```bash
# Verify CORS_ORIGIN in backend .env includes frontend URL
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

**Steam API Errors:**
- Verify STEAM_API_KEY is valid at https://steamcommunity.com/dev/apikey
- Check rate limiting in logs
- Ensure STEAM_REALM matches your backend URL

### Docker Service Management

```bash
# View all service logs
docker compose logs -f

# Restart specific service
docker compose restart postgres

# Stop all services
docker compose down

# Clean up volumes (WARNING: Deletes data)
docker compose down -v
```

## Next Steps After Successful Launch

### 1. Seed Market Data
```bash
cd apps/backend
npm run db:seed
```

### 2. Configure Trading Bot
- First user to register is auto-promoted to admin
- Access Admin UI at http://localhost:3000/admin
- Add bot credentials via Admin panel:
  - Bot: Sgovt1
  - Username: Sgovt1
  - Password: Szxc123!
  - Shared Secret: LVke3WPKHWzT8pCNSemh2FMuJ90=
  - Identity Secret: fzCjA+NZa0b3yOeEMhln81qgNM4=

### 3. Test Trading Features
- Sync inventory from Steam
- Create trade offers
- Test price updates
- Verify WebSocket real-time updates

### 4. Monitor Performance
- View metrics at http://localhost:3001/api/metrics
- Check logs for errors: `docker compose logs backend`
- Monitor database performance

## Production Deployment

For production deployment:

1. **Generate new secrets** for JWT and bot encryption
2. **Use production Docker images** instead of development builds
3. **Configure reverse proxy** (nginx) with SSL
4. **Set up monitoring** (Prometheus + Grafana)
5. **Configure backups** for databases
6. **Enable rate limiting** and security headers
7. **Use production Steam API keys** and bot accounts

## Support

- **Main Documentation**: README.md
- **Troubleshooting**: TROUBLESHOOTING.md
- **API Documentation**: http://localhost:3001/api/docs
- **Steam API Verification**: STEAM_API_VERIFICATION.md

---

**✅ Launch Complete!** Your Steam Marketplace is now running and ready for development and testing.