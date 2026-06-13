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
