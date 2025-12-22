# Стек технологий: SGOMarket

## Основные технологии
- **Язык программирования:** TypeScript / JavaScript (Node.js 18+)
- **Архитектура:** Monorepo (apps/backend, apps/frontend, packages/types)

## Фронтенд (Frontend)
- **Фреймворк:** Next.js 14 (App Router)
- **Стилизация:** TailwindCSS
- **Управление состоянием:** Zustand
- **Запросы к API:** React Query (TanStack Query)
- **Валидация данных:** Zod

## Бэкенд (Backend)
- **Фреймворк:** Express.js
- **Real-time связь:** Socket.io
- **Аутентификация:** Passport.js (Steam OpenID)
- **Очереди задач:** Bull (на базе Redis)
- **Логирование:** Winston

## Базы данных и хранение (Databases & Storage)
- **Основная БД:** PostgreSQL (Prisma ORM / pg)
- **Кеширование и сессии:** Redis

## Инфраструктура и DevOps (Infrastructure)
- **Контейнеризация:** Docker, Docker Compose
- **Прокси и SSL:** Nginx (certbot для Let's Encrypt)
- **CI/CD:** GitHub Workflows (настроены в .github/workflows)

## Внешние интеграции (External Integrations)
- **Steam API:** Steam Web API, Steam Trade Offer Manager
- **Платежи:** Stripe (подготовлено в конфигурации)
