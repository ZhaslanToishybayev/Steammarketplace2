#!/bin/bash
# ===========================================
# 🔧 Force Rebuild Script
# Fixes ENOENT error by rebuilding with clean cache
# ===========================================

set -e

echo "=========================================="
echo "🔧 Force Rebuild - Fixing ENOENT Error"
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ Error: docker-compose.yml not found!${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Update code first
echo -e "\n${YELLOW}📥 Updating code from GitHub...${NC}"
git pull origin main

# Stop containers
echo -e "\n${YELLOW}🛑 Stopping containers...${NC}"
docker-compose down

# Clear Docker cache
echo -e "\n${YELLOW}🧹 Clearing Docker cache...${NC}"
docker system prune -f
docker image prune -a -f

# Rebuild with force recreate and no cache
echo -e "\n${YELLOW}🔨 Rebuilding containers (this will take 3-5 minutes)...${NC}"
docker-compose up -d --build --force-recreate --no-cache

# Wait for containers to start
echo -e "\n${YELLOW}⏳ Waiting for containers to start...${NC}"
sleep 60

# Check status
echo -e "\n${GREEN}📊 Container Status:${NC}"
docker-compose ps

# Test API
echo -e "\n${GREEN}🌐 Testing API...${NC}"
sleep 10
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo -e "${GREEN}✅ API is responding!${NC}"
    curl -s http://localhost:3001/api/health | python3 -m json.tool
else
    echo -e "${RED}❌ API not responding!${NC}"
fi

# Check if frontend files exist
echo -e "\n${GREEN}📁 Checking frontend files...${NC}"
if docker-compose exec -T app ls /app/public/ 2>/dev/null | grep -q "index.html"; then
    echo -e "${GREEN}✅ Frontend files found in /app/public/${NC}"
    docker-compose exec -T app ls -la /app/public/
else
    echo -e "${RED}❌ Frontend files still missing!${NC}"
    echo "Check logs:"
    docker-compose logs app | tail -20
fi

echo -e "\n=========================================="
echo -e "${GREEN}✅ Force Rebuild Complete!${NC}"
echo "=========================================="
echo ""
echo "🌐 Visit your website: https://sgomarket.com/"
echo ""
