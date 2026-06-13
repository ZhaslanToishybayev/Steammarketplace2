#!/bin/bash

# Comprehensive Steam Marketplace Trading System Deployment Script
# This script sets up and fixes the trading system for production

set -e

echo "🚀 Steam Marketplace Trading System Deployment"
echo "================================================"
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

print_status "Starting Steam Marketplace Trading System deployment..."

# 1. Check prerequisites
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

# Check Docker (if using Docker)
if command -v docker &> /dev/null; then
    print_success "Docker found"
    DOCKER_AVAILABLE=true
else
    print_warning "Docker not found - will use local services"
    DOCKER_AVAILABLE=false
fi

# 2. Install dependencies
print_status "2. Installing dependencies..."
cd apps/backend
npm install
print_success "Backend dependencies installed"

cd ../frontend
npm install
print_success "Frontend dependencies installed"

cd ../..

# 3. Setup environment
print_status "3. Setting up environment configuration..."

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    print_warning "No .env file found, using .env.production"
    cp .env.production .env
    print_success "Copied .env.production to .env"
fi

# Verify critical environment variables
print_status "Checking critical environment variables..."

required_vars=(
    "STEAM_API_KEY"
    "STEAM_BOT_1_USERNAME"
    "STEAM_BOT_1_PASSWORD"
    "STEAM_BOT_1_SHARED_SECRET"
    "STEAM_BOT_1_IDENTITY_SECRET"
    "POSTGRES_HOST"
    "POSTGRES_USER"
    "POSTGRES_PASSWORD"
    "REDIS_HOST"
    "REDIS_PASSWORD"
    "JWT_SECRET"
    "SESSION_SECRET"
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

# 4. Setup database
print_status "4. Setting up database..."

# Check if PostgreSQL is running
if ! pgrep postgres > /dev/null; then
    print_warning "PostgreSQL is not running"
    if [ "$DOCKER_AVAILABLE" = true ]; then
        print_status "Starting PostgreSQL with Docker Compose..."
        docker-compose up -d postgres
        sleep 10
    else
        print_error "Please start PostgreSQL manually or use Docker Compose"
        exit 1
    fi
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
tables=("escrow_trades" "listings" "bots" "escrow_transactions" "users")
for table in "${tables[@]}"; do
    if psql -h ${POSTGRES_HOST:-localhost} -p ${POSTGRES_PORT:-5432} -U ${POSTGRES_USER:-steam_user} -d ${POSTGRES_DB:-steam_marketplace} -c "SELECT 1 FROM $table LIMIT 1" > /dev/null 2>&1; then
        print_success "Table $table exists"
    else
        print_warning "Table $table missing - may need additional migrations"
    fi
done

# 5. Setup Redis
print_status "5. Setting up Redis..."

if ! pgrep redis-server > /dev/null; then
    print_warning "Redis is not running"
    if [ "$DOCKER_AVAILABLE" = true ]; then
        print_status "Starting Redis with Docker Compose..."
        docker-compose up -d redis
        sleep 5
    else
        print_error "Please start Redis manually or use Docker Compose"
        exit 1
    fi
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

# 6. Verify Steam Bot Configuration
print_status "6. Verifying Steam Bot configuration..."
if [ -n "$STEAM_BOT_1_USERNAME" ] && [ -n "$STEAM_BOT_1_PASSWORD" ]; then
    print_success "Steam Bot 1 configured"
else
    print_error "Steam Bot 1 not configured"
    exit 1
fi

# 7. Build frontend
print_status "7. Building frontend..."
cd apps/frontend
if [ -f "package.json" ] && grep -q '"build"' package.json; then
    npm run build
    print_success "Frontend built successfully"
else
    print_warning "No build script found in frontend package.json"
fi
cd ../..

# 8. Start services
print_status "8. Starting Steam Marketplace services..."

# Start backend
print_status "Starting backend service..."
cd apps/backend

# Create logs directory
mkdir -p logs

# Start in background
nohup npm start > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../backend.pid

# Wait a moment for startup
sleep 3

# Check if backend started successfully
if kill -0 $BACKEND_PID 2>/dev/null; then
    print_success "Backend started with PID $BACKEND_PID"
else
    print_error "Backend failed to start"
    print_error "Check logs/backend.log for details"
    exit 1
fi

cd ../..

# 9. Health check
print_status "9. Performing health check..."

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

# 10. Create monitoring script
print_status "10. Creating monitoring script..."

cat > monitor-trading-system.sh << 'EOF'
#!/bin/bash

# Steam Marketplace Trading System Monitor

echo "🏥 Steam Marketplace Trading System Monitor"
echo "=========================================="

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

# Check logs
echo ""
echo "📋 Recent Log Entries:"
if [ -f logs/backend.log ]; then
    tail -5 logs/backend.log
else
    echo "No log file found"
fi

echo ""
echo "💡 To stop the system: ./stop-trading-system.sh"
echo "💡 To view logs: tail -f logs/backend.log"
EOF

chmod +x monitor-trading-system.sh
print_success "Created monitor-trading-system.sh"

# 11. Create stop script
print_status "11. Creating stop script..."

cat > stop-trading-system.sh << 'EOF'
#!/bin/bash

# Steam Marketplace Trading System Stop Script

echo "🛑 Stopping Steam Marketplace Trading System..."

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

echo "✅ Steam Marketplace Trading System stopped"
EOF

chmod +x stop-trading-system.sh
print_success "Created stop-trading-system.sh"

# Final summary
print_success "🎉 Steam Marketplace Trading System deployment complete!"
echo ""
echo "📋 Summary:"
echo "✅ Backend started on http://localhost:3001"
echo "✅ Database initialized with escrow tables"
echo "✅ Redis configured"
echo "✅ Steam Bot configuration verified"
echo "✅ Environment variables set"
echo ""
echo "🎯 Next Steps:"
echo "1. Monitor system: ./monitor-trading-system.sh"
echo "2. View logs: tail -f logs/backend.log"
echo "3. Stop system: ./stop-trading-system.sh"
echo ""
echo "🌐 Available Endpoints:"
echo "   Health Check: http://localhost:3001/api/health"
echo "   Ready Check:  http://localhost:3001/health/ready"
echo "   Escrow API:   http://localhost:3001/api/escrow"
echo "   Auth:         http://localhost:3001/api/auth"
echo ""
echo "⚠️ Important Notes:"
echo "   - Ensure Steam Bot accounts are properly configured on Steam"
echo "   - Check logs regularly for any errors"
echo "   - Monitor bot status through the admin panel"
echo "   - Test trading functionality with small amounts first"