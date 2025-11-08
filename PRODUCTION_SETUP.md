# 🚀 Production Setup Guide

## 📋 Overview

This guide walks you through setting up the Steam Marketplace for production deployment. It covers security, performance, monitoring, and best practices for a production-ready environment.

## 🏗️ Architecture

### Production Architecture

```
                    ┌─────────────────┐
                    │   Load Balancer │
                    │     (Nginx)     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Nginx Reverse  │
                    │     Proxy       │
                    │   (Port 443)    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   Application   │
                    │   (Node.js)     │
                    │   Port 3001     │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
      ┌───────▼────────┐           ┌────────▼────────┐
      │   MongoDB      │           │     Redis       │
      │   Cluster      │           │   Cluster       │
      │  (Primary DB)  │           │   (Cache)       │
      └────────────────┘           └─────────────────┘
              │                             │
      ┌───────▼────────┐           ┌────────▼────────┐
      │   Backups      │           │   Monitoring    │
      │  (S3/Drive)    │           │  (Sentry etc.)  │
      └────────────────┘           └─────────────────┘
```

## 📋 Pre-Deployment Checklist

### 1. Server Requirements
- [ ] **Operating System:** Ubuntu 20.04+ LTS or CentOS 8+
- [ ] **CPU:** Minimum 2 cores, Recommended 4+ cores
- [ ] **Memory:** Minimum 4GB RAM, Recommended 8GB+ RAM
- [ ] **Storage:** Minimum 50GB SSD, Recommended 100GB+ SSD
- [ ] **Network:** Static IP address
- [ ] **Domain:** Registered domain name with DNS configured

### 2. Security
- [ ] SSL/TLS certificates obtained
- [ ] Firewall configured (ports 22, 80, 443)
- [ ] SSH key-based authentication enabled
- [ ] Password authentication disabled
- [ ] Fail2ban installed and configured
- [ ] Regular security updates enabled

### 3. Software Dependencies
- [ ] Docker 20.10+
- [ ] Docker Compose 2.0+
- [ ] Nginx 1.20+
- [ ] Node.js 18+ (for local development)
- [ ] MongoDB 6.0+ (or cloud service)
- [ ] Redis 7.0+ (or cloud service)

### 4. External Services
- [ ] Steam API key obtained
- [ ] Sentry account created (error tracking)
- [ ] Monitoring service configured
- [ ] Backup storage configured (S3, etc.)

## 🔐 Security Hardening

### 1. Server Security

#### Firewall Configuration
```bash
# Install UFW (Uncomplicated Firewall)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Check status
sudo ufw status verbose
```

#### SSH Hardening
```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Recommended settings:
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2

# Restart SSH
sudo systemctl restart sshd
```

#### Fail2ban
```bash
# Install fail2ban
sudo apt-get install fail2ban

# Configure for SSH
sudo nano /etc/fail2ban/jail.local

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

# Enable and start
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 2. Application Security

#### Environment Variables
- All secrets must be stored in environment variables
- Never commit `.env` files to version control
- Use a secret management service in production
- Rotate secrets regularly

#### SSL/TLS Configuration
```nginx
# Strong SSL configuration (already in nginx.conf)
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
```

#### Security Headers
```nginx
# Already configured in nginx.conf
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

## 🗄️ Database Setup

### Option 1: MongoDB Atlas (Recommended)

1. **Create Account**
   - Go to https://cloud.mongodb.com
   - Create a new project

2. **Create Cluster**
   - Choose M10+ tier for production
   - Select region closest to your server
   - Enable backup

3. **Configure Security**
   - Create database user with read/write permissions
   - Add your server IP to IP Access List
   - Get connection string

4. **Configure Replica Set**
   - In Atlas, go to "Connect" → "Connect your application"
   - Select "Node.js" and version 4.1 or later
   - Copy connection string

5. **Set up Monitoring**
   - Enable Cloud Atlas monitoring
   - Set up alerts for:
     - CPU usage > 80%
     - Memory usage > 80%
     - Connections > 80% of limit
     - Query performance degradation

### Option 2: Self-Hosted MongoDB

1. **Install MongoDB**
```bash
# Ubuntu
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Configure replica set
sudo nano /etc/mongod.conf
# Add:
# replication:
#   replSetName: "rs0"

sudo systemctl restart mongod
```

2. **Initialize Replica Set**
```bash
mongosh
> rs.initiate()
> rs.add("secondary-host:27017")
```

3. **Set up Authentication**
```bash
# Create admin user
mongosh
> use admin
> db.createUser({
    user: "admin",
    pwd: "secure_password",
    roles: [{ role: "userAdminAnyDatabase", db: "admin" }]
  })

# Update config to enable auth
sudo nano /etc/mongod.conf
# security:
#   authorization: enabled

sudo systemctl restart mongod
```

4. **Configure Backup**
```bash
# Create backup script
sudo nano /usr/local/bin/backup-mongodb.sh

#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/mongodb"
mongodump --uri="mongodb://admin:password@localhost:27017/steam-marketplace?authSource=admin" --out="$BACKUP_DIR/$DATE"
find $BACKUP_DIR -type d -mtime +30 -exec rm -rf {} \;
```

### Option 3: AWS DocumentDB / Azure Cosmos DB

**AWS DocumentDB:**
- Enable cluster mode
- Configure VPC security groups
- Use connection string with `replicaSet=rs0`

**Azure Cosmos DB:**
- Use MongoDB API
- Configure RU (Request Units)
- Set up geo-replication

## 💾 Redis Setup

### Option 1: Redis Cloud / ElastiCache (Recommended)

1. **Redis Cloud**
   - Create account at https://redis.com/try-free/
   - Create database with password
   - Get connection string

2. **AWS ElastiCache**
   - Create Redis cluster
   - Configure subnet group
   - Set up security groups
   - Enable transit encryption

### Option 2: Self-Hosted Redis

1. **Install Redis**
```bash
sudo apt-get install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Set:
# requirepass secure_password
# maxmemory 2gb
# maxmemory-policy allkeys-lru
```

2. **Enable systemd**
```bash
sudo systemctl enable redis-server
sudo systemctl restart redis-server
```

3. **Enable TLS (Optional)**
```bash
# Generate certificates
sudo mkdir /etc/redis/tls
sudo openssl req -x509 -nodes -newkey rsa:4096 -keyout /etc/redis/tls/redis.key -out /etc/redis/tls/redis.crt -days 365

# Update config
sudo nano /etc/redis/redis.conf
# tls-port 6380
# tls-cert-file /etc/redis/tls/redis.crt
# tls-key-file /etc/redis/tls/redis.key
```

## 🌐 SSL/TLS Certificates

### Option 1: Let's Encrypt (Free)

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d sgomarket.com -d www.sgomarket.com

# Auto-renewal
sudo crontab -e
# Add:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

### Option 2: Commercial SSL Certificate

1. **Purchase Certificate**
   - Get from SSL provider (DigiCert, GlobalSign, etc.)

2. **Generate CSR**
```bash
openssl req -new -newkey rsa:2048 -nodes -keyout sgomarket.key -out sgomarket.csr
```

3. **Submit to CA**
   - Provide CSR to certificate authority
   - Complete validation
   - Download certificate and chain

4. **Install Certificates**
```bash
# Copy certificates
sudo mkdir -p /etc/nginx/ssl
sudo cp sgomarket.crt /etc/nginx/ssl/cert.pem
sudo cp sgomarket.key /etc/nginx/ssl/key.pem
sudo cp ca-bundle.crt /etc/nginx/ssl/ca-certificates.crt

# Set permissions
sudo chmod 600 /etc/nginx/ssl/*.key
sudo chmod 644 /etc/nginx/ssl/*.crt
```

## 🚀 Deployment

### 1. Clone Repository
```bash
git clone <your-repository-url>
cd steam-marketplace
```

### 2. Configure Environment
```bash
# Copy production environment template
cp .env.example .env.production

# Edit with your values
nano .env.production
```

### 3. SSL Certificates
```bash
# Create directory
mkdir -p nginx/ssl

# Copy your certificates
cp /path/to/cert.pem nginx/ssl/cert.pem
cp /path/to/key.pem nginx/ssl/key.pem
cp /path/to/ca-bundle.crt nginx/ssl/ca-certificates.crt
```

### 4. Run Deployment Script
```bash
# Make script executable
chmod +x scripts/deploy-production.sh

# Run deployment
./scripts/deploy-production.sh
```

### 5. Manual Deployment (Alternative)

```bash
# Build and start services
docker-compose --env-file .env.production --profile production up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app
```

## 📊 Monitoring & Observability

### 1. Sentry Setup

1. **Create Account**
   - Go to https://sentry.io
   - Create new project (Node.js)

2. **Configure**
   - Copy DSN from project settings
   - Add to `.env.production`

3. **Custom Tags**
   Already configured for:
   - Service name
   - Error type
   - User ID
   - Endpoint

### 2. Application Monitoring

#### Health Checks
```bash
# Check application health
curl http://localhost:3001/health

# Response should be:
{
  "status": "OK",
  "redis": "connected",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Metrics Endpoint
```bash
# Get metrics (if enabled)
curl http://localhost:3001/metrics
```

#### Log Aggregation
```yaml
# docker-compose.yml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 3. System Monitoring

#### Prometheus + Grafana
```bash
# Add to docker-compose.yml
prometheus:
  image: prom/prometheus
  ports:
    - "9090:9090"
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml

grafana:
  image: grafana/grafana
  ports:
    - "3000:3000"
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=admin
```

#### External Monitoring Services
- **DataDog:** Application performance monitoring
- **New Relic:** APM and infrastructure monitoring
- **Dynatrace:** AI-powered monitoring
- **Splunk:** Log analysis and SIEM

## 🔄 Backup & Recovery

### 1. MongoDB Backup

#### Automated Backup Script
```bash
# Create backup script
cat > /usr/local/bin/backup-mongodb.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/mongodb"
S3_BUCKET="your-backup-bucket"

# Create backup
mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/$DATE"

# Compress
tar -czf "$BACKUP_DIR/mongodb_$DATE.tar.gz" -C "$BACKUP_DIR" "$DATE"
rm -rf "$BACKUP_DIR/$DATE"

# Upload to S3
aws s3 cp "$BACKUP_DIR/mongodb_$DATE.tar.gz" "s3://$S3_BUCKET/mongodb/"

# Clean up old backups (keep 30 days)
find "$BACKUP_DIR" -name "mongodb_*.tar.gz" -mtime +30 -delete

echo "Backup completed: mongodb_$DATE.tar.gz"
EOF

chmod +x /usr/local/bin/backup-mongodb.sh

# Schedule with cron
crontab -e
# Add:
# 0 2 * * * /usr/local/bin/backup-mongodb.sh
```

#### Point-in-Time Recovery
```bash
# Restore from backup
aws s3 cp s3://your-backup-bucket/mongodb/mongodb_20240101_020000.tar.gz .
tar -xzf mongodb_20240101_020000.tar.gz

# Restore
mongorestore --uri="$MONGODB_URI" --gzip --archive=mongodb_20240101_020000.gz
```

### 2. Redis Backup

```bash
# Enable RDB snapshots in redis.conf
# save 900 1
# save 300 10
# save 60 10000

# Manual backup
docker-compose exec redis redis-cli BGSAVE
docker cp steam-marketplace-redis:/data/dump.rdb ./redis-backup.rdb
```

### 3. Configuration Backup

```bash
# Backup configuration files
tar -czf config-backup.tar.gz \
  .env.production \
  nginx/ \
  docker-compose.yml \
  scripts/

# Upload to S3
aws s3 cp config-backup.tar.gz s3://your-backup-bucket/config/
```

## 🔧 Performance Optimization

### 1. Application Performance

#### Enable Caching
- Redis cache is already configured
- Implement cache strategies for:
  - User sessions: 24 hours
  - Inventory data: 5 minutes
  - Market listings: 2 minutes
  - API responses: 5 minutes

#### Database Optimization
```javascript
// Add indexes
db.users.createIndex({ steamId: 1 })
db.trades.createIndex({ steamId: 1, createdAt: -1 })
db.trades.createIndex({ status: 1 })
db.marketListings.createIndex({ createdAt: -1 })
```

#### Connection Pooling
```javascript
// In app.js
mongoose.connect(uri, {
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  bufferMaxEntries: 0 // Disable mongoose buffering
});
```

### 2. Nginx Performance

#### Gzip Compression
Already enabled in nginx.conf:
```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
```

#### HTTP/2
```nginx
listen 443 ssl http2;
```

#### Caching Static Assets
```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    access_log off;
}
```

### 3. System Performance

#### Increase File Limits
```bash
# /etc/security/limits.conf
* soft nofile 65536
* hard nofile 65536
```

#### Optimize Kernel Parameters
```bash
# /etc/sysctl.conf
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 4096
net.ipv4.tcp_max_syn_backlog = 4096
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 1200
```

## 🔄 CI/CD Pipeline

### GitHub Actions

Already configured in `.github/workflows/ci-cd.yml`:

1. **Linting & Code Quality**
2. **Security Scanning**
3. **Unit & Integration Tests**
4. **Build Application**
5. **Docker Build & Scan**
6. **Deploy to Staging**
7. **Performance Testing**
8. **Deploy to Production**

### Manual Deployment

1. **Merge to main branch**
2. **CI/CD pipeline automatically:**
   - Runs tests
   - Builds Docker image
   - Scans for vulnerabilities
   - Deploys to staging
   - Runs performance tests
   - Deploys to production

## 📝 Maintenance

### Regular Tasks

#### Daily
- [ ] Check application logs
- [ ] Monitor error rates in Sentry
- [ ] Verify backups completed
- [ ] Check disk space

#### Weekly
- [ ] Review security alerts
- [ ] Update dependencies
- [ ] Check performance metrics
- [ ] Review access logs

#### Monthly
- [ ] Security audit
- [ ] Performance review
- [ ] Backup restoration test
- [ ] SSL certificate check
- [ ] Update documentation

### Log Rotation

```bash
# /etc/logrotate.d/steam-marketplace
/var/log/nginx/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 nginx nginx
    postrotate
        docker kill -s USR1 steam-marketplace-nginx
    endscript
}
```

### Updates

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose pull

# Update Node.js dependencies
npm update

# Update SSL certificates (Let's Encrypt)
sudo certbot renew
```

## 🚨 Disaster Recovery

### Recovery Time Objectives (RTO)
- **Critical:** 1 hour
- **Important:** 4 hours
- **Low:** 24 hours

### Recovery Point Objectives (RPO)
- **Database:** 15 minutes
- **Cache:** Acceptable to lose
- **Configuration:** 0 (always available)

### Recovery Procedures

1. **Application Down**
```bash
# Check service status
docker-compose ps

# Restart services
docker-compose restart

# Check logs
docker-compose logs -f app
```

2. **Database Failure**
```bash
# Restore from latest backup
aws s3 cp s3://your-backup-bucket/mongodb/latest.tar.gz .
tar -xzf latest.tar.gz
mongorestore --uri="$MONGODB_URI" --gzip --archive=latest.gz
```

3. **Complete Server Failure**
```bash
# Spin up new server
# Restore from backup
# Update DNS
# Deploy application
```

## 📚 Resources

### Documentation
- [MongoDB Manual](https://docs.mongodb.com/manual/)
- [Redis Documentation](https://redis.io/documentation)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)

### Tools
- **Monitoring:** Datadog, New Relic, Dynatrace
- **Logging:** ELK Stack, Splunk, LogDNA
- **Backups:** MongoDB Atlas, AWS Backup, Veeam
- **Security:** Aqua Security, Twistlock, Snyk
- **Performance:** Lighthouse, WebPageTest, GTmetrix

## ✅ Production Readiness Checklist

### Security
- [ ] SSL/TLS configured with strong ciphers
- [ ] All default passwords changed
- [ ] Firewall configured
- [ ] SSH key-based authentication enabled
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Input validation in place
- [ ] Error messages sanitized
- [ ] Dependencies scanned for vulnerabilities
- [ ] Secrets stored in environment variables

### Reliability
- [ ] Database replica set configured
- [ ] Automated backups tested
- [ ] Health checks implemented
- [ ] Error tracking (Sentry) enabled
- [ ] Monitoring configured
- [ ] Log aggregation enabled
- [ ] Multiple app instances (load balanced)
- [ ] Caching implemented

### Performance
- [ ] Gzip compression enabled
- [ ] Static assets cached
- [ ] Database indexes optimized
- [ ] Connection pooling configured
- [ ] Redis caching enabled
- [ ] CDN configured (optional)
- [ ] Performance monitoring enabled

### Operations
- [ ] CI/CD pipeline configured
- [ ] Automated testing in place
- [ ] Documentation updated
- [ ] Runbooks created
- [ ] Team trained on deployment
- [ ] Monitoring alerts configured
- [ ] Backup retention policy defined
- [ ] Disaster recovery plan documented

## 🎯 Next Steps

1. **Complete the checklist above**
2. **Set up monitoring and alerting**
3. **Configure automated backups**
4. **Test disaster recovery procedures**
5. **Set up log aggregation**
6. **Configure performance monitoring**
7. **Implement security scanning**
8. **Set up team access and permissions**
9. **Create runbooks for common operations**
10. **Schedule regular security audits**

## 📞 Support

For issues during production setup:
1. Check the logs: `docker-compose logs -f app`
2. Verify environment variables
3. Check health endpoint: `/health`
4. Review Sentry for errors
5. Consult this guide
6. Create an issue with logs and details

---

**Last Updated:** 2024
**Version:** 1.0.0
**Maintained by:** Development Team