#!/bin/bash

# Steam Marketplace Deployment Script for ps.kz
# Usage: ./scripts/deploy.sh

set -e

echo "🚀 Starting deployment to production..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${RED}Error: .env.production file not found!${NC}"
    echo "Please create .env.production with production settings"
    exit 1
fi

# Build and deploy with Docker
echo -e "${GREEN}Building Docker images...${NC}"
docker-compose -f docker-compose.prod.yml build

echo -e "${GREEN}Stopping old containers...${NC}"
docker-compose -f docker-compose.prod.yml down

echo -e "${GREEN}Starting new containers...${NC}"
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 10

# Check if application is healthy
echo -e "${GREEN}Checking application health...${NC}"
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Application is healthy!${NC}"
else
    echo -e "${RED}❌ Application health check failed${NC}"
    echo "Check logs with: docker-compose -f docker-compose.prod.yml logs app"
    exit 1
fi

# Show status
echo -e "${GREEN}Deployment complete!${NC}"
echo ""
echo "📊 Service status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "📝 Useful commands:"
echo "  View logs:       docker-compose -f docker-compose.prod.yml logs -f"
echo "  Stop services:   docker-compose -f docker-compose.prod.yml down"
echo "  Restart app:     docker-compose -f docker-compose.prod.yml restart app"
echo ""
echo -e "${GREEN}🌐 Your application should be available at: $BASE_URL${NC}"
