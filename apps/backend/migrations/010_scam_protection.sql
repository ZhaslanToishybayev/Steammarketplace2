-- Migration: Add Scam Protection Tables
-- Run: psql -d your_database -f 010_scam_protection.sql

-- Create user_api_keys table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_api_keys (
    id SERIAL PRIMARY KEY,
    steam_id VARCHAR(20) NOT NULL UNIQUE,
    api_key VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_steam_id ON user_api_keys(steam_id);

-- Add hash column to existing user_api_keys table for change detection
ALTER TABLE user_api_keys ADD COLUMN IF NOT EXISTS api_key_hash VARCHAR(64);
ALTER TABLE user_api_keys ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_api_keys_hash ON user_api_keys(api_key_hash);

-- Scam Logs Table for Suspicious Activity Tracking
CREATE TABLE IF NOT EXISTS user_scam_logs (
    id SERIAL PRIMARY KEY,
    steam_id VARCHAR(20) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'api_key_changed', 'item_missing', 'rapid_cancel', 'trade_blocked'
    details JSONB,
    risk_score INTEGER DEFAULT 0,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for scam logs
CREATE INDEX IF NOT EXISTS idx_scam_logs_steam_id ON user_scam_logs(steam_id);
CREATE INDEX IF NOT EXISTS idx_scam_logs_event_type ON user_scam_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_scam_logs_created_at ON user_scam_logs(created_at DESC);

-- User Risk Score Cache (optional, for performance)
CREATE TABLE IF NOT EXISTS user_risk_scores (
    steam_id VARCHAR(20) PRIMARY KEY,
    risk_score INTEGER DEFAULT 0,
    last_calculated_at TIMESTAMP DEFAULT NOW(),
    flags JSONB -- { "api_key_changes": 2, "item_missing": 1, ... }
);

-- Comments for documentation
COMMENT ON TABLE user_scam_logs IS 'Tracks suspicious activity for scam prevention';
COMMENT ON COLUMN user_scam_logs.event_type IS 'Types: api_key_changed, item_missing, rapid_cancel, trade_blocked, ownership_failed';
COMMENT ON COLUMN user_scam_logs.risk_score IS 'Points added to user total for this event (e.g., api_key_changed = 50)';
