#!/bin/bash

################################################################################
# Steam Marketplace - Rollback Script
# Быстрый откат к предыдущей версии
################################################################################

set -e  # Exit on error

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для логирования
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Параметры
ENVIRONMENT=${1:-production}
TARGET_VERSION=${2:-previous}
BACKUP_DIR="/opt/backups"

################################################################################
# Проверки
################################################################################

log "🚀 Steam Marketplace - Rollback Script"
log "=========================================="
log "Environment: $ENVIRONMENT"
log "Target Version: $TARGET_VERSION"
log ""

# Проверяем environment
if [[ "$ENVIRONMENT" != "production" && "$ENVIRONMENT" != "staging" ]]; then
    error "Invalid environment. Use 'production' or 'staging'"
fi

# Проверяем, что мы в правильной директории
if [[ ! -f "docker-compose.$ENVIRONMENT.yml" ]]; then
    error "docker-compose.$ENVIRONMENT.yml not found"
fi

# Проверяем Docker
if ! command -v docker &> /dev/null; then
    error "Docker is not installed"
fi

if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose is not installed"
fi

################################################################################
# Создаем резервную копию перед rollback
################################################################################

log "📦 Creating backup before rollback..."

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="rollback_$TIMESTAMP"

if [[ "$ENVIRONMENT" == "production" ]]; then
    warning "Creating database backup..."
    ssh $PRODUCTION_USER@$PRODUCTION_HOST "
        mkdir -p $BACKUP_DIR/$BACKUP_NAME &&
        docker exec steam-marketplace_mongodb_1 mongodump --out /tmp/backup &&
        tar -czf $BACKUP_DIR/$BACKUP_NAME/db.tar.gz -C /tmp backup &&
        rm -rf /tmp/backup
    " || warning "Failed to create database backup"
fi

success "Backup created: $BACKUP_NAME"

################################################################################
# Получаем предыдущую версию
################################################################################

if [[ "$TARGET_VERSION" == "previous" ]]; then
    log "🔍 Getting previous version..."

    if command -v git &> /dev/null; then
        # Получаем предыдущий тег
        PREVIOUS_TAG=$(git describe --tags --abbrev=0 HEAD~1 2>/dev/null || echo "")

        if [[ -n "$PREVIOUS_TAG" ]]; then
            TARGET_VERSION=$PREVIOUS_TAG
            log "Found previous tag: $PREVIOUS_TAG"
        else
            warning "No previous tag found, using previous commit"
            TARGET_VERSION=$(git rev-parse HEAD~1)
        fi
    else
        error "Git is not installed, cannot determine previous version"
    fi
fi

log "🎯 Rolling back to version: $TARGET_VERSION"

################################################################################
# Выполняем rollback
################################################################################

log "🔄 Starting rollback process..."

if [[ "$ENVIRONMENT" == "production" ]]; then
    # Production rollback
    warning "Rolling back PRODUCTION environment!"

    # Спрашиваем подтверждение
    read -p "Are you sure you want to rollback production? (yes/no): " CONFIRM
    if [[ "$CONFIRM" != "yes" ]]; then
        error "Rollback cancelled"
    fi

    log "Pulling previous Docker image..."
    docker pull ghcr.io/$GITHUB_REPOSITORY:$TARGET_VERSION

    log "Tagging as latest..."
    docker tag ghcr.io/$GITHUB_REPOSITORY:$TARGET_VERSION ghcr.io/$GITHUB_REPOSITORY:latest

    log "Rolling back Docker Compose services..."
    ssh $PRODUCTION_USER@$PRODUCTION_HOST "
        cd /opt/steam-marketplace &&
        docker-compose -f docker-compose.prod.yml up -d --remove-orphans
    "

    success "Production rollback completed"

elif [[ "$ENVIRONMENT" == "staging" ]]; then
    # Staging rollback
    log "Rolling back STAGING environment..."

    log "Pulling previous Docker image..."
    docker pull ghcr.io/$GITHUB_REPOSITORY:$TARGET_VERSION

    log "Tagging as latest..."
    docker tag ghcr.io/$GITHUB_REPOSITORY:$TARGET_VERSION ghcr.io/$GITHUB_REPOSITORY:latest

    log "Rolling back Docker Compose services..."
    ssh $STAGING_USER@$STAGING_HOST "
        cd /opt/steam-marketplace &&
        docker-compose -f docker-compose.staging.yml up -d --remove-orphans
    "

    success "Staging rollback completed"
fi

################################################################################
# Проверяем результат
################################################################################

log "🧪 Waiting for services to start..."
sleep 30

log "Running health checks..."

# Определяем URL для проверки
if [[ "$ENVIRONMENT" == "production" ]]; then
    HEALTH_URL="https://sgomarket.com/api/health"
elif [[ "$ENVIRONMENT" == "staging" ]]; then
    HEALTH_URL="https://staging.steam-marketplace.dev/api/health"
else
    HEALTH_URL="http://localhost:3001/api/health"
fi

# Проверяем health endpoint
for i in {1..5}; do
    if curl -f -s "$HEALTH_URL" > /dev/null; then
        success "Health check passed!"
        break
    else
        if [[ $i -eq 5 ]]; then
            error "Health check failed after 5 attempts"
        else
            warning "Health check attempt $i failed, retrying in 10s..."
            sleep 10
        fi
    fi
done

################################################################################
# Проверяем статус сервисов
################################################################################

log "Checking service status..."

if [[ "$ENVIRONMENT" == "production" ]]; then
    ssh $PRODUCTION_USER@$PRODUCTION_HOST "
        cd /opt/steam-marketplace &&
        docker-compose -f docker-compose.prod.yml ps
    "
elif [[ "$ENVIRONMENT" == "staging" ]]; then
    ssh $STAGING_USER@$STAGING_HOST "
        cd /opt/steam-marketplace &&
        docker-compose -f docker-compose.staging.yml ps
    "
fi

################################################################################
# Отправляем уведомление
################################################################################

if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
    log "Sending Slack notification..."

    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"🔄 Rollback completed\\nEnvironment: $ENVIRONMENT\\nVersion: $TARGET_VERSION\\nStatus: ✅ Success\"}" \
        $SLACK_WEBHOOK_URL || warning "Failed to send Slack notification"
fi

################################################################################
# Итоги
################################################################################

echo ""
log "=========================================="
success "🎉 Rollback completed successfully!"
log "=========================================="
log "Environment: $ENVIRONMENT"
log "Version: $TARGET_VERSION"
log "Backup: $BACKUP_NAME"
log "Time: $(date)"
log ""

# Показать логи
log "Recent logs:"
if [[ "$ENVIRONMENT" == "production" ]]; then
    ssh $PRODUCTION_USER@$PRODUCTION_HOST "
        cd /opt/steam-marketplace &&
        docker-compose -f docker-compose.prod.yml logs --tail=20
    " | tail -20
elif [[ "$ENVIRONMENT" == "staging" ]]; then
    ssh $STAGING_USER@$STAGING_HOST "
        cd /opt/steam-marketplace &&
        docker-compose -f docker-compose.staging.yml logs --tail=20
    " | tail -20
fi

log ""
log "To monitor the rollback, run:"
log "  docker-compose -f docker-compose.$ENVIRONMENT.yml logs -f"
log ""
