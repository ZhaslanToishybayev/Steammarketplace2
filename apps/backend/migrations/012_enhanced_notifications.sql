-- Enhanced Notification System
-- Adapted to existing notifications table structure

-- The notifications table already exists with columns:
-- id, user_steam_id, type, title, message, data, is_read, created_at

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add delivered_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'delivered_at'
    ) THEN
        ALTER TABLE notifications ADD COLUMN delivered_at TIMESTAMP;
    END IF;
    
    -- Add read_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'read_at'
    ) THEN
        ALTER TABLE notifications ADD COLUMN read_at TIMESTAMP;
    END IF;
END $$;

-- Create additional indexes if not exist
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
ON notifications(user_steam_id, is_read);

-- Function to cleanup old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications
    WHERE created_at < NOW() - INTERVAL '7 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- View for notification statistics (adapted to actual schema)
DROP VIEW IF EXISTS notification_stats;
CREATE VIEW notification_stats AS
SELECT
    COUNT(*) as total,
    COUNT(CASE WHEN is_read = false THEN 1 END) as unread,
    COUNT(CASE WHEN is_read = true THEN 1 END) as read,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as last_hour,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 day' THEN 1 END) as last_day
FROM notifications;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Enhanced notifications migration completed!';
END $$;