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
