-- Admin Panel Tables
-- Run this migration after existing tables

-- Admin users table
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    role VARCHAR(20) DEFAULT 'admin',  -- 'admin' or 'moderator'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admins(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),  -- 'user', 'listing', 'trade', 'bot'
    entity_id INTEGER,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Add is_featured column to listings if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='listings' AND column_name='is_featured') THEN
        ALTER TABLE listings ADD COLUMN is_featured BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add is_banned column to users if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='is_banned') THEN
        ALTER TABLE users ADD COLUMN is_banned BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Insert default admin user (password: admin123 - bcrypt hashed)
-- You should change this immediately after setup
INSERT INTO admins (username, password_hash, email, role) 
VALUES ('admin', '$2b$10$5H.JQpf1cKPP/OYlMHXSXuyKK0lbxXvXlZqvLU1qxXqfHQOKmxk/u', 'admin@steammarket.local', 'admin')
ON CONFLICT (username) DO NOTHING;
