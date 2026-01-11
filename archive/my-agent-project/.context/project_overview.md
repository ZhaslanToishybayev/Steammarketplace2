# Steam Marketplace Project Overview

This agent is configured to work with the **Steam Marketplace** application, a full-stack Next.js 14 application with Steam integration for viewing CS2 and Dota 2 inventories.

## Key Features & Completed Work

### Optimization
- **Image Optimization**: Lazy loading, placeholders, responsive handling.
- **Caching**: 
    - `InventoryCache` (TTL-based, localStorage).
    - `ImageCache` (IndexedDB, 24h TTL).
    - `MemoizationCache` for calculations.
- **Prefetching**: Smart background strategies (user-based, item-based).
- **Rate Limiting**: Token bucket algorithm, exponential backoff retries.

### Core Functionality
- **Frontend**: Next.js 14 App Router, TypeScript.
- **Backend**: Node.js + Express, Steam OpenID auth, Inventory APIs.
- **Infrastructure**: Docker, Redis caching.

### File Structure Highlights
- `/apps/frontend`: Next.js application.
- `/apps/backend`: Express.js server.
- `/lib`: Shared utilities (caching, prefetching, rate limiting).
