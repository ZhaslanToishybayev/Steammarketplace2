#!/bin/bash

# Database Initialization Script for Steam Marketplace

echo "🚀 Initializing Steam Marketplace Database..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until pg_isready -h localhost -p 5432 -U steam_user; do
  echo "⏳ Waiting for PostgreSQL..."
  sleep 2
done

echo "✅ PostgreSQL is ready"

# Create database if it doesn't exist
echo "📦 Creating database..."
createdb -h localhost -p 5432 -U steam_user steam_marketplace 2>/dev/null || echo "Database already exists"

# Run migrations
echo "🔄 Running database migrations..."
cd /var/www/apps/backend

# Run the migration script
node scripts/run_migrations.js

echo "✅ Database initialization complete!"

# Verify tables were created
echo "🔍 Verifying tables..."
psql -h localhost -p 5432 -U steam_user -d steam_marketplace -c "
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('escrow_trades', 'listings', 'bots', 'escrow_transactions', 'users');
"

echo "🎉 Database setup complete!"
