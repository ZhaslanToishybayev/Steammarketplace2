-- Migration: 014_p2p_marketplace_flow.sql
-- Adds explicit P2P marketplace state, balance reservation, and settlement hold fields.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS reserved_balance DECIMAL(12, 2) DEFAULT 0.00 CHECK (reserved_balance >= 0);

UPDATE users SET reserved_balance = 0 WHERE reserved_balance IS NULL;

ALTER TABLE listings
    ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30),
    ADD COLUMN IF NOT EXISTS removed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS remove_reason TEXT;

ALTER TABLE escrow_trades
    ADD COLUMN IF NOT EXISTS payment_reserved_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS seller_notified_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS trade_sent_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS trade_accepted_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS settlement_due_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS settlement_released_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS dispute_opened_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS buyer_profile_url TEXT,
    ADD COLUMN IF NOT EXISTS seller_profile_url TEXT;

CREATE INDEX IF NOT EXISTS idx_users_reserved_balance ON users(reserved_balance);
CREATE INDEX IF NOT EXISTS idx_listings_p2p_status_verified
    ON listings(listing_type, status, last_verified_at);
CREATE INDEX IF NOT EXISTS idx_escrow_trades_settlement_due
    ON escrow_trades(status, settlement_due_at)
    WHERE settlement_due_at IS NOT NULL;
