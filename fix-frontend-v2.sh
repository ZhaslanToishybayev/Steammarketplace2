#!/bin/bash
# ===========================================
# 🔧 Fix Frontend V2 - Full Fix
# ===========================================

echo "=========================================="
echo "🔧 Fix Frontend V2 - Complete Fix"
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

# Show versions
echo -e "\n${GREEN}📋 Installed versions:${NC}"
node --version
npm --version

# Build frontend
echo -e "\n${YELLOW}🏗️  Building frontend...${NC}"
cd frontend

# Remove old dependencies
echo "🧹 Cleaning old dependencies..."
rm -rf node_modules
rm -f package-lock.json

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if vite is available
if ! npm list vite >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Vite not found, trying to install it globally...${NC}"
    npm install -g vite@latest
fi

# Build project
echo "🏗️  Building project..."
npm run build

# Check if dist exists
if [ -d "dist" ]; then
    echo -e "${GREEN}✅ Frontend built successfully!${NC}"
    ls -la dist/
else
    echo -e "${RED}❌ Frontend build failed!${NC}"
    echo "Trying alternative build method..."

    # Try with npx
    npx vite build

    if [ -d "dist" ]; then
        echo -e "${GREEN}✅ Frontend built with npx!${NC}"
        ls -la dist/
    else
        echo -e "${RED}❌ All build methods failed!${NC}"
        exit 1
    fi
fi

cd ..

# Rebuild Docker
echo -e "\n${YELLOW}🐳 Rebuilding Docker image...${NC}"
docker-compose build --no-cache app
docker-compose up -d --force-recreate

# Wait
echo -e "\n${YELLOW}⏳ Waiting for containers to start...${NC}"
sleep 90

# Check result
echo -e "\n${GREEN}📊 Final Check:${NC}"
if docker-compose exec -T app ls /app/public/ 2>/dev/null | grep -q "index.html"; then
    echo -e "${GREEN}✅ Frontend files found!${NC}"
    docker-compose exec -T app ls -la /app/public/

    echo -e "\n${GREEN}🌐 Testing website...${NC}"
    curl -I http://localhost:3001/

    echo -e "\n${GREEN}🎉 SUCCESS! Your website should work now!${NC}"
    echo "Visit: https://sgomarket.com/"
else
    echo -e "${RED}❌ Frontend files still missing!${NC}"
    echo "Check logs:"
    docker-compose logs app | tail -20
fi

echo -e "\n=========================================="
echo -e "${GREEN}✅ Fix Complete!${NC}"
echo "=========================================="
