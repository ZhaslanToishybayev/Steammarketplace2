#!/bin/bash
# ===========================================
# 🔄 Restart All Containers
# Fix Docker volume and container issues
# ===========================================

echo "=========================================="
echo "🔄 Restart All Containers"
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ Error: docker-compose.yml not found!${NC}"
    exit 1
fi

# Stop all containers and remove volumes
echo -e "\n${YELLOW}🛑 Stopping and removing all containers...${NC}"
docker-compose down -v --remove-orphans

# Clean Docker system
echo -e "\n${YELLOW}🧹 Cleaning Docker system...${NC}"
docker system prune -f

# Check if frontend/dist exists
if [ ! -d "frontend/dist" ]; then
    echo -e "${RED}❌ Frontend not built! Run fix-frontend-v2.sh first!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Frontend dist found!${NC}"

# Start containers
echo -e "\n${YELLOW}🚀 Starting all containers...${NC}"
docker-compose up -d --build

# Wait for containers
echo -e "\n${YELLOW}⏳ Waiting for containers to start...${NC}"
sleep 90

# Check status
echo -e "\n${GREEN}📊 Container Status:${NC}"
docker-compose ps

# Check API
echo -e "\n${GREEN}🌐 Testing API...${NC}"
sleep 10
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo -e "${GREEN}✅ API is responding!${NC}"
else
    echo -e "${RED}❌ API not responding!${NC}"
fi

# Check frontend files
echo -e "\n${GREEN}📁 Checking frontend files...${NC}"
if docker-compose exec -T app ls /app/public/ 2>/dev/null | grep -q "index.html"; then
    echo -e "${GREEN}✅ Frontend files found!${NC}"
    docker-compose exec -T app ls -la /app/public/

    echo -e "\n${GREEN}🎉 SUCCESS! Your website should work now!${NC}"
    echo "Visit: https://sgomarket.com/"
else
    echo -e "${RED}❌ Frontend files still missing!${NC}"
    echo "Check logs:"
    docker-compose logs app | tail -20
fi

echo -e "\n=========================================="
echo -e "${GREEN}✅ Restart Complete!${NC}"
echo "=========================================="
