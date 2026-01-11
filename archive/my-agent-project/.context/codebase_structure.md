# Codebase Structure

## Overview
The project is a monorepo containing a full-stack application.

- Root: `/Steammarketplace2-main/`
- Frontend: `/apps/frontend/`
- Backend: `/apps/backend/`

## Frontend Structure (`apps/frontend`)
- **Technology**: Next.js 14, TypeScript, Tailwind CSS.
- **Key Files**:
    - `src/app/`: App Router pages and layouts.
    - `src/components/`: Reusable React components.
    - `src/lib/`: Custom hooks and utilities (Caching, Prefetching).
    - `public/`: Static assets.
    - `next.config.js`: Next.js configuration.
    - `ROUTING_GUIDE.md`: Documentation on frontend routes.

## Backend Structure (`apps/backend`)
- **Technology**: Node.js, Express.js.
- **Key Files**:
    - `server.js`: Main entry point.
    - `src/`: Source code (routes, controllers).
    - `steam-auth-server.js`: Dedicated Steam OpenID handling.
    - `migrations/`: Database migrations.
    - `simple-api.js`: Lightweight API implementation.

## Key Integration Points
- **Authentication**: Frontend talks to `steam-auth-server.js` for login.
- **Data**: Frontend fetches inventory from Backend API (`/api/inventory`).
- **Caching**: Redis is used on the backend; IndexedDB and localStorage on the frontend.
