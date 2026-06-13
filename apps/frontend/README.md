# Steam Marketplace Frontend

Next.js 14 frontend application for the Steam Marketplace platform, providing a modern, responsive interface for buying, selling, and trading Steam items.

## Quick Start

### Prerequisites
- Node.js >= 18.0.0
- Backend running on http://localhost:3001
- Steam API key (for OAuth)

### Setup
1. Copy environment file:
   ```bash
   cp .env.local.example .env.local
   ```
2. Update `.env.local` with your Steam API key
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start dev server:
   ```bash
   npm run dev
   ```
5. Open http://localhost:3000

### Verify Setup
- Root page loads: http://localhost:3000/
- Market page: http://localhost:3000/market
- Login page: http://localhost:3000/auth/login
- API proxy works: http://localhost:3000/api/health (should proxy to backend)

## Features

### Core Functionality
- **Steam OAuth Integration**: Secure authentication via Steam
- **Real-time Trading**: WebSocket-powered live updates
- **Inventory Management**: Browse and manage your Steam items
- **Marketplace**: Browse, search, and filter available items
- **Trade System**: Create and manage trade offers
- **Responsive Design**: Mobile-first, works on all devices

### Technical Features
- **Next.js 14 App Router**: Modern file-based routing
- **TypeScript**: Full type safety
- **Tailwind CSS**: Utility-first styling
- **React Query**: Server state management
- **Zustand**: Client state management
- **Socket.io**: Real-time communication
- **Form Validation**: Zod schema validation

## Architecture

### App Router Structure
```
src/app/
├── layout.tsx              # Root layout with providers
├── page.tsx                # Landing page
├── dashboard/page.tsx      # User dashboard
├── inventory/page.tsx      # User inventory
├── market/page.tsx         # Marketplace
├── trade/
│   ├── page.tsx           # Trade center
│   └── create/page.tsx    # Create trade
├── auth/
│   ├── login/page.tsx     # Steam OAuth login
│   └── callback/page.tsx  # OAuth callback
└── admin/
    ├── page.tsx           # Admin dashboard
    └── layout.tsx         # Admin layout
```

### State Management
- **Global State**: Zustand stores for auth, user data, notifications
- **Server State**: React Query for API data caching and synchronization
- **Form State**: React Hook Form with Zod validation
- **UI State**: React hooks for component state

### Styling
- **Base**: Tailwind CSS with custom Steam-themed colors
- **Components**: Reusable component library in `src/components/`
- **Layouts**: Layout components for consistent page structure
- **Responsive**: Mobile-first responsive design

## API Integration

### Proxy Configuration
The frontend uses Next.js rewrites to proxy API calls to the backend:

```javascript
// next.config.js
rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*`,
    },
  ];
}
```

This avoids CORS issues and provides a unified origin for cookies and authentication.

### API Client
```typescript
// src/lib/api.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});
```

### Authentication Flow

The application uses **Steam OAuth only** for authentication - no email/password authentication is supported.

1. User clicks "Login with Steam" on `/auth/login`
2. Redirects to `/api/auth/steam` (proxied to backend)
3. Backend redirects to Steam OAuth
4. Steam redirects back to `/api/auth/steam/return` (backend)
5. Backend sets JWT cookie, redirects to `/auth/callback` (frontend)
6. Frontend callback page extracts tokens, stores in Zustand, redirects to `/dashboard`

## Development

### Available Scripts
- `npm run dev` - Start development server on port 3000
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks
- `npm run clean` - Clean build cache
- `npm run dev:clean` - Clean build and start dev server
- `npm run test:pages` - Quick smoke test for routes

### Code Structure
```
src/
├── app/                    # App Router pages
├── components/             # Reusable components
│   ├── dashboard/         # Dashboard-specific components
│   ├── inventory/         # Inventory components
│   ├── layout/            # Layout components
│   ├── market/            # Marketplace components
│   ├── shared/            # Shared UI components
│   └── trade/             # Trade components
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities and helpers
├── stores/                 # Zustand state stores
├── styles/                 # Global styles
└── types/                  # TypeScript type definitions
```

### Adding New Pages
1. Create page in `src/app/[route]/page.tsx`
2. Add `'use client'` directive if using hooks
3. Follow existing patterns for layouts and components
4. Add any required stores or hooks
5. Update navigation if needed

### Component Guidelines
- Use Tailwind classes for styling
- Prefer functional components with hooks
- Use TypeScript for type safety
- Follow existing naming conventions
- Make components reusable and composable

## Environment Variables

Required variables in `.env.local`:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# Steam OAuth Configuration
NEXT_PUBLIC_STEAM_RETURN_URL=http://localhost:3000/auth/callback
NEXT_PUBLIC_STEAM_API_KEY=your-steam-api-key

# CDN Configuration
NEXT_PUBLIC_CDN_URL=https://cdn.example.com
NEXT_PUBLIC_CDN_ENABLED=false
NEXT_PUBLIC_STEAM_CDN=https://steamcdn-a.akamaihd.net

# Application Settings
NEXT_PUBLIC_APP_NAME=Steam Marketplace
NEXT_PUBLIC_APP_VERSION=1.0.0
```

## Troubleshooting

### Common Issues

**404 on all pages**
- Check `.env.local` exists with `NEXT_PUBLIC_API_URL`
- Run `npm run build` to verify no errors
- Clear `.next` cache: `rm -rf .next`

**API calls fail**
- Verify backend running: `curl http://localhost:3001/api/health`
- Check proxy config in `next.config.js`
- Inspect Network tab for actual request URL

**Build errors**
- Run `npm run clean && npm install`
- Check TypeScript errors: `npm run type-check`
- Verify all required env vars are set

**Authentication not working**
- Check Steam API key in `.env.local`
- Verify `NEXT_PUBLIC_STEAM_RETURN_URL` matches callback URL
- Check browser cookies and localStorage

**WebSocket connection fails**
- Verify `NEXT_PUBLIC_WS_URL` is correct
- Check if backend WebSocket server is running
- Inspect browser console for connection errors

### Performance Optimization
- Bundle analysis: `npm run build:analyze`
- Code splitting is configured in `next.config.js`
- Images use Next.js Image component with optimization
- Lazy loading for non-critical components

### Browser Support
- Modern browsers with ES2018+ support
- Chrome 73+, Firefox 65+, Safari 12+, Edge 79+
- Progressive enhancement for older browsers

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run tests: `npm run verify`
5. Commit your changes: `git commit -am 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support and questions:
- Check the [troubleshooting section](#troubleshooting)
- Create an issue in the repository
- Contact the development team