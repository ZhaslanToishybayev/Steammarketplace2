# 🚀 Steam Marketplace - Deployment Guide

## 📋 Prerequisites

- **Node.js** v18+ 
- **PostgreSQL** v14+
- **Redis** v6+
- **Steam API Key** (get from https://steamcommunity.com/dev/apikey)
- **Steam Bot Account** with Mobile Authenticator

---

## ⚡ Quick Start

### 1. Install Dependencies

```bash
# Root (installs all workspaces)
npm install

# Or separately:
cd apps/backend && npm install
cd apps/frontend && npm install
```

### 2. Configure Environment

```bash
# Backend
cd apps/backend
cp .env.example .env
# Edit .env with your values
```

### 3. Setup Database

```bash
# Create PostgreSQL database
psql -U postgres -c "CREATE DATABASE steam_marketplace;"
psql -U postgres -c "CREATE USER steam_user WITH PASSWORD 'your_password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE steam_marketplace TO steam_user;"

# Run migrations
cd apps/backend
psql -U steam_user -d steam_marketplace -f migrations/001_escrow_tables.sql
```

### 4. Start Services

```bash
# Start Redis
redis-server

# Start Backend (port 3001)
cd apps/backend
npm start

# Start Frontend (port 3000)
cd apps/frontend
npm run dev
```

---

## 🔐 Steam Bot Setup

1. Create a new Steam account for the bot
2. Enable Steam Guard Mobile Authenticator
3. Get `shared_secret` and `identity_secret` from authenticator
4. Add credentials to `.env`:
   ```
   STEAM_BOT_1_USERNAME=bot_account
   STEAM_BOT_1_PASSWORD=bot_password
   STEAM_BOT_1_SHARED_SECRET=xxx
   STEAM_BOT_1_IDENTITY_SECRET=xxx
   STEAM_BOT_1_STEAM_ID=76561198xxxxxxxxx
   ```

---

## 🌐 Production Deployment

### Using PM2:
```bash
npm install -g pm2
cd apps/backend && pm2 start server.js --name steam-backend
cd apps/frontend && pm2 start npm --name steam-frontend -- start
```

### Environment Variables for Production:
```
NODE_ENV=production
CORS_ORIGIN=https://your-domain.com
```

---

## 📁 Project Structure

```
├── apps/
│   ├── backend/          # Express.js API
│   │   ├── src/
│   │   │   ├── routes/   # API endpoints
│   │   │   ├── services/ # Business logic
│   │   │   └── config/   # Configuration
│   │   └── migrations/   # SQL migrations
│   └── frontend/         # Next.js App
│       └── src/
│           ├── app/      # Pages
│           ├── components/
│           └── lib/      # Utilities
└── packages/
    └── types/            # Shared TypeScript types
```

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| Database connection failed | Check POSTGRES_* env vars |
| Redis connection failed | Ensure redis-server is running |
| Steam API 403 | Check STEAM_API_KEY |
| Bot login failed | Verify shared_secret/identity_secret |

---

## 📞 Support

For issues, check the logs:
```bash
tail -f apps/backend/backend.log
```
