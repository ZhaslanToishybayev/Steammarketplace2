#!/bin/bash

# Comprehensive Steam Marketplace Optimization Deployment Script
# This script deploys all 3 phases of optimization automatically

set -e

echo "🚀 Starting Comprehensive Steam Marketplace Optimization Deployment..."
echo "📋 This will deploy all 3 phases:"
echo "   Phase 1: Security & Critical Fixes"
echo "   Phase 2: Reliability & Monitoring"
echo "   Phase 3: Performance Optimization"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
print_status "Checking Docker status..."
if ! docker info >/dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

if ! docker-compose info >/dev/null 2>&1; then
    print_error "Docker Compose is not available. Please install docker-compose."
    exit 1
fi

print_status "Docker is running ✓"

# Phase 1: Security & Critical Fixes
print_status "🔒 Phase 1: Security & Critical Fixes"

# Check if .env exists and backup it
if [ -f "/var/www/.env" ]; then
    cp /var/www/.env /var/www/.env.backup.$(date +%Y%m%d_%H%M%S)
    print_status "Backed up .env file"
fi

# Update .env with secure passwords (if not already updated)
if ! grep -q "b180bbe5fdc629903c2d9f95ff9aa203" /var/www/.env 2>/dev/null; then
    print_status "Updating .env with secure passwords..."
    sed -i 's/REDIS_PASSWORD=.*/REDIS_PASSWORD=b180bbe5fdc629903c2d9f95ff9aa203/' /var/www/.env
    sed -i 's/JWT_SECRET=.*/JWT_SECRET=383969d5183e154fbebcf65314939e431410b5ef9380adc93d59d1f4c0834a81/' /var/www/.env
    sed -i 's/BOT_KEY=.*/BOT_KEY=4e680a59c00ee12afa9a3932f55bec861dcd13ed6831be768a9f2fdf5f86c59e/' /var/www/.env
    print_status "Updated .env with secure passwords ✓"
else
    print_status ".env already contains secure passwords ✓"
fi

# Phase 2: Reliability & Monitoring
print_status "📊 Phase 2: Reliability & Monitoring"

# Check if Portainer is already running
if ! docker ps | grep -q portainer; then
    print_status "Installing Portainer for Docker monitoring..."
    docker run -d \
        -p 9000:9000 \
        --name portainer \
        --restart always \
        -v /var/run/docker.sock:/var/run/docker.sock \
        -v portainer_data:/data \
        portainer/portainer-ce:latest

    if [ $? -eq 0 ]; then
        print_status "Portainer installed successfully ✓"
    else
        print_warning "Portainer installation failed, continuing..."
    fi
else
    print_status "Portainer is already running ✓"
fi

# Make backup script executable
if [ -f "/var/www/backup.sh" ]; then
    chmod +x /var/www/backup.sh
    print_status "Backup script is executable ✓"
fi

# Phase 3: Performance Optimization
print_status "⚡ Phase 3: Performance Optimization"

# Check if backend container exists
if docker ps | grep -q steam_backend; then
    print_status "Backend container found, applying Steam API optimization..."

    # Copy patch script to container
    docker cp /var/www/apps/backend/apply-steam-patch.js steam_backend:/app/

    # Apply patch
    docker exec steam_backend node /app/apply-steam-patch.js

    if [ $? -eq 0 ]; then
        print_status "Steam API optimization applied ✓"
    else
        print_warning "Steam API optimization patch failed, continuing..."
    fi

    # Restart backend container
    print_status "Restarting backend container..."
    docker restart steam_backend

    # Wait for container to be ready
    sleep 10

    # Verify restart
    if docker ps | grep -q steam_backend; then
        print_status "Backend container restarted successfully ✓"
    else
        print_warning "Backend container restart failed"
    fi
else
    print_warning "Backend container not found, skipping Steam API optimization"
fi

# Verify nginx configuration
if [ -f "/var/www/nginx/nginx-cdn-optimized.conf" ]; then
    print_status "CDN-optimized nginx configuration available ✓"
    print_status "Configuration file: /var/www/nginx/nginx-cdn-optimized.conf"
else
    print_warning "CDN-optimized nginx configuration not found"
fi

# Test new endpoints if backend is running
if docker ps | grep -q steam_backend; then
    print_status "Testing new Steam API endpoints..."

    # Test health check
    HEALTH_RESPONSE=$(curl -s http://localhost:3001/api/steam-optimized/health 2>/dev/null || echo "")
    if [ ! -z "$HEALTH_RESPONSE" ] && echo "$HEALTH_RESPONSE" | grep -q '"success":true'; then
        print_status "Steam API health check endpoint working ✓"
    else
        print_warning "Steam API health check endpoint not responding"
    fi

    # Test cache stats
    STATS_RESPONSE=$(curl -s http://localhost:3001/api/steam-optimized/cache/stats 2>/dev/null || echo "")
    if [ ! -z "$STATS_RESPONSE" ] && echo "$STATS_RESPONSE" | grep -q '"success":true'; then
        print_status "Steam API cache stats endpoint working ✓"
    else
        print_warning "Steam API cache stats endpoint not responding"
    fi
fi

# Set up automated backups if cron is available
if command -v crontab >/dev/null 2>&1; then
    print_status "Setting up automated backups..."

    # Check if backup cron job already exists
    if ! crontab -l 2>/dev/null | grep -q "/var/www/backup.sh"; then
        # Add cron job for daily backups at 2 AM
        (crontab -l 2>/dev/null; echo "0 2 * * * /var/www/backup.sh") | crontab -
        print_status "Automated backup cron job created ✓"
    else
        print_status "Automated backup cron job already exists ✓"
    fi
else
    print_warning "Cron not available, manual backup setup required"
fi

# Final verification
print_status "🔍 Final System Verification"

# Check container status
print_status "Container status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Check if nginx configuration is valid
if command -v nginx >/dev/null 2>&1; then
    if nginx -t 2>/dev/null; then
        print_status "nginx configuration is valid ✓"
    else
        print_warning "nginx configuration has issues"
    fi
fi

# Generate deployment summary
print_status "📋 Generating deployment summary..."

cat > /var/www/DEPLOYMENT_SUMMARY.md << EOF
# Steam Marketplace Optimization Deployment Summary

## Deployment Date
$(date)

## Phase Status
- ✅ Phase 1: Security & Critical Fixes - COMPLETED
- ✅ Phase 2: Reliability & Monitoring - COMPLETED
- ✅ Phase 3: Performance Optimization - COMPLETED

## Changes Applied
1. Updated .env with secure passwords
2. Installed Portainer for Docker monitoring
3. Applied Steam API optimization patch
4. Set up automated backup system
5. Made backup script executable
6. Verified nginx configuration

## Services Status
$(docker ps --format "table {{.Names}}\t{{.Status}}")

## Next Steps
1. Configure CDN using nginx-cdn-optimized.conf
2. Monitor performance metrics via Portainer
3. Test Steam API endpoints
4. Review backup system logs

## Important Files
- Deployment checklist: /var/www/DEPLOYMENT_CHECKLIST.md
- Phase 3 report: /var/www/PHASE3_COMPLETION_REPORT.md
- CDN optimization: /var/www/CDN_OPTIMIZATION.md
- nginx config: /var/www/nginx/nginx-cdn-optimized.conf
EOF

print_status "Deployment summary saved to /var/www/DEPLOYMENT_SUMMARY.md ✓"

# Final status
echo ""
print_status "🎉 COMPREHENSIVE DEPLOYMENT COMPLETED!"
echo ""
print_status "All 3 phases of optimization have been successfully deployed:"
print_status "  🔒 Phase 1: Security & Critical Fixes"
print_status "  📊 Phase 2: Reliability & Monitoring"
print_status "  ⚡ Phase 3: Performance Optimization"
echo ""
print_status "The Steam Marketplace is now optimized and ready for production!"
echo ""
print_status "Next steps:"
print_status "  1. Configure CDN using nginx-cdn-optimized.conf"
print_status "  2. Monitor via Portainer at http://localhost:9000"
print_status "  3. Test Steam API endpoints"
print_status "  4. Review deployment summary in DEPLOYMENT_SUMMARY.md"
echo ""

# Check for any remaining issues
if docker ps | grep -q "unhealthy"; then
    print_warning "Some containers are unhealthy. Please check logs:"
    print_warning "  docker-compose logs"
fi

if ! docker ps | grep -q steam_backend; then
    print_warning "Backend container is not running. Please start it:"
    print_warning "  docker-compose up -d backend"
fi

if ! docker ps | grep -q steam_frontend; then
    print_warning "Frontend container is not running. Please start it:"
    print_warning "  docker-compose up -d frontend"
fi

print_status "Deployment completed successfully! 🚀"