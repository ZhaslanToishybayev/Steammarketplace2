#!/bin/bash
# ===========================================
# 🚀 Quick Deploy Script for VPS
# Run this on your target VPS (194.x.x.x)
# ===========================================

set -e

echo "=========================================="
echo "🚀 Steam Marketplace Quick Deploy"
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Docker
echo -e "\n🔍 Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not installed!${NC}"
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl start docker
    systemctl enable docker
    echo -e "${GREEN}✅ Docker installed!${NC}"
else
    echo -e "${GREEN}✅ Docker is installed${NC}"
fi

# Check Docker Compose
echo -e "\n🔍 Checking Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose not installed!${NC}"
    echo "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✅ Docker Compose installed!${NC}"
else
    echo -e "${GREEN}✅ Docker Compose is installed${NC}"
fi

# Create project directory
echo -e "\n📁 Setting up project..."
PROJECT_DIR="/root/steam-marketplace"
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${YELLOW}⚠️  .env.production not found!${NC}"
    echo "Please ensure .env.production is in the project directory"
    exit 1
fi

# Start services
echo -e "\n🚀 Starting services..."
echo "Starting MongoDB and Redis..."
docker-compose up -d mongodb redis

echo "Waiting for databases to be ready..."
sleep 15

echo "Starting application..."
docker-compose up -d app

# Check status
echo -e "\n📊 Checking status..."
sleep 10
docker-compose ps

# Health check
echo -e "\n🌐 Testing API..."
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo -e "${GREEN}✅ API is responding!${NC}"
    curl -s http://localhost:3001/api/health | python3 -m json.tool
else
    echo -e "${RED}❌ API not responding!${NC}"
    echo "Check logs with: docker-compose logs app"
fi

echo -e "\n=========================================="
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "=========================================="
echo "📋 Useful commands:"
echo "  - View logs: docker-compose logs -f app"
echo "  - Stop all: docker-compose down"
echo "  - Restart app: docker-compose restart app"
echo "  - Check status: docker-compose ps"
echo ""
echo "🌐 Access your site at: http://$(curl -s ifconfig.me):3001"
echo "=========================================="
