#!/bin/bash

# Steam Marketplace Trading System Startup Script

echo "🚀 Steam Marketplace Trading System Startup"
echo "============================================"

# Load environment variables
if [ -f .env.production ]; then
    echo "📦 Loading environment variables from .env.production"
    export $(cat .env.production | grep -v '^#' | xargs)
else
    echo "⚠️ .env.production not found, using system environment"
fi

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL client not found"
    echo "   Install with: sudo apt install postgresql-client"
    exit 1
fi

# Check Redis
if ! command -v redis-cli &> /dev/null; then
    echo "❌ Redis client not found"
    echo "   Install with: sudo apt install redis-tools"
    exit 1
fi

# Start services
echo ""
echo "🔧 Starting Steam Marketplace services..."

# Start in the correct directory
cd /var/www/apps/backend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run database migrations
echo "🔄 Running database migrations..."
node scripts/run_migrations.js

# Start the application
echo "🚀 Starting Steam Marketplace backend..."
echo "   Backend will be available at: http://localhost:3001"
echo "   Health check: http://localhost:3001/health/ready"
echo "   WebSocket: ws://localhost:3001/ws"
echo ""
echo "Press Ctrl+C to stop"

# Start the application
npm start

echo ""
echo "✅ Steam Marketplace backend stopped"
