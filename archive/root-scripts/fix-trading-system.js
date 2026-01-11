#!/usr/bin/env node

/**
 * Fix Trading System Script
 * This script fixes the critical issues preventing the trading system from working
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Steam Marketplace Trading System Fix Script');
console.log('================================================');

// 1. Create proper .env file with all required environment variables
const envContent = `# ============================================
# PRODUCTION ENVIRONMENT VARIABLES
# ============================================
NODE_ENV=production
PORT=3001

# ============================================
# DATABASE CONFIGURATION
# ============================================
# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=steam_user
POSTGRES_PASSWORD=steam_password
POSTGRES_DB=steam_marketplace

# MongoDB
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=b180bbe5fdc629903c2d9f95ff9aa203
MONGO_DB=steam_marketplace

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=b180bbe5fdc629903c2d9f95ff9aa203

# ============================================
# AUTHENTICATION & SECURITY
# ============================================
# JWT Secrets
JWT_SECRET=383969d5183e154fbebcf65314939e431410b5ef9380adc93d59d1f4c0834a81
JWT_REFRESH_SECRET=b180bbe5fdc629903c2d9f95ff9aa203
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# CORS Configuration
CORS_ORIGIN=https://sgomarket.com,https://www.sgomarket.com,http://localhost:3000,http://localhost:3001,https://localhost:3000,https://localhost:3001

# WebSocket Configuration
WS_URL=wss://sgomarket.com

# ============================================
# STEAM INTEGRATION
# ============================================
# Steam API Key (REQUIRED)
STEAM_API_KEY=E1FC69B3707FF57C6267322B0271A86B

# Steam OpenID Configuration
STEAM_REALM=https://sgomarket.com
STEAM_RETURN_URL=https://sgomarket.com/api/auth/steam/return

# ============================================
# BOT CONFIGURATION (CRITICAL FOR TRADING)
# ============================================
# Bot Encryption Key - Generate with: openssl rand -hex 32
BOT_ENCRYPTION_KEY=4e680a59c00ee12afa9a3932f55bec861dcd13ed6831be768a9f2fdf5f86c59e

# Steam Bot 1 Configuration (REQUIRED)
STEAM_BOT_1_USERNAME=Sgovt1
STEAM_BOT_1_PASSWORD=Szxc123!
STEAM_BOT_1_SHARED_SECRET=LVke3WPKHWzT8pCNSemh2FMuJ90=
STEAM_BOT_1_IDENTITY_SECRET=fzCjA+NZa0b3yOeEMhln81qgNM4=
STEAM_BOT_1_STEAM_ID=76561198012345678

# Steam Bot 2 Configuration (OPTIONAL - for load balancing)
STEAM_BOT_2_USERNAME=Sgovt2
STEAM_BOT_2_PASSWORD=Szxc123!
STEAM_BOT_2_SHARED_SECRET=LVke3WPKHWzT8pCNSemh2FMuJ90=
STEAM_BOT_2_IDENTITY_SECRET=fzCjA+NZa0b3yOeEMhln81qgNM4=
STEAM_BOT_2_STEAM_ID=76561198012345679

# ============================================
# EXTERNAL SERVICES
# ============================================
# Session Secret (REQUIRED)
SESSION_SECRET=WlTQF7w5ZFWBR1vT4iwfVlNYJ5y22QnvLiaYKQPBxWeRVEDrtENLfsieYgkFJjFtBbFkwfRwub/3RBwb+tAPSg==

# Email Configuration (REQUIRED)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@sgomarket.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@sgomarket.com

# ============================================
# RATE LIMITING & PERFORMANCE
# ============================================
AUTH_RATE_LIMIT_TTL=60
AUTH_RATE_LIMIT_MAX=5

# Database Pool Settings
DB_POOL_MAX=50
DB_POOL_MIN=10

# Cache Settings
REDIS_SESSIONS_DB=0
REDIS_CACHE_DB=1
REDIS_QUEUES_DB=2
REDIS_THROTTLE_DB=3

# Queue Settings
QUEUE_TRADE_CONCURRENCY=10
QUEUE_INVENTORY_CONCURRENCY=5
QUEUE_PRICE_CONCURRENCY=20

# ============================================
# FRONTEND URLS
# ============================================
FRONTEND_URL=https://sgomarket.com
CLIENT_URL=https://sgomarket.com

# ============================================
# LOGGING
# ============================================
LOG_LEVEL=info

# Disable worker for development (set to false to run bots in same process)
RUN_WORKER=true
`;

// 2. Create .env file
const envPath = path.join(__dirname, '.env.production');
if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Created .env.production with all required environment variables');
} else {
    console.log('⚠️ .env.production already exists');
}

// 3. Create database initialization script
const dbInitScript = `#!/bin/bash

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
`;

const dbInitPath = path.join(__dirname, 'init-database.sh');
if (!fs.existsSync(dbInitPath)) {
    fs.writeFileSync(dbInitPath, dbInitScript);
    fs.chmodSync(dbInitPath, '755');
    console.log('✅ Created init-database.sh script');
} else {
    console.log('⚠️ init-database.sh already exists');
}

// 4. Create Redis configuration script
const redisConfigScript = `#!/bin/bash

# Redis Configuration Script

echo "🔧 Configuring Redis for Steam Marketplace..."

# Check if Redis is running
if ! pgrep redis-server > /dev/null; then
    echo "❌ Redis is not running. Please start Redis first:"
    echo "   sudo systemctl start redis"
    echo "   or"
    echo "   redis-server"
    exit 1
fi

# Test Redis connection
echo "🔍 Testing Redis connection..."
redis-cli ping

if [ $? -eq 0 ]; then
    echo "✅ Redis is accessible"
else
    echo "❌ Redis connection failed"
    exit 1
fi

# Configure Redis databases
echo "🗄️ Configuring Redis databases..."
redis-cli CONFIG SET databases 16

# Test with password
echo "🔑 Testing Redis password authentication..."
redis-cli -a b180bbe5fdc629903c2d9f95ff9aa203 ping

if [ $? -eq 0 ]; then
    echo "✅ Redis password authentication working"
else
    echo "⚠️ Redis password authentication may need configuration"
    echo "   Set password in redis.conf: requirepass b180bbe5fdc629903c2d9f95ff9aa203"
fi

echo "🎉 Redis configuration complete!"
`;

const redisConfigPath = path.join(__dirname, 'configure-redis.sh');
if (!fs.existsSync(redisConfigPath)) {
    fs.writeFileSync(redisConfigPath, redisConfigScript);
    fs.chmodSync(redisConfigPath, '755');
    console.log('✅ Created configure-redis.sh script');
} else {
    console.log('⚠️ configure-redis.sh already exists');
}

// 5. Create trading system health check script
const healthCheckScript = `#!/bin/bash

# Steam Marketplace Trading System Health Check

echo "🏥 Steam Marketplace Trading System Health Check"
echo "================================================"

# Check environment variables
echo "🔍 Checking environment variables..."

required_vars=("STEAM_API_KEY" "STEAM_BOT_1_USERNAME" "STEAM_BOT_1_PASSWORD" "STEAM_BOT_1_SHARED_SECRET" "STEAM_BOT_1_IDENTITY_SECRET" "POSTGRES_HOST" "POSTGRES_USER" "POSTGRES_PASSWORD" "REDIS_HOST" "REDIS_PASSWORD" "JWT_SECRET" "SESSION_SECRET")

for var in "\${required_vars[@]}"; do
    if [ -z "\${!var}" ]; then
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
for table in "\${tables[@]}"; do
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
`;

const healthCheckPath = path.join(__dirname, 'health-check.sh');
if (!fs.existsSync(healthCheckPath)) {
    fs.writeFileSync(healthCheckPath, healthCheckScript);
    fs.chmodSync(healthCheckPath, '755');
    console.log('✅ Created health-check.sh script');
} else {
    console.log('⚠️ health-check.sh already exists');
}

// 6. Create trading system startup script
const startupScript = `#!/bin/bash

# Steam Marketplace Trading System Startup Script

echo "🚀 Steam Marketplace Trading System Startup"
echo "============================================"

# Load environment variables
if [ -f .env.production ]; then
    echo "📦 Loading environment variables from .env.production"
    export \$(cat .env.production | grep -v '^#' | xargs)
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
`;

const startupPath = path.join(__dirname, 'start-trading-system.sh');
if (!fs.existsSync(startupPath)) {
    fs.writeFileSync(startupPath, startupScript);
    fs.chmodSync(startupPath, '755');
    console.log('✅ Created start-trading-system.sh script');
} else {
    console.log('⚠️ start-trading-system.sh already exists');
}

console.log("");
console.log("🎉 Trading System Fix Complete!");
console.log("================================");
console.log("");
console.log("📋 Summary of fixes applied:");
console.log("✅ Created .env.production with all required variables");
console.log("✅ Created database initialization script");
console.log("✅ Created Redis configuration script");
console.log("✅ Created health check script");
console.log("✅ Created startup script");
console.log("");
console.log("🔧 Next steps:");
console.log("1. Run: chmod +x *.sh");
console.log("2. Run: ./configure-redis.sh");
console.log("3. Run: ./init-database.sh");
console.log("4. Run: ./start-trading-system.sh");
console.log("");
console.log("🔍 To check status:");
console.log("   ./health-check.sh");
console.log("");
console.log("🌐 Services will be available at:");
console.log("   Backend API: http://localhost:3001");
console.log("   WebSocket: ws://localhost:3001/ws");
console.log("   Health: http://localhost:3001/health/ready");
console.log("");
console.log("⚠️ IMPORTANT: Make sure to:");
console.log("   - Set correct Steam Bot credentials in .env.production");
console.log("   - Ensure PostgreSQL and Redis are running");
console.log("   - Verify Steam API key is valid");
console.log("   - Check that bots are properly configured on Steam");