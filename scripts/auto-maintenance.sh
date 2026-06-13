#!/bin/bash

# Steam Marketplace Auto-Maintenance Script
# Objectives: Log rotation, Docker cleanup, DB Optimization

LOG_DIR="/root/Steammarketplace2/apps/backend/logs"
BACKUP_DIR="/root/backups/daily"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "[$TIMESTAMP] Starting maintenance..."

# 1. Database Backup
mkdir -p $BACKUP_DIR
docker exec steam-marketplace-db pg_dump -U postgres steam_marketplace > $BACKUP_DIR/db_$TIMESTAMP.sql
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete

# 2. Docker Cleanup
docker system prune -f --volumes

# 3. DB Optimization (Vacuum)
docker exec steam-marketplace-db psql -U postgres -d steam_marketplace -c "VACUUM ANALYZE;"

# 4. System health check
curl -s http://localhost/api/health | grep -q "healthy" || echo "[$TIMESTAMP] ALERT: Backend unhealthy"

echo "[$TIMESTAMP] Maintenance complete."
