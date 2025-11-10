# 📋 PROJECT IMPROVEMENT PLAN - CONTEXT & DEPENDENCIES

**Версия:** 1.0
**Дата:** 2025-11-10
**План:** project-improvement-plan

---

## 🔗 KEY FILES & DECISIONS

### Critical Architecture Files

**Backend Core:**
- `app.js` (256 строк) - Main application entry point с Express, Socket.io, Passport, Sentry
- `routes/steam.js` (1000+ строк) - Steam API integration, inventory management
- `routes/marketplace.js` (500+ строк) - Marketplace operations, listings
- `services/steamBotManager.js` (400+ строк) - Multiple Steam bots management
- `services/steamIntegrationService.js` (400+ строк) - Real Steam API integration с кэшированием
- `models/User.js` (192 строки) - User model с dual inventory system (steamInventory + userInventory)
- `models/MarketListing.js` (239 строк) - Marketplace listings model

**Frontend Core:**
- `frontend/src/App.jsx` (100+ строк) - Main React app с routing, theme, i18n
- `frontend/src/components/Header.jsx` (100+ строк) - Navigation с auth
- `frontend/src/components/ListingCard.jsx` - Product display
- `frontend/src/contexts/ThemeContext.js` - Dark/Light theme management
- `frontend/src/i18n/` - Multi-language support (EN, RU, KZ)

**DevOps:**
- `docker-compose.yml` - MongoDB + Redis setup
- `.env.example` - Environment configuration template
- `package.json` - Dependencies (50+ packages)

### Architecture Decisions

**1. Database Schema Design (User Model)**
```javascript
// DECISION: Dual inventory system
steamInventory: [...]  // Raw Steam API data
userInventory: [...]   // Normalized user data
gameInventories: Map  // Per-game organization (CS2, Dota2, etc.)
```

**Rationale:** Flexible for different game types, preserves raw data for debugging

**2. Steam Integration**
```javascript
// DECISION: Abstraction через steamIntegrationService
class SteamIntegrationService {
  async getInventory(steamId, appId, accessToken)
  async getMarketData(itemHash)
  async createTradeOffer(...)
}
```

**Rationale:** Centralized Steam API logic, easier testing, cache management

**3. Authentication Flow**
```javascript
// DECISION: Steam OAuth + JWT
Steam OAuth → JWT Token → Cookie-based session
```

**Rationale:** Standard for Steam integration, secure, stateless

**4. Real-time Updates**
```javascript
// DECISION: Socket.io для live updates
io.on('connection', (socket) => {
  socket.join(`user-${userId}`);
});
```

**Rationale:** Real-time inventory updates, trade notifications

---

## 🏗️ SYSTEM DEPENDENCIES

### Core Dependencies

**Node.js Ecosystem:**
```
express: ^4.18.2          // Web framework
mongoose: ^7.5.0          // MongoDB ODM
passport-steam: ^1.0.17   // Steam OAuth
steam-user: ^5.2.3        // Steam API client
steam-tradeoffer-manager: ^2.10.8  // Trade offers
socket.io: ^4.7.2         // Real-time
```

**Frontend Stack:**
```
react: ^18                // UI library
vite: ^5                  // Build tool
react-router: ^6          // Routing
@tanstack/react-query: ^5 // Data fetching
i18next: ^23              // Internationalization
```

**DevOps Stack:**
```
docker: ^20               // Containerization
mongodb: 4.4              // Database
redis: ^4.6.8             // Caching
sentry: ^7.114.0          // Error tracking
```

### External Services

**Steam API:**
- Inventory API: `https://steamcommunity.com/inventory/{steamId}/{appId}/2`
- Market API: `https://steamcommunity.com/market/priceoverview`
- Trade API: Via steam-tradeoffer-manager

**Dependencies on External Systems:**
1. **Steam Community** - Must be accessible (rate limits apply)
2. **MongoDB Atlas** - Cloud DB or self-hosted
3. **Redis Cloud** - Cache layer
4. **Sentry** - Error tracking service

---

## ⚠️ CRITICAL DEPENDENCIES

### Phase 1: Testing Dependencies

**Required for Unit Tests:**
- `jest` (29.6.4) - Testing framework ✅
- `supertest` (6.3.3) - HTTP testing ✅
- `mongodb-memory-server` (8.x) - Needed for DB tests ❌
- `nock` (13.x) - HTTP request mocking ❌

**Required for E2E Tests:**
- `@playwright/test` (1.40+) - E2E framework ❌
- `@playwright/test` browsers - Chrome, Firefox, Safari ❌

**Required for Performance Tests:**
- `artillery` (2.x) - Load testing ❌
- `chrome-launcher` - Lighthouse integration ❌

**Gap Analysis:**
- Missing: 4 critical testing packages
- Action: Add to package.json in Phase 1, Week 1

### Phase 2: Performance Dependencies

**Required for Caching:**
- `redis` (4.6.8) ✅
- `ioredis` (5.3+) - Better cluster support ❌

**Required for Database:**
- MongoDB Profiler - Built-in ✅
- Connection pooling - Mongoose built-in ✅

**Gap Analysis:**
- Consider upgrading to ioredis for production Redis cluster
- MongoDB already configured correctly

### Phase 3: Security Dependencies

**Required for Validation:**
- `joi` (17.13.3) ✅
- `express-validator` (7.3.0) ✅

**Required for Security Headers:**
- `helmet` (7.0.0) ✅
- `cors` (2.8.5) ✅

**Required for Rate Limiting:**
- `express-rate-limit` (6.10.0) ✅

**Gap Analysis:**
- All security dependencies already installed ✅
- No gaps, proceed with implementation

### Phase 4: DevOps Dependencies

**Required for CI/CD:**
- GitHub Actions - Built-in ✅
- Docker - Already configured ✅
- Kubernetes manifests - Need to create ❌

**Required for Deployment:**
- Helm charts - Need to create ❌
- Cloud provider CLI - AWS/GCP/Azure ❌

**Gap Analysis:**
- Major gap: Kubernetes infrastructure not set up
- Action: Set up K8s cluster in Phase 4

### Phase 5: Monitoring Dependencies

**Required for Metrics:**
- `prom-client` (14.x) - Prometheus metrics ❌
- `express-prometheus-middleware` - Express metrics ❌

**Required for Dashboards:**
- Grafana - External service ❌
- Grafana plugins - Need to install ❌

**Required for Alerting:**
- Slack/Telegram webhook - Already available ✅
- PagerDuty - Optional ❌

**Gap Analysis:**
- Need to integrate Prometheus client into app
- Set up Grafana Cloud account

---

## 🔄 DEPENDENCY CHAIN

### Before Phase 1

**Prerequisites:**
- [ ] Testing frameworks installed
- [ ] Test database setup (MongoDB Memory Server)
- [ ] Steam API mock service

**Cannot Start Without:**
- Jest + Supertest configured
- Mock infrastructure for Steam API
- CI/CD pipeline foundation

### Before Phase 2

**Phase 1 Must Complete:**
- [ ] 85% test coverage achieved
- [ ] E2E test suite working
- [ ] Performance baseline measured

**Prerequisites for Phase 2:**
- [ ] Redis instance configured
- [ ] Database indexes analyzed
- [ ] Slow query log enabled

### Before Phase 3

**Phase 2 Must Complete:**
- [ ] Architecture refactored
- [ ] Performance metrics baseline
- [ ] Cache layer implemented

**Prerequisites for Phase 3:**
- [ ] Security audit tools installed (Snyk, SonarQube)
- [ ] OWASP checklist prepared
- [ ] Security policies documented

### Before Phase 4

**Phase 3 Must Complete:**
- [ ] Security vulnerabilities patched
- [ ] Authentication hardened
- [ ] Input validation complete

**Prerequisites for Phase 4:**
- [ ] Staging environment set up
- [ ] Docker multi-stage builds
- [ ] GitHub repository access

### Before Phase 5

**Phase 4 Must Complete:**
- [ ] CI/CD pipeline working
- [ ] Production deployment automated
- [ ] Monitoring hooks in place

**Prerequisites for Phase 5:**
- [ ] Prometheus installed
- [ ] Grafana account created
- [ ] Alert channels configured

### Before Phase 6

**Phase 5 Must Complete:**
- [ ] Monitoring dashboards live
- [ ] Alerting tested
- [ ] Metrics collected

**Prerequisites for Phase 6:**
- [ ] API documentation structure
- [ ] Storybook set up (optional)
- [ ] Accessibility testing tools

---

## 🎯 DEPENDENCY RISKS

### High-Risk Dependencies

**1. Steam API (External)**
- **Risk:** API changes, rate limits, downtime
- **Impact:** Critical - marketplace non-functional
- **Mitigation:** Abstraction layer, cache, fallbacks
- **Files:** `services/steamIntegrationService.js`, `routes/steam.js`

**2. MongoDB (External)**
- **Risk:** Connection issues, performance degradation
- **Impact:** High - slow queries, timeouts
- **Mitigation:** Connection pooling, indexes, caching
- **Files:** `models/*.js`, `app.js` (db connection)

**3. Redis (External) - Phase 2**
- **Risk:** Cache server downtime
- **Impact:** Medium - slower performance
- **Mitigation:** Cache fallback to MongoDB
- **Files:** `services/cacheService.js` (to be created)

### Medium-Risk Dependencies

**4. GitHub Actions (External)**
- **Risk:** CI/CD pipeline breaks
- **Impact:** Medium - deployment delays
- **Mitigation:** Manual deployment fallback
- **Files:** `.github/workflows/` (to be created)

**5. NPM Packages (Internal)**
- **Risk:** Vulnerabilities in dependencies
- **Impact:** Medium - security issues
- **Mitigation:** Regular updates, Snyk monitoring
- **Files:** `package.json`

### Low-Risk Dependencies

**6. Grafana (External)**
- **Risk:** Dashboard unavailable
- **Impact:** Low - manual monitoring
- **Mitigation:** Sentry + logs fallback
- **Files:** Monitoring configuration

---

## 🔍 ANALYSIS ARTIFACTS

### Codebase Metrics (Current)

**Backend:**
- Total Lines: 11,120
- Routes: 10 files
- Services: 12 files
- Models: 10 files
- Middleware: 6 files

**Frontend:**
- Components: 10+ files
- Pages: 5+ files
- Bundle Size: 1,158.61 kB (318.21 kB gzipped)
- Languages: 3 (EN, RU, KZ)

**Testing:**
- Test Files: 10
- Coverage: ~60% (estimated)
- E2E Tests: 0

### Performance Baseline (Current)

**API Response Times (Estimated):**
- GET /api/steam/inventory: 800ms
- GET /api/marketplace/listings: 400ms
- POST /api/trade/create: 1200ms
- WebSocket updates: 100ms

**Database Queries (Estimated):**
- User lookup: 50ms
- Inventory fetch: 200ms
- Marketplace search: 300ms

**Page Load Times (Current):**
- Initial page: 3.2s
- Marketplace: 2.8s
- Inventory: 2.5s

### Quality Metrics (Current)

**Test Coverage (Estimated):**
- Unit Tests: 60%
- Integration Tests: 30%
- E2E Tests: 0%
- **Overall: 45%**

**Security:**
- OWASP Compliance: 60%
- Critical Vulnerabilities: 5
- Dependencies Outdated: 20

**Code Quality:**
- ESLint Errors: 0
- TypeScript Migration: 0% (JS only)
- Documentation: 40%

---

## 🎓 KNOWLEDGE TRANSFER

### Required Team Knowledge

**Before Phase 1:**
- [ ] Jest testing patterns
- [ ] Playwright E2E testing
- [ ] MongoDB testing strategies
- [ ] Steam API mock services

**Before Phase 2:**
- [ ] Redis operations
- [ ] MongoDB indexing strategies
- [ ] Performance profiling tools
- [ ] Caching patterns (Cache-Aside, Write-Through)

**Before Phase 3:**
- [ ] OWASP Top 10
- [ ] Security audit tools (Snyk, SonarQube)
- [ ] JWT security best practices
- [ ] Input validation techniques

**Before Phase 4:**
- [ ] GitHub Actions
- [ ] Docker multi-stage builds
- [ ] Kubernetes basics
- [ ] Helm package manager

**Before Phase 5:**
- [ ] Prometheus metrics
- [ ] Grafana dashboards
- [ ] Alert management
- [ ] Log aggregation (ELK)

**Before Phase 6:**
- [ ] API documentation (Swagger)
- [ ] Technical writing
- [ ] Bundle optimization
- [ ] Accessibility (WCAG 2.1)

### Training Requirements

**Week 0 (Before Phase 1):**
- 2-day testing workshop (Jest + Playwright)
- 1-day performance testing (Artillery)
- 1-day Steam API integration deep-dive

**Between Phases:**
- Phase 1→2: 1-day Redis training
- Phase 2→3: 2-day security audit workshop
- Phase 3→4: 2-day DevOps training (K8s)
- Phase 4→5: 1-day monitoring setup
- Phase 5→6: 1-day documentation best practices

---

## 📦 RESOURCE ALLOCATION

### Team Allocation by Phase

| Phase | Tech Lead | Backend (2) | Frontend | DevOps | QA | Security |
|-------|-----------|-------------|----------|--------|----|---------||
| 1: Testing | 25% | 50% | 25% | 0% | 75% | 0% |
| 2: Architecture | 50% | 100% | 25% | 0% | 25% | 0% |
| 3: Security | 50% | 50% | 25% | 0% | 25% | 100% |
| 4: DevOps | 50% | 25% | 25% | 100% | 25% | 0% |
| 5: Monitoring | 25% | 50% | 25% | 75% | 25% | 0% |
| 6: Documentation | 50% | 25% | 75% | 25% | 25% | 0% |

**Total FTE (Full-Time Equivalent):**
- Tech Lead: 3.0 FTE-months
- Backend Devs: 4.0 FTE-months each (8.0 total)
- Frontend Dev: 2.5 FTE-months
- DevOps: 2.0 FTE-months
- QA: 3.0 FTE-months
- Security: 0.5 FTE-months

### Infrastructure Allocation

**Development:**
- Staging MongoDB: Dedicated instance
- Redis: 1GB RAM, 1 node
- Testing: MongoDB Memory Server
- CI/CD: GitHub Actions (free tier)

**Production:**
- MongoDB Cluster: 3 nodes, 8GB RAM each
- Redis Cluster: 3 nodes, 4GB RAM each
- Application Servers: 3 nodes, 4 CPU, 8GB RAM
- Load Balancer: 1 node, 2 CPU, 4GB RAM
- Monitoring: Separate 2GB RAM instance

**Estimated Monthly Costs:**
- Cloud Infrastructure: $2,000
- Monitoring: $100
- CDN: $50
- **Total: $2,150/month**

---

## 🔄 CHANGE MANAGEMENT

### Version Control Strategy

**Branching Model:**
```
main (production)
  ↑
staging (pre-production)
  ↑
develop (integration)
  ↑
feature/* (individual features)
```

**Release Process:**
1. Feature branch → develop
2. Develop → staging (auto-deploy)
3. Staging testing (QA)
4. Staging → main (manual approval)
5. Production deployment

**Rollback Strategy:**
- Git tags for each release
- Docker images tagged by version
- Database migration rollback scripts
- Feature flags for gradual rollout

### Documentation Updates

**Docs to Update During Implementation:**
- `README.md` - Update tech stack, architecture
- `DEPLOYMENT_GUIDE.md` - Update with K8s instructions
- `API.md` - Create from Swagger (Phase 6)
- `ARCHITECTURE.md` - Update decision records
- `RUNBOOK.md` - Create operational procedures

**Versioning:**
- Document version = Plan version (1.0, 1.1, etc.)
- Changelog in each document
- Last updated timestamp
- Author attribution

---

## 🎯 SUCCESS CRITERIA PER PHASE

### Phase 1 Success Criteria

**Quantitative:**
- Test coverage: 85%+ (measured by Jest)
- E2E tests: 30+ passing scenarios
- API tests: 25+ endpoint coverage
- Load test: 1000 concurrent users supported

**Qualitative:**
- Team confident in test suite
- CI pipeline triggers tests on PR
- Performance baseline documented
- No critical bugs in staging

### Phase 2 Success Criteria

**Quantitative:**
- API response time: <200ms (p95)
- DB query time: <100ms (p95)
- Cache hit rate: >80%
- Bundle size: <700 kB gzipped

**Qualitative:**
- Clean architecture implemented
- Services responsabilidades clear
- Circuit breakers working
- Performance degradation alerts set

### Phase 3 Success Criteria

**Quantitative:**
- OWASP compliance: 95%+
- Critical vulnerabilities: 0
- Security test coverage: 100%
- Auth flow: All scenarios tested

**Qualitative:**
- Security audit passed
- Team trained on security best practices
- Security incident response plan documented
- Penetration testing completed

### Phase 4 Success Criteria

**Quantitative:**
- CI pipeline: <10min build time
- Deployment time: <15min
- Deployment success: 99%+
- Zero-downtime deployments

**Qualitative:**
- Team can deploy independently
- Rollback tested and working
- K8s cluster stable
- Monitoring in place

### Phase 5 Success Criteria

**Quantitative:**
- Monitoring coverage: 95%+
- MTTD: <5min
- Alert response: <5min
- Dashboard uptime: 99.9%+

**Qualitative:**
- All critical metrics visible
- Team responds to alerts correctly
- Business metrics tracked
- Performance trends visible

### Phase 6 Success Criteria

**Quantitative:**
- Documentation: 100% complete
- Bundle size: <500 kB gzipped
- Accessibility score: WCAG AA
- User satisfaction: 4.5/5

**Qualitative:**
- Onboarding guide complete
- API documentation comprehensive
- Code examples up to date
- UX improvements validated

---

**Документ создан:** 2025-11-10
**Версия:** 1.0
**Связанный план:** project-improvement-plan.md
**Следующий review:** Weekly

---

*Этот документ содержит детальный контекст для выполнения плана улучшения проекта. Все решения должны быть документированы и обоснованы.*
