# Database Seeding

This directory contains the database seeding system for the Steam Marketplace backend. The seeder populates the database with real CS:GO market data from Steam APIs.

## Overview

The seeding system is designed to:
- Fetch 1000+ popular CS:GO items from Steam Community Market
- Retrieve real-time pricing from Steam Market, CSGOFloat, and Buff163
- Store item metadata in MongoDB and price history in PostgreSQL
- Respect Steam API rate limits to avoid being blocked
- Provide comprehensive error handling and progress tracking

## Prerequisites

- Valid `STEAM_API_KEY` in your `.env` file
- Running PostgreSQL, MongoDB, and Redis instances (via docker-compose)
- Backend dependencies installed (`npm install`)
- Backend services running (`npm run start:dev` or `docker-compose up`)

## Usage

### Basic Seeding

```bash
# Seed all data (1000 items by default)
npm run db:seed

# Seed specific count
npm run db:seed -- --count=500

# Seed only market data
npm run db:seed -- --only=market

# Dry run (fetch but don't save)
npm run db:seed -- --dry-run

# Enable verbose logging
npm run db:seed -- --verbose
```

### Command Line Options

- `-c, --count <number>`: Number of items to seed (default: 1000)
- `--only <type>`: Type of seeding (default: 'market')
- `--dry-run`: Fetch data but don't save to database
- `--verbose`: Enable verbose logging

## What Gets Seeded

### Item Data
- Item metadata: names, icons, rarity, wear, float values, stickers, tags
- Game-specific properties for CS:GO items (condition, paint seed, etc.)
- Trading information (tradable, marketable, commodity status)
- Raw Steam API data for future reference

### Pricing Data
- Real-time pricing from Steam Market, CSGOFloat, and Buff163
- Aggregated weighted average prices (40% Steam, 35% CSGOFloat, 25% Buff163)
- Price history with timestamps
- Volume data and price ranges (lowest, median, highest)

## Performance

- **Rate Limiting**: Respects Steam API limits (5 requests/second, 200/minute)
- **Batch Processing**: Processes items in batches of 100 for efficiency
- **Redis Caching**: Leverages existing Redis cache to avoid redundant API calls
- **Estimated Time**: 10-15 minutes for 1000 items (depends on network and API response times)

## Configuration

The seeder uses environment variables for configuration:

```env
# Database Seeding Configuration
SEED_MARKET_ITEM_COUNT=1000
SEED_BATCH_SIZE=100
SEED_RATE_LIMIT_DELAY_MS=200
SEED_ENABLE_PROGRESS_LOGGING=true
```

These can be overridden in your `.env` file to customize the seeding behavior.

## Error Handling

The seeder includes comprehensive error handling:

- **Rate Limit Exceeded**: Automatically waits and retries
- **Private Inventory**: Skips items with private inventories
- **Missing Price Data**: Logs warnings but continues processing
- **Database Errors**: Logs errors and continues with next items
- **Network Issues**: Retries with exponential backoff

### Common Issues

**"Steam API rate limit exceeded"**
- Wait 60 seconds and retry
- The seeder automatically handles rate limiting, but heavy usage may require manual delays

**"Private inventory" errors**
- Normal - seeder skips these items automatically
- These are items that have been removed from the market

**"Price not found"**
- Some items may not have pricing data on all sources
- The seeder will still save the item metadata and try to fetch prices from available sources

**Database connection errors**
- Ensure docker-compose services are running
- Check database connection strings in `.env` file

## Data Verification

After seeding, verify the data was imported correctly:

```bash
# Check MongoDB items
mongo steam_marketplace --eval "db.items.count()"

# Check PostgreSQL prices
psql -U steam_user -d steam_marketplace -c "SELECT COUNT(*) FROM item_prices;"

# Check recent price records
psql -U steam_user -d steam_marketplace -c "
  SELECT market_hash_name, price, source, price_date
  FROM item_prices
  ORDER BY price_date DESC
  LIMIT 10;
"
```

## Architecture

The seeding system follows this flow:

1. **Market Data Fetching**: Calls Steam Community Market API to get popular items
2. **Metadata Enrichment**: Uses Steam API to get detailed item descriptions and properties
3. **Price Aggregation**: Fetches prices from multiple sources and calculates weighted averages
4. **Database Storage**: Saves items to MongoDB and price records to PostgreSQL
5. **Progress Tracking**: Logs progress every 50 items and provides summary statistics

## Extending the Seeder

To add new seeders:

1. Create a new seeder class in this directory (e.g., `user-seeder.ts`)
2. Follow the same pattern: injectable service with a `seed()` method
3. Register the seeder in `run-seed.ts`
4. Add command-line options if needed

### Example Custom Seeder

```typescript
@Injectable()
export class UserSeeder {
  async seed(count: number): Promise<SeedResult> {
    // Implementation here
  }
}
```

## Monitoring

The seeder provides detailed logging:

- **Progress Updates**: Every 50 items processed
- **Error Tracking**: Counts and details of failed items
- **Performance Metrics**: Total duration and API response times
- **Summary Statistics**: Final counts of created items and fetched prices

Enable verbose logging for detailed information about each item processed:

```bash
npm run db:seed -- --verbose
```

## Troubleshooting

### Slow Performance
- Check network connectivity to Steam APIs
- Verify Redis cache is working properly
- Consider reducing batch size in `.env`

### High Error Rate
- Verify `STEAM_API_KEY` is valid and has sufficient quota
- Check API rate limits in Steam Developer portal
- Enable verbose logging to see specific error details

### Incomplete Seeding
- Check available disk space for databases
- Verify database connections are stable
- Review logs for specific failure patterns

## Security Notes

- The seeder uses the same API keys and endpoints as the main application
- All API calls are rate-limited and cached appropriately
- No sensitive user data is generated during seeding
- The seeder can be safely run in development and staging environments