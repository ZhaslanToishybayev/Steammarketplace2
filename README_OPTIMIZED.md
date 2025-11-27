# Steam Marketplace - Optimized Claude Workflow

## 🚀 Quick Start (30 seconds)

```bash
# 1. Install dependencies
npm run install:all

# 2. Start development environment
npm run dev

# 3. Verify setup (optional)
npm run verify:system
```

**Default URLs:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api
- Admin Panel: http://localhost:3000/admin

## 🎯 Project Snapshot

**What this is:** A complete Steam marketplace with real Steam API integration, bot-based trading, and real-time features.

**Tech Stack:**
- **Backend**: NestJS + TypeScript + PostgreSQL + MongoDB + Redis
- **Frontend**: Next.js 14 + React 18 + TailwindCSS + Zustand
- **Steam Integration**: Real Steam OAuth, inventory sync, bot trading
- **Infrastructure**: Docker + WebSocket + comprehensive testing

## 📁 Project Structure (AI-Friendly)

```
steam-marketplace-monorepo/
├── apps/
│   ├── backend/          # NestJS API (src/modules/*)
│   │   ├── src/modules/auth/     # Steam OAuth & JWT auth
│   │   ├── src/modules/steam/    # Steam API integration
│   │   ├── src/modules/trading/  # Bot trading system
│   │   └── src/modules/inventory/ # Steam inventory sync
│   └── frontend/         # Next.js UI (src/app/*)
│       ├── src/app/market/       # Marketplace pages
│       ├── src/app/trade/        # Trading interface
│       └── src/app/admin/        # Admin panel
├── tests/e2e/            # End-to-end tests
└── scripts/              # Deployment & utilities
```

## 🚀 Development Commands (AI-Optimized)

### One-Command Setup
```bash
npm run dev  # Starts both backend + frontend
```

### Essential Commands
```bash
# Development
npm run dev              # Full development environment
npm run dev:backend     # Backend only (port 3001)
npm run dev:frontend    # Frontend only (port 3000)

# Quick fixes
npm run clean && npm run install:all && npm run dev  # Nuclear option

# Testing
npm run verify:system   # Complete system check
npm run test:steam      # Steam integration tests
npm run test:e2e        # End-to-end tests

# Backend specific
cd apps/backend && npm run start:dev  # Backend with hot reload
cd apps/backend && npm run build      # Build backend
cd apps/backend && npm run lint       # Lint backend code

# Frontend specific
cd apps/frontend && npm run dev       # Frontend development
cd apps/frontend && npm run build     # Build frontend
cd apps/frontend && npm run lint      # Lint frontend code
```

## 🔧 Configuration (Steam-Ready)

### Environment Setup
```bash
# Copy environment files
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.local.example apps/frontend/.env.local

# Required Steam variables
STEAM_API_KEY=your-steam-api-key  # Get from https://steamcommunity.com/dev/apikey
BOT_ENCRYPTION_KEY=32-char-encryption-key
JWT_SECRET=your-jwt-secret
```

### Database Quick Start
```bash
# Full setup with Docker
npm run docker:up
make db-init  # Creates tables + seeds with real Steam data

# Or manual setup
docker compose up -d postgres mongodb redis
cd apps/backend && npm run start:dev  # Wait for tables, then Ctrl+C
npm run db:seed  # Add test data
```

## 🧪 Testing Strategy (AI-Guided)

### Quick Verification
```bash
npm run verify:system           # Complete system check
npm run test:steam              # Steam API integration tests
npm run test:e2e                # End-to-end tests
```

### Test Categories
- **Unit Tests**: Backend module testing with Jest
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Complete user workflows with Playwright
- **Steam Tests**: Real Steam API integration testing
- **Performance Tests**: Load and stress testing

## 🔄 Architecture Patterns (AI-Friendly)

### Backend Modules (NestJS)
```
src/modules/
├── auth/           # Steam OAuth & JWT authentication
├── steam/          # Steam API integration
├── trading/        # Bot-based trade system
├── inventory/      # Steam inventory sync
├── marketplace/    # Item listings & pricing
├── user/           # User management
└── admin/          # Admin functionality
```

### Frontend Structure (Next.js)
```
src/app/
├── market/         # Marketplace pages
├── trade/          # Trading interface
├── inventory/      # User inventory
├── auth/           # Authentication pages
└── admin/          # Admin panel
```

### Key Patterns
- **Dependency Injection**: NestJS DI throughout backend
- **State Management**: Zustand + TanStack Query
- **Real-time**: WebSocket events for trades, inventory, balance
- **Security**: JWT + rate limiting + input validation

## 🔌 API Integration (Steam-Focused)

### Key Endpoints
```bash
# Authentication
GET /api/auth/steam         # Initiate Steam OAuth
GET /api/auth/steam/return  # Steam OAuth callback
POST /api/auth/refresh      # Refresh JWT tokens

# Inventory
GET /api/inventory          # Get user inventory
POST /api/inventory/sync    # Sync Steam inventory
GET /api/inventory/statistics  # Inventory analytics

# Trading
POST /api/trades            # Create trade
GET /api/trades             # Get user trades
GET /api/bots               # Bot management (admin)

# Marketplace
GET /api/market/items       # Market listings
GET /api/pricing/item/:id   # Item pricing
GET /api/pricing/trends     # Market trends
```

### WebSocket Events
```typescript
// Real-time updates
socket.on('trade:completed', (data) => { /* Update UI */ });
socket.on('balance:updated', (data) => { /* Update balance */ });
socket.on('inventory:updated', (data) => { /* Refresh inventory */ });
```

## 🎮 Steam Integration (Real APIs)

### What Makes This Special
- **Real Steam OAuth**: Uses actual Steam API for authentication
- **Live Inventory Sync**: Pulls real items from Steam accounts
- **Bot Trading**: Real Steam bots process trades automatically
- **Market Data**: Real Steam Community Market integration

### Steam Setup Required
1. Get Steam API key: https://steamcommunity.com/dev/apikey
2. Configure bot accounts in admin panel
3. First Steam login becomes admin automatically

## 🚨 Troubleshooting (AI-Powered)

### Common Issues & Solutions
```bash
# Nuclear option - clean restart
npm run clean && npm run install:all && npm run dev

# Port conflicts
lsof -i :3000 -i :3001  # Check ports
kill -9 <PID>           # Free ports

# Database issues
npm run verify:seeding   # Check data

# Steam API problems
npm run validate:env     # Verify config
```

### Quick Health Checks
- Frontend: http://localhost:3000
- Backend: http://localhost:3001/api/health
- Admin: http://localhost:3000/admin

## 📚 Quick Reference

### Adding New Features
1. **Backend**: Create module in `src/modules/` with controller/service/entity
2. **Frontend**: Add page in `src/app/[route]/page.tsx`
3. **Database**: Add TypeORM entity + migration
4. **Testing**: Add unit + integration tests

### Development Workflow
```bash
# 1. Make changes
# 2. Test locally: npm run dev
# 3. Run tests: npm run test:unit
# 4. Verify system: npm run verify:system
# 5. Build: npm run build
```

### Performance Optimization
- **Frontend**: Next.js Image optimization, code splitting
- **Backend**: Redis caching, PostgreSQL connection pooling
- **Database**: MongoDB indexing, query optimization

---

**🎯 This is a production-ready Steam marketplace with real Steam API integration. The architecture follows modern best practices and is designed for scalability.**

**🔗 Integration ready for**: https://github.com/diet103/claude-code-infrastructure-showcase

**📄 Full documentation**: See original README.md for comprehensive details