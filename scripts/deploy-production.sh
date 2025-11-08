#!/bin/bash

# Production Deployment Script
# Steam Marketplace - Automated deployment to production

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_DIR}/.env.production"
BACKUP_DIR="${PROJECT_DIR}/backups/$(date +%Y%m%d_%H%M%S)"
LOG_FILE="${PROJECT_DIR}/logs/deploy_$(date +%Y%m%d_%H%M%S).log"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

check_dependencies() {
    log "Checking dependencies..."

    # Check required commands
    local deps=("docker" "docker-compose" "curl")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            error "$dep is not installed"
        fi
    done

    success "All dependencies are installed"
}

check_environment() {
    log "Checking environment configuration..."

    # Check if .env.production exists
    if [ ! -f "$ENV_FILE" ]; then
        error ".env.production file not found. Please create it from .env.example"
    fi

    # Source environment file
    set -a
    source "$ENV_FILE"
    set +a

    # Validate critical variables
    local critical_vars=(
        "MONGODB_URI"
        "REDIS_URL"
        "JWT_SECRET"
        "SESSION_SECRET"
        "STEAM_API_KEY"
        "SENTRY_DSN"
    )

    for var in "${critical_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            error "Environment variable $var is not set"
        fi
    done

    # Check for default values
    if [[ "$JWT_SECRET" == *"CHANGE_THIS"* ]]; then
        error "Please change the default JWT_SECRET in .env.production"
    fi

    if [[ "$SESSION_SECRET" == *"3528e219a19da7ee52223423d20a2659f5c3624decd391c3ab15d98725bfd1e8"* ]]; then
        warning "SESSION_SECRET is still using default value. Consider changing it."
    fi

    success "Environment configuration is valid"
}

pre_deployment_checks() {
    log "Running pre-deployment checks..."

    # Check disk space (require at least 2GB free)
    local free_space=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$free_space" -lt 2 ]; then
        error "Insufficient disk space. At least 2GB required."
    fi

    # Check if MongoDB is accessible
    log "Checking MongoDB connection..."
    if ! curl -s "${MONGODB_URI}/admin?authSource=admin" &> /dev/null; then
        error "Cannot connect to MongoDB. Check MONGODB_URI"
    fi

    # Check if Redis is accessible
    log "Checking Redis connection..."
    if ! redis-cli -u "$REDIS_URL" ping &> /dev/null; then
        error "Cannot connect to Redis. Check REDIS_URL"
    fi

    # Health check - current deployment
    log "Checking current application health..."
    if curl -sf "http://localhost:${PORT:-3001}/health" &> /dev/null; then
        success "Application is running"
    else
        warning "Application health check failed - may not be running"
    fi

    success "Pre-deployment checks completed"
}

create_backup() {
    log "Creating backup..."

    # Create backup directory
    mkdir -p "$BACKUP_DIR"

    # Backup MongoDB
    if command -v mongodump &> /dev/null; then
        log "Backing up MongoDB..."
        mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/mongodb" 2>&1 | tee -a "$LOG_FILE"
        success "MongoDB backup completed"
    else
        warning "mongodump not found, skipping MongoDB backup"
    fi

    # Backup Redis
    if command -v redis-cli &> /dev/null; then
        log "Backing up Redis..."
        redis-cli -u "$REDIS_URL" --rdb "$BACKUP_DIR/redis_dump.rdb" 2>&1 | tee -a "$LOG_FILE"
        success "Redis backup completed"
    else
        warning "redis-cli not found, skipping Redis backup"
    fi

    # Backup configuration
    log "Backing up configuration..."
    cp "$ENV_FILE" "$BACKUP_DIR/.env.production"
    cp -r "${PROJECT_DIR}/nginx" "$BACKUP_DIR/" 2>/dev/null || true
    success "Configuration backup completed"

    success "Backup created at: $BACKUP_DIR"
}

run_tests() {
    log "Running pre-deployment tests..."

    # Build Docker image
    log "Building Docker image..."
    docker build -t steam-marketplace:latest . 2>&1 | tee -a "$LOG_FILE"

    # Run unit tests
    log "Running unit tests..."
    docker run --rm -v "$PROJECT_DIR:/app" -w /app steam-marketplace:latest npm test 2>&1 | tee -a "$LOG_FILE"

    success "All tests passed"
}

deploy_application() {
    log "Starting application deployment..."

    # Pull latest images
    log "Pulling latest Docker images..."
    docker-compose --env-file "$ENV_FILE" pull 2>&1 | tee -a "$LOG_FILE"

    # Build and start services
    log "Building and starting services..."
    docker-compose --env-file "$ENV_FILE" --profile production up -d --build 2>&1 | tee -a "$LOG_FILE"

    # Wait for services to be ready
    log "Waiting for services to start..."
    sleep 30

    # Check service health
    log "Checking service health..."
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -sf "http://localhost:${PORT:-3001}/health" &> /dev/null; then
            success "Application is healthy"
            break
        fi

        if [ $attempt -eq $max_attempts ]; then
            error "Application health check failed after $max_attempts attempts"
        fi

        log "Attempt $attempt/$max_attempts - waiting for application..."
        sleep 10
        attempt=$((attempt + 1))
    done

    success "Application deployed successfully"
}

post_deployment_checks() {
    log "Running post-deployment checks..."

    # Test critical endpoints
    local endpoints=(
        "http://localhost:${PORT:-3001}/health"
        "http://localhost:${PORT:-3001}/api/auth/status"
    )

    for endpoint in "${endpoints[@]}"; do
        if curl -sf "$endpoint" &> /dev/null; then
            success "Endpoint OK: $endpoint"
        else
            error "Endpoint failed: $endpoint"
        fi
    done

    # Check database connections
    log "Verifying database connections..."
    if docker-compose --env-file "$ENV_FILE" exec -T app node -e "
        const mongoose = require('mongoose');
        mongoose.connect(process.env.MONGODB_URI).then(() => {
            console.log('MongoDB OK');
            process.exit(0);
        }).catch(err => {
            console.error('MongoDB FAILED:', err.message);
            process.exit(1);
        });
    " 2>&1 | tee -a "$LOG_FILE"; then
        success "MongoDB connection verified"
    else
        error "MongoDB connection failed"
    fi

    # Check Redis connection
    if docker-compose --env-file "$ENV_FILE" exec -T redis redis-cli ping 2>&1 | grep -q "PONG"; then
        success "Redis connection verified"
    else
        error "Redis connection failed"
    fi

    # Check Sentry
    log "Verifying Sentry integration..."
    if curl -sf "$SENTRY_DSN" &> /dev/null; then
        success "Sentry DSN is accessible"
    else
        warning "Sentry DSN check failed - check configuration"
    fi

    success "Post-deployment checks completed"
}

cleanup() {
    log "Cleaning up old Docker images and containers..."

    # Remove old images (keep last 3)
    docker images --format "{{.Repository}}:{{.Tag}}" | grep steam-marketplace | \
        head -n -3 | xargs -r docker rmi 2>&1 | tee -a "$LOG_FILE" || true

    # Remove stopped containers
    docker container prune -f 2>&1 | tee -a "$LOG_FILE"

    # Remove dangling images
    docker image prune -f 2>&1 | tee -a "$LOG_FILE"

    success "Cleanup completed"
}

send_notification() {
    local status="$1"
    local message="$2"

    # Slack notification (if webhook is configured)
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚀 Steam Marketplace Deployment: $status\\n$message\"}" \
            "$SLACK_WEBHOOK_URL" 2>/dev/null || true
    fi

    # Email notification (if configured)
    if [ -n "${EMAIL_NOTIFICATION:-}" ]; then
        echo "$message" | mail -s "Steam Marketplace Deployment: $status" "$EMAIL_NOTIFICATION" 2>/dev/null || true
    fi
}

rollback() {
    log "Rolling back to previous version..."

    # This is a simplified rollback - in production, you should use a more robust solution
    error "Rollback not implemented. Please restore from backup manually."
}

# Main deployment flow
main() {
    log "======================================"
    log "Steam Marketplace - Production Deployment"
    log "======================================"
    log "Started at: $(date)"
    log "Log file: $LOG_FILE"
    log ""

    # Create necessary directories
    mkdir -p "${PROJECT_DIR}/logs"
    mkdir -p "${PROJECT_DIR}/backups"

    # Run deployment steps
    check_dependencies
    check_environment
    pre_deployment_checks

    # Ask for confirmation
    echo ""
    echo -e "${YELLOW}⚠️  WARNING: This will deploy to PRODUCTION!${NC}"
    read -p "Are you sure you want to continue? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
        error "Deployment cancelled by user"
    fi

    create_backup || error "Backup failed"

    if [ "${SKIP_TESTS:-false}" != "true" ]; then
        run_tests || error "Tests failed"
    fi

    deploy_application || {
        error "Deployment failed - consider rolling back"
    }

    post_deployment_checks

    cleanup

    log ""
    log "======================================"
    success "Deployment completed successfully!"
    log "Completed at: $(date)"
    log "======================================"

    send_notification "SUCCESS" "Deployment completed successfully at $(date)"

    # Display useful information
    echo ""
    echo -e "${GREEN}Deployment Summary:${NC}"
    echo "  - Environment: production"
    echo "  - Port: ${PORT:-3001}"
    echo "  - Health Check: http://localhost:${PORT:-3001}/health"
    echo "  - Backup Location: $BACKUP_DIR"
    echo "  - Logs: $LOG_FILE"
    echo ""

    # Display current container status
    log "Current container status:"
    docker-compose --env-file "$ENV_FILE" ps
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --skip-tests    Skip running tests before deployment"
        echo "  --rollback      Rollback to previous version"
        echo "  --help|-h       Show this help message"
        echo ""
        exit 0
        ;;
    --skip-tests)
        export SKIP_TESTS=true
        main
        ;;
    --rollback)
        rollback
        ;;
    *)
        main
        ;;
esac