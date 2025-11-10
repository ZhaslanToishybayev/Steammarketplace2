# 🔄 Update Commands for VPS

## Run these commands on your VPS (194.x.x.x):

```bash
# 1. Go to your project directory
cd /root/steammarketplace2

# 2. Pull latest changes from GitHub
git pull origin main

# 3. Stop current services
docker-compose down

# 4. Start with latest changes
docker-compose up -d --build
```

## Or use the quick script:

```bash
# Make script executable (only once)
chmod +x quick-deploy.sh

# Run update
./quick-deploy.sh
```

## Or use the management script:

```bash
# Make script executable (only once)
chmod +x manage-production.sh

# Restart with latest code
./manage-production.sh restart
```

## Check status after update:

```bash
# View container status
docker-compose ps

# Check API health
curl http://localhost:3001/api/health

# View logs
./manage-production.sh logs
```

---

## 📝 If you get errors:

### Error: `.env.production` not found
```bash
# Copy from backup
cp .env.production.backup .env.production
# Then edit it with your settings
nano .env.production
```

### Error: Port already in use
```bash
# Find what's using port 3001
lsof -i :3001

# Kill the process (replace PID)
kill -9 PID
```

### Error: Docker not running
```bash
# Start Docker
systemctl start docker
systemctl enable docker
```
