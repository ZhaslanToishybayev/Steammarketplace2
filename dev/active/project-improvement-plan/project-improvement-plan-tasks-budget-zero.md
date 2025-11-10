# ✅ ПЛАН УЛУЧШЕНИЯ - ЗАДАЧИ (БЕСПЛАТНО, 12 НЕДЕЛЬ)

**Версия:** 2.0 (Budget: $0)
**Дата:** 2025-11-10
**План:** project-improvement-plan-budget-zero.md

---

## 📊 PROGRESS TRACKING

### Общий прогресс
```
Total Tasks: 97 (89 основных + 8 migration)
Completed: 0
In Progress: 0
Pending: 97
Completion: 0%

Budget: $240-360/year (Vercel Pro → ps.kz)
Timeline: 12 weeks (вместо 18)
Migration: Week 11-12 (Vercel Pro → ps.kz)
```

### Прогресс по фазам
```
Phase 1 (Testing & QA, недели 1-3): 0/25 tasks (0%)
Phase 2 (Architecture, недели 4-5): 0/15 tasks (0%)
Phase 3 (Security, недели 6-7): 0/15 tasks (0%)
Phase 4 (DevOps, недели 8-9): 0/15 tasks (0%)
Phase 5 (Monitoring, неделя 10): 0/10 tasks (0%)
Phase 6 (Documentation, недели 11-12): 0/9 tasks (0%)
+ ps.kz Migration: 0/8 tasks (0%)
```

### Инструменты (все бесплатные)
```
✅ Уже установлено:
- jest, supertest, express, mongoose, passport
- helmet, cors, express-rate-limit
- winston, socket.io, dotenv

✅ Бесплатно - добавить:
- mongodb-memory-server (dev)
- nock (dev)
- @playwright/test (dev)
- artillery (dev)
- prom-client (dev)
```

---

## 🎯 PHASE 1: TESTING & QA (НЕДЕЛИ 1-3)

**Цель:** 80%+ test coverage, E2E tests
**Инструменты:** Jest, MongoDB Memory Server, Playwright, Artillery
**Бюджет:** $0

### Спринт 1.1 (Неделя 1): Unit & Integration Tests

**День 1-2 (Monday-Tuesday):**
- [ ] **Task 1.1.1:** Установить mongodb-memory-server
  - Owner: Backend Dev
  - Estimated: 1 час
  - Command: `npm install --save-dev mongodb-memory-server`
  - Acceptance: Tests могут использовать in-memory MongoDB
  - Files: `package.json`, `tests/setup.js`

- [ ] **Task 1.1.2:** Установить nock для HTTP mocking
  - Owner: Backend Dev
  - Estimated: 30 минут
  - Command: `npm install --save-dev nock`
  - Acceptance: Steam API запросы можно мокать
  - Files: `tests/mocks/steamApi.js`

- [ ] **Task 1.1.3:** Настроить test database connection
  - Owner: Backend Dev
  - Estimated: 2 часа
  - Dependencies: MongoDB Memory Server
  - Acceptance: Tests используют отдельную test DB
  - Files: `tests/setup.js`, `jest.config.js`

- [ ] **Task 1.1.4:** Создать Steam API mocks
  - Owner: QA Engineer
  - Estimated: 4 часа
  - Dependencies: Nock
  - Acceptance: Inventory, market data, trade endpoints замоканы
  - Files: `tests/mocks/steamApi.js`

**День 3-4 (Wednesday-Thursday):**
- [ ] **Task 1.1.5:** Написать тесты для auth middleware
  - Owner: Backend Dev
  - Estimated: 3 часа
  - Dependencies: Test setup
  - Acceptance: JWT validation протестирован
  - Files: `tests/unit/middleware/auth.test.js`

- [ ] **Task 1.1.6:** Написать тесты для rateLimitMiddleware
  - Owner: Backend Dev
  - Estimated: 2 часа
  - Dependencies: Test setup
  - Acceptance: Rate limiting логика протестирована
  - Files: `tests/unit/middleware/rateLimit.test.js`

- [ ] **Task 1.1.7:** Написать тесты для validation middleware
  - Owner: Backend Dev
  - Estimated: 2 часа
  - Dependencies: Joi (уже установлен)
  - Acceptance: Все validation схемы протестированы
  - Files: `tests/unit/middleware/validation.test.js`

**День 5 (Friday):**
- [ ] **Task 1.1.8:** Написать тесты для User model
  - Owner: QA Engineer
  - Estimated: 4 часа
  - Dependencies: MongoDB Memory Server
  - Acceptance: User CRUD, virtual fields протестированы
  - Files: `tests/unit/models/User.test.js`

- [ ] **Task 1.1.9:** Написать тесты для MarketListing model
  - Owner: QA Engineer
  - Estimated: 3 часа
  - Dependencies: MongoDB Memory Server
  - Acceptance: Listing operations протестированы
  - Files: `tests/unit/models/MarketListing.test.js`

- [ ] **Task 1.1.10:** Написать тесты для TradeOffer model
  - Owner: QA Engineer
  - Estimated: 3 часа
  - Dependencies: MongoDB Memory Server
  - Acceptance: Trade offer lifecycle протестирован
  - Files: `tests/unit/models/TradeOffer.test.js`

### Спринт 1.2 (Неделя 2): API Integration Tests

**День 1-2 (Monday-Tuesday):**
- [ ] **Task 1.2.1:** Написать тесты для auth API
  - Owner: QA Engineer
  - Estimated: 6 часов
  - Dependencies: Test user creation
  - Acceptance: Login, logout, JWT validation протестированы
  - Files: `tests/integration/auth.test.js`

- [ ] **Task 1.2.2:** Написать тесты для steam API
  - Owner: QA Engineer
  - Estimated: 8 часов
  - Dependencies: Steam API mocks
  - Acceptance: Inventory, market data протестированы
  - Files: `tests/integration/steam.test.js`

**День 3-4 (Wednesday-Thursday):**
- [ ] **Task 1.2.3:** Написать тесты для marketplace API
  - Owner: QA Engineer
  - Estimated: 6 часов
  - Dependencies: Test data setup
  - Acceptance: Listings, search, filters протестированы
  - Files: `tests/integration/marketplace.test.js`

- [ ] **Task 1.2.4:** Написать тесты для trade API
  - Owner: QA Engineer
  - Estimated: 8 часов
  - Dependencies: Steam bot mocks
  - Acceptance: Create, accept, cancel trades протестированы
  - Files: `tests/integration/trade.test.js`

**День 5 (Friday):**
- [ ] **Task 1.2.5:** Написать тесты для users API
  - Owner: QA Engineer
  - Estimated: 4 часа
  - Dependencies: Test user creation
  - Acceptance: Profile, inventory, settings протестированы
  - Files: `tests/integration/users.test.js`

- [ ] **Task 1.2.6:** Написать тесты для Socket.io
  - Owner: Backend Dev
  - Estimated: 4 часа
  - Dependencies: Socket.io client
  - Acceptance: Real-time events протестированы
  - Files: `tests/integration/socket.test.js`

- [ ] **Task 1.2.7:** Настроить coverage reporting
  - Owner: Backend Dev
  - Estimated: 2 часа
  - Dependencies: Jest config
  - Acceptance: Coverage report генерируется
  - Files: `jest.config.js`, coverage в `.gitignore`

### Спринт 1.3 (Неделя 3): E2E & Performance Tests

**День 1-2 (Monday-Tuesday):**
- [ ] **Task 1.3.1:** Установить Playwright
  - Owner: Tech Lead
  - Estimated: 1 час
  - Command: `npm install --save-dev @playwright/test`
  - Acceptance: Playwright + браузеры установлены
  - Files: `package.json`, `playwright.config.js`

- [ ] **Task 1.3.2:** Создать E2E test setup
  - Owner: Backend Dev
  - Estimated: 3 часа
  - Dependencies: Test servers
  - Acceptance: E2E environment настроен
  - Files: `tests/e2e/setup/`, `playwright.config.js`

- [ ] **Task 1.3.3:** E2E тест - login flow
  - Owner: QA Engineer
  - Estimated: 4 часа
  - Dependencies: E2E setup
  - Acceptance: Steam OAuth flow протестирован
  - Files: `tests/e2e/auth/login.spec.js`

- [ ] **Task 1.3.4:** E2E тест - marketplace browsing
  - Owner: QA Engineer
  - Estimated: 4 часа
  - Dependencies: E2E setup
  - Acceptance: Browse, filter, search протестированы
  - Files: `tests/e2e/marketplace/browse.spec.js`

**День 3-4 (Wednesday-Thursday):**
- [ ] **Task 1.3.5:** E2E тест - inventory display
  - Owner: QA Engineer
  - Estimated: 4 часа
  - Dependencies: Test user с items
  - Acceptance: Inventory loads, items отображаются
  - Files: `tests/e2e/inventory/display.spec.js`

- [ ] **Task 1.3.6:** E2E тест - trade creation
  - Owner: QA Engineer
  - Estimated: 6 часов
  - Dependencies: Steam bot mocks
  - Acceptance: Create trade offer протестирован
  - Files: `tests/e2e/trade/create.spec.js`

**День 5 (Friday):**
- [ ] **Task 1.3.7:** Установить Artillery
  - Owner: Tech Lead
  - Estimated: 30 минут
  - Command: `npm install --save-dev artillery`
  - Acceptance: Artillery установлен
  - Files: `package.json`, `artillery.yml`

- [ ] **Task 1.3.8:** Создать load test scenarios
  - Owner: QA Engineer
  - Estimated: 4 часа
  - Dependencies: Artillery
  - Acceptance: 5+ load test scenarios создано
  - Files: `tests/load/*.yml`

- [ ] **Task 1.3.9:** Запустить performance baseline
  - Owner: QA Engineer
  - Estimated: 3 часа
  - Dependencies: Load scenarios
  - Acceptance: Baseline метрики задокументированы
  - Reports: `tests/performance/baseline.md`

- [ ] **Task 1.3.10:** Phase 1 review
  - Owner: Tech Lead
  - Estimated: 2 часа
  - Dependencies: Все задачи выполнены
  - Acceptance: 80% coverage, E2E suite работает
  - Review: `docs/phase1-review.md`

### Неделя 1-3 итоги
- **25 задач** выполнено
- **80% test coverage** достигнуто
- **15+ E2E тестов** создано
- **Performance baseline** измерен

---

## 🏗️ PHASE 2: ARCHITECTURE & PERFORMANCE (НЕДЕЛИ 4-5)

**Цель:** Clean architecture, <300ms API
**Инструменты:** Node.js built-in, Redis (Docker), MongoDB profiler
**Бюджет:** $0

### Спринт 2.1 (Неделя 4): Architecture Refactoring

**День 1 (Monday):**
- [ ] **Task 2.1.1:** Дизайн repository layer
  - Owner: Tech Lead
  - Estimated: 4 часа
  - Dependencies: Architecture review
  - Acceptance: Repository interfaces спроектированы
  - Files: `repositories/interfaces/*.js`

- [ ] **Task 2.1.2:** Создать UserRepository
  - Owner: Backend Dev
  - Estimated: 4 часа
  - Dependencies: Repository layer
  - Acceptance: UserRepository с CRUD операциями
  - Files: `repositories/UserRepository.js`

**День 2 (Tuesday):**
- [ ] **Task 2.1.3:** Создать MarketListingRepository
  - Owner: Backend Dev
  - Estimated: 4 часа
  - Dependencies: Repository layer
  - Acceptance: MarketListingRepository с поиском
  - Files: `repositories/MarketListingRepository.js`

- [ ] **Task 2.1.4:** Создать TradeOfferRepository
  - Owner: Backend Dev
  - Estimated: 3 часа
  - Dependencies: Repository layer
  - Acceptance: TradeOfferRepository с фильтрацией
  - Files: `repositories/TradeOfferRepository.js`

**День 3 (Wednesday):**
- [ ] **Task 2.1.5:** Создать DTOs для API
  - Owner: Backend Dev
  - Estimated: 4 часа
  - Dependencies: None
  - Acceptance: DTOs для всех API requests/responses
  - Files: `dto/*.js`

- [ ] **Task 2.1.6:** Рефакторинг services (использовать repositories)
  - Owner: Backend Dev
  - Estimated: 6 часов
  - Dependencies: Repositories созданы
  - Acceptance: Services используют repositories
  - Files: `services/*.js` (обновлены)

**День 4-5 (Thursday-Friday):**
- [ ] **Task 2.1.7:** Очистка routes (убрать бизнес-логику)
  - Owner: Backend Dev
  - Estimated: 6 часов
  - Dependencies: Services рефактор
  - Acceptance: Routes содержат только HTTP логику
  - Files: `routes/*.js` (очищены)

- [ ] **Task 2.1.8:** Реализовать Circuit Breaker
  - Owner: Backend Dev
  - Estimated: 4 часа
  - Dependencies: None
  - Acceptance: Steam API защищен circuit breaker
  - Files: `utils/circuitBreaker.js`

### Спринт 2.2 (Неделя 5): Database & Caching

**День 1 (Monday):**
- [ ] **Task 2.2.1:** Запустить Redis локально (Docker)
  - Owner: Backend Dev
  - Estimated: 1 час
  - Command: `docker run -d -p 6379:6379 --name redis redis:alpine`
  - Acceptance: Redis доступен на localhost:6379
  - Files: Docker, Redis config

- [ ] **Task 2.2.2:** Проанализировать медленные запросы
  - Owner: Backend Dev
  - Estimated: 4 часа
  - Dependencies: MongoDB profiler
  - Acceptance: Top 10 slow queries идентифицированы
  - Reports: `docs/db-slow-queries.md`

**День 2 (Tuesday):**
- [ ] **Task 2.2.3:** Создать compound indexes
  - Owner: Backend Dev
  - Estimated: 6 часов
  - Dependencies: Query analysis
  - Acceptance: Indexes на частые поля
  - Files: `models/*.js` (index definitions)

- [ ] **Task 2.2.4:** Оптимизировать aggregation pipelines
  - Owner: Backend Dev
  - Estimated: 4 часа
  - Dependencies: Database profiler
  - Acceptance: Aggregations оптимизированы
  - Files: `repositories/*Repository.js`

**День 3 (Wednesday):**
- [ ] **Task 2.2.5:** Создать cache service
  - Owner: Backend Dev
  - Estimated: 4 часа
  - Dependencies: Redis setup
  - Acceptance: CacheService с get/set/delete
  - Files: `services/cacheService.js`

- [ ] **Task 2.2.6:** Кэшировать Steam inventory
  - Owner: Backend Dev
  - Estimated: 4 часа
  - Dependencies: CacheService
  - Acceptance: Steam inventory кэшируется 5 минут
  - Files: `services/steamIntegrationService.js`

**День 4-5 (Thursday-Friday):**
- [ ] **Task 2.2.7:** Кэшировать marketplace listings
  - Owner: Backend Dev
  - Estimated: 3 часа
  - Dependencies: CacheService
  - Acceptance: Marketplace search кэшируется
  - Files: `repositories/MarketListingRepository.js`

- [ ] **Task 2.2.8:** Кэшировать user sessions
  - Owner: Backend Dev
  - Estimated: 3 часа
  - Dependencies: CacheService
  - Acceptance: User sessions кэшируются
  - Files: `middleware/auth.js`

- [ ] **Task 2.2.9:** Тестировать производительность
  - Owner: QA Engineer
  - Estimated: 4 часа
  - Dependencies: Cache implementation
  - Acceptance: 70%+ cache hit rate
  - Tests: `tests/performance/cache.yml`

- [ ] **Task 2.2.10:** Phase 2 review
  - Owner: Tech Lead
  - Estimated: 2 часа
  - Dependencies: Все задачи выполнены
  - Acceptance: API <300ms, cache hit 70%+
  - Review: `docs/phase2-review.md`

### Неделя 4-5 итоги
- **15 задач** выполнено
- **Clean architecture** реализована
- **API <300ms** достигнуто
- **70%+ cache hit rate**

---

## 🔒 PHASE 3: SECURITY & AUDIT (НЕДЕЛИ 6-7)

**Цель:** OWASP 90%+, 0 critical vulnerabilities
**Инструменты:** npm audit, SonarQube CE, OWASP ZAP, Helmet
**Бюджет:** $0

### Спринт 3.1 (Неделя 6): Security Audit

**День 1 (Monday):**
- [ ] **Task 3.1.1:** Запустить npm audit
  - Owner: Backend Dev
  - Estimated: 1 час
  - Command: `npm audit`
  - Acceptance: All vulnerabilities identified
  - Reports: `docs/security/dependency-audit.md`

- [ ] **Task 3.1.2:** Исправить критические уязвимости
  - Owner: Backend Dev
  - Estimated: 4 часа
  - Dependencies: npm audit results
  - Acceptance: Critical vulnerabilities patched
  - Command: `npm audit fix`

**День 2 (Tuesday):**
- [ ] **Task 3.1.3:** Установить SonarQube локально
  - Owner: Backend Dev
  - Estimated: 2 часа
  - Command: `docker run -d -p 9000:9000 sonarqube`
  - Acceptance: SonarQube доступен на localhost:9000
  - Files: SonarQube config

- [ ] **Task 3.1.4:** Интегрировать SonarQube
  - Owner: Backend Dev
  - Estimated: 4 часа
  - Dependencies: SonarQube running
  - Acceptance: Code quality scanned
  - Files: `sonar-project.properties`

**День 3 (Wednesday):**
- [ ] **Task 3.1.5:** OWASP Top 10 assessment
  - Owner: Tech Lead
  - Estimated: 6 часов
  - Dependencies: Code review
  - Acceptance: OWASP checklist completed
  - Reports: `docs/security/owasp-assessment.md`

- [ ] **Task 3.1.6:** Проверить Steam API key security
  - Owner: Tech Lead
  - Estimated: 2 часа
  - Dependencies: Environment configs
  - Acceptance: API keys secured, no hardcoded
  - Review: `docs/security/api-key-review.md`

**День 4-5 (Thursday-Friday):**
- [ ] **Task 3.1.7:** Проверить authentication flow
  - Owner: Backend Dev
  - Estimated: 4 часа
  - Dependencies: Auth code review
  - Acceptance: Auth flow secure, no bypasses
  - Review: `docs/security/auth-review.md`

- [ ] **Task 3.1.8:** Проверить input validation
  - Owner: Backend Dev
  - Estimated: 4 часа
  - Dependencies: Joi validation
  - Acceptance: All inputs validated
  - Review: `docs/security/validation-audit.md`

- [ ] **Task 3.1.9:** Настроить security headers
  - Owner: Backend Dev
  - Estimated: 3 часа
  - Dependencies: Helmet (уже установлен)
  - Acceptance: CSP, HSTS, X-Frame-Options set
  - Files: `app.js` (helmet config enhanced)

- [ ] **Task 3.1.10:** Security review Week 6
  - Owner: Tech Lead
  - Estimated: 2 часа
  - Dependencies: All tasks complete
  - Acceptance: Security audit completed
  - Review: `docs/security/week6-review.md`

### Спринт 3.2 (Неделя 7): Authentication & Protection

**День 1 (Monday):**
- [ ] **Task 3.2.1:** Реализовать JWT token rotation
  - Owner: Backend Dev
  - Estimated: 4 часа
  - Dependencies: Auth review
  - Acceptance: Access token 15min, refresh 7 days
  - Files: `middleware/auth.js`

- [ ] **Task 3.2.2:** Добавить refresh token storage
  - Owner: Backend Dev
  - Estimated: 3 часа
  - Dependencies: User model
  - Acceptance: Refresh tokens in DB
  - Files: `models/User.js` (refresh token)

**День 2 (Tuesday):**
- [ ] **Task 3.2.3:** Harden Steam OAuth
  - Owner: Backend Dev
  - Estimated: 4 часа
  - Dependencies: Passport config
  - Acceptance: OAuth secure, state validated
  - Files: `routes/auth.js`

- [ ] **Task 3.2.4:** Реализовать RBAC (basic)
  - Owner: Backend Dev
  - Estimated: 4 часа
  - Dependencies: User model
  - Acceptance: User/admin roles
  - Files: `middleware/rbac.js`

**День 3 (Wednesday):**
- [ ] **Task 3.2.5:** Comprehensive validation schemas
  - Owner: Backend Dev
  - Estimated: 6 часов
  - Dependencies: Joi
  - Acceptance: All API inputs validated
  - Files: `validations/*.js`

- [ ] **Task 3.2.6:** XSS protection
  - Owner: Backend Dev
  - Estimated: 3 часа
  - Dependencies: Input sanitization
  - Acceptance: All input sanitized
  - Files: `middleware/sanitization.js`

**День 4-5 (Thursday-Friday):**
- [ ] **Task 3.2.7:** CSRF protection
  - Owner: Backend Dev
  - Estimated: 4 часа
  - Dependencies: csurf library
  - Acceptance: CSRF tokens on state-changing requests
  - Files: `middleware/csrf.js`

- [ ] **Task 3.2.8:** Rate limiting per user
  - Owner: Backend Dev
  - Estimated: 4 часа
  - Dependencies: express-rate-limit
  - Acceptance: Per-user rate limits
  - Files: `middleware/rateLimitMiddleware.js`

- [ ] **Task 3.2.9:** Pen test с OWASP ZAP
  - Owner: Tech Lead
  - Estimated: 4 часа
  - Dependencies: OWASP ZAP installed
  - Acceptance: Basic pen test completed
  - Reports: `docs/security/pentest-summary.md`

- [ ] **Task 3.2.10:** Phase 3 review
  - Owner: Tech Lead
  - Estimated: 2 часа
  - Dependencies: All tasks complete
  - Acceptance: OWASP 90%+, 0 critical
  - Review: `docs/phase3-review.md`

### Неделя 6-7 итоги
- **15 задач** выполнено
- **OWASP 90%+** достигнуто
- **0 critical vulnerabilities**
- **Security audit** пройден

---

## 🚀 PHASE 4: DEVOPS & CI/CD (НЕДЕЛИ 8-9)

**Цель:** Automated CI/CD pipeline
**Инструменты:** GitHub Actions, Docker, GitHub Container Registry
**Бюджет:** $0

### Спринт 4.1 (Неделя 8): CI Pipeline

**День 1 (Monday):**
- [ ] **Task 4.1.1:** Создать GitHub Actions workflow
  - Owner: DevOps Engineer
  - Estimated: 3 часа
  - Dependencies: GitHub repo access
  - Acceptance: CI workflow файл создан
  - Files: `.github/workflows/ci.yml`

- [ ] **Task 4.1.2:** Добавить automated testing
  - Owner: DevOps Engineer
  - Estimated: 2 часа
  - Dependencies: CI workflow
  - Acceptance: Tests run on every PR
  - Files: `.github/workflows/ci.yml` (test job)

**День 2 (Tuesday):**
- [ ] **Task 4.1.3:** Добавить code quality checks
  - Owner: DevOps Engineer
  - Estimated: 3 часа
  - Dependencies: ESLint, Prettier
  - Acceptance: Linter checks pass
  - Files: `.github/workflows/ci.yml` (lint job)

- [ ] **Task 4.1.4:** Интегрировать SonarQube
  - Owner: DevOps Engineer
  - Estimated: 4 часа
  - Dependencies: SonarQube local
  - Acceptance: Code quality в PR
  - Files: `.github/workflows/ci.yml` (sonar job)

**День 3 (Wednesday):**
- [ ] **Task 4.1.5:** Добавить test coverage gate
  - Owner: DevOps Engineer
  - Estimated: 2 часа
  - Dependencies: Jest coverage
  - Acceptance: <80% coverage fails build
  - Files: `.github/workflows/test-coverage.yml`

- [ ] **Task 4.1.6:** Добавить security scan
  - Owner: DevOps Engineer
  - Estimated: 2 часа
  - Dependencies: npm audit
  - Acceptance: Security check в CI
  - Files: `.github/workflows/security.yml`

**День 4-5 (Thursday-Friday):**
- [ ] **Task 4.1.7:** Настроить build caching
  - Owner: DevOps Engineer
  - Estimated: 2 часа
  - Dependencies: CI workflow
  - Acceptance: Build cache ускоряет CI
  - Config: `.github/workflows/cache-config.yml`

- [ ] **Task 4.1.8:** Добавить PR templates
  - Owner: Tech Lead
  - Estimated: 1 час
  - Dependencies: None
  - Acceptance: PR template с checklist
  - Files: `.github/pull_request_template.md`

- [ ] **Task 4.1.9:** Добавить CODEOWNERS
  - Owner: Tech Lead
  - Estimated: 1 час
  - Dependencies: Team structure
  - Acceptance: Code owners assigned
  - Files: `.github/CODEOWNERS`

- [ ] **Task 4.1.10:** Тестировать CI pipeline
  - Owner: DevOps Engineer
  - Estimated: 2 часа
  - Dependencies: All CI configs
  - Acceptance: Full pipeline работает
  - Tests: Create test PR

### Спринт 4.2 (Неделя 9): CD Pipeline & Docker

**День 1 (Monday):**
- [ ] **Task 4.2.1:** Создать multi-stage Dockerfile
  - Owner: DevOps Engineer
  - Estimated: 3 часа
  - Dependencies: Docker
  - Acceptance: Production-optimized build
  - Files: `Dockerfile`, `Dockerfile.prod`

- [ ] **Task 4.2.2:** Настроить GitHub Container Registry
  - Owner: DevOps Engineer
  - Estimated: 2 часа
  - Dependencies: Docker
  - Acceptance: Images push to GHCR
  - Files: `.github/workflows/docker.yml`

**День 2 (Tuesday):**
- [ ] **Task 4.2.3:** Создать auto-deploy workflow
  - Owner: DevOps Engineer
  - Estimated: 4 часа
  - Dependencies: Docker images
  - Acceptance: Auto deploy on main branch
  - Files: `.github/workflows/deploy.yml`

- [ ] **Task 4.2.4:** Создать staging environment (local)
  - Owner: DevOps Engineer
  - Estimated: 4 часа
  - Dependencies: Docker Compose
  - Acceptance: Staging environment accessible
  - Files: `docker-compose.staging.yml`

**День 3 (Wednesday):**
- [ ] **Task 4.2.5:** Создать health check endpoints
  - Owner: Backend Dev
  - Estimated: 2 часа
  - Dependencies: None
  - Acceptance: /healthz, /readyz endpoints
  - Files: `routes/health.js`

- [ ] **Task 4.2.6:** Добавить smoke tests
  - Owner: DevOps Engineer
  - Estimated: 3 часа
  - Dependencies: Staging env
  - Acceptance: Smoke tests после deploy
  - Files: `tests/smoke/`

**День 4-5 (Thursday-Friday):**
- [ ] **Task 4.2.7:** Создать rollback mechanism
  - Owner: DevOps Engineer
  - Estimated: 4 часа
  - Dependencies: Deploy process
  - Acceptance: One-click rollback
  - Files: `.github/workflows/rollback.yml`

- [ ] **Task 4.2.8:** Настроить environment variables
  - Owner: DevOps Engineer
  - Estimated: 3 часа
  - Dependencies: Secrets management
  - Acceptance: Secrets in GitHub Actions
  - Files: `.github/workflows/secrets.yml`

- [ ] **Task 4.2.9:** Тестировать CD pipeline
  - Owner: DevOps Engineer
  - Estimated: 4 часа
  - Dependencies: All configs
  - Acceptance: Full CD tested
  - Tests: Deploy test application

- [ ] **Task 4.2.10:** Phase 4 review
  - Owner: DevOps Engineer
  - Estimated: 2 часа
  - Dependencies: All tasks complete
  - Acceptance: CI/CD работает
  - Review: `docs/phase4-review.md`

### Неделя 8-9 итоги
- **15 задач** выполнено
- **CI pipeline** работает
- **CD pipeline** работает
- **Docker** настроен

---

## 📊 PHASE 5: MONITORING & ANALYTICS (НЕДЕЛЯ 10)

**Цель:** Full observability
**Инструменты:** Prometheus, Grafana, Alertmanager, Winston
**Бюджет:** $0

### Спринт 5.1 (Неделя 10): Monitoring Setup

**День 1 (Monday):**
- [ ] **Task 5.1.1:** Установить Prometheus локально
  - Owner: DevOps Engineer
  - Estimated: 1 час
  - Command: `docker run -d -p 9090:9090 prom/prometheus`
  - Acceptance: Prometheus доступен
  - Files: Prometheus config

- [ ] **Task 5.1.2:** Добавить prom-client
  - Owner: Backend Dev
  - Estimated: 1 час
  - Command: `npm install --save prom-client`
  - Acceptance: prom-client установлен
  - Files: `package.json`

**День 2 (Tuesday):**
- [ ] **Task 5.1.3:** Добавить custom metrics
  - Owner: Backend Dev
  - Estimated: 4 часа
  - Dependencies: prom-client
  - Acceptance: Business metrics tracked
  - Files: `metrics/business.js`

- [ ] **Task 5.1.4:** Добавить technical metrics
  - Owner: Backend Dev
  - Estimated: 3 часа
  - Dependencies: prom-client
  - Acceptance: Response time, errors tracked
  - Files: `metrics/technical.js`

**День 3 (Wednesday):**
- [ ] **Task 5.1.5:** Установить Grafana локально
  - Owner: DevOps Engineer
  - Estimated: 1 час
  - Command: `docker run -d -p 3000:3000 grafana/grafana`
  - Acceptance: Grafana доступен
  - Files: Grafana config

- [ ] **Task 5.1.6:** Создать Grafana dashboards
  - Owner: DevOps Engineer
  - Estimated: 6 часов
  - Dependencies: Prometheus
  - Acceptance: 3+ dashboards создано
  - Files: `grafana/dashboards/`

**День 4 (Thursday):**
- [ ] **Task 5.1.7:** Настроить Alertmanager
  - Owner: DevOps Engineer
  - Estimated: 3 часа
  - Dependencies: Prometheus
  - Acceptance: Alert rules созданы
  - Files: `monitoring/alerts.yml`

- [ ] **Task 5.1.8:** Настроить Winston logging
  - Owner: Backend Dev
  - Estimated: 3 часа
  - Dependencies: Winston (уже установлен)
  - Acceptance: Structured JSON logs
  - Files: `utils/logger.js` (enhanced)

**День 5 (Friday):**
- [ ] **Task 5.1.9:** Настроить Slack alerts (free)
  - Owner: DevOps Engineer
  - Estimated: 2 часа
  - Dependencies: Slack workspace
  - Acceptance: Alerts в Slack канал
  - Files: `monitoring/slack-config.yml`

- [ ] **Task 5.1.10:** Phase 5 review
  - Owner: DevOps Engineer
  - Estimated: 2 часа
  - Dependencies: All tasks complete
  - Acceptance: Monitoring работает
  - Review: `docs/phase5-review.md`

### Неделя 10 итоги
- **10 задач** выполнено
- **Prometheus** настроен
- **Grafana dashboards** созданы
- **Alerting** работает

---

## 📚 PHASE 6: DOCUMENTATION & UX (НЕДЕЛИ 11-12)

**Цель:** 100% документации, <250kB bundle
**Инструменты:** Swagger UI, Docusaurus, Lighthouse, axe-core
**Бюджет:** $0

### Спринт 6.1 (Неделя 11): Documentation

**День 1-2 (Monday-Tuesday):**
- [ ] **Task 6.1.1:** Настроить Swagger/OpenAPI
  - Owner: Backend Dev
  - Estimated: 4 часа
  - Dependencies: swagger-ui-express (уже установлен)
  - Acceptance: Interactive API docs
  - Files: `docs/api/openapi.yaml`

- [ ] **Task 6.1.2:** Документировать API endpoints
  - Owner: Backend Dev
  - Estimated: 8 часов
  - Dependencies: OpenAPI setup
  - Acceptance: All endpoints документированы
  - Files: `docs/api/`

**День 3-4 (Wednesday-Thursday):**
- [ ] **Task 6.1.3:** Создать ADRs
  - Owner: Tech Lead
  - Estimated: 6 часов
  - Dependencies: Architecture decisions
  - Acceptance: 5+ ADRs создано
  - Files: `docs/architecture/adr/`

- [ ] **Task 6.1.4:** Написать onboarding guide
  - Owner: Tech Lead
  - Estimated: 4 часа
  - Dependencies: None
  - Acceptance: New dev can onboard in 1 day
  - Files: `docs/onboarding/`

- [ ] **Task 6.1.5:** Создать deployment guide
  - Owner: DevOps Engineer
  - Estimated: 3 часа
  - Dependencies: CI/CD complete
  - Acceptance: Step-by-step deployment
  - Files: `docs/deployment/`

**День 5 (Friday):**
- [ ] **Task 6.1.6:** Создать troubleshooting guide
  - Owner: Tech Lead
  - Estimated: 4 часа
  - Dependencies: Production experience
  - Acceptance: Common issues документированы
  - Files: `docs/troubleshooting/`

### Спринт 6.2 (Неделя 12): Frontend & UX

**День 1-2 (Monday-Tuesday):**
- [ ] **Task 6.2.1:** Code splitting
  - Owner: Frontend Dev
  - Estimated: 4 часа
  - Dependencies: React.lazy
  - Acceptance: Routes lazy-loaded
  - Files: `frontend/src/pages/*` (lazy imports)

- [ ] **Task 6.2.2:** Bundle optimization
  - Owner: Frontend Dev
  - Estimated: 6 часов
  - Dependencies: Vite analyzer
  - Acceptance: Bundle <250 kB gzipped
  - Files: `vite.config.js`, `rollup-plugin-visualizer`

**День 3-4 (Wednesday-Thursday):**
- [ ] **Task 6.2.3:** Accessibility audit
  - Owner: Frontend Dev
  - Estimated: 4 часа
  - Dependencies: axe-core
  - Acceptance: WCAG AA checked
  - Reports: `docs/a11y/audit.md`

- [ ] **Task 6.2.4:** Добавить ARIA labels
  - Owner: Frontend Dev
  - Estimated: 4 часа
  - Dependencies: A11y audit
  - Acceptance: All interactive elements have ARIA
  - Files: All components (ARIA attributes)

- [ ] **Task 6.2.5:** Keyboard navigation
  - Owner: Frontend Dev
  - Estimated: 4 часа
  - Dependencies: None
  - Acceptance: All features keyboard accessible
  - Files: `frontend/src/utils/keyboardNav.js`

**День 5 (Friday):**
- [ ] **Task 6.2.6:** Lighthouse audit
  - Owner: Frontend Dev
  - Estimated: 3 часа
  - Dependencies: Chrome DevTools
  - Acceptance: Performance >90, Accessibility >90
  - Reports: `docs/performance/lighthouse.md`

- [ ] **Task 6.2.7:** Service Worker
  - Owner: Frontend Dev
  - Estimated: 4 часа
  - Dependencies: HTTPS
  - Acceptance: Offline caching
  - Files: `public/sw.js`

- [ ] **Task 6.2.8:** User testing (internal)
  - Owner: Tech Lead
  - Estimated: 3 часа
  - Dependencies: Team members
  - Acceptance: 5+ users протестировали
  - Reports: `docs/ux/user-testing.md`

- [ ] **Task 6.2.9:** Create CHANGELOG
  - Owner: Tech Lead
  - Estimated: 2 часа
  - Dependencies: Git history
  - Acceptance: Versioned changelog
  - Files: `CHANGELOG.md`

- [ ] **Task 6.2.10:** Phase 6 review
  - Owner: Tech Lead
  - Estimated: 2 часа
  - Dependencies: All tasks complete
  - Acceptance: 100% docs, <250 kB bundle
  - Review: `docs/phase6-review.md`

### Неделя 11-12 итоги
- **9 задач** выполнено
- **100% документация**
- **Bundle <250 kB**
- **WCAG AA compliance**
- **✅ ps.kz migration complete**

### ⚠️ BONUS: ps.kz Migration Tasks (Week 11-12)

**Дополнительные задачи для миграции:**

#### Week 11: Migration Preparation
- [ ] **Task 6.M.1:** Документировать Vercel Pro настройку
  - Owner: DevOps Engineer
  - Estimated: 4 часа
  - Acceptance: Полная документация Vercel setup
  - Files: `docs/vercel-current-state.md`

- [ ] **Task 6.M.2:** Contact ps.kz и получить детали
  - Owner: Tech Lead
  - Estimated: 2 часа
  - Acceptance: Тарифы, возможности поняты
  - Reports: `docs/pskz-analysis.md`

- [ ] **Task 6.M.3:** Создать план миграции
  - Owner: Tech Lead
  - Estimated: 4 часа
  - Acceptance: Пошаговый план
  - Files: `docs/migration-plan.md`

- [ ] **Task 6.M.4:** Настроить staging на ps.kz
  - Owner: DevOps Engineer
  - Estimated: 8 часов
  - Acceptance: Staging работает на ps.kz
  - Config: `pskz/staging/`

#### Week 12: Migration Execution
- [ ] **Task 6.M.5:** Настроить dual deployment
  - Owner: DevOps Engineer
  - Estimated: 6 часов
  - Acceptance: Оба platform active
  - Files: `deployment/blue-green.sh`

- [ ] **Task 6.M.6:** Performance testing
  - Owner: QA Engineer
  - Estimated: 6 часов
  - Acceptance: Performance report для обеих платформ
  - Reports: `docs/performance-comparison.md`

- [ ] **Task 6.M.7:** Traffic migration (10% → 50% → 100%)
  - Owner: DevOps Engineer
  - Estimated: 4 часа
  - Acceptance: 100% users на ps.kz
  - Config: `nginx/load-balancer.conf`

- [ ] **Task 6.M.8:** Close Vercel Pro (опционально)
  - Owner: Tech Lead
  - Estimated: 1 час
  - Acceptance: Vercel Pro отключен, экономия $20/месяц
  - Action: Cancel subscription

**Total Migration Tasks: 8**
**Migration Duration: 2 недели**
**Reference:** `deployment-strategy-vercel-pskz.md`

---

## ✅ COMPLETION CHECKLIST

### Все фазы завершены
- [ ] Phase 1: Testing & QA (0/25 tasks)
- [ ] Phase 2: Architecture & Performance (0/15 tasks)
- [ ] Phase 3: Security & Audit (0/15 tasks)
- [ ] Phase 4: DevOps & CI/CD (0/15 tasks)
- [ ] Phase 5: Monitoring & Analytics (0/10 tasks)
- [ ] Phase 6: Documentation & UX (0/9 tasks)

### Финальные результаты
- [ ] Test coverage >80%
- [ ] API response <300ms (p95)
- [ ] Database query <150ms (p95)
- [ ] Bundle size <250 kB gzipped
- [ ] Cache hit rate >70%
- [ ] OWASP compliance >90%
- [ ] Zero critical vulnerabilities
- [ ] CI/CD pipeline working
- [ ] Monitoring dashboards live
- [ ] API documentation complete
- [ ] WCAG AA compliance

### Бюджет
- [ ] $0 потрачено
- [ ] Все инструменты бесплатные
- [ ] No SaaS subscriptions
- [ ] No license costs

---

## 📅 DAILY TRACKING

### Неделя 1 (Phase 1 Start)
```
Monday:    Tasks 1.1.1, 1.1.2, 1.1.3
Tuesday:   Task 1.1.4
Wednesday: Tasks 1.1.5, 1.1.6
Thursday:  Task 1.1.7
Friday:    Tasks 1.1.8, 1.1.9, 1.1.10
```

### Weekly Review Format (Friday afternoon)
```
1. What was completed this week?
2. What were the blockers?
3. Did we meet our sprint goals?
4. What needs to be carried over?
5. Plan for next week
```

### Tools to Install (Week 0)
```bash
# Development dependencies
npm install --save-dev \
  mongodb-memory-server \
  nock \
  @playwright/test \
  artillery \
  prom-client
```

---

**Документ создан:** 2025-11-10
**Версия:** 2.0 (Budget: $0)
**План:** project-improvement-plan-budget-zero.md
**Обновление:** Weekly (Fridays)

---

*Этот чек-лист полностью бесплатный и использует только open-source инструменты. 89 задач за 12 недель = ~7 задач в неделю = очень выполнимо! 🚀*
