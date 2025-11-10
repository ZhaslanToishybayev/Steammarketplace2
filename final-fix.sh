#!/bin/bash
# ===========================================
# 🎯 FINAL FIX - Create logs directory with proper permissions
# ===========================================

echo "🔧 FINAL FIX - Adding logs directory to Dockerfile"

# Backup Dockerfile
cp Dockerfile Dockerfile.backup

# Add logs directory creation after COPY commands
sed -i "/RUN mkdir -p \/app\/public/i\\
# Create logs directory with proper permissions\\
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app/logs\\
" Dockerfile

echo "✅ Dockerfile updated"
echo ""
echo "🔄 Starting containers..."

# Start containers
docker-compose -f docker-compose.prod.yml up -d --build

# Wait
echo "⏳ Waiting for containers to start (60 seconds)..."
sleep 60

# Check status
echo ""
echo "📊 FINAL STATUS:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "🌐 Testing API:"
curl -s http://localhost:3001/api/health

echo ""
echo "✅ DONE! If all services are up, visit https://sgomarket.com/"
