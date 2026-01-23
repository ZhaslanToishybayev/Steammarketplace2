-- Performance Indexes for Steam Marketplace
-- Adapted to actual database schema

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
ON listings(item_app_id, status) 
WHERE status = 'active';

-- Full-text search on item names
CREATE INDEX IF NOT EXISTS idx_listings_item_name_gin 
ON listings USING gin(to_tsvector('english', item_name));

-- ========== ESCROW_TRADES TABLE ==========

-- Index for buyer's trade history
CREATE INDEX IF NOT EXISTS idx_escrow_trades_buyer 
ON escrow_trades(buyer_steam_id, status, created_at DESC);

-- Index for seller's trade history
CREATE INDEX IF NOT EXISTS idx_escrow_trades_seller 
ON escrow_trades(seller_steam_id, status, created_at DESC);

-- Index for trade status monitoring
CREATE INDEX IF NOT EXISTS idx_escrow_trades_status 
ON escrow_trades(status, created_at DESC);

-- Index for Steam offer tracking (using actual column names)
CREATE INDEX IF NOT EXISTS idx_escrow_trades_seller_offer 
ON escrow_trades(seller_trade_offer_id) 
WHERE seller_trade_offer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_escrow_trades_buyer_offer 
ON escrow_trades(buyer_trade_offer_id) 
WHERE buyer_trade_offer_id IS NOT NULL;

-- ========== BOTS TABLE ==========

-- Check if bots table has the columns before creating index
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bots' AND column_name = 'status'
    ) THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_bots_status ON bots(status)';
    END IF;
END $$;

-- ========== ANALYZE TABLES ==========

ANALYZE listings;
ANALYZE escrow_trades;
ANALYZE users;
ANALYZE bots;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Performance indexes created successfully!';
END $$;
