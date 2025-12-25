-- Add item_stickers column to listings
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS item_stickers JSONB DEFAULT '[]'::jsonb;

-- Index for searching stickers (if we want to search inside JSONB)
CREATE INDEX IF NOT EXISTS idx_listings_stickers ON listings USING gin (item_stickers);

-- Comment
COMMENT ON COLUMN listings.item_stickers IS 'Array of sticker names/attributes as JSON';
