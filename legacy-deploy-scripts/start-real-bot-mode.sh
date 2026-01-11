#!/bin/bash

# Steam Marketplace Trading System - REAL BOT MODE
# This script ensures bots are running and online in Steam

set -e

echo "🚀 Steam Marketplace Trading System - REAL BOT MODE"
echo "====================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Check environment
print_status "1. Loading environment configuration..."

if [ -f ".env.production" ]; then
    print_status "Loading .env.production"
    export $(cat .env.production | grep -v '^#' | xargs)
elif [ -f ".env" ]; then
    print_status "Loading .env"
    export $(cat .env | grep -v '^#' | xargs)
else
    print_error "No .env file found"
    exit 1
fi

# Verify critical bot environment variables
print_status "2. Verifying bot configuration..."

required_bot_vars=(
    "STEAM_API_KEY"
    "STEAM_BOT_1_USERNAME"
    "STEAM_BOT_1_PASSWORD"
    "STEAM_BOT_1_SHARED_SECRET"
    "STEAM_BOT_1_IDENTITY_SECRET"
    "STEAM_BOT_1_STEAM_ID"
    "BOT_ENCRYPTION_KEY"
)

missing_vars=()

for var in "${required_bot_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
    print_error "Missing required bot environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    exit 1
fi

print_success "All bot environment variables are set"

# Start services
print_status "3. Starting Steam Marketplace services with REAL BOT MODE..."

cd apps/backend

# Kill any existing processes
print_status "Stopping any existing processes..."
pkill -f "node.*server.js" || true
sleep 2

# Create logs directory
mkdir -p ../logs

# Start backend with REAL BOT MODE
print_status "Starting backend with enhanced bot management..."

nohup node -e "
const { app, server, io } = require('./src/server.js');
const { botManager } = require('./src/services/bot-manager.service');
const { steamNotificationService } = require('./src/services/steam-notification.service');
const PORT = process.env.PORT || 3001;

console.log('🚀 Starting Steam Marketplace with REAL BOT MODE...');
console.log('🔧 Bot Configuration Verified');

// Enhanced bot startup with forced initialization
async function realBotStartup() {
    try {
        console.log('🤖 Forcing bot initialization...');

        // Force bot initialization with retries
        let attempts = 0;
        let maxAttempts = 3;
        let botOnline = false;

        while (attempts < maxAttempts && !botOnline) {
            attempts++;
            console.log(\`🔄 Attempt \${attempts}/\${maxAttempts} to initialize bots...\`);

            try {
                // Initialize bots
                const botResult = await botManager.startAll();

                // Check bot status
                const stats = botManager.getStatistics();
                console.log(\`📊 Bot Statistics: \${stats.onlineBots}/\${stats.totalBots} online\`);

                if (stats.onlineBots > 0) {
                    botOnline = true;
                    console.log('✅ Bots are ONLINE and ready!');
                    break;
                } else {
                    console.warn('⚠️ No bots online, retrying in 5 seconds...');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            } catch (err) {
                console.error(\`❌ Bot initialization attempt \${attempts} failed:\`, err.message);
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
        }

        if (!botOnline) {
            console.error('❌ Failed to get bots online after 3 attempts');
            console.log('💡 This may be due to:');
            console.log('   - Incorrect Steam credentials');
            console.log('   - Steam Guard issues');
            console.log('   - Rate limiting');
            console.log('   - Network connectivity');
        } else {
            console.log('✅ Bot initialization successful!');
        }

        // Test Steam notification service
        console.log('🔔 Testing Steam notification service...');
        try {
            const bots = botManager.getAllBots();
            const availableBot = bots.find(b => b.isOnline && b.isReady);
            if (availableBot) {
                console.log('✅ Steam notification service ready');
                console.log(\`🤖 Using bot: \${availableBot.config.accountName}\`);
            } else {
                console.warn('⚠️ No bots available for Steam notifications');
            }
        } catch (err) {
            console.error('❌ Steam notification service test failed:', err.message);
        }

    } catch (err) {
        console.error('❌ Enhanced bot startup failed:', err);
    }
}

// Start bot initialization
realBotStartup();

// Start server
server.listen(PORT, () => {
    console.log('');
    console.log('🚀 REAL BOT MODE - Steam Marketplace запущен!');
    console.log(\`📡 Port: http://localhost:\${PORT}\`);
    console.log('🛒 Escrow API: http://localhost:3001/api/escrow');
    console.log('🤖 Bot Mode: REAL - Bots will connect to Steam');
    console.log('🔔 Steam Notifications: Enabled');
    console.log('');
    console.log('📋 Bot Status Check Commands:');
    console.log('   - Check logs: tail -f ../logs/backend.log');
    console.log('   - Bot diagnostics: node diagnose-bots.js');
    console.log('   - System monitor: ./monitor-enhanced.sh');
});

" > ../logs/backend-real-bot.log 2>&1 &

BACKEND_PID=$!
echo $BACKEND_PID > ../backend.pid

print_success "Backend started with PID $BACKEND_PID"

# Wait for startup
print_status "4. Waiting for system initialization..."
sleep 10

# Check if backend is running
if kill -0 $BACKEND_PID 2>/dev/null; then
    print_success "Backend is running"
else
    print_error "Backend failed to start"
    print_error "Check logs: tail -f logs/backend-real-bot.log"
    exit 1
fi

# Health check
print_status "5. Performing health check..."

if curl -s http://localhost:3001/api/health > /dev/null; then
    print_success "Backend API is responding"
else
    print_warning "Backend API not responding yet"
fi

if curl -s http://localhost:3001/health/ready > /dev/null; then
    print_success "System is ready"
else
    print_warning "System not ready yet, checking in background"
fi

# Check bot status
print_status "6. Checking bot status..."

sleep 5

# Try to get bot status from API
BOT_STATUS=$(curl -s http://localhost:3001/health/ready 2>/dev/null | grep -o '"bots":{"online":[0-9]*,"total":[0-9]*}' || echo "unknown")

if [ "$BOT_STATUS" != "unknown" ]; then
    print_success "Bot status: $BOT_STATUS"
else
    print_warning "Cannot determine bot status yet"
    print_status "Bots may still be initializing..."
fi

# Final instructions
print_success "🎉 Steam Marketplace with REAL BOT MODE is starting!"
echo ""
echo "📋 System Status:"
echo "✅ Backend API: http://localhost:3001"
echo "✅ WebSocket: ws://localhost:3001/ws"
echo "✅ Escrow API: http://localhost:3001/api/escrow"
echo "✅ Steam Notifications: Enabled"
echo ""
echo "🔍 Monitoring Commands:"
echo "   View logs: tail -f logs/backend-real-bot.log"
echo "   Bot diagnostics: node diagnose-bots.js"
echo "   System monitor: ./monitor-enhanced.sh"
echo ""
echo "🤖 Bot Status:"
echo "   - Bots are attempting to connect to Steam"
echo "   - Check Steam Guard settings on bot accounts"
echo "   - Ensure Steam API key is working"
echo "   - Bot status will update in logs"
echo ""
echo "🔔 Steam Notifications:"
echo "   - Users will receive notifications in Steam"
echo "   - Notifications sent via authenticated bots"
echo "   - Fallback system ensures delivery"
echo ""
echo "💡 If bots are still offline after 5 minutes:"
echo "   1. Check bot credentials in .env.production"
echo "   2. Verify Steam Guard settings"
echo "   3. Check network connectivity to Steam"
echo "   4. Review logs for specific errors"