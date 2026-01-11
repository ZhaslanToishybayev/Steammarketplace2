-- =============================================
-- Escrow Trade System Database Schema
-- Steam Marketplace - Migration Script
-- =============================================

-- Bots table - Steam trading bots
CREATE TABLE IF NOT EXISTS bots (
    id SERIAL PRIMARY KEY,
    steam_id VARCHAR(20) UNIQUE NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'offline',
    trade_url TEXT,
    shared_secret_encrypted TEXT,
    identity_secret_encrypted TEXT,
    inventory_count INT DEFAULT 0,
    active_trades_count INT DEFAULT 0,
    last_online_at TIMESTAMP,
    last_error TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Listings table - Items listed for sale
CREATE TABLE IF NOT EXISTS listings (
    id SERIAL PRIMARY KEY,
    seller_steam_id VARCHAR(20) NOT NULL,
    seller_trade_url TEXT NOT NULL,
    
    -- Item details
    item_asset_id VARCHAR(50) NOT NULL,
    item_class_id VARCHAR(50),
    item_instance_id VARCHAR(50),
    item_name VARCHAR(255) NOT NULL,
    item_market_hash_name VARCHAR(255),
    item_app_id INTEGER NOT NULL,
    item_context_id VARCHAR(10) DEFAULT '2',
    item_icon_url TEXT,
    item_rarity VARCHAR(50),
    item_exterior VARCHAR(50),
    item_float DECIMAL(10,8),
    
    -- Pricing
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Status
    status VARCHAR(20) DEFAULT 'active',
    views_count INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    
    CONSTRAINT check_price_positive CHECK (price > 0)
);

-- Escrow trades table - Main escrow transactions
CREATE TABLE IF NOT EXISTS escrow_trades (
    id SERIAL PRIMARY KEY,
    trade_uuid UUID UNIQUE NOT NULL,
    
    -- Participants
    listing_id INTEGER REFERENCES listings(id),
    buyer_steam_id VARCHAR(20) NOT NULL,
    buyer_trade_url TEXT NOT NULL,
    seller_steam_id VARCHAR(20) NOT NULL,
    seller_trade_url TEXT NOT NULL,
    bot_id INTEGER REFERENCES bots(id),
    
    -- Item snapshot (in case listing is modified)
    item_asset_id VARCHAR(50) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    item_app_id INTEGER NOT NULL,
    
    -- Financial details
    price DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) DEFAULT 0,
    platform_fee_percent DECIMAL(5,2) DEFAULT 5.00,
    seller_payout DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Steam trade offer IDs
    seller_trade_offer_id VARCHAR(20),
    buyer_trade_offer_id VARCHAR(20),
    
    -- Status tracking
    status VARCHAR(30) DEFAULT 'pending_payment',
    -- Possible statuses:
    -- pending_payment      - Waiting for buyer payment
    -- payment_received     - Payment confirmed, requesting item from seller
    -- awaiting_seller      - Trade offer sent to seller
    -- seller_accepted      - Seller accepted, item received by bot
    -- awaiting_buyer       - Trade offer sent to buyer
    -- buyer_accepted       - Buyer accepted, item delivered
    -- completed            - All done, seller paid out
    -- cancelled            - Trade cancelled
    -- refunded             - Buyer refunded
    -- disputed             - Under dispute resolution
    -- expired              - Trade expired
    
    seller_trade_status VARCHAR(20),
    buyer_trade_status VARCHAR(20),
    
    -- Timestamps
    payment_at TIMESTAMP,
    seller_offer_sent_at TIMESTAMP,
    seller_accepted_at TIMESTAMP,
    buyer_offer_sent_at TIMESTAMP,
    buyer_accepted_at TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    expires_at TIMESTAMP,
    
    -- Metadata
    cancel_reason TEXT,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Escrow transactions table - Financial transactions
CREATE TABLE IF NOT EXISTS escrow_transactions (
    id SERIAL PRIMARY KEY,
    transaction_uuid UUID UNIQUE NOT NULL,
    escrow_trade_id INTEGER REFERENCES escrow_trades(id),
    
    steam_id VARCHAR(20) NOT NULL,
    type VARCHAR(20) NOT NULL,
    -- Types: payment, payout, refund, fee
    
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending',
    -- Statuses: pending, processing, completed, failed
    
    -- External payment reference
    payment_provider VARCHAR(20),
    external_transaction_id VARCHAR(100),
    
    -- Error tracking
    error_message TEXT,
    retry_count INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Trade status history for audit trail
CREATE TABLE IF NOT EXISTS escrow_trade_history (
    id SERIAL PRIMARY KEY,
    escrow_trade_id INTEGER REFERENCES escrow_trades(id),
    old_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    changed_by VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- Indexes for performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings(seller_steam_id);
CREATE INDEX IF NOT EXISTS idx_listings_app_id ON listings(item_app_id);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price);

CREATE INDEX IF NOT EXISTS idx_escrow_trades_status ON escrow_trades(status);
CREATE INDEX IF NOT EXISTS idx_escrow_trades_buyer ON escrow_trades(buyer_steam_id);
CREATE INDEX IF NOT EXISTS idx_escrow_trades_seller ON escrow_trades(seller_steam_id);
CREATE INDEX IF NOT EXISTS idx_escrow_trades_bot ON escrow_trades(bot_id);
CREATE INDEX IF NOT EXISTS idx_escrow_trades_uuid ON escrow_trades(trade_uuid);

CREATE INDEX IF NOT EXISTS idx_transactions_trade ON escrow_transactions(escrow_trade_id);
CREATE INDEX IF NOT EXISTS idx_transactions_steam_id ON escrow_transactions(steam_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON escrow_transactions(status);

CREATE INDEX IF NOT EXISTS idx_bots_status ON bots(status);

-- =============================================
-- Comments
-- =============================================

COMMENT ON TABLE bots IS 'Steam trading bots for escrow operations';
COMMENT ON TABLE listings IS 'Item listings created by sellers';
COMMENT ON TABLE escrow_trades IS 'Main escrow trade transactions';
COMMENT ON TABLE escrow_transactions IS 'Financial transactions related to escrow trades';
COMMENT ON TABLE escrow_trade_history IS 'Audit trail for escrow trade status changes';
