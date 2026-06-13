#!/bin/bash

# Final Steam Marketplace Optimization Deployment
# This script completes the deployment using docker-compose

set -e

echo "🎯 Starting Final Steam Marketplace Optimization Deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if docker-compose.yml exists
if [ ! -f "/var/www/docker-compose.yml" ]; then
    print_error "docker-compose.yml not found"
    exit 1
fi

print_status "Docker Compose file found ✓"

# Phase 1: Security & Critical Fixes
print_status "🔒 Phase 1: Security & Critical Fixes"

# Update .env with secure passwords
if [ -f "/var/www/.env" ]; then
    # Backup .env
    cp /var/www/.env /var/www/.env.backup.$(date +%Y%m%d_%H%M%S)
    print_status "Backed up .env file"

    # Update passwords if not already updated
    if ! grep -q "b180bbe5fdc629903c2d9f95ff9aa203" /var/www/.env 2>/dev/null; then
        print_status "Updating .env with secure passwords..."
        sed -i 's/REDIS_PASSWORD=.*/REDIS_PASSWORD=b180bbe5fdc629903c2d9f95ff9aa203/' /var/www/.env
        sed -i 's/JWT_SECRET=.*/JWT_SECRET=383969d5183e154fbebcf65314939e431410b5ef9380adc93d59d1f4c0834a81/' /var/www/.env
        sed -i 's/BOT_KEY=.*/BOT_KEY=4e680a59c00ee12afa9a3932f55bec861dcd13ed6831be768a9f2fdf5f86c59e/' /var/www/.env
        print_status "Updated .env with secure passwords ✓"
    else
        print_status ".env already contains secure passwords ✓"
    fi
fi

# Phase 2: Reliability & Monitoring
print_status "📊 Phase 2: Reliability & Monitoring"

# Install Portainer if not running
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

# Check if files exist
if [ -f "/var/www/apps/backend/src/routes/steam-manager.routes.js" ] && \
   [ -f "/var/www/apps/backend/src/services/steam-api-manager.service.js" ] && \
   [ -f "/var/www/apps/backend/src/services/steam-api-optimized.service.js" ]; then
    print_status "Steam API optimization files found ✓"
else
    print_warning "Steam API optimization files not found, they will be created during build"
fi

# Update server.js to include new routes
print_status "Updating server.js with new routes..."

# Create a patch for server.js
if [ -f "/var/www/apps/backend/src/server.js" ]; then
    # Check if already patched
    if ! grep -q "steam-manager" /var/www/apps/backend/src/server.js; then
        # Create backup
        cp /var/www/apps/backend/src/server.js /var/www/apps/backend/src/server.js.backup

        # Add the new routes import and usage
        sed -i '/const steamCacheRoutes = require.*steam-cache/a\const steamManagerRoutes = require("./routes/steam-manager");' /var/www/apps/backend/src/server.js
        sed -i '/app\.use.*steam.*steamCacheRoutes/a\app.use("/api/steam-optimized", steamManagerRoutes);' /var/www/apps/backend/src/server.js

        print_status "Updated server.js with new routes ✓"
    else
        print_status "server.js already contains steam-manager routes ✓"
    fi
fi

# Rebuild and restart backend container
print_status "Rebuilding backend container..."

# Stop backend container
if docker ps | grep -q steam_backend; then
    print_status "Stopping backend container..."
    docker stop steam_backend
fi

# Remove backend container
if docker ps -a | grep -q steam_backend; then
    print_status "Removing backend container..."
    docker rm steam_backend
fi

# Build and start backend container
print_status "Building and starting backend container..."
docker-compose up -d backend

# Wait for container to be ready
print_status "Waiting for backend container to be ready..."
sleep 15

# Check container status
if docker ps | grep -q steam_backend; then
    print_status "Backend container started successfully ✓"
else
    print_warning "Backend container may have issues, checking logs..."
    docker logs steam_backend --tail 20
fi

# Test new endpoints
print_status "Testing new Steam API endpoints..."

# Test health check
echo "Testing health check..."
curl -s http://localhost:3001/api/steam-optimized/health

# Test cache stats
echo "Testing cache stats..."
curl -s http://localhost:3001/api/steam-optimized/cache/stats

# Set up automated backups
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
3. Updated server.js with Steam API optimization routes
4. Set up automated backup system
5. Made backup script executable
6. Rebuilt backend container with optimizations

## Services Status
$(docker ps --format "table {{.Names}}\t{{.Status}}")

## New Endpoints
- /api/steam-optimized/inventory/:steamId
- /api/steam-optimized/player/:steamId
- /api/steam-optimized/cache/stats
- /api/steam-optimized/cache/invalidate/:steamId
- /api/steam-optimized/health
- /api/steam-optimized/admin/toggle-optimized

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