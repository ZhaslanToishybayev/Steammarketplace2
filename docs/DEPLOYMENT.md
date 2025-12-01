# Production Deployment Guide

This comprehensive guide covers deploying the Steam Marketplace application in a production environment with security hardening, monitoring, and scalability considerations.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Security Hardening](#security-hardening)
5. [Docker Deployment](#docker-deployment)
6. [Monitoring Setup](#monitoring-setup)
7. [Load Testing](#load-testing)
8. [Backup & Recovery](#backup--recovery)
9. [Troubleshooting](#troubleshooting)
10. [Maintenance](#maintenance)

## Overview

The Steam Marketplace application uses a modern tech stack optimized for production deployment:

- **Backend**: NestJS with TypeScript, PostgreSQL, MongoDB, Redis
- **Frontend**: Next.js with React, TailwindCSS
- **Infrastructure**: Docker, Docker Compose, Nginx
- **Monitoring**: Prometheus, Grafana
- **Security**: Helmet, Rate Limiting, CORS, JWT

## Prerequisites

### System Requirements

- **OS**: Linux (Ubuntu 20.04+ recommended), macOS, Windows with WSL2
- **CPU**: 4+ cores
- **Memory**: 8GB+ RAM (16GB recommended)
- **Storage**: 20GB+ free space
- **Network**: Stable internet connection

### Software Requirements

```bash
# Docker & Docker Compose
docker --version     # 20.10+
docker-compose --version  # 2.0+

# OpenSSL for certificate generation
openssl version

# curl for testing
curl --version
```

### Domain & SSL

- Domain name pointing to your server
- SSL/TLS certificate (Let's Encrypt recommended)
- DNS records configured properly

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/steam-marketplace.git
cd steam-marketplace
```

### 2. Environment Configuration

```bash
# Copy environment templates
cp .env.production.example .env.production
cp apps/backend/.env.example apps/backend/.env.production
cp apps/frontend/.env.example apps/frontend/.env.production

# Generate production secrets
./scripts/generate-secrets.sh
```

### 3. Required Environment Variables

Create a `.env.production` file with the following variables:

```bash
# Application
NODE_ENV=production
PORT=3001

# Database Configuration
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=steam_user
POSTGRES_PASSWORD=your-super-secure-postgres-password-here
POSTGRES_DB=steam_marketplace

MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your-super-secure-mongo-password-here
MONGO_DB=steam_marketplace

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your-super-secure-redis-password-here

# Authentication
JWT_SECRET=your-super-secure-256-bit-jwt-secret-key-here
JWT_REFRESH_SECRET=your-super-secure-256-bit-jwt-refresh-secret-key-here
BOT_ENCRYPTION_KEY=your-32-character-encryption-key-here

# Steam Integration
STEAM_API_KEY=your-real-steam-api-key-here
STEAM_REALM=https://yourdomain.com
STEAM_RETURN_URL=https://yourdomain.com/api/auth/steam/return

# Security (CRITICAL: Must be set for production)
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com  # Required for browser access
WS_URL=wss://yourdomain.com  # Required for WebSocket connections

# Monitoring
GRAFANA_PASSWORD=your-super-secure-grafana-password-here

# External Services
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key-here
CRYPTO_API_KEY=your-crypto-api-key-here
```

**⚠️ Critical Security Note**: The `CORS_ORIGIN` environment variable is **required** in production. If not set, the application will fail to start with a clear error message. This prevents accidental exposure of your API to unauthorized domains.

### 4. WebSocket Configuration

The WebSocket URL must be properly configured for real-time features:

```bash
# Backend WebSocket URL (used in CSP headers)
WS_URL=wss://yourdomain.com

# Frontend WebSocket URL (must match backend)
NEXT_PUBLIC_WS_URL=wss://yourdomain.com
```

**⚠️ Important**: The `WS_URL` environment variable is **required** in production. If not set, the application will fail to start with a clear error message. The WebSocket URL must use `wss://` protocol in production for security.

### 5. SSL Certificate Setup

### 1. Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw deny 3000:3002/tcp  # Block direct app access
sudo ufw enable

# Verify firewall status
sudo ufw status
```

### 2. Database Security

```bash
# Create external volumes for data persistence
docker volume create steam-marketplace-postgres-prod
docker volume create steam-marketplace-mongo-prod
docker volume create steam-marketplace-redis-prod

# Set volume permissions
docker run --rm -v steam-marketplace-postgres-prod:/data busybox chown -R 70:70 /data
```

### 3. Application Security

Security measures already implemented:

- **CORS**: Restricted to trusted domains only
- **Rate Limiting**: 5 requests/minute for auth endpoints
- **Security Headers**: Helmet middleware with CSP, HSTS
- **Input Validation**: Class-validator integration
- **JWT Security**: Strong secrets, proper expiration
- **Bot Encryption**: AES-256-GCM for bot credentials

## Docker Deployment

### 1. Build Production Images

```bash
# Build backend
cd apps/backend
docker build -f Dockerfile -t steam-marketplace-backend:prod .

# Build frontend
cd ../frontend
docker build -f Dockerfile -t steam-marketplace-frontend:prod .

# Return to root
cd ../..
```

### 2. Start Production Stack

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Verify services are running
docker-compose -f docker-compose.prod.yml ps

# Check service logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 3. Database Initialization

```bash
# Run database migrations
docker-compose -f docker-compose.prod.yml exec backend npm run db:migrate

# Seed initial data (optional)
docker-compose -f docker-compose.prod.yml exec backend npm run db:seed

# Verify database connectivity
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U steam_user
```

### 4. Health Checks

```bash
# Application health
curl -f https://yourdomain.com/api/health

# Detailed health information
curl -f https://yourdomain.com/api/health/detailed

# Readiness probe
curl -f https://yourdomain.com/api/health/ready

# Liveness probe
curl -f https://yourdomain.com/api/health/live
```

## Monitoring Setup

### 1. Start Monitoring Stack

```bash
# Start monitoring services
docker-compose --profile monitoring up -d

# Access Grafana
echo "Grafana: https://yourdomain.com:3002"
echo "Default credentials: admin/admin"

# Access Prometheus
echo "Prometheus: https://yourdomain.com:9090"
```

### 2. Configure Dashboards

Import the following dashboard JSON files in Grafana:

- `docker/grafana/dashboards/overview.json` - System overview
- `docker/grafana/dashboards/database.json` - Database metrics
- `docker/grafana/dashboards/business.json` - Business metrics

### 3. Set Up Alerting

Configure alerts in `docker/prometheus/alerts.yml`:

```yaml
groups:
- name: steam-marketplace
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value | humanizePercentage }}"

  - alert: SlowResponseTime
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Slow response times detected"
      description: "95th percentile response time is {{ $value }}s"
```

### 4. Verify Metrics Collection

```bash
# Check Prometheus targets
curl -s "https://yourdomain.com:9090/api/v1/targets" | jq '.data.activeTargets[] | {job: .labels.job, state: .health}'

# Query application metrics
curl -G "https://yourdomain.com:9090/api/v1/query" \
  --data-urlencode 'query=rate(http_requests_total[5m])'
```

## Load Testing

### 1. Run Load Tests

```bash
# Set environment variables
export API_URL=https://yourdomain.com
export CONFIG_PROFILE=load

# Run load test
artillery run scripts/load-test.js

# View results
open artifacts/load-test-report-load.html
```

### 2. Performance Validation

Expected performance benchmarks:

- **Response Time**: < 200ms (p95)
- **Throughput**: 100-500 concurrent users
- **Error Rate**: < 1%
- **CPU Usage**: < 70%
- **Memory Usage**: < 80%

### 3. Stress Testing

```bash
# Run stress test to find limits
export CONFIG_PROFILE=stress
artillery run scripts/load-test.js

# Monitor system during test
htop
docker stats
```

## Backup & Recovery

### 1. Database Backups

```bash
# PostgreSQL backup
docker-compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U steam_user steam_marketplace > backup/$(date +%F)-steam-marketplace.sql

# MongoDB backup
docker-compose -f docker-compose.prod.yml exec mongodb \
  mongodump --out /backup --gzip
docker cp $(docker-compose -f docker-compose.prod.yml ps -q mongodb):/backup ./backup/mongodb

# Redis backup
docker-compose -f docker-compose.prod.yml exec redis \
  redis-cli BGSAVE
docker cp $(docker-compose -f docker-compose.prod.yml ps -q redis):/data/dump.rdb ./backup/redis-dump.rdb
```

### 2. Automated Backups

Create a cron job for regular backups:

```bash
# Edit crontab
crontab -e

# Add backup job (daily at 2 AM)
0 2 * * * /path/to/steam-marketplace/scripts/backup.sh
```

### 3. Recovery Procedures

```bash
# Restore PostgreSQL
docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U steam_user -d steam_marketplace < backup/steam-marketplace.sql

# Restore MongoDB
docker cp backup/mongodb/dump mongodb:/tmp/
docker-compose -f docker-compose.prod.yml exec mongodb \
  mongorestore /tmp/dump --gzip

# Restore Redis
docker cp backup/redis-dump.rdb $(docker-compose -f docker-compose.prod.yml ps -q redis):/data/
docker-compose -f docker-compose.prod.yml restart redis
```

## Troubleshooting

### Common Issues

#### 1. Service Won't Start

```bash
# Check service logs
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs postgres
docker-compose -f docker-compose.prod.yml logs nginx

# Check container status
docker-compose -f docker-compose.prod.yml ps

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend
```

#### 2. Database Connection Issues

```bash
# Test PostgreSQL connection
docker-compose -f docker-compose.prod.yml exec postgres \
  pg_isready -U steam_user -d steam_marketplace

# Test MongoDB connection
docker-compose -f docker-compose.prod.yml exec mongodb \
  mongosh --eval "db.adminCommand('ping')" --quiet

# Test Redis connection
docker-compose -f docker-compose.prod.yml exec redis \
  redis-cli ping
```

#### 3. SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in docker/ssl/nginx.crt -text -noout

# Test SSL connection
curl -vk https://yourdomain.com

# Renew Let's Encrypt certificate
sudo certbot renew
```

#### 4. High Resource Usage

```bash
# Monitor resource usage
docker stats

# Check application logs for errors
docker-compose -f docker-compose.prod.yml logs backend | grep ERROR

# Check system resources
htop
df -h
```

### Emergency Procedures

#### 1. Rollback Deployment

```bash
# Tag current deployment
docker tag steam-marketplace:latest steam-marketplace:backup

# Rollback to previous version
git checkout HEAD~1
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

#### 2. Emergency Maintenance

```bash
# Put application in maintenance mode
docker-compose -f docker-compose.prod.yml exec nginx \
  nginx -s stop

# Perform maintenance
# ...

# Restore service
docker-compose -f docker-compose.prod.yml exec nginx \
  nginx
```

## Maintenance

### 1. Regular Updates

```bash
# Update Docker images
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Update SSL certificates
sudo certbot renew

# Update system packages
sudo apt update && sudo apt upgrade -y
```

### 2. Log Management

```bash
# View application logs
docker-compose -f docker-compose.prod.yml logs --tail=100 -f

# Clean old logs
docker system prune -f

# Log rotation (add to crontab)
0 0 * * * docker-compose -f docker-compose.prod.yml logs --tail=1000 > logs/$(date +%F).log
```

### 3. Performance Monitoring

Monitor these key metrics:

- **Response Time**: 95th percentile < 200ms
- **Error Rate**: < 1%
- **CPU Usage**: < 70%
- **Memory Usage**: < 80%
- **Database Connection Pool**: < 80% utilization
- **Cache Hit Rate**: > 90%

### 4. Security Audits

Regular security checks:

```bash
# Check for exposed secrets
grep -r "password\|secret\|key" --include="*.env" . || echo "No .env files found"

# Verify SSL configuration
sslscan yourdomain.com

# Check for outdated packages
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image steam-marketplace:latest
```

## Additional Resources

- [Metrics Alignment Guide](docs/METRICS_ALIGNMENT.md)
- [Load Testing Guide](scripts/README-load-testing.md)
- [Steam Integration Guide](STEAM_INTEGRATION_TEST_GUIDE.md)
- [Security Configuration](docs/SECURITY.md)

This guide provides a comprehensive approach to deploying the Steam Marketplace application in a production environment. Always test changes in a staging environment before applying them to production.