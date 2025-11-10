#!/bin/bash
# ===========================================
# 🔧 Fix Frontend - Install Node.js and Build
# ===========================================

echo "=========================================="
echo "🔧 Fix Frontend - Install Node.js & Build"
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Node.js 18...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    echo -e "${GREEN}✅ Node.js installed!${NC}"
else
    echo -e "${GREEN}✅ Node.js is already installed${NC}"
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${YELLOW}📦 Installing npm...${NC}"
    apt-get install -y npm
    echo -e "${GREEN}✅ npm installed!${NC}"
else
    echo -e "${GREEN}✅ npm is already installed${NC}"
fi

# Show versions
echo -e "\n${GREEN}📋 Installed versions:${NC}"
node --version
npm --version

# Build frontend
echo -e "\n${YELLOW}🏗️  Building frontend...${NC}"
cd frontend

if [ -d "node_modules" ]; then
    echo "✅ node_modules already exists"
else
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🏗️  Building project..."
npm run build

# Check if dist exists
if [ -d "dist" ]; then
    echo -e "${GREEN}✅ Frontend built successfully!${NC}"
    ls -la dist/
else
    echo -e "${RED}❌ Frontend build failed!${NC}"
    exit 1
fi

cd ..

# Rebuild Docker
echo -e "\n${YELLOW}🐳 Rebuilding Docker image...${NC}"
docker-compose build --no-cache app
docker-compose up -d --force-recreate

# Wait
echo -e "\n${YELLOW}⏳ Waiting for containers to start...${NC}"
sleep 60

# Check result
echo -e "\n${GREEN}📊 Final Check:${NC}"
if docker-compose exec -T app ls /app/public/ 2>/dev/null | grep -q "index.html"; then
    echo -e "${GREEN}✅ Frontend files found!${NC}"
    docker-compose exec -T app ls -la /app/public/

    echo -e "\n${GREEN}🌐 Testing website...${NC}"
    curl -I http://localhost:3001/
else
    echo -e "${RED}❌ Frontend files still missing!${NC}"
fi

echo -e "\n=========================================="
echo -e "${GREEN}✅ Fix Complete!${NC}"
echo "=========================================="
