#!/bin/bash
# ===========================================
# 📦 Create Deployment Package
# This script creates a deployable archive
# ===========================================

echo "📦 Creating deployment package..."

# Create archive name with date
ARCHIVE_NAME="steam-marketplace-deploy-$(date +%Y%m%d-%H%M%S).tar.gz"

# Exclude unnecessary files
EXCLUDE_DIRS="--exclude=node_modules --exclude=.git --exclude=logs --exclude=.env --exclude=*.log"

# Create tar.gz archive
tar $EXCLUDE_DIRS -czf $ARCHIVE_NAME \
    package*.json \
    docker-compose*.yml \
    Dockerfile* \
    .env.production \
    services/ \
    controllers/ \
    models/ \
    routes/ \
    middleware/ \
    utils/ \
    frontend/ \
    nginx/ \
    scripts/ \
    manage-production.sh \
    vps-diagnostic-commands.sh

echo "✅ Created: $ARCHIVE_NAME"
echo ""
echo "📋 To deploy on VPS:"
echo "1. Copy this archive to your VPS:"
echo "   scp $ARCHIVE_NAME root@194.x.x.x:/root/"
echo ""
echo "2. On your VPS, run:"
echo "   tar -xzf $ARCHIVE_NAME"
echo "   cd steammarketplace2-main"
echo "   ./quick-deploy.sh"
echo ""
echo "💾 Archive size:"
ls -lh $ARCHIVE_NAME
