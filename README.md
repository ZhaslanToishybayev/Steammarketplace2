# SGOMarket Steam Marketplace

P2P-маркетплейс для торговли Steam-скинами CS2 и Dota 2. Проект включает Next.js frontend, Node.js/Express backend, Steam-авторизацию, торговых ботов, escrow-логику, PostgreSQL, Redis, nginx, Prometheus и Grafana.

## Возможности

- Steam Login через Passport Steam.
- P2P-сделки между пользователями с escrow-процессом.
- Поддержка торговых ботов Steam и очередей обработки трейдов.
- Marketplace, корзина, профиль пользователя, баланс и история сделок.
- Админ-панель для пользователей, лотов, ботов, трейдов, аналитики и настроек.
- WebSocket-уведомления через Socket.IO.
- Метрики Prometheus и dashboards Grafana.
- Docker Compose конфигурации для локального и production запуска.

## Технологии

- Frontend: Next.js 14, React 18, Tailwind CSS, Zustand, React Query, Socket.IO Client.
- Backend: Node.js, Express, Passport.js, Socket.IO, PostgreSQL, Redis, Bull.
- Steam: `steam-user`, `steamcommunity`, `steam-tradeoffer-manager`, Steam Web API.
- Infrastructure: Docker Compose, nginx, Prometheus, Grafana.
- Tests: Jest, Playwright.

## Структура

```text
.
├── apps/
│   ├── backend/          # Express API, worker, Steam services, migrations
│   └── frontend/         # Next.js app, admin panel, marketplace UI
├── docker/               # Docker, nginx, grafana, prometheus configs
├── docs/                 # Specs, checklists, runbooks, reports
├── legacy-deploy-scripts/# Old deployment helpers
├── monitoring/           # Prometheus and alerting configs
├── nginx/                # Local and production nginx configs
├── packages/types/       # Shared TypeScript types
├── scripts/              # Verification and utility scripts
├── docker-compose.yml
└── docker-compose.local.yml
```

## Быстрый запуск через Docker

Требования:

- Docker Desktop или Docker Engine с Docker Compose.
- Node.js 18+ нужен только для запуска тестов и локальной разработки без Docker.

Локальный Docker-режим использует `docker-compose.local.yml` и поднимает PostgreSQL, Redis, backend, worker, frontend, nginx, Prometheus и Grafana.

```bash
docker compose -f docker-compose.local.yml up --build
```

После запуска:

- Frontend: `http://localhost:8080`
- API через nginx: `http://localhost:8080/api`
- Grafana: `http://localhost:3300`
- Admin panel: `http://localhost:8080/admin`

По умолчанию trade offers и платежная система в local compose отключены:

```env
ENABLE_TRADE_OFFERS=false
ENABLE_PAYMENT_SYSTEM=false
```

## Настройка окружения

Примеры переменных лежат в:

- [.env.example](./.env.example)
- [apps/backend/.env.example](./apps/backend/.env.example)
- [apps/frontend/.env.local.example](./apps/frontend/.env.local.example)

Реальные `.env`-файлы не коммитятся. Перед production запуском заполните секреты и ключи:

- `STEAM_API_KEY`
- Steam bot credentials: username, password, shared secret, identity secret, Steam ID
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `SESSION_SECRET`
- PostgreSQL credentials
- Redis settings
- Stripe keys, если включаете платежи
- Telegram token/chat id, если используете уведомления

Не храните реальные секреты в README, issues или публичных репозиториях.

## Локальная разработка без Docker

Backend:

```bash
cd apps/backend
npm install
npm run dev
```

Worker:

```bash
cd apps/backend
npm run worker:dev
```

Frontend:

```bash
cd apps/frontend
npm install
npm run dev
```

Для работы без Docker отдельно поднимите PostgreSQL и Redis и синхронизируйте переменные окружения с backend config.

## Тестирование

Backend unit tests:

```bash
cd apps/backend
npm test
```

Frontend checks:

```bash
cd apps/frontend
npm run lint
npm run type-check
npm run build
```

Playwright E2E:

```bash
cd apps/frontend
npx playwright test
```

Дополнительные проверки и smoke-скрипты находятся в [scripts](./scripts) и [apps/backend/dev-scripts](./apps/backend/dev-scripts).

## Production деплой

Основной production compose:

```bash
docker compose up -d
```

Он ожидает production-ready images и `.env` в корне проекта. Nginx слушает порты `80` и `443`, Grafana доступна на `3300`.

Перед деплоем проверьте:

- заполнены все production переменные окружения;
- домен указывает на сервер;
- SSL-сертификаты доступны nginx или выпущены через certbot;
- Steam API key и bot credentials валидны;
- включение `ENABLE_TRADE_OFFERS=true` сделано только после проверки ботов;
- database migrations применены;
- backup PostgreSQL настроен.

Для первого SSL-выпуска можно использовать certbot container из `docker-compose.yml`, затем перезапустить nginx.

## Безопасность

- Реальные `.env`, `.env.*`, `.next`, `.next_*`, build artifacts и backup-env файлы игнорируются через `.gitignore`.
- В репозиторий должны попадать только `.env.example` и `.env.*.example`.
- Для Steam bot credentials используйте отдельные аккаунты и минимально необходимые права.
- Не включайте реальные trade offers и платежи в local/dev окружении.
- Проверяйте admin credentials перед production запуском.

## Полезные документы

- [docs/TECHNICAL_SPEC_V1.md](./docs/TECHNICAL_SPEC_V1.md)
- [docs/production/PRODUCTION_CHECKLIST.md](./docs/production/PRODUCTION_CHECKLIST.md)
- [docs/testing/TESTING_STRATEGY.md](./docs/testing/TESTING_STRATEGY.md)
- [docs/runbooks/BOT_TROUBLESHOOTING.md](./docs/runbooks/BOT_TROUBLESHOOTING.md)
- [docs/monitoring/MONITORING_SETUP.md](./docs/monitoring/MONITORING_SETUP.md)

## Репозиторий

GitHub: [ZhaslanToishybayev/Steammarketplace2](https://github.com/ZhaslanToishybayev/Steammarketplace2)
