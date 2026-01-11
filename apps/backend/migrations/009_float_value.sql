-- Migration: Add Float Value and Automation Support
-- Date: 2025-12-16

-- Add float value columns to listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS float_value DECIMAL(10, 10);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS paint_seed INTEGER;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS paint_index INTEGER;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS stickers JSONB DEFAULT '[]';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS inspect_link TEXT;

-- Add phase column for Doppler detection
ALTER TABLE listings ADD COLUMN IF NOT EXISTS phase VARCHAR(50);

-- Index for float-based queries
CREATE INDEX IF NOT EXISTS idx_listings_float_value ON listings(float_value);
