#!/bin/bash

# Steam Marketplace Database Backup Script
# Создает резервные копии PostgreSQL и Redis

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
POSTGRES_DB="steam_marketplace"
POSTGRES_USER="steam_user"
POSTGRES_HOST="localhost"
POSTGRES_PORT="5432"

# Создаем директорию для бэкапов
mkdir -p $BACKUP_DIR

echo "Starting backup process: $(date)"

# PostgreSQL backup
echo "Creating PostgreSQL backup..."
sudo docker exec e93f29e5f6dc pg_dump -U $POSTGRES_USER -h $POSTGRES_HOST -p $POSTGRES_PORT $POSTGRES_DB > $BACKUP_DIR/postgres_$DATE.sql

if [ $? -eq 0 ]; then
    echo "✅ PostgreSQL backup created successfully"
else
    echo "❌ PostgreSQL backup failed"
    exit 1
fi

# Redis backup (dump.rdb)
echo "Creating Redis backup..."
sudo docker exec 6b1f9f3105b3 redis-cli BGSAVE
sleep 5
sudo docker cp 6b1f9f3105b3:/data/dump.rdb $BACKUP_DIR/redis_$DATE.rdb

if [ $? -eq 0 ]; then
    echo "✅ Redis backup created successfully"
else
    echo "❌ Redis backup failed"
fi

# Удаляем бэкапы старше 7 дней
echo "Cleaning old backups (older than 7 days)..."
find $BACKUP_DIR -type f -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -type f -name "*.rdb" -mtime +7 -delete

echo "Backup process completed: $(date)"
echo "Backup location: $BACKUP_DIR"

# Отправляем уведомление в лог
logger "Steam Marketplace backup completed: $DATE"