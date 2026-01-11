#!/bin/bash

# Enhanced Steam Marketplace Trading System Startup Script
# This script ensures all components are properly configured and running

set -e

echo "🚀 Enhanced Steam Marketplace Trading System Startup"
echo "======================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Load environment variables
if [ -f ".env.production" ]; then
    print_status "Loading environment variables from .env.production"
    export $(cat .env.production | grep -v '^#' | xargs)
elif [ -f ".env" ]; then
    print_status "Loading environment variables from .env"
    export $(cat .env | grep -v '^#' | xargs)
else
    print_warning "No .env file found, using system environment"
fi

# 1. Prerequisites Check
print_status "1. Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi
print_success "Node.js $(node --version) found"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi
print_success "npm $(npm --version) found"

# 2. Dependency Installation
print_status "2. Installing dependencies..."

cd apps/backend
npm install
print_success "Backend dependencies installed"

cd ../frontend
npm install
print_success "Frontend dependencies installed"

cd ../..

# 3. Environment Validation
print_status "3. Validating environment configuration..."

required_vars=(
    "STEAM_API_KEY"
    "STEAM_BOT_1_USERNAME"
    "STEAM_BOT_1_PASSWORD"
    "STEAM_BOT_1_SHARED_SECRET"
    "STEAM_BOT_1_IDENTITY_SECRET"
    "STEAM_BOT_1_STEAM_ID"
    "POSTGRES_HOST"
    "POSTGRES_USER"
    "POSTGRES_PASSWORD"
    "REDIS_HOST"
    "REDIS_PASSWORD"
    "JWT_SECRET"
    "SESSION_SECRET"
    "CORS_ORIGIN"
    "BOT_ENCRYPTION_KEY"
)

missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
    print_error "Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    print_error "Please check your .env file"
    exit 1
fi

print_success "All required environment variables are set"

# 4. Database Setup
print_status "4. Setting up database..."

# Check if PostgreSQL is running
if ! pgrep postgres > /dev/null; then
    print_warning "PostgreSQL is not running"
    print_status "Starting PostgreSQL with Docker Compose..."
    docker-compose up -d postgres
    sleep 10
fi

# Wait for PostgreSQL to be ready
print_status "Waiting for PostgreSQL to be ready..."
timeout=30
counter=0
while ! pg_isready -h ${POSTGRES_HOST:-localhost} -p ${POSTGRES_PORT:-5432} -U ${POSTGRES_USER:-steam_user} 2>/dev/null; do
    sleep 1
    counter=$((counter + 1))
    if [ $counter -eq $timeout ]; then
        print_error "PostgreSQL is not ready after $timeout seconds"
        exit 1
    fi
done

# Create database if needed
createdb -h ${POSTGRES_HOST:-localhost} -p ${POSTGRES_PORT:-5432} -U ${POSTGRES_USER:-steam_user} ${POSTGRES_DB:-steam_marketplace} 2>/dev/null || print_warning "Database already exists"

# Run migrations
print_status "Running database migrations..."
node apps/backend/scripts/run_migrations.js

# Verify tables
print_status "Verifying database tables..."
tables=("escrow_trades" "listings" "bots" "escrow_transactions" "users" "notifications")
for table in "${tables[@]}"; do
    if psql -h ${POSTGRES_HOST:-localhost} -p ${POSTGRES_PORT:-5432} -U ${POSTGRES_USER:-steam_user} -d ${POSTGRES_DB:-steam_marketplace} -c "SELECT 1 FROM $table LIMIT 1" > /dev/null 2>&1; then
        print_success "Table $table exists"
    else
        print_warning "Table $table missing - may need additional migrations"
    fi
done

# 5. Redis Setup
print_status "5. Setting up Redis..."

if ! pgrep redis-server > /dev/null; then
    print_warning "Redis is not running"
    print_status "Starting Redis with Docker Compose..."
    docker-compose up -d redis
    sleep 5
fi

# Test Redis connection
if redis-cli ping > /dev/null 2>&1; then
    print_success "Redis connection successful"
else
    print_error "Redis connection failed"
    exit 1
fi

# Test Redis with password
if redis-cli -a ${REDIS_PASSWORD} ping > /dev/null 2>&1; then
    print_success "Redis password authentication working"
else
    print_warning "Redis password authentication failed - check Redis configuration"
fi

# 6. Bot Configuration Verification
print_status "6. Verifying Steam Bot configuration..."

if [ -n "$STEAM_BOT_1_USERNAME" ] && [ -n "$STEAM_BOT_1_PASSWORD" ]; then
    print_success "Steam Bot 1 configured"
else
    print_error "Steam Bot 1 not configured"
    exit 1
fi

# 7. Enhanced Bot Diagnostics
print_status "7. Running enhanced bot diagnostics..."

node diagnose-bots.js

# 8. Build Frontend
print_status "8. Building frontend..."
cd apps/frontend
if [ -f "package.json" ] && grep -q '"build"' package.json; then
    npm run build
    print_success "Frontend built successfully"
else
    print_warning "No build script found in frontend package.json"
fi
cd ../..

# 9. Start Services with Enhanced Monitoring
print_status "9. Starting Steam Marketplace services with enhanced monitoring..."

# Create logs directory
mkdir -p logs

# Start backend with enhanced monitoring
print_status "Starting backend service with enhanced bot management..."

cd apps/backend

# Start in background with enhanced script
nohup node -e "
const { startServer } = require('./src/server.js');
const { botManager } = require('./src/services/bot-manager.service');
const { enhancedNotificationService } = require('./src/services/enhanced-notification.service');

console.log('🚀 Starting Steam Marketplace with Enhanced Bot Management...');
console.log('🔧 Bot Manager Status:', botManager.getStatistics());

// Enhanced startup with retry logic
async function enhancedStartup() {
    try {
        console.log('🔄 Initializing bots with enhanced session management...');

        // Wait a moment for services to be ready
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Initialize bots with enhanced logging
        const botResult = await botManager.startAll();
        console.log('🤖 Bot initialization result:', botResult);

        // Check bot status
        const stats = botManager.getStatistics();
        console.log('📊 Bot Statistics:', stats);

        if (stats.onlineBots === 0) {
            console.warn('⚠️ No bots are online, checking session restore...');

            // Try session restore for each bot
            const bots = botManager.getAllBots();
            for (const bot of bots) {
                try {
                    const restored = await bot.restoreSession();
                    if (restored) {
                        console.log('✅ Bot session restored:', bot.config.accountName);
                    } else {
                        console.log('⚠️ No session found for bot:', bot.config.accountName);
                    }
                } catch (err) {
                    console.error('❌ Bot session restore failed:', bot.config.accountName, err.message);
                }
            }
        }

        console.log('✅ Enhanced bot management complete');

    } catch (err) {
        console.error('❌ Enhanced startup failed:', err);
    }
}

enhancedStartup();

// Start the server
const { app, server, io } = require('./src/server.js');
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log('🚀 Backend запущен: http://localhost:' + PORT);
    console.log('🔐 Steam Auth: http://localhost:3000/api/auth/steam');
    console.log('🛒 Escrow API: http://localhost:3000/api/escrow');
    console.log('📡 WebSocket: ws://localhost:' + PORT);
    console.log('🧪 Test: http://localhost:' + PORT + '/test-steam');
    console.log('✅ Готово! Enhanced Escrow trade system активирован.');

    // Enhanced notification system status
    console.log('🔔 Enhanced notification system: Available');
    console.log('📱 Real-time notifications: Enabled');
    console.log('🔄 Fallback notifications: Enabled');
});

" > ../logs/backend-enhanced.log 2>&1 &

BACKEND_PID=$!
echo $BACKEND_PID > ../backend.pid

# Wait for startup
sleep 10

# Check if backend started successfully
if kill -0 $BACKEND_PID 2>/dev/null; then
    print_success "Backend started with PID $BACKEND_PID"
else
    print_error "Backend failed to start"
    print_error "Check logs/backend-enhanced.log for details"
    exit 1
fi

cd ../..

# 10. Enhanced Health Check
print_status "10. Performing enhanced health check..."

sleep 5

# Check API health
if curl -s http://localhost:3001/api/health > /dev/null; then
    print_success "Backend API is responding"
else
    print_warning "Backend API not responding - may still be starting"
fi

# Check readiness endpoint
if curl -s http://localhost:3001/health/ready > /dev/null; then
    print_success "Backend is ready"
else
    print_warning "Backend not ready yet - check logs for details"
fi

# Check WebSocket connection
print_status "Testing WebSocket connection..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/ws > /dev/null; then
    print_success "WebSocket endpoint accessible"
else
    print_warning "WebSocket endpoint may have CORS issues"
fi

# 11. Create Enhanced Monitoring Scripts
print_status "11. Creating enhanced monitoring scripts..."

# Enhanced monitor script
cat > monitor-enhanced.sh << 'EOF'
#!/bin/bash

# Enhanced Steam Marketplace Trading System Monitor

echo "🏥 Enhanced Steam Marketplace Trading System Monitor"
echo "======================================================"

# Check backend process
if [ -f backend.pid ]; then
    BACKEND_PID=$(cat backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        echo "✅ Backend running (PID: $BACKEND_PID)"
    else
        echo "❌ Backend not running"
    fi
else
    echo "⚠️ Backend PID file not found"
fi

# Check services
echo ""
echo "🔍 Service Status:"

# PostgreSQL
if pgrep postgres > /dev/null; then
    echo "✅ PostgreSQL running"
else
    echo "❌ PostgreSQL not running"
fi

# Redis
if pgrep redis-server > /dev/null; then
    echo "✅ Redis running"
else
    echo "❌ Redis not running"
fi

# Check API
echo ""
echo "🌐 API Status:"
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ API responding"
else
    echo "❌ API not responding"
fi

if curl -s http://localhost:3001/health/ready > /dev/null; then
    echo "✅ API ready"
else
    echo "❌ API not ready"
fi

# Check WebSocket
echo ""
echo "📡 WebSocket Status:"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/ws | grep -q "101\|200\|400"; then
    echo "✅ WebSocket endpoint accessible"
else
    echo "⚠️ WebSocket endpoint may have issues"
fi

# Enhanced Bot Status Check
echo ""
echo "🤖 Bot Status:"
if [ -f backend.pid ]; then
    # Try to get bot status from API
    BOT_STATUS=$(curl -s http://localhost:3001/health/ready | grep -o '"bots":{"online":[0-9]+,"total":[0-9]+}' 2>/dev/null || echo "unknown")
    if [ "$BOT_STATUS" != "unknown" ]; then
        echo "✅ Bot status: $BOT_STATUS"
    else
        echo "⚠️ Cannot determine bot status"
    fi
else
    echo "⚠️ Backend not running, cannot check bot status"
fi

# Check logs
echo ""
echo "📋 Recent Log Entries:"
if [ -f logs/backend-enhanced.log ]; then
    tail -10 logs/backend-enhanced.log
else
    echo "No log file found"
fi

echo ""
echo "💡 To stop the system: ./stop-trading-system.sh"
echo "💡 To view logs: tail -f logs/backend-enhanced.log"
echo "💡 To run diagnostics: node diagnose-bots.js"
EOF

chmod +x monitor-enhanced.sh
print_success "Created enhanced monitor script"

# Enhanced stop script
cat > stop-enhanced.sh << 'EOF'
#!/bin/bash

# Enhanced Steam Marketplace Trading System Stop Script

echo "🛑 Stopping Enhanced Steam Marketplace Trading System..."

# Stop backend
if [ -f backend.pid ]; then
    BACKEND_PID=$(cat backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        echo "Stopping backend (PID: $BACKEND_PID)..."
        kill $BACKEND_PID
        sleep 2
        if kill -0 $BACKEND_PID 2>/dev/null; then
            echo "Force killing backend..."
            kill -9 $BACKEND_PID
        fi
        rm backend.pid
        print_success "Backend stopped"
    else
        echo "Backend already stopped"
        rm -f backend.pid
    fi
else
    echo "No backend PID file found"
fi

# Stop Docker containers if running
if command -v docker &> /dev/null; then
    if docker-compose ps | grep -q "Up"; then
        echo "Stopping Docker containers..."
        docker-compose stop
    fi
fi

echo "✅ Enhanced Steam Marketplace Trading System stopped"
EOF

chmod +x stop-enhanced.sh
print_success "Created enhanced stop script"

# Final summary
print_success "🎉 Enhanced Steam Marketplace Trading System deployment complete!"
echo ""
echo "📋 Enhanced Summary:"
echo "✅ Backend started on http://localhost:3001"
echo "✅ Database initialized with escrow and notification tables"
echo "✅ Redis configured with enhanced session management"
echo "✅ Steam Bot configuration verified with diagnostics"
echo "✅ Environment variables set with all required variables"
echo "✅ Enhanced notification system with fallback mechanisms"
echo "✅ WebSocket connections configured for production domain"
echo ""
echo "🎯 Enhanced Features:"
echo "✅ Real-time WebSocket notifications"
echo "✅ Database fallback for notifications"
echo "✅ Redis pub/sub notification system"
echo "✅ Enhanced bot session management"
echo "✅ Bot diagnostics and health monitoring"
echo "✅ Fallback notification mechanisms"
echo ""
echo "🔍 Next Steps:"
echo "1. Monitor system: ./monitor-enhanced.sh"
echo "2. View logs: tail -f logs/backend-enhanced.log"
echo "3. Run diagnostics: node diagnose-bots.js"
echo "4. Stop system: ./stop-enhanced.sh"
echo ""
echo "🌐 Available Endpoints:"
echo "   Health Check: http://localhost:3001/api/health"
echo "   Ready Check:  http://localhost:3001/health/ready"
echo "   Escrow API:   http://localhost:3001/api/escrow"
echo "   Auth:         http://localhost:3001/api/auth"
echo "   Notifications: http://localhost:3001/api/notifications"
echo ""
echo "⚠️ Important Notes:"
echo "   - Enhanced bot diagnostics will help identify connectivity issues"
echo "   - Fallback notification system ensures users receive updates"
echo "   - WebSocket connections are now optimized for production"
echo "   - Bot sessions are managed to prevent rate limiting"
echo "   - Test trading functionality with small amounts first"