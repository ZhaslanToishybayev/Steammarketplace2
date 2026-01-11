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
-- Migration: 002_add_users_balance.sql
-- Description: Adds users table with balance support for internal wallet

CREATE TABLE IF NOT EXISTS users (
    steam_id VARCHAR(20) PRIMARY KEY,
    username VARCHAR(100),
    avatar VARCHAR(255),
    profile_url VARCHAR(255),
    balance DECIMAL(12, 2) DEFAULT 0.00 CHECK (balance >= 0),
    trade_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups by steam_id (primary key is already indexed, but good to be explicit for joins)
CREATE INDEX IF NOT EXISTS idx_users_steam_id ON users(steam_id);

-- Optional: History of balance changes (Audit Log)
CREATE TABLE IF NOT EXISTS balance_transactions (
    id SERIAL PRIMARY KEY,
    steam_id VARCHAR(20) REFERENCES users(steam_id),
    amount DECIMAL(12, 2) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'deposit', 'withdraw', 'purchase', 'sale', 'refund'
    reference_id UUID, -- Links to trade_uuid or payment_id
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_balance_transactions_steam_id ON balance_transactions(steam_id);
-- Add item_stickers column to listings
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS item_stickers JSONB DEFAULT '[]'::jsonb;

-- Index for searching stickers (if we want to search inside JSONB)
CREATE INDEX IF NOT EXISTS idx_listings_stickers ON listings USING gin (item_stickers);

-- Comment
COMMENT ON COLUMN listings.item_stickers IS 'Array of sticker names/attributes as JSON';
-- Admin Panel Tables
-- Run this migration after existing tables

-- Admin users table
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    role VARCHAR(20) DEFAULT 'admin',  -- 'admin' or 'moderator'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admins(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),  -- 'user', 'listing', 'trade', 'bot'
    entity_id INTEGER,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Add is_featured column to listings if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='listings' AND column_name='is_featured') THEN
        ALTER TABLE listings ADD COLUMN is_featured BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add is_banned column to users if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='is_banned') THEN
        ALTER TABLE users ADD COLUMN is_banned BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Insert default admin user (password: admin123 - bcrypt hashed)
-- You should change this immediately after setup
INSERT INTO admins (username, password_hash, email, role) 
VALUES ('admin', '$2b$10$5H.JQpf1cKPP/OYlMHXSXuyKK0lbxXvXlZqvLU1qxXqfHQOKmxk/u', 'admin@steammarket.local', 'admin')
ON CONFLICT (username) DO NOTHING;
-- Support System Tables (Fixed for steam_id primary key)
-- Run after existing migrations

-- Support tickets
CREATE TABLE IF NOT EXISTS support_tickets (
    id SERIAL PRIMARY KEY,
    user_steam_id VARCHAR(20) REFERENCES users(steam_id),
    subject VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'open',
    priority VARCHAR(20) DEFAULT 'normal',
    category VARCHAR(50) DEFAULT 'general',
    assigned_admin_id INTEGER REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ticket messages
CREATE TABLE IF NOT EXISTS ticket_messages (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_steam_id VARCHAR(20) REFERENCES users(steam_id),
    admin_id INTEGER REFERENCES admins(id),
    message TEXT NOT NULL,
    is_staff BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Referral system
CREATE TABLE IF NOT EXISTS referrals (
    id SERIAL PRIMARY KEY,
    referrer_steam_id VARCHAR(20) REFERENCES users(steam_id),
    referred_steam_id VARCHAR(20) REFERENCES users(steam_id) UNIQUE,
    referral_code VARCHAR(20) NOT NULL,
    bonus_given BOOLEAN DEFAULT false,
    bonus_amount DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_steam_id VARCHAR(20) REFERENCES users(steam_id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Price alerts / Watchlist
CREATE TABLE IF NOT EXISTS watchlist (
    id SERIAL PRIMARY KEY,
    user_steam_id VARCHAR(20) REFERENCES users(steam_id),
    market_hash_name VARCHAR(255) NOT NULL,
    app_id INTEGER DEFAULT 730,
    target_price DECIMAL(10, 2),
    alert_type VARCHAR(20) DEFAULT 'below',
    is_active BOOLEAN DEFAULT true,
    last_notified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_steam_id, market_hash_name, app_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tickets_steam_id ON support_tickets(user_steam_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_notifications_steam_id_read ON notifications(user_steam_id, is_read);
CREATE INDEX IF NOT EXISTS idx_watchlist_steam_id ON watchlist(user_steam_id);

-- Add referral_code to users if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='referral_code') THEN
        ALTER TABLE users ADD COLUMN referral_code VARCHAR(20) UNIQUE;
    END IF;
END $$;

-- Generate referral codes for existing users without one
UPDATE users SET referral_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8))
WHERE referral_code IS NULL;
CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY,
    market_hash_name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    volume INTEGER DEFAULT 0,
    source VARCHAR(50) DEFAULT 'steam',
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_stats (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    total_volume DECIMAL(12, 2) DEFAULT 0,
    total_sales INTEGER DEFAULT 0,
    avg_commission DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_price_history_name_date ON price_history(market_hash_name, recorded_at);
CREATE INDEX idx_daily_stats_date ON daily_stats(date);
-- Migration: 007_session_table.sql
-- Description: Create session table for connect-pg-simple

CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
