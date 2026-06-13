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
