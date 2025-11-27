# CLAUDE.md - Steam Marketplace AI Developer Guide

This guide optimizes Claude Code (claude.ai/code) workflows for the Steam Marketplace project - a production-ready Steam item trading platform with real Steam API integration.

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

## 🔧 Configuration

### Environment Setup

**Backend Environment** (apps/backend/.env):
```bash
# Required for Steam integration
STEAM_API_KEY=your-steam-api-key
BOT_ENCRYPTION_KEY=32-character-encryption-key

# Database connections
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=steam_user
POSTGRES_PASSWORD=steam_password
POSTGRES_DB=steam_marketplace
MONGODB_URI=mongodb://localhost:27017/steam_marketplace
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password

# JWT Authentication
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-jwt-refresh-secret
```

**Frontend Environment** (apps/frontend/.env.local):
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_STEAM_RETURN_URL=http://localhost:3000/auth/callback
```

### Steam Integration Setup

1. **Get Steam API Key**: Visit https://steamcommunity.com/dev/apikey
2. **Bot Account Setup**: Use Steam Desktop Authenticator (SDA) to generate shared/identity secrets
3. **First Admin Setup**: The first user to login via Steam is automatically promoted to admin

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

## 🔌 API Integration

### Key API Endpoints

**Authentication**:
- `GET /api/auth/steam` - Initiate Steam OAuth
- `GET /api/auth/steam/return` - Steam OAuth callback
- `POST /api/auth/refresh` - Refresh JWT tokens

**Inventory**:
- `GET /api/inventory` - Get user inventory
- `POST /api/inventory/sync` - Sync Steam inventory
- `GET /api/inventory/statistics` - Inventory analytics

**Trading**:
- `POST /api/trades` - Create new trade
- `GET /api/trades` - Get user trades
- `GET /api/bots` - Bot management (admin only)

**Marketplace**:
- `GET /api/pricing/item/:id` - Item pricing
- `GET /api/market/items` - Market listings
- `GET /api/pricing/trends` - Market trends

### WebSocket Events

```typescript
// Frontend WebSocket connection
const socket = io(process.env.NEXT_PUBLIC_WS_URL, {
  auth: { token: accessToken }
});

// Key events
socket.on('trade:completed', (data) => { /* Update UI */ });
socket.on('balance:updated', (data) => { /* Update balance */ });
socket.on('inventory:updated', (data) => { /* Refresh inventory */ });
```

## 🎯 Common Development Tasks

### Adding New Features

1. **Backend Module Creation**:
   ```bash
   cd apps/backend
   # Create new module with controllers, services, entities
   # Add to app.module.ts imports
   # Define API routes and DTOs
   # Add database entities and migrations
   ```

2. **Frontend Component Development**:
   ```bash
   cd apps/frontend
   # Create page in src/app/[route]/page.tsx
   # Add API calls using src/lib/api.ts
   # Update Zustand stores if needed
   # Add Tailwind-styled components
   ```

3. **Database Changes**:
   ```bash
   # Add TypeORM entities
   # Create migration: typeorm migration:generate -n MigrationName
   # Run migration: typeorm migration:run
   ```

### Steam Integration Tasks

1. **Adding Bot Support**:
   - Configure bot credentials in admin panel
   - Set `BOT_ENCRYPTION_KEY` environment variable
   - Monitor bot status via WebSocket events

2. **Inventory Sync**:
   - Triggered manually via API or automatically every 30 minutes
   - Supports CS:GO, Dota 2, TF2, Rust
   - Caches results in Redis for performance

3. **Trade Processing**:
   - Bot assignment and trade offer creation
   - Mobile authenticator confirmation
   - Real-time status updates via WebSocket

## 🐛 Troubleshooting

### Common Issues

**Development Setup Problems**:
```bash
# Port conflicts
lsof -i :3000 -i :3001  # Check port usage
kill -9 <PID>           # Free up ports

# Dependency issues
npm run clean && npm run install:all

# Database connection issues
npm run verify:seeding
```

**Steam Integration Issues**:
```bash
# Verify Steam API key
npm run validate:env

# Check bot status
# Visit admin panel: http://localhost:3000/admin
# Check bot logs in backend console
```

**Build/Compilation Errors**:
```bash
# TypeScript errors
cd apps/backend && npm run type-check
cd apps/frontend && npm run type-check

# RxJS conflicts (common issue)
rm -rf node_modules apps/backend/node_modules
cd apps/backend && npm install
```

### Performance Optimization

- **Database**: PostgreSQL connection pooling, MongoDB indexing
- **Caching**: Redis for sessions and API responses
- **Frontend**: Next.js Image optimization, code splitting
- **Backend**: Bull queue for background jobs, rate limiting

### Monitoring & Logging

- **Health Checks**: `GET /api/health`, `GET /api/health/detailed`
- **Metrics**: `GET /api/metrics` (Prometheus format)
- **Logs**: Docker container logs, Winston structured logging
- **Real-time Monitoring**: Grafana dashboard at http://localhost:3002

## 🚀 Deployment

### Production Requirements

1. **Environment Variables**: Set all production secrets
2. **Database**: PostgreSQL, MongoDB, Redis with proper security
3. **SSL/TLS**: HTTPS termination with valid certificates
4. **Load Balancing**: Nginx reverse proxy configuration
5. **Monitoring**: Prometheus/Grafana setup

### Security Considerations

- **JWT Rotation**: Automatic token refresh mechanism
- **Rate Limiting**: Protection against abuse
- **Input Validation**: Comprehensive validation with class-validator
- **CORS**: Proper cross-origin configuration
- **Bot Security**: Encrypted bot credentials with AES-256-GCM

## 📚 Additional Documentation

- **README.md**: Comprehensive project documentation
- **API Verification Guide**: scripts/API_VERIFICATION_GUIDE.md
- **Steam Integration Guide**: STEAM_INTEGRATION_TEST_GUIDE.md
- **E2E Testing**: tests/e2e/ directory with comprehensive test suites
- **Database Docs**: apps/backend/src/database/README.md

## 🎮 Steam-Specific Features

### Real Steam Integration
This application uses **real Steam APIs** for all functionality:
- Steam OAuth authentication
- Real-time inventory synchronization
- Bot-based trade processing with actual Steam bots
- Real market data from Steam Community Market

### Bot Management
- Admin panel for adding/managing Steam bot accounts
- Automatic bot health monitoring
- Trade status tracking and notifications
- Mobile authenticator integration

### Inventory System
- Multi-game support (CS:GO, Dota 2, TF2, Rust)
- Automatic synchronization every 30 minutes
- Advanced filtering and search capabilities
- Redis caching for performance

## ⚡ Quick Start for New Developers

1. **Clone and Setup**:
   ```bash
   git clone <repository>
   cd steam-marketplace-monorepo
   npm run install:all
   ```

2. **Environment Configuration**:
   ```bash
   cp apps/backend/.env.example apps/backend/.env
   cp apps/frontend/.env.local.example apps/frontend/.env.local
   # Configure Steam API key and other required variables
   ```

3. **Database Initialization**:
   ```bash
   make db-init  # Full setup with test data
   ```

4. **Start Development**:
   ```bash
   npm run dev
   # Frontend: http://localhost:3000
   # Backend: http://localhost:3001/api
   ```

5. **Verify Setup**:
   ```bash
   npm run verify:system  # Complete system verification
   ```

This Steam Marketplace project represents a sophisticated, production-ready application with comprehensive testing, real-time features, and extensive Steam integration. The architecture follows modern best practices and is designed for scalability and maintainability.