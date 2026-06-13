-- Migration: 015_p2p_flow_complete.sql
-- Fills gaps in P2P marketplace flow: missing columns, indexes, timeout support.

-- Ensure buyer_trade_url column exists (used by p2p-flow.service createReservedTrade)
ALTER TABLE escrow_trades
    ADD COLUMN IF NOT EXISTS buyer_trade_url TEXT,
    ADD COLUMN IF NOT EXISTS platform_fee_percent DECIMAL(5,2) DEFAULT 5.00,
    ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS buyer_accepted_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS seller_deadline_at TIMESTAMP;

-- Index for finding trades that need auto-cancel (seller timeout)
CREATE INDEX IF NOT EXISTS idx_escrow_trades_seller_deadline
    ON escrow_trades(status, seller_deadline_at)
    WHERE seller_deadline_at IS NOT NULL;

-- Index for fast lookups of user's P2P trades (as buyer or seller)
CREATE INDEX IF NOT EXISTS idx_escrow_trades_buyer
    ON escrow_trades(buyer_steam_id, trade_type);
CREATE INDEX IF NOT EXISTS idx_escrow_trades_seller
    ON escrow_trades(seller_steam_id, trade_type);

-- Add api_key_hash to user_api_keys if not present (used by scam-protection)
ALTER TABLE user_api_keys
    ADD COLUMN IF NOT EXISTS api_key_hash VARCHAR(128),
    ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP;

-- Escrow transactions table (used in settlement release)
CREATE TABLE IF NOT EXISTS escrow_transactions (
    id SERIAL PRIMARY KEY,
    transaction_uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    escrow_trade_id INTEGER REFERENCES escrow_trades(id),
    steam_id VARCHAR(20) NOT NULL,
    type VARCHAR(30) NOT NULL, -- 'payout', 'refund', 'fee'
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(5) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escrow_transactions_trade
    ON escrow_transactions(escrow_trade_id);

-- Balance transactions table (used when reserving buyer funds)
CREATE TABLE IF NOT EXISTS balance_transactions (
    id SERIAL PRIMARY KEY,
    steam_id VARCHAR(20) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    type VARCHAR(30) NOT NULL, -- 'reserve', 'release', 'debit', 'credit'
    reference_id VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_balance_transactions_user
    ON balance_transactions(steam_id, created_at DESC);
