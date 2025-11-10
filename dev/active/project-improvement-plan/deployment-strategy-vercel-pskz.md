# 🚀 СТРАТЕГИЯ DEPLOYMENT: VERCEL PRO → PS.KZ

**Версия:** 1.0
**Дата:** 2025-11-10
**Current:** Vercel Pro
**Target:** ps.kz
**Автор:** Claude Code Strategic Planning

---

## 📊 CURRENT STATE: VERCEL PRO

### Преимущества Vercel Pro
- ✅ **100GB bandwidth/month** (достаточно для marketplace)
- ✅ **Edge Network** - быстрое глобальное распределение
- ✅ **Serverless Functions** - автоматическое масштабирование
- ✅ **GitHub Integration** - seamless CI/CD
- ✅ **Analytics** - built-in performance metrics
- ✅ **Preview Deployments** - для каждого PR
- ✅ **Custom Domains** - поддержка вашего домена
- ✅ **Zero Configuration** - минимальная настройка

### Ограничения Vercel Pro
- ⚠️ **Serverless Cold Starts** - первые запросы медленнее
- ⚠️ **Execution Timeout** - функции ограничены по времени
- ⚠️ **Vendor Lock-in** - зависимость от Vercel
- ⚠️ **Region Limitations** - не все регионы доступны
- ⚠️ **$20/month** - платная подписка
- ⚠️ **Not in Kazakhstan** - сервера не в Казахстане

---

## 🎯 FUTURE STATE: PS.KZ

### Преимущества ps.kz
- ✅ **Казахстанский хостинг** - близко к пользователям
- ✅ **Полный контроль** - собственные сервера
- ✅ **Собственная инфраструктура** - не зависим от vendor
- ✅ **Кастомизация** - любая конфигурация
- ✅ **Потенциальная экономия** - возможно дешевле Vercel Pro
- ✅ **Соответствие требованиям** - local data residency
- ✅ **Выделенные ресурсы** - предсказуемая производительность
- ✅ **Support на русском** - local support

### Требования к переходу
- ⚠️ **Собственная DevOps** - настройка CI/CD
- ⚠️ **Мониторинг** - самостоятельная настройка
- ⚠️ **Backup & Recovery** - собственная стратегия
- ⚠️ **Security** - настройка firewall, SSL
- ⚠️ **Load Balancer** - для high availability
- ⚠️ **Scaling** - ручное или автоматическое
- ⚠️ **DNS Management** - настройка доменов

---

## 📅 MIGRATION ROADMAP

### Phase 0: Preparation (Неделя 0)
**Цель:** Подготовиться к миграции

#### День 1-2: Infrastructure Assessment
- [ ] **Task 0.1:** Документировать текущую Vercel настройку
  - Owner: DevOps Engineer
  - Estimated: 4 часа
  - Acceptance: Полная документация Vercel setup
  - Files: `docs/vercel-current-state.md`

- [ ] **Task 0.2:** Изучить ps.kz offerings
  - Owner: Tech Lead
  - Estimated: 6 часов
  - Acceptance: Понимание тарифов, возможностей
  - Reports: `docs/pskz-analysis.md`

- [ ] **Task 0.3:** Создать план миграции
  - Owner: Tech Lead
  - Estimated: 4 часа
  - Acceptance: Пошаговый план миграции
  - Files: `docs/migration-plan.md`

#### День 3-5: Setup параллельной инфраструктуры
- [ ] **Task 0.4:** Настроить staging на ps.kz
  - Owner: DevOps Engineer
  - Estimated: 8 часов
  - Dependencies: ps.kz account
  - Acceptance: Staging работает на ps.kz
  - Config: `pskz/staging/`

- [ ] **Task 0.5:** Настроить CI/CD для ps.kz
  - Owner: DevOps Engineer
  - Estimated: 6 часов
  - Dependencies: Staging setup
  - Acceptance: Auto-deploy на ps.kz
  - Files: `.github/workflows/deploy-pskz.yml`

- [ ] **Task 0.6:** Настроить мониторинг
  - Owner: DevOps Engineer
  - Estimated: 4 часа
  - Dependencies: ps.kz infrastructure
  - Acceptance: Monitoring работает
  - Config: `pskz/monitoring/`

### Phase 1: Dual Deployment (Неделя 11)
**Цель:** Держать обе платформы active

#### День 1-3: Параллельные деплои
- [ ] **Task 1.1:** Настроить blue-green deployment
  - Owner: DevOps Engineer
  - Estimated: 8 часов
  - Dependencies: CI/CD для обеих платформ
  - Acceptance: Можно переключаться между Vercel и ps.kz
  - Files: `deployment/blue-green.sh`

- [ ] **Task 1.2:** Сравнить производительность
  - Owner: QA Engineer
  - Estimated: 6 часов
  - Dependencies: Оба deployment active
  - Acceptance: Performance report для обеих платформ
  - Reports: `docs/performance-comparison.md`

- [ ] **Task 1.3:** Настроить load balancing
  - Owner: DevOps Engineer
  - Estimated: 4 часа
  - Dependencies: DNS control
  - Acceptance: 50/50 трафик на обе платформы
  - Config: `nginx/load-balancer.conf`

#### День 4-5: Testing & Validation
- [ ] **Task 1.4:** Провести E2E тесты на ps.kz
  - Owner: QA Engineer
  - Estimated: 6 часов
  - Dependencies: ps.kz staging
  - Acceptance: Все E2E тесты проходят
  - Tests: `tests/e2e/pskz/`

- [ ] **Task 1.5:** Мониторинг обеих платформ
  - Owner: DevOps Engineer
  - Estimated: 4 часа
  - Dependencies: Monitoring setup
  - Acceptance: Дашборды для обеих платформ
  - Config: `monitoring/platforms/`

### Phase 2: Gradual Migration (Неделя 12)
**Цель:** Плавно перевести трафик

#### День 1-2: Traffic Shifting
- [ ] **Task 2.1:** 10% трафика на ps.kz
  - Owner: DevOps Engineer
  - Estimated: 2 часа
  - Dependencies: Load balancer
  - Acceptance: 10% пользователей на ps.kz
  - Config: `nginx/upstream-pskz权重=1`

- [ ] **Task 2.2:** Мониторинг performance
  - Owner: DevOps Engineer
  - Estimated: 4 часа
  - Dependencies: Traffic shifted
  - Acceptance: Метрики collected для ps.kz
  - Dashboard: Grafana ps.kz metrics

#### День 3-4: Scale up
- [ ] **Task 2.3:** 50% трафика на ps.kz
  - Owner: DevOps Engineer
  - Estimated: 2 часа
  - Dependencies: 10% работает稳定
  - Acceptance: 50% пользователей на ps.kz
  - Config: `nginx/upstream-pskz权重=5`

- [ ] **Task 2.4:** 100% трафика на ps.kz
  - Owner: DevOps Engineer
  - Estimated: 2 часа
  - Dependencies: 50% работает稳定
  - Acceptance: 100% пользователей на ps.kz
  - Config: `nginx/upstream-vercel权重=0`

### Phase 3: Optimization (Post-Migration)
**Цель:** Оптимизировать под ps.kz

#### День 5-7: Post-Migration Optimization
- [ ] **Task 3.1:** Настроить CDN (ps.kz или CloudFlare)
  - Owner: DevOps Engineer
  - Estimated: 4 часа
  - Dependencies: 100% migration
  - Acceptance: CDN настроен для статических assets
  - Config: `cdn/config.yml`

- [ ] **Task 3.2:** Оптимизировать для local infrastructure
  - Owner: Backend Dev
  - Estimated: 6 часов
  - Dependencies: ps.kz infrastructure
  - Acceptance: Код оптимизирован под ps.kz
  - Files: `pskz/optimizations/`

- [ ] **Task 3.3:** Создать backup strategy
  - Owner: DevOps Engineer
  - Estimated: 4 часа
  - Dependencies: ps.kz infrastructure
  - Acceptance: Автоматические бэкапы настроены
  - Files: `pskz/backup/cron-jobs.yml`

- [ ] **Task 3.4:** Документировать ps.kz setup
  - Owner: Tech Lead
  - Estimated: 4 часа
  - Dependencies: Migration complete
  - Acceptance: Полная документация ps.kz
  - Files: `docs/pskz-setup.md`

- [ ] **Task 3.5:** Закрыть Vercel Pro (опционально)
  - Owner: Tech Lead
  - Estimated: 1 час
  - Dependencies: 2+ недели стабильной работы
  - Acceptance: Vercel Pro отключен, экономия $20/месяц
  - Action: Cancel Vercel Pro subscription

---

## 🛠️ TECHNICAL IMPLEMENTATION

### CI/CD Pipeline for ps.kz

```yaml
# .github/workflows/deploy-pskz.yml
name: Deploy to ps.kz

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build application
        run: npm run build

      - name: Deploy to ps.kz
        run: |
          # Deploy using ps.kz API or rsync
          rsync -avz --delete dist/ user@pskz-server:/var/www/steam-marketplace/

      - name: Run smoke tests
        run: |
          curl -f https://steam-marketplace.ps.kz/health || exit 1
```

### Load Balancer Configuration (Nginx)

```nginx
# nginx/load-balancer.conf
upstream vercel_backend {
    server your-app.vercel.app weight=10 max_fails=3 fail_timeout=30s;
}

upstream pskz_backend {
    server 185.12.44.22:80 weight=10 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name steam-marketplace.kz;

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "OK\n";
        add_header Content-Type text/plain;
    }

    # Main application
    location / {
        # Simple round-robin
        proxy_pass http://pskz_backend;

        # Or weighted (recommended)
        # proxy_pass http://pskz_backend;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### ps.kz Server Configuration

```bash
# /etc/systemd/system/steam-marketplace.service
[Unit]
Description=Steam Marketplace Node.js App
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/steam-marketplace
ExecStart=/usr/bin/node app.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3001

[Install]
WantedBy=multi-user.target
```

### Database Configuration

```javascript
// config/database.js
const mongoose = require('mongoose');

const dbConfig = {
  development: {
    uri: process.env.MONGODB_URI_LOCAL || 'mongodb://localhost:27017/steam-marketplace-dev',
  },
  production: {
    // ps.kz hosting
    uri: process.env.MONGODB_URI_PSKZ || 'mongodb://pskz-server:27017/steam-marketplace',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },
  // Vercel fallback
  vercel: {
    uri: process.env.MONGODB_URI || 'mongodb://vercel-cluster:27017/steam-marketplace',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
};

module.exports = {
  connect: (env = process.env.NODE_ENV) => {
    return mongoose.connect(dbConfig[env].uri, dbConfig[env].options);
  },
};
```

---

## 📊 PERFORMANCE COMPARISON

### Metrics to Track

| Metric | Vercel Pro | ps.kz | Winner |
|--------|------------|-------|--------|
| **Cold Start Time** | 200-500ms | 50-100ms | ps.kz ✅ |
| **Time to First Byte** | 100-200ms | 80-150ms | ps.kz ✅ |
| **Global Availability** | 100+ locations | Kazakhstan only | Vercel |
| **Bandwidth** | 100GB/month | Unlimited | ps.kz ✅ |
| **Cost** | $20/month | TBD | ps.kz ✅ |
| **Support** | English | Russian | ps.kz ✅ |
| **Vendor Lock-in** | High | None | ps.kz ✅ |
| **Development Speed** | 5 min deploy | 10 min deploy | Vercel |

### Load Testing Plan

```javascript
// tests/load/compare-platforms.yml
config:
  target: ['https://steam-marketplace.vercel.app', 'https://steam-marketplace.ps.kz']
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Browse marketplace"
    flow:
      - get:
          url: "/"
      - think: 2
      - get:
          url: "/marketplace"
      - think: 3
```

---

## 💰 COST ANALYSIS

### Vercel Pro
```
Vercel Pro: $20/month = $240/year
Bandwidth: Included (100GB)
Functions: Unlimited
Domains: Unlimited
Support: Standard
Total: $240/year
```

### ps.kz (estimated)
```
Shared Hosting: $5-10/month = $60-120/year
VPS (recommended): $20-30/month = $240-360/year
Dedicated Server: $50-100/month = $600-1200/year

Add-ons:
- SSL Certificate: Free (Let's Encrypt)
- CDN: Free (CloudFlare) or $5/month
- Backup: Free (local) or $10/month
- Monitoring: Free (Prometheus) or $5/month

Total Estimated: $240-360/year
```

### Break-even Analysis
```
Vercel Pro: $240/year
ps.kz VPS: $240-360/year

Difference: $0-120/year (ps.kz может быть дороже или дешевле)

Benefits:
+ Полный контроль
+ Кастомизация
+ Local data residency
+ No vendor lock-in
+ Better performance в Казахстане
```

---

## 🛡️ RISK MITIGATION

### Risks of Migration

**1. Downtime During Migration (Risk: HIGH)**
- *Mitigation:* Blue-green deployment
- *Backup Plan:* Rollback to Vercel in 5 minutes
- *Monitoring:* Real-time health checks

**2. Performance Regression (Risk: MEDIUM)**
- *Mitigation:* Load testing before migration
- *Backup Plan:* Quick rollback to Vercel
- *Monitoring:* Compare metrics live

**3. DNS Propagation Delays (Risk: MEDIUM)**
- *Mitigation:* Low TTL during migration (300 seconds)
- *Duration:* Up to 48 hours for full propagation
- *Workaround:* Use direct IP temporarily

**4. Loss of Vercel Features (Risk: LOW)**
- *Mitigation:* Recreate critical features (Analytics, Preview Deploys)
- *Impact:* Manual setup required

**5. Support Response Time (Risk: MEDIUM)**
- *Mitigation:* Test support before migration
- *Backup Plan:* Community support, documentation

### Rollback Plan

```bash
#!/bin/bash
# rollback-to-vercel.sh

echo "Rolling back to Vercel..."

# Update DNS to point to Vercel
nslookup steam-marketplace.kz cname.vercel-dns.com

# Update load balancer weights
nginx -s reload

# Verify
curl -I https://steam-marketplace.kz

echo "Rollback complete. Verify DNS propagation in 5-10 minutes."
```

---

## 📚 DOCUMENTATION REQUIREMENTS

### Before Migration
- [ ] `docs/vercel-current-state.md` - Current Vercel setup
- [ ] `docs/pskz-analysis.md` - ps.kz service analysis
- [ ] `docs/migration-plan.md` - Detailed migration steps
- [ ] `docs/risk-assessment.md` - Risk analysis

### During Migration
- [ ] `docs/migration-progress.md` - Daily progress updates
- [ ] `docs/performance-comparison.md` - Platform comparison
- [ ] `docs/issues-encountered.md` - Issues and solutions

### After Migration
- [ ] `docs/pskz-setup.md` - Complete ps.kz documentation
- [ ] `docs/operations-runbook.md` - Daily operations guide
- [ ] `docs/backup-recovery.md` - Backup and recovery procedures
- [ ] `docs/monitoring-setup.md` - Monitoring configuration
- [ ] `docs/post-mortem.md` - Migration retrospective

---

## 🎯 SUCCESS CRITERIA

### Technical Criteria
- [ ] Zero downtime during migration
- [ ] Performance equal or better than Vercel Pro
- [ ] All E2E tests pass on ps.kz
- [ ] Monitoring and alerting working
- [ ] Backup and recovery tested
- [ ] Documentation complete

### Business Criteria
- [ ] User experience unchanged or improved
- [ ] Support tickets related to performance: 0
- [ ] Migration completed within 2 weeks
- [ ] Cost neutral or lower
- [ ] Team trained on ps.kz operations

### Timeline
```
Week 0: Preparation
Week 11: Dual deployment
Week 12: Gradual migration
Week 13: Optimization
Total: 4 weeks
```

---

## 🚀 NEXT STEPS

### Immediate Actions (Today)
1. **Research ps.kz** - contact sales, understand pricing
2. **Document Vercel setup** - current configuration
3. **Plan migration** - detailed timeline
4. **Set up staging** - test environment on ps.kz

### This Week
1. **Get ps.kz account** - sign up for service
2. **Set up staging** - deploy to ps.kz
3. **Configure CI/CD** - automate deployments
4. **Run initial tests** - ensure everything works

### Next Week
1. **Begin dual deployment** - both platforms active
2. **Monitor performance** - collect metrics
3. **Gradual traffic shift** - 10% → 50% → 100%
4. **Optimize** - tune for ps.kz infrastructure

---

**Документ создан:** 2025-11-10
**Статус:** Ready for review
**Следующий шаг:** Contact ps.kz для получения деталей

---

*Миграция на ps.kz даст больше контроля, лучшую производительность в Казахстане и устранит vendor lock-in. Vercel Pro останется как backup в случае проблем.*
