#!/bin/bash

# Steam API Optimization Deployment Script
# This script applies Redis caching to Steam API without rebuilding Docker image

echo "🚀 Starting Steam API optimization deployment..."

# Check if backend container exists
if ! docker ps | grep -q steam_backend; then
    echo "❌ Backend container not found. Please start the containers first."
    exit 1
fi

# Apply patch to server.js inside container
echo "📦 Applying patch to backend container..."

docker exec steam_backend node /app/apply-steam-patch.js

if [ $? -eq 0 ]; then
    echo "✅ Patch applied successfully!"
else
    echo "❌ Failed to apply patch"
    exit 1
fi

# Restart backend container to apply changes
echo "🔄 Restarting backend container..."
docker restart steam_backend

if [ $? -eq 0 ]; then
    echo "✅ Backend container restarted successfully!"
else
    echo "❌ Failed to restart backend container"
    exit 1
fi

# Wait for container to be ready
echo "⏳ Waiting for backend to be ready..."
sleep 10

# Test new endpoints
echo "🧪 Testing new Steam API endpoints..."

# Test health check
echo "Testing health check..."
curl -s http://localhost:3001/api/steam-optimized/health || echo "❌ Health check failed"

# Test cache stats
echo "Testing cache stats..."
curl -s http://localhost:3001/api/steam-optimized/cache/stats || echo "❌ Cache stats failed"

echo "✅ Steam API optimization deployment completed!"
echo "📋 Available endpoints:"
echo "  - /api/steam-optimized/inventory/:steamId"
echo "  - /api/steam-optimized/player/:steamId"
echo "  - /api/steam-optimized/cache/stats"
echo "  - /api/steam-optimized/cache/invalidate/:steamId"
echo "  - /api/steam-optimized/health"
echo "  - /api/steam-optimized/admin/toggle-optimized"