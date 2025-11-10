# 🚀 GitHub Deployment Guide

## Option 2: GitHub + Auto Deploy

### Step 1: Prepare Repository

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit: Steam Marketplace"

# Create GitHub repository and push
git remote add origin https://github.com/YOUR_USERNAME/steam-marketplace.git
git branch -M main
git push -u origin main
```

### Step 2: Create GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to VPS

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Deploy to VPS
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.KEY }}
        script: |
          cd /root/steam-marketplace
          git pull origin main
          docker-compose down
          docker-compose up -d --build
```

### Step 3: Add GitHub Secrets

In your GitHub repository, go to Settings → Secrets and variables → Actions and add:

- `HOST`: Your VPS IP (194.x.x.x)
- `USERNAME`: root (or your username)
- `KEY`: Your SSH private key

### Step 4: First Manual Deploy

```bash
# On your VPS, clone the repository
git clone https://github.com/YOUR_USERNAME/steam-marketplace.git /root/steam-marketplace
cd /root/steam-marketplace

# Configure .env.production
cp .env.production .env.production.backup
# Edit .env.production with your settings

# Initial deploy
./quick-deploy.sh
```

## ✅ Benefits of GitHub Deploy

1. **Automatic Updates**: Push to main → VPS updates automatically
2. **Version Control**: All changes tracked
3. **Rollback**: Easy to revert to previous versions
4. **Professional**: Industry standard practice

## 📝 Note

You need to generate an SSH key pair for GitHub Actions:

```bash
# Generate SSH key on VPS
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# Add public key to authorized_keys
cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys

# Copy private key content and add to GitHub Secrets as 'KEY'
cat ~/.ssh/id_rsa
```
