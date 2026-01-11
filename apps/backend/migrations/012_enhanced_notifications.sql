-- Enhanced Notification System Database Schema
-- Table for storing user notifications with fallback mechanism

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    steam_id VARCHAR(20) NOT NULL,
    type VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    -- Status: pending, delivered, read
    created_at TIMESTAMP DEFAULT NOW(),
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,

    INDEX idx_notifications_steam_id (steam_id),
    INDEX idx_notifications_status (status),
    INDEX idx_notifications_type (type),
    INDEX idx_notifications_created_at (created_at)
);

-- Add foreign key constraint if users table exists
ALTER TABLE notifications
ADD CONSTRAINT fk_notifications_steam_id
FOREIGN KEY (steam_id) REFERENCES users(steam_id)
ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_status
ON notifications (steam_id, status, created_at);

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

-- View for notification statistics
CREATE OR REPLACE VIEW notification_stats AS
SELECT
    COUNT(*) as total,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
    COUNT(CASE WHEN status = 'read' THEN 1 END) as read,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as last_hour,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 day' THEN 1 END) as last_day
FROM notifications;

COMMENT ON TABLE notifications IS 'User notifications with fallback storage';
COMMENT ON COLUMN notifications.status IS 'Notification delivery status: pending, delivered, read';
COMMENT ON COLUMN notifications.data IS 'JSON data for the notification content';