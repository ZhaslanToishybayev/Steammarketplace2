-- Migration: Add P2P Support
-- Date: 2025-12-16

-- Add listing_type to distinguish bot sales from P2P
ALTER TABLE listings ADD COLUMN IF NOT EXISTS listing_type VARCHAR(20) DEFAULT 'bot_sale';
-- Values: 'bot_sale' (bot owns the item) | 'p2p' (user owns the item)

-- Add seller_trade_url for P2P (so we can request items from sellers)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS seller_trade_url TEXT;

-- Add trade_type to escrow_trades
ALTER TABLE escrow_trades ADD COLUMN IF NOT EXISTS trade_type VARCHAR(20) DEFAULT 'bot_sale';

-- Add seller_trade_offer_id for P2P (offer sent to seller to receive item)
ALTER TABLE escrow_trades ADD COLUMN IF NOT EXISTS seller_trade_offer_id VARCHAR(50);

-- Add seller_offer_sent_at timestamp
ALTER TABLE escrow_trades ADD COLUMN IF NOT EXISTS seller_offer_sent_at TIMESTAMP;

-- Add seller_received_at (when bot received item from seller)
ALTER TABLE escrow_trades ADD COLUMN IF NOT EXISTS seller_received_at TIMESTAMP;

-- Add commission fields
ALTER TABLE escrow_trades ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE escrow_trades ADD COLUMN IF NOT EXISTS seller_payout DECIMAL(10, 2) DEFAULT 0;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_listings_listing_type ON listings(listing_type);
CREATE INDEX IF NOT EXISTS idx_listings_seller_steam_id ON listings(seller_steam_id);
CREATE INDEX IF NOT EXISTS idx_escrow_trades_trade_type ON escrow_trades(trade_type);
