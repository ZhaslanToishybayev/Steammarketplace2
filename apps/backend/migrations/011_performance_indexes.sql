-- Performance Indexes for Steam Marketplace
-- Run: psql -d steam_marketplace -f migrations/011_performance_indexes.sql

-- ========== LISTINGS TABLE ==========

-- Index for marketplace browsing (most common query)
CREATE INDEX IF NOT EXISTS idx_listings_status_price 
ON listings(status, price ASC) 
WHERE status = 'active';

-- Index for user's listings
CREATE INDEX IF NOT EXISTS idx_listings_seller_id 
ON listings(seller_steam_id, status);

-- Index for game filtering
CREATE INDEX IF NOT EXISTS idx_listings_app_id 
ON listings(app_id, status) 
WHERE status = 'active';

-- Full-text search on item names
CREATE INDEX IF NOT EXISTS idx_listings_item_name_gin 
ON listings USING gin(to_tsvector('english', item_name));

-- ========== ESCROW_TRADES TABLE ==========

-- Index for buyer's trade history
CREATE INDEX IF NOT EXISTS idx_escrow_trades_buyer 
ON escrow_trades(buyer_id, status, created_at DESC);

-- Index for seller's trade history
CREATE INDEX IF NOT EXISTS idx_escrow_trades_seller 
ON escrow_trades(seller_id, status, created_at DESC);

-- Index for trade status monitoring
CREATE INDEX IF NOT EXISTS idx_escrow_trades_status 
ON escrow_trades(status, created_at DESC);

-- Index for Steam offer tracking
CREATE INDEX IF NOT EXISTS idx_escrow_trades_offer_id 
ON escrow_trades(steam_offer_id) 
WHERE steam_offer_id IS NOT NULL;

-- ========== USERS TABLE ==========

-- Index for Steam ID lookups (primary lookup)
CREATE INDEX IF NOT EXISTS idx_users_steam_id 
ON users(steam_id);

-- Index for balance queries (for wallet operations)
CREATE INDEX IF NOT EXISTS idx_users_balance 
ON users(balance DESC) 
WHERE balance > 0;

-- ========== TRANSACTIONS TABLE ==========

-- Index for user transaction history
CREATE INDEX IF NOT EXISTS idx_transactions_user 
ON transactions(user_id, created_at DESC);

-- Index for transaction type filtering
CREATE INDEX IF NOT EXISTS idx_transactions_type 
ON transactions(type, created_at DESC);

-- ========== BOTS TABLE ==========

-- Index for available bot lookup
CREATE INDEX IF NOT EXISTS idx_bots_status 
ON bots(status, is_available) 
WHERE is_available = true;

-- ========== WATCHLIST TABLE ==========

-- Index for user's watchlist
CREATE INDEX IF NOT EXISTS idx_watchlist_user 
ON watchlist(user_id, created_at DESC);

-- Index for price drop notifications
CREATE INDEX IF NOT EXISTS idx_watchlist_item 
ON watchlist(market_hash_name, target_price);

-- ========== ANALYZE TABLES ==========

ANALYZE listings;
ANALYZE escrow_trades;
ANALYZE users;
ANALYZE transactions;
ANALYZE bots;
ANALYZE watchlist;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Performance indexes created successfully!';
END $$;
