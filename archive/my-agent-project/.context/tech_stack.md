# Technology Stack

## Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **State/Hooks**: Custom hooks for caching (`useCachedInventory`), prefetching (`usePrefetching`), and progress (`useProgressIndicator`).
- **Storage**: 
    - `localStorage` for metadata and inventory data.
    - `IndexedDB` for binary image data.

## Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Authentication**: Steam OpenID
- **Caching**: Redis (server-side), Memory (local)

## Infrastructure / DevOps
- **Containerization**: Docker, Docker Compose
- **Ports**: 
    - Frontend: 3002
    - Backend: 3001
