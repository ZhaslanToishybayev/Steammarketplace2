# 🚧 Staging Environment Guide

This guide describes how to deploy and manage the **Staging / Beta** environment.

## 🎯 Purpose
- **User Acceptance Testing (UAT)**: Real users testing the UI/UX.
- **Integration Testing**: Verifying Steam bot operations and inventory syncing.
- **Load Testing**: Checking performance under moderate load.

**⚠️ IMPORTANT**: This environment uses **FAKE MONEY**. Real payments are disabled.

---

## 🚀 Deployment Instructions

### 1. Prerequisite Checklist
- [x] **Robots.txt**: `Disallow: /` (Prevent SEO indexing)
- [x] **Banner**: "Staging Environment" warning is visible.
- [x] **Payment**: Real payment gateways disabled.

### 2. Environment Variables (`.env.staging`)

Create a `.env` file on your staging server with these specifics:

```env
# Backend
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://staging.yourdomain.com
JWT_SECRET=complex_secret_key_staging
SESSION_SECRET=complex_session_secret_staging
STEAM_API_KEY=your_steam_api_key

# Database
POSTGRES_HOST=postgres
POSTGRES_DB=steam_marketplace_staging

# Frontend
NEXT_PUBLIC_BACKEND_URL=https://api-staging.yourdomain.com
```

### 3. Docker Deployment

Run the following on your staging server (VPS/Cloud):

```bash
# 1. Clone repo
git clone https://github.com/yourusername/steam-marketplace.git
cd steam-marketplace

# 2. Setup env
cp .env.staging apps/backend/.env
cp .env.staging apps/frontend/.env

# 3. Launch
docker-compose up -d --build
```

### 4. Post-Deployment Verification

1. **Visit Site**: You should see the **Yellow Staging Banner**.
2. **Login**: Authenticate with Steam.
3. **Test Money**: Click `+$100` button (should work).
4. **Trade**: P2P trade should trigger bot events (check logs).

---

## 🛡️ Monitoring

Since we don't have Sentry yet, monitor logs manually:

```bash
# Follow backend logs
docker logs -f steam-marketplace-backend

# Follow bot activity
docker logs -f steam-marketplace-backend | grep "Bot"
```

## 🔄 Rollback

If critical bugs are found:

```bash
docker-compose down
# Revert to stable tag if using images, or git checkout main
```
