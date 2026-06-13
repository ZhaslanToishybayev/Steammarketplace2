#!/bin/bash

# Steam Marketplace Trading System Health Check

echo "🏥 Steam Marketplace Trading System Health Check"
echo "================================================"

# Check environment variables
echo "🔍 Checking environment variables..."

required_vars=("STEAM_API_KEY" "STEAM_BOT_1_USERNAME" "STEAM_BOT_1_PASSWORD" "STEAM_BOT_1_SHARED_SECRET" "STEAM_BOT_1_IDENTITY_SECRET" "POSTGRES_HOST" "POSTGRES_USER" "POSTGRES_PASSWORD" "REDIS_HOST" "REDIS_PASSWORD" "JWT_SECRET" "SESSION_SECRET")

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Missing required environment variable: $var"
        missing=true
    else
        echo "✅ $var is set"
    fi
done

if [ "$missing" = true ]; then
    echo "❌ Some required environment variables are missing!"
    echo "   Please check your .env file"
    exit 1
fi

# Check database connection
echo ""
echo "🔍 Checking database connection..."
if psql -h localhost -p 5432 -U steam_user -d steam_marketplace -c "SELECT 1" > /dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
    echo "   Please ensure PostgreSQL is running and credentials are correct"
fi

# Check Redis connection
echo ""
echo "🔍 Checking Redis connection..."
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis connection successful"
else
    echo "❌ Redis connection failed"
    echo "   Please ensure Redis is running"
fi

# Check tables
echo ""
echo "🔍 Checking database tables..."
tables=("escrow_trades" "listings" "bots" "escrow_transactions" "users")
for table in "${tables[@]}"; do
    if psql -h localhost -p 5432 -U steam_user -d steam_marketplace -c "SELECT 1 FROM $table LIMIT 1" > /dev/null 2>&1; then
        echo "✅ Table $table exists"
    else
        echo "⚠️ Table $table missing - run migrations"
    fi
done

# Check bot configuration
echo ""
echo "🔍 Checking Steam Bot configuration..."
if [ -n "$STEAM_BOT_1_USERNAME" ] && [ -n "$STEAM_BOT_1_PASSWORD" ]; then
    echo "✅ Steam Bot 1 configured"
else
    echo "❌ Steam Bot 1 not configured"
fi

# Check API endpoints
echo ""
echo "🔍 Checking API endpoints..."
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Backend API is responding"
else
    echo "⚠️ Backend API not responding - may not be started yet"
fi

echo ""
echo "🎉 Health check complete!"
echo ""
echo "Next steps:"
echo "1. Ensure all services are running: npm run start"
echo "2. Check the logs for any errors"
echo "3. Test trading functionality"
