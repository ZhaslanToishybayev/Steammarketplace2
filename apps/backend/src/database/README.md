# Database Initialization Guide

This guide covers the complete database initialization process for the Steam Marketplace backend, including automatic table creation, database verification, seeding, and troubleshooting.

## Overview

The Steam Marketplace backend uses a **polyglot persistence** architecture with three databases:

- **PostgreSQL**: Transactional data (users, trades, prices, wallets) via TypeORM
- **MongoDB**: Item metadata and flexible document storage via Mongoose
- **Redis**: Caching, sessions, queues, and rate limiting via Bull/Redis

### TypeORM Auto-Sync Behavior

**Development Mode** (`NODE_ENV=development`):
- TypeORM automatically creates/updates database tables on startup (`synchronize: true`)
- No manual migrations required during development
- Tables are synced based on entity definitions in `src/modules/*/entities/*.entity.ts`

**Production Mode** (`NODE_ENV=production`):
- TypeORM auto-sync is disabled (`synchronize: false`)
- Requires manual migration generation and execution
- Use `npm run db:migrate` to run migrations

## Development Setup

### Prerequisites

1. **Docker Services Running**:
   ```bash
   docker compose up -d postgres mongodb redis
   ```

2. **Environment Configuration**:
   ```bash
   # Copy example environment file
   cp .env.example .env

   # Required for seeding (get from https://steamcommunity.com/dev/apikey)
   STEAM_API_KEY=your_steam_api_key_here
   ```

3. **Dependencies Installed**:
   ```bash
   npm install
   ```

### Automatic Table Creation

The first time you start the backend, TypeORM will automatically create all required tables:

```bash
# Start backend (tables will be created automatically)
cd apps/backend && npm run start:dev
```

**Expected Output**:
```
[Nest] [timestamp] INFO: Creating tables for entities...
[Nest] [timestamp] INFO: Table 'users' created
[Nest] [timestamp] INFO: Table 'item_prices' created
[Nest] [timestamp] INFO: Table 'trades' created
[Nest] [timestamp] INFO: Steam Marketplace Backend is running on port 3001
```

### Database Verification

After the backend starts successfully, verify all tables and collections exist:

```bash
# Check table/collection existence
npm run db:verify
```

**Expected Output**:
```
✅ PostgreSQL Tables:
  ✅ users
  ✅ refresh_tokens
  ✅ bots
  ✅ trades
  ✅ trade_items
  ✅ item_prices
  ✅ balances
  ✅ transactions
  ✅ audit_logs
  ✅ reports
  ✅ trade_disputes

✅ MongoDB Collections:
  ✅ items
  ✅ system.indexes

All database objects verified successfully!
```

### Seed Market Data

Populate databases with real CS:GO market data:

```bash
# Seed 1000+ items (takes 10-15 minutes)
npm run db:seed
```

**Expected Output**:
```
🚀 Starting market data seeding...
📊 Processing 1000 items in batches of 100
⏱️  Rate limit: 5 requests/second, 200/minute
🔄 Progress: 50/1000 items processed (5%)
🔄 Progress: 100/1000 items processed (10%)
...
✅ Seeding completed successfully!
📈 Statistics:
  - Items processed: 1000
  - Items saved to MongoDB: 987
  - Price records created: 3948
  - Average processing time: 12ms per item
```

### Check Database Status

View population statistics:

```bash
# Display database counts and stats
npm run db:status
```

**Expected Output**:
```
📊 Database Population Status:

Entity                    | Count
-------------------------|--------
Users                     | 0
Bots                      | 0
Trades                    | 0
Item Prices               | 3,948
Balances                  | 0
Transactions              | 0
Audit Logs                | 0
Reports                   | 0
Trade Disputes            | 0

📈 Additional Statistics:
  - MongoDB Items: 987
  - Items by App ID:
    - CS:GO (730): 987
    - Dota 2 (570): 0
    - TF2 (440): 0
    - Rust (252490): 0
  - Price Sources:
    - STEAM: 987
    - CSGOFLOAT: 987
    - BUFF163: 987
    - AGGREGATED: 987
  - Latest Trade: Never
  - Latest Price Update: 2 minutes ago
```

## Production Setup

### Migration Strategy

For production deployments, disable auto-sync and use manual migrations:

1. **Disable Auto-Sync**:
   ```env
   NODE_ENV=production
   # synchronize will be false automatically in production
   ```

2. **Generate Migration**:
   ```bash
   # Create migration for new entity changes
   typeorm migration:generate -n MigrationName
   ```

3. **Run Migrations**:
   ```bash
   # Apply all pending migrations
   npm run db:migrate
   ```

### Manual Table Verification

**PostgreSQL Tables**:
```bash
# Connect to PostgreSQL and list tables
docker exec -it steam-marketplace-postgres psql -U steam_user -d steam_marketplace -c "\dt"
```

**MongoDB Collections**:
```bash
# Connect to MongoDB and list collections
docker exec -it steam-marketplace-mongo mongosh steam_marketplace --eval "db.getCollectionNames()"
```

## Database Scripts

The following npm scripts are available for database operations:

| Script | Description | Usage |
|--------|-------------|-------|
| `db:verify` | Check table/collection existence | `npm run db:verify` |
| `db:status` | Display population statistics | `npm run db:status` |
| `db:seed` | Seed market data | `npm run db:seed [-- --count=500]` |
| `db:migrate` | Run TypeORM migrations (production) | `npm run db:migrate` |

### Advanced Seeding Options

```bash
# Seed specific number of items
npm run db:seed -- --count=500

# Seed only market data (skip prices)
npm run db:seed -- --only=market

# Dry run (fetch but don't save)
npm run db:seed -- --dry-run

# Enable verbose logging
npm run db:seed -- --verbose
```

## Troubleshooting

### Common Issues

**"Database connection failed"**
```bash
# Check Docker services
docker compose ps

# Verify database containers are healthy
docker compose ps --filter health=healthy

# Check logs for specific service
docker compose logs postgres
docker compose logs mongodb
```

**"Tables not created on startup"**
```bash
# Verify NODE_ENV is set correctly
echo $NODE_ENV

# Check TypeORM configuration
grep -A 5 "synchronize" src/config/database.config.ts

# Ensure entities are properly imported
find src -name "*.entity.ts" | head -5
```

**"Seeding errors"**
```bash
# Verify STEAM_API_KEY is set
grep STEAM_API_KEY .env

# Check API key validity
curl "https://api.steampowered.com/ISteamWebAPIUtil/GetSupportedAPIList/v1/"

# Enable verbose seeding for debugging
npm run db:seed -- --verbose
```

**"Rate limit exceeded"**
```bash
# Wait and retry
sleep 60
npm run db:seed

# Reduce rate limit in .env
echo "SEED_RATE_LIMIT_DELAY_MS=500" >> .env
```

### Database Cleanup

**Reset PostgreSQL**:
```bash
# Drop and recreate database
docker exec -it steam-marketplace-postgres psql -U steam_user -c "DROP DATABASE steam_marketplace;"
docker exec -it steam-marketplace-postgres psql -U steam_user -c "CREATE DATABASE steam_marketplace;"
```

**Reset MongoDB**:
```bash
# Clear all collections
docker exec -it steam-marketplace-mongo mongosh steam_marketplace --eval "db.dropDatabase()"
```

**Full Reset**:
```bash
# Stop and remove database volumes
docker compose down -v

# Restart with fresh data
docker compose up -d postgres mongodb redis

# Re-run initialization
npm run start:dev  # Wait for tables, then Ctrl+C
npm run db:verify
npm run db:seed
```

### Performance Optimization

**Database Tuning**:
- PostgreSQL connection pool: 10-50 connections
- MongoDB compression: zlib enabled
- Redis caching: 5-minute default duration
- Batch processing: 100 items per batch

**Monitoring**:
```bash
# Check database connections
docker stats steam-marketplace-postgres steam-marketplace-mongo

# Monitor API calls during seeding
npm run db:seed -- --verbose | grep "API"

# Check Redis memory usage
docker exec -it steam-marketplace-redis redis-cli info memory
```

## Security Considerations

- **API Keys**: Store `STEAM_API_KEY` securely, never commit to version control
- **Database Access**: Use separate credentials for different environments
- **Data Validation**: All seeded data goes through the same validation as user data
- **Rate Limiting**: Respects Steam API limits to avoid IP blocking

## Related Documentation

- [Database Seeding Guide](./seeds/README.md) - Detailed seeding documentation
- [Backend README](../README.md) - General backend setup and usage
- [Launch Guide](../../LAUNCH_GUIDE.md) - Complete deployment instructions
- [Entity Definitions](../modules) - TypeORM entity and Mongoose schema references