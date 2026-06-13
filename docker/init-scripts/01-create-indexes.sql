-- Steam Marketplace Database Optimization Script
-- This script creates additional indexes and optimizations for production performance
--
-- COLUMN NAMING NOTE:
-- TypeORM uses camelCase for entity properties but converts to snake_case for database columns
-- However, these column names are quoted to preserve case-sensitivity and match
-- the actual TypeORM-generated column names in the database schema.
-- All column names below correspond to TypeORM entity properties:
-- - users: steamId, isActive, isBanned, etc.
-- - trades: userId, botId, status, type, hasEscrow, etc.
-- - transactions: userId, tradeId, status, type, etc.
-- - inventory: userId, appId, assetId, tradable, marketable, etc.
-- - item_prices: itemId, appId, marketHashName, priceDate, source, etc.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS btree_gin;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Partial indexes for frequently filtered queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_steam_id
ON users("steamId")
WHERE "isActive" = true AND "isBanned" = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_pending_user_created
ON trades("userId", "createdAt")
WHERE "status" IN ('pending', 'sent');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_bot_active
ON trades("botId", "createdAt")
WHERE "status" IN ('pending', 'sent', 'accepted');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_expired_cleanup
ON trades("status", "expiresAt")
WHERE "expiresAt" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_type_status_created
ON trades("type", "status", "createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_escrow_status
ON trades("hasEscrow", "status");

-- Recent price indexes for faster queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prices_recent_item_date
ON item_prices("itemId", "priceDate" DESC)
WHERE "priceDate" > NOW() - INTERVAL '30 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prices_recent_game_hash_date
ON item_prices("appId", "marketHashName", "priceDate" DESC)
WHERE "priceDate" > NOW() - INTERVAL '30 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prices_source_date
ON item_prices("source", "priceDate" DESC);

-- Inventory optimization indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_user_game_tradable
ON inventory("userId", "appId", "tradable");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_user_sync_status
ON inventory("userId", "syncStatus", "lastSyncedAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_asset_user
ON inventory("assetId", "userId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_game_marketable
ON inventory("appId", "marketable", "tradable");

-- Transaction optimization indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_user_status_created
ON transactions("userId", "status", "createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_type_status_created
ON transactions("type", "status", "createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_external_status
ON transactions("externalTransactionId", "status");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_trade_type
ON transactions("tradeId", "type");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_status_processed
ON transactions("status", "processedAt");

-- JSONB indexes for metadata queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_metadata_gin
ON trades USING GIN("metadata");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_metadata_gin
ON transactions USING GIN("metadata");

-- Auto-vacuum tuning for high-traffic tables
ALTER TABLE trades SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02,
    autovacuum_vacuum_cost_delay = 10,
    autovacuum_vacuum_cost_limit = 100
);

ALTER TABLE transactions SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02,
    autovacuum_vacuum_cost_delay = 10,
    autovacuum_vacuum_cost_limit = 100
);

ALTER TABLE item_prices SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05,
    autovacuum_vacuum_cost_delay = 10,
    autovacuum_vacuum_cost_limit = 100
);

-- Update table statistics
ANALYZE users;
ANALYZE trades;
ANALYZE transactions;
ANALYZE item_prices;
ANALYZE inventory;
ANALYZE bots;
ANALYZE items;