# 🚀 Ideal Development Workflow

This document outlines the complete optimized workflow for the Steam Marketplace project, designed for maximum productivity and code quality.

## 🎯 Quick Start (30 seconds)

```bash
# Clone and setup
git clone <your-repo>
cd testsite
npm install

# Start everything with one command
npm run dev:all
```

## 🏗️ Project Architecture

### Multi-Server Setup
- **Frontend**: Next.js 14 on port 3000 (primary), 3001, 3005, 3006, 3007
- **Backend**: NestJS on port 3002
- **Steam Services**: Multiple specialized services on ports 3008-3011
- **Unified Server**: Central coordination on port 3009

### Key Technologies
- **Frontend**: React 18, Next.js 14, TypeScript, TailwindCSS
- **Backend**: NestJS, TypeScript, PostgreSQL, MongoDB, Redis
- **Steam Integration**: Real Steam API, OAuth, Inventory sync
- **State Management**: Zustand, TanStack Query
- **Testing**: Jest, Supertest, Playwright

## 🛠️ Essential Commands

### Development Workflow
```bash
# Start all services
npm run dev:all

# Individual services
npm run dev                    # Frontend only
npm run start:dev             # Backend only
npm run steam:services        # Steam integration services

# Build and deploy
npm run build                 # Production build
npm run build:analyze         # Bundle analysis
npm run deploy:staging        # Staging deployment
npm run deploy:production     # Production deployment
```

### Quality Assurance
```bash
# Code quality checks
npm run lint                  # ESLint check
npm run lint:fix              # Auto-fix lint issues
npm run type-check            # TypeScript validation
npm run format                # Prettier formatting

# Testing
npm run test                  # Unit tests
npm run test:integration      # Integration tests
npm run test:e2e              # End-to-end tests
npm run test:steam            # Steam API tests
```

### Steam Integration
```bash
# Steam API testing
npm run steam:auth:test       # OAuth flow testing
npm run steam:inventory:test  # Inventory sync testing
npm run steam:trade:test      # Trade offer testing

# Bot management
npm run bot:status            # Check bot status
npm run bot:deploy            # Deploy trading bots
npm run bot:monitor           # Real-time bot monitoring
```

## 🔧 Advanced Development Tools

### Claude Code Integration
```bash
# AI-assisted development
npm run claude:analyze        # Codebase analysis
npm run claude:optimize       # Performance optimization
npm run claude:security       # Security audit
npm run claude:test-gen       # Test generation
```

### Debugging & Monitoring
```bash
# Debug tools
npm run debug:steam           # Steam API debugging
npm run debug:auth            # Authentication debugging
npm run debug:database        # Database connection debugging

# Performance monitoring
npm run perf:analyze          # Performance analysis
npm run bundle:analyze        # Bundle size analysis
npm run memory:profile        # Memory usage profiling
```

### Deployment & DevOps
```bash
# Docker operations
npm run docker:build          # Build all containers
npm run docker:compose        # Start with Docker Compose
npm run docker:deploy         # Deploy to production

# Database operations
npm run db:migrate            # Run migrations
npm run db:seed               # Seed development data
npm run db:backup             # Create backup
npm run db:restore            # Restore from backup
```

## 📋 Quality Gates

### Pre-commit Checklist
Before committing code, ensure:

1. ✅ **Code Quality**
   ```bash
   npm run lint && npm run type-check && npm run format
   ```

2. ✅ **Tests Pass**
   ```bash
   npm run test && npm run test:integration
   ```

3. ✅ **Build Success**
   ```bash
   npm run build
   ```

4. ✅ **Steam Integration**
   ```bash
   npm run steam:auth:test && npm run steam:trade:test
   ```

### Automated Quality Checks
The following commands run automatically in CI/CD:

```bash
npm run quality:gate          # All quality checks
npm run security:scan         # Vulnerability scanning
npm run dependency:check      # Dependency auditing
npm run performance:audit     # Performance regression testing
```

## 🎯 Steam Integration Workflow

### Setting Up Steam API
1. **Get API Keys**: Visit [Steam Partner](https://partner.steamgames.com/)
2. **Configure Environment**:
   ```bash
   cp .env.example .env.local
   # Fill in STEAM_API_KEY, STEAM_DOMAIN, etc.
   ```
3. **Test Integration**:
   ```bash
   npm run steam:auth:test
   ```

### Bot Management
```bash
# Add new trading bot
npm run bot:create            # Create new bot account
npm run bot:configure         # Configure bot settings
npm run bot:activate          # Activate bot trading

# Monitor bots
npm run bot:status            # Check all bot status
npm run bot:logs              # View bot logs
npm run bot:metrics           # Performance metrics
```

### Trade Flow
1. **User initiates trade** → Frontend creates trade offer
2. **Bot processes offer** → Backend validates and sends to Steam
3. **Steam confirms** → Real-time updates via WebSocket
4. **Completion** → Inventory sync and notifications

## 🔒 Security Best Practices

### Environment Variables
```bash
# Never commit .env files
echo ".env*" >> .gitignore

# Use different keys for each environment
.env.development
.env.staging
.env.production
```

### Steam Security
- ✅ Use HTTPS for all Steam API calls
- ✅ Validate all Steam callback responses
- ✅ Rate limit Steam API requests
- ✅ Store API keys securely
- ✅ Use Steam Guard for bot accounts

### Code Security
```bash
npm run security:audit        # Regular security audits
npm run secret:scan           # Scan for exposed secrets
npm run dependency:audit      # Check for vulnerable packages
```

## 📊 Performance Optimization

### Frontend Optimization
```bash
npm run build:analyze         # Analyze bundle size
npm run perf:audit            # Performance audit
npm run lighthouse            # Lighthouse CI
```

### Backend Optimization
```bash
npm run db:optimize           # Database optimization
npm run cache:warm            # Warm Redis cache
npm run api:benchmark         # API performance testing
```

### Steam API Optimization
- ✅ Cache Steam API responses
- ✅ Implement exponential backoff
- ✅ Use Steam API batching
- ✅ Monitor rate limits
- ✅ Optimize inventory sync

## 🐛 Debugging Guide

### Common Issues

1. **Steam OAuth Failing**
   ```bash
   npm run debug:auth
   # Check: STEAM_DOMAIN, callback URLs, SSL certificates
   ```

2. **Bot Not Trading**
   ```bash
   npm run bot:logs
   # Check: Steam Guard, API limits, bot configuration
   ```

3. **Database Connection Issues**
   ```bash
   npm run debug:database
   # Check: connection strings, PostgreSQL status, migrations
   ```

4. **Frontend Build Errors**
   ```bash
   npm run type-check
   npm run lint
   # Check: TypeScript config, ESLint rules, dependencies
   ```

### Debug Tools
- **Chrome DevTools**: Frontend debugging
- **Postman**: API testing
- **pgAdmin**: Database management
- **Redis Desktop Manager**: Cache inspection
- **Wireshark**: Network analysis

## 🚀 Deployment Guide

### Staging Deployment
```bash
npm run deploy:staging
# Automated deployment to staging environment
```

### Production Deployment
```bash
npm run deploy:production
# Blue-green deployment with zero downtime
```

### Rollback Strategy
```bash
npm run deploy:rollback       # Rollback to previous version
npm run deploy:emergency      # Emergency hotfix deployment
```

## 📈 Monitoring & Analytics

### Application Monitoring
```bash
npm run monitor:health        # Health checks
npm run monitor:metrics       # Performance metrics
npm run monitor:errors        # Error tracking
```

### Steam Integration Monitoring
```bash
npm run monitor:steam         # Steam API health
npm run monitor:trades        # Trade success rates
npm run monitor:bots          # Bot performance
```

### Business Analytics
- User registration trends
- Trade volume analysis
- Bot profitability metrics
- Steam inventory sync success rates

## 🎓 Learning Resources

### Steam API Documentation
- [Steam Web API](https://partner.steamgames.com/doc/webapi)
- [Steam Community Market](https://partner.steamgames.com/doc/webapi/economy)
- [Steam OAuth](https://steamcommunity.com/dev)

### Technical Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [NestJS Documentation](https://docs.nestjs.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Best Practices
- Follow Steam API rate limits
- Implement proper error handling
- Use TypeScript for type safety
- Write comprehensive tests
- Monitor performance continuously

---

## 🎯 Summary

This Steam Marketplace project provides a complete, production-ready solution with:

- ✅ **Full Steam Integration**: Real Steam API, OAuth, trading
- ✅ **Modern Tech Stack**: Next.js, NestJS, TypeScript, Tailwind
- ✅ **AI-Optimized Workflow**: Claude Code tools for quality
- ✅ **Comprehensive Testing**: Unit, integration, E2E tests
- ✅ **DevOps Ready**: Docker, CI/CD, monitoring
- ✅ **Security First**: OAuth, rate limiting, security audits
- ✅ **Performance Optimized**: Caching, optimization, monitoring

The workflow is designed for maximum productivity while maintaining high code quality and security standards.