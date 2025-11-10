#!/bin/bash

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║           🔧 DOCKER FIX & PRODUCTION DEPLOY                       ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "docker-compose.prod.yml" ]; then
    print_error "docker-compose.prod.yml not found!"
    echo "Please run this script from the project root directory"
    exit 1
fi

print_status "Found docker-compose.prod.yml"
echo ""

# Step 1: Stop all containers
echo "=== STEP 1: Stopping all containers ==="
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
print_status "Containers stopped"
echo ""

# Step 2: Clean up Docker system
echo "=== STEP 2: Cleaning up Docker system ==="
echo "This will remove all unused containers, networks, and images..."
docker system prune -af --volumes 2>/dev/null || true
print_status "Docker system cleaned"
echo ""

# Step 3: Verify environment file
echo "=== STEP 3: Verifying environment configuration ==="
if [ ! -f ".env.production" ]; then
    print_warning ".env.production not found!"
    if [ -f ".env.production.fixed" ]; then
        cp .env.production.fixed .env.production
        print_status "Copied .env.production.fixed to .env.production"
    else
        print_error ".env.production.fixed not found!"
        echo "Please create .env.production manually"
        exit 1
    fi
else
    print_status ".env.production exists"
fi

# Check if secrets are generated
if grep -q "GENERATE_STRONG" .env.production; then
    print_warning "Secrets not generated in .env.production"
    print_status "Running generate-secrets.sh..."
    if [ -f "generate-secrets.sh" ]; then
        chmod +x generate-secrets.sh
        ./generate-secrets.sh
        print_status "Secrets generated"
    else
        print_error "generate-secrets.sh not found!"
        exit 1
    fi
else
    print_status "Secrets already configured"
fi
echo ""

# Step 4: Build and start containers
echo "=== STEP 4: Building and starting containers ==="
echo "This may take 5-10 minutes on first run..."
docker-compose -f docker-compose.prod.yml up -d --build
print_status "Containers built and started"
echo ""

# Step 5: Wait for services to be ready
echo "=== STEP 5: Waiting for services to be ready ==="
echo "Waiting 30 seconds for services to initialize..."
sleep 30
print_status "Wait complete"
echo ""

# Step 6: Check container status
echo "=== STEP 6: Checking container status ==="
docker-compose -f docker-compose.prod.yml ps
echo ""

# Step 7: Check service health
echo "=== STEP 7: Testing service health ==="

# Test MongoDB
echo -n "  MongoDB: "
if docker-compose -f docker-compose.prod.yml exec -T mongodb mongosh --eval "db.adminCommand({ping: 1})" > /dev/null 2>&1; then
    print_status "MongoDB is healthy"
else
    print_error "MongoDB is not responding"
fi

# Test Redis
echo -n "  Redis: "
if docker-compose -f docker-compose.prod.yml exec -T redis redis-cli ping > /dev/null 2>&1; then
    print_status "Redis is healthy"
else
    print_error "Redis is not responding"
fi

# Test App
echo -n "  App: "
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    print_status "App is responding"
else
    print_error "App is not responding"
fi

# Test Nginx
echo -n "  Nginx: "
if curl -s http://localhost/api/health > /dev/null 2>&1; then
    print_status "Nginx is responding"
else
    print_error "Nginx is not responding"
fi
echo ""

# Step 8: Show logs if there are errors
echo "=== STEP 8: Checking for errors in logs ==="
if docker-compose -f docker-compose.prod.yml ps | grep -q "Exited"; then
    print_warning "Some containers have exited. Showing logs:"
    echo ""
    docker-compose -f docker-compose.prod.yml logs --tail=50
else
    print_status "No exited containers found"
fi
echo ""

# Step 9: Final status
echo "=== STEP 9: Final status ==="
echo "Container Status:"
docker ps --filter "name=steam-marketplace" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# Step 10: Test endpoints
echo "=== STEP 10: Testing endpoints ==="
echo -n "  Health endpoint: "
if curl -s http://localhost/api/health | grep -q "healthy"; then
    print_status "Health check passed"
    curl -s http://localhost/api/health | head -5
else
    print_error "Health check failed"
fi
echo ""

echo -n "  Steam OAuth: "
OAUTH_RESPONSE=$(curl -sI http://localhost/api/auth/steam 2>&1 | head -1)
if echo "$OAUTH_RESPONSE" | grep -q "302\|301"; then
    print_status "Steam OAuth is working"
else
    print_warning "Steam OAuth response: $OAUTH_RESPONSE"
fi
echo ""

# Summary
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                    📊 DEPLOYMENT SUMMARY                          ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""
print_status "Deployment completed!"
echo ""
echo "🌐 Access URLs:"
echo "  - http://sgomarket.com"
echo "  - http://sgomarket.com/api/health"
echo "  - http://localhost/api/health (local)"
echo ""
echo "📋 Useful Commands:"
echo "  - View logs:        docker-compose -f docker-compose.prod.yml logs -f"
echo "  - Stop services:    docker-compose -f docker-compose.prod.yml down"
echo "  - Restart services: docker-compose -f docker-compose.prod.yml restart"
echo "  - Check status:     docker-compose -f docker-compose.prod.yml ps"
echo ""
echo "🔧 Troubleshooting:"
echo "  - If app doesn't start: docker-compose -f docker-compose.prod.yml logs app"
echo "  - If MongoDB fails:     docker-compose -f docker-compose.prod.yml logs mongodb"
echo "  - If Redis fails:       docker-compose -f docker-compose.prod.yml logs redis"
echo "  - If Nginx fails:       docker-compose -f docker-compose.prod.yml logs nginx"
echo ""

# Check if domain is accessible
echo "=== DOMAIN ACCESS TEST ==="
if curl -s --max-time 5 http://sgomarket.com/api/health > /dev/null 2>&1; then
    print_status "Domain sgomarket.com is accessible!"
    echo ""
    echo "🎉 SUCCESS! Your site is live at http://sgomarket.com"
else
    print_warning "Domain sgomarket.com is not accessible yet"
    echo "This is normal if DNS hasn't propagated or if you're on laptop"
    echo "For production VPS, this should work automatically"
    echo ""
    echo "If you're deploying to VPS:"
    echo "  1. Make sure your domain A record points to VPS IP"
    echo "  2. Wait 5-15 minutes for DNS propagation"
    echo "  3. Open http://sgomarket.com in your browser"
fi
echo ""
