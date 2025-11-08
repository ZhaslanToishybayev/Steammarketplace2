# 🐳 Docker Setup Guide

## 📋 Overview

This project includes comprehensive Docker configuration for development and production deployments. The setup uses multi-stage builds, hot reload for development, and containerized databases.

## 🏗️ Architecture

### Services
- **app**: Main application server
- **mongodb**: MongoDB database
- **redis**: Redis cache
- **nginx**: Reverse proxy (production only)
- **mongo-express**: MongoDB web UI (development only)
- **redis-commander**: Redis web UI (development only)

## 🚀 Quick Start

### Development with Docker

1. **Clone and setup**
```bash
git clone <repository>
cd steam-marketplace
cp .env.example .env
```

2. **Edit .env file**
```bash
# Update the necessary environment variables
nano .env
```

3. **Start services**
```bash
# Start all services
docker-compose up

# Start with dev tools (MongoDB & Redis web UIs)
docker-compose --profile dev-tools up

# Start in detached mode
docker-compose up -d

# Start specific service
docker-compose up mongodb
```

4. **Access the application**
- Application: http://localhost:3001
- Health check: http://localhost:3001/health
- MongoDB Express: http://localhost:8081 (dev-tools profile)
- Redis Commander: http://localhost:8082 (dev-tools profile)

### Production Deployment

1. **Create production environment file**
```bash
cp .env.example .env.production
nano .env.production
```

2. **Update production settings**
```bash
NODE_ENV=production
MONGO_ROOT_PASSWORD=secure_random_password
REDIS_PASSWORD=another_secure_password
JWT_SECRET=very_secure_jwt_secret
# ... other production values
```

3. **Deploy**
```bash
# Build and start production services
docker-compose --env-file .env.production --profile production up -d

# View logs
docker-compose logs -f app
```

## 📁 File Structure

```
.
├── Dockerfile              # Production multi-stage build
├── Dockerfile.dev          # Development with hot reload
├── docker-compose.yml       # Main compose file
├── docker-compose.override.yml  # Development overrides
├── .dockerignore            # Excluded files
├── .env.example             # Environment template
└── nginx/
    ├── nginx.conf           # Nginx configuration
    └── ssl/                 # SSL certificates
```

## 🔧 Configuration Files

### 1. Dockerfile (Production)
**Location:** `Dockerfile`

**Features:**
- Multi-stage build (frontend + backend)
- Optimized image size
- Non-root user security
- dumb-init for signal handling
- Production-ready configuration

**Stages:**
1. **frontend-builder**: Builds React frontend
2. **backend-builder**: Prepares backend
3. **production**: Final optimized image

**Usage:**
```bash
# Build image
docker build -t steam-marketplace:latest .

# Run container
docker run -p 3001:3001 steam-marketplace:latest
```

### 2. Dockerfile.dev (Development)
**Location:** `Dockerfile.dev`

**Features:**
- Hot reload enabled
- Volume mounts for live code changes
- Full dev dependencies installed
- Debug port exposed (9229)

**Usage:**
```bash
# Used automatically by docker-compose up
# No manual build needed
```

### 3. docker-compose.yml (Main)
**Location:** `docker-compose.yml`

**Services:**
- `mongodb`: Database with health checks
- `redis`: Caching layer with auth
- `app`: Application server
- `nginx`: Production reverse proxy

**Features:**
- Health check dependencies
- Environment variable interpolation
- Named volumes
- Custom network

### 4. docker-compose.override.yml (Dev)
**Location:** `docker-compose.override.yml`

**Features:**
- Loaded automatically for development
- No authentication for easier access
- Hot reload volumes
- Development tools (Mongo Express, Redis Commander)

**Profiles:**
- `dev-tools`: Enable web UIs for databases

### 5. .dockerignore
**Location:** `.dockerignore`

**Purpose:** Excludes files from Docker build context to reduce image size

**Excludes:**
- `node_modules`
- `.git`
- `tests/`
- `*.md`
- Development files

## 🛠️ Common Commands

### Development
```bash
# Start all services
docker-compose up

# Start with dev tools
docker-compose --profile dev-tools up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f app
docker-compose logs -f mongodb
docker-compose logs -f redis

# Restart service
docker-compose restart app

# Stop services
docker-compose down

# Remove volumes (WARNING: deletes data)
docker-compose down -v

# Rebuild image
docker-compose build app

# Enter container
docker-compose exec app sh
docker-compose exec mongodb mongosh

# Run commands in container
docker-compose exec app npm test
docker-compose exec mongodb mongosh --eval "db.adminCommand({ismaster: 1})"
```

### Production
```bash
# Deploy with custom env file
docker-compose --env-file .env.production up -d

# View production logs
docker-compose -f docker-compose.yml -f docker-compose.production.yml logs -f

# Check service health
docker-compose ps
docker inspect steam-marketplace-app

# Scale services
docker-compose up -d --scale app=3

# Update application
docker-compose pull app
docker-compose up -d app
```

### Image Management
```bash
# Build image
docker build -t steam-marketplace:latest .

# Tag for registry
docker tag steam-marketplace:latest yourusername/steam-marketplace:latest

# Push to registry
docker push yourusername/steam-marketplace:latest

# Pull from registry
docker pull yourusername/steam-marketplace:latest

# Remove old images
docker image prune -f

# View image layers
docker history steam-marketplace:latest
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Error: Port 3001 is already allocated

# Solution: Change port in docker-compose.yml
ports:
  - "3002:3001"  # Use different host port

# Or stop conflicting service
docker-compose down
sudo lsof -ti:3001 | xargs kill -9
```

#### 2. MongoDB Connection Failed
```bash
# Error: MongoDB connection refused

# Check MongoDB is running
docker-compose ps mongodb
docker-compose logs mongodb

# Wait for MongoDB to be ready
docker-compose up mongodb
# Wait for "waiting for connections" message

# Restart app
docker-compose restart app
```

#### 3. Permission Denied
```bash
# Error: Permission denied on volume mount

# Fix ownership
sudo chown -R $USER:$USER .
docker-compose down -v
docker-compose up
```

#### 4. Hot Reload Not Working
```bash
# Changes not reflected in container

# Check volume mounts in docker-compose.yml
volumes:
  - .:/app  # Host path : Container path

# Rebuild image
docker-compose build --no-cache app

# Or delete and recreate
docker-compose down
docker-compose up
```

#### 5. Out of Memory
```bash
# Error: Container killed (OOM)

# Check memory usage
docker stats

# Limit memory
# In docker-compose.yml:
services:
  app:
    mem_limit: 1g

# Or add swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### 6. Environment Variables Not Loading
```bash
# Check .env file exists
ls -la .env

# Verify format (no spaces around =)
cat .env

# Load specific env file
docker-compose --env-file .env.docker up

# Check in container
docker-compose exec app env | grep NODE_ENV
```

## 🔒 Security Best Practices

### 1. Non-Root User
```dockerfile
# Dockerfile already includes
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001 -G nodejs
USER nodejs
```

### 2. Secrets Management
```bash
# Use Docker secrets (swarm mode)
echo "my_password" | docker secret create mongo_password -

# Or environment files (not in git)
echo "MONGO_PASSWORD=secret" > .env.production

# In production, use external secret management
# - AWS Secrets Manager
# - HashiCorp Vault
# - Azure Key Vault
```

### 3. Read-Only Root Filesystem
```yaml
# In docker-compose.yml
services:
  app:
    read_only: true
    tmpfs:
      - /tmp
      - /var/run
```

### 4. Resource Limits
```yaml
services:
  app:
    mem_limit: 512m
    cpus: '0.5'
    mem_reservation: 256m
```

### 5. Health Checks
```yaml
services:
  app:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## 📊 Monitoring

### View Container Stats
```bash
# Real-time resource usage
docker stats

# Per service
docker stats steam-marketplace-app
```

### Logs Management
```bash
# View logs
docker-compose logs app

# Follow logs
docker-compose logs -f app

# Last 100 lines
docker-compose logs --tail=100 app

# Logs with timestamp
docker-compose logs -t app

# Save logs
docker-compose logs app > app.log
```

### Debugging
```bash
# Enter container
docker-compose exec app sh

# Check processes
docker-compose exec app ps aux

# Check environment
docker-compose exec app env

# Check file system
docker-compose exec app ls -la

# Network inspection
docker network inspect steam-marketplace_steam-marketplace

# Volume inspection
docker volume inspect steam-marketplace_mongodb_data
```

## 🚀 Production Deployment

### Checklist
- [ ] Change all default passwords
- [ ] Generate strong JWT secrets
- [ ] Enable HTTPS/SSL
- [ ] Configure proper CORS
- [ ] Set up monitoring (Sentry)
- [ ] Enable rate limiting
- [ ] Set resource limits
- [ ] Configure log rotation
- [ ] Set up backups
- [ ] Enable health checks
- [ ] Use secrets management
- [ ] Scan images for vulnerabilities
- [ ] Update base images regularly

### Example Production docker-compose.production.yml
```yaml
version: '3.8'

services:
  app:
    image: your-registry/steam-marketplace:latest
    restart: always
    mem_limit: 1g
    cpus: '1.0'
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### SSL/TLS with Nginx
```nginx
# nginx/nginx.conf
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location / {
        proxy_pass http://app:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    context: .
    push: true
    tags: ${{ steps.meta.outputs.tags }}
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

### Docker Scout (Security Scanning)
```bash
# Scan image for vulnerabilities
docker scout cves steam-marketplace:latest

# View recommendations
docker scout recommendations steam-marketplace:latest
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Security](https://docs.docker.com/engine/security/)
- [Performance](https://docs.docker.com/config/containers/container-runtime/)
- [Multi-stage builds](https://docs.docker.com/build/building/multi-stage/)

## 🎯 Next Steps

1. **Set up Docker Desktop** or Docker Engine
2. **Copy .env.example to .env** and configure
3. **Run `docker-compose up`** to start development
4. **Access web UIs** with dev-tools profile
5. **Read application logs** with `docker-compose logs`
6. **Deploy to production** with custom env file
7. **Set up monitoring** and alerting
8. **Configure backups** for data persistence
9. **Implement CI/CD** with Docker registry
10. **Schedule regular security scans**