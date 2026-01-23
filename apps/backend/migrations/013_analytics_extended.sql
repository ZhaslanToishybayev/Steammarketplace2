-- Extended Analytics Tables for Steam Marketplace
-- Migration 013: Analytics Extended

-- Add game_id and price_change to price_history
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='price_history' AND column_name='game_id') THEN
        ALTER TABLE price_history ADD COLUMN game_id INTEGER DEFAULT 730;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='price_history' AND column_name='price_change') THEN
        ALTER TABLE price_history ADD COLUMN price_change DECIMAL(10,2);
    END IF;
END $$;

-- Popular items cache for fast retrieval
CREATE TABLE IF NOT EXISTS popular_items_cache (
    id SERIAL PRIMARY KEY,
    market_hash_name VARCHAR(255) NOT NULL,
    game_id INTEGER DEFAULT 730,
    total_sales INTEGER DEFAULT 0,
    avg_price DECIMAL(10,2) DEFAULT 0,
    volume_24h INTEGER DEFAULT 0,
    volume_7d INTEGER DEFAULT 0,
    price_trend DECIMAL(5,2) DEFAULT 0, -- % change in last 7 days
    last_sale_price DECIMAL(10,2),
    image_url TEXT,
    rarity VARCHAR(50),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(market_hash_name, game_id)
);

-- User trade statistics cache
CREATE TABLE IF NOT EXISTS user_trade_stats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    total_bought INTEGER DEFAULT 0,
    total_sold INTEGER DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,
    total_earned DECIMAL(12,2) DEFAULT 0,
    profit DECIMAL(12,2) DEFAULT 0,
    avg_buy_price DECIMAL(10,2) DEFAULT 0,
    avg_sell_price DECIMAL(10,2) DEFAULT 0,
    most_traded_item VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Platform settings (for admin panel)
CREATE TABLE IF NOT EXISTS platform_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    type VARCHAR(20) DEFAULT 'string', -- string, number, boolean, json
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES admins(id)
);

-- Content management
CREATE TABLE IF NOT EXISTS site_content (
    id SERIAL PRIMARY KEY,
    page VARCHAR(100) NOT NULL,
    section VARCHAR(100) NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text', -- text, html, markdown
    content TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES admins(id),
    UNIQUE(page, section)
);

-- Banners management
CREATE TABLE IF NOT EXISTS banners (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subtitle TEXT,
    image_url TEXT,
    link_url TEXT,
    button_text VARCHAR(100),
    position VARCHAR(50) DEFAULT 'home_main', -- home_main, home_promo, sidebar
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES admins(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_popular_items_sales ON popular_items_cache(total_sales DESC);
CREATE INDEX IF NOT EXISTS idx_popular_items_game ON popular_items_cache(game_id);
CREATE INDEX IF NOT EXISTS idx_price_history_game ON price_history(game_id, market_hash_name);
CREATE INDEX IF NOT EXISTS idx_user_trade_stats_user ON user_trade_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_banners_position ON banners(position, is_active);
CREATE INDEX IF NOT EXISTS idx_site_content_page ON site_content(page, is_active);

-- Insert default platform settings
INSERT INTO platform_settings (key, value, type, description) VALUES
    ('platform_fee_percent', '5.0', 'number', 'Platform commission percentage'),
    ('min_listing_price', '0.03', 'number', 'Minimum listing price in USD'),
    ('max_listing_price', '10000', 'number', 'Maximum listing price in USD'),
    ('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode'),
    ('new_listings_enabled', 'true', 'boolean', 'Allow new listings'),
    ('withdrawals_enabled', 'true', 'boolean', 'Allow balance withdrawals'),
    ('telegram_notifications', 'true', 'boolean', 'Send Telegram notifications'),
    ('site_title', 'SGO Market - Steam Marketplace', 'string', 'Website title'),
    ('site_description', 'Buy and sell CS2 & Dota 2 skins with instant delivery', 'string', 'Website meta description')
ON CONFLICT (key) DO NOTHING;

-- Insert default content
INSERT INTO site_content (page, section, content_type, content) VALUES
    ('home', 'hero_title', 'text', 'Trade Steam Skins'),
    ('home', 'hero_subtitle', 'text', 'Buy and sell CS2 & Dota 2 items with instant delivery and secure transactions'),
    ('home', 'features_title', 'text', 'Why Choose Us'),
    ('faq', 'title', 'text', 'Frequently Asked Questions')
ON CONFLICT (page, section) DO NOTHING;
