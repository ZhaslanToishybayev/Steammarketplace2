# Frontend Routing Guide

This guide provides comprehensive documentation for the Next.js 14 App Router structure used in the Steam Marketplace frontend.

## App Router Structure

Next.js 14 App Router uses file-based routing where each file in the `app/` directory represents a route. The structure automatically generates routes based on the file system.

### Public Routes (No Auth Required)
- `/` - Landing page (`app/page.tsx`)
- `/auth/login` - Steam OAuth login (`app/auth/login/page.tsx`)
- `/auth/callback` - OAuth callback handler (`app/auth/callback/page.tsx`)
- `/market` - Browse marketplace (`app/market/page.tsx`)
- `/help` - Help center (placeholder)
- `/contact` - Contact page (placeholder)
- `/privacy` - Privacy policy (placeholder)
- `/terms` - Terms of service (placeholder)

### Protected Routes (Auth Required)
- `/dashboard` - User dashboard (`app/dashboard/page.tsx`)
- `/inventory` - User inventory (`app/inventory/page.tsx`)
- `/trade` - Trade center (`app/trade/page.tsx`)
- `/trade/create` - Create new trade (`app/trade/create/page.tsx`)
- `/trade/history` - Trade history (`app/trade/history/page.tsx`)
- `/wallet` - Wallet management (placeholder)
- `/profile` - User profile (placeholder)

### Admin Routes (Admin Role Required)
- `/admin` - Admin dashboard (`app/admin/page.tsx`)
- `/admin/bots` - Bot management (`app/admin/bots/page.tsx`)
- `/admin/users` - User management (`app/admin/users/page.tsx`)
- `/admin/trades` - Trade monitoring (`app/admin/trades/page.tsx`)

## Layouts

### Root Layout (`app/layout.tsx`)
The root layout wraps the entire application and provides:

```tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryClientProvider client={queryClient}>
          <SocketProvider>
            <AuthProvider>
              <ToastProvider>
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </ToastProvider>
            </AuthProvider>
          </SocketProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
```

**Features:**
- Global providers (Query, Socket, Auth, Toast)
- Error boundaries
- Font and base styling
- Metadata configuration

### Admin Layout (`app/admin/layout.tsx`)
Wraps admin pages with additional admin-specific functionality:

```tsx
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <div className="flex-1">
        <AdminHeader />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

**Features:**
- Admin sidebar navigation
- Admin header with controls
- Role-based access enforcement
- Admin-specific styling

## Middleware (`src/middleware.ts`)

Middleware runs before a request is completed and can modify the response:

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Only run on admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Future: Add JWT verification and role checks
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
```

**Current Implementation:**
- Only runs on `/admin/*` routes
- Placeholder for future authentication checks
- Allows all requests (client-side auth currently used)

**Future Enhancements:**
- JWT token verification
- Role-based access control
- Rate limiting
- Security headers

## API Proxy

### Configuration (`next.config.js`)

The frontend uses Next.js rewrites to proxy API calls to the backend:

```javascript
rewrites() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  const cdnEnabled = process.env.NEXT_PUBLIC_CDN_ENABLED === 'true';

  return [
    {
      source: '/api/:path*',
      destination: `${apiUrl}/:path*`,
    },
    // CDN rewrite only if enabled
    ...(cdnEnabled ? [{
      source: '/cdn/:path*',
      destination: `${process.env.NEXT_PUBLIC_CDN_URL}/:path*`,
    }] : []),
  ];
},
```

### Usage

Frontend components make API calls to `/api/*` which are automatically proxied to the backend:

```typescript
// src/lib/api.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // Important for auth cookies
});

// Usage in components
const { data: inventory } = await api.get('/inventory');
```

**Benefits:**
- Avoids CORS issues
- Unified origin for cookies and authentication
- Development/production consistency
- Automatic fallback URLs

## Navigation

### Programmatic Navigation

In client components, use the `useRouter` hook:

```tsx
'use client';

import { useRouter } from 'next/navigation';

export default function MyComponent() {
  const router = useRouter();

  const handleNavigation = () => {
    router.push('/dashboard');
    // or
    router.replace('/market');
    // or
    router.back();
  };

  return <button onClick={handleNavigation}>Go to Dashboard</button>;
}
```

For simple redirects, you can also use:

```tsx
// Direct navigation (works in both client and server components)
window.location.href = '/auth/login';

// Form submissions
<form action="/api/logout" method="post">
  <button type="submit">Logout</button>
</form>
```

### Link Component

For navigation links, use Next.js `Link` component:

```tsx
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Navigation() {
  return (
    <nav>
      <Link href="/" className="text-white hover:text-orange-500">
        Home
      </Link>
      <Link href="/market" className="text-white hover:text-orange-500">
        Marketplace
      </Link>
      <Link href="/dashboard" className="text-white hover:text-orange-500">
        Dashboard
      </Link>
    </nav>
  );
}
```

## Authentication Flow

The authentication flow integrates Steam OAuth with JWT tokens:

### 1. Login Initiation
```tsx
// app/auth/login/page.tsx
export default function LoginPage() {
  const handleSteamLogin = () => {
    // Redirect to backend Steam OAuth endpoint
    window.location.href = '/api/auth/steam';
  };

  return (
    <button onClick={handleSteamLogin}>
      Sign in with Steam
    </button>
  );
}
```

### 2. Backend OAuth Flow
1. Frontend calls `/api/auth/steam` (proxied to backend)
2. Backend redirects to Steam OAuth
3. User authenticates with Steam
4. Steam redirects to backend callback URL

### 3. Token Setup
Backend sets JWT cookies and redirects to frontend callback:

```tsx
// app/auth/callback/page.tsx
export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Extract tokens from URL or cookies
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
      // Store token in Zustand store
      useAuthStore.getState().setToken(token);
    }

    // Redirect to dashboard
    router.push('/dashboard');
  }, [router]);

  return <div>Processing authentication...</div>;
}
```

### 4. Protected Routes
Use the `useAuth` hook to protect routes:

```tsx
'use client';

import { useAuth } from '@/hooks/useAuth';

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = '/auth/login';
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <MainLayout>
      {/* Dashboard content */}
    </MainLayout>
  );
}
```

## Error Handling

### 404 Pages
Next.js automatically handles 404s, but you can create a custom 404 page:

```tsx
// app/not-found.tsx
export default function NotFound() {
  return (
    <div className="text-center py-12">
      <h2 className="text-3xl font-bold text-white mb-4">Page Not Found</h2>
      <p className="text-gray-400 mb-8">The page you're looking for doesn't exist.</p>
      <Link href="/" className="btn-primary">
        Go Home
      </Link>
    </div>
  );
}
```

### Error Boundaries
The root layout includes error boundaries:

```tsx
// app/layout.tsx
<ErrorBoundary>
  {children}
</ErrorBoundary>

// src/components/shared/ErrorBoundary.tsx
'use client';

export default function ErrorBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundaryComponent>
      {children}
    </ErrorBoundaryComponent>
  );
}
```

## Dynamic Routes

### Route Parameters
Create dynamic routes using square brackets:

```
app/users/[id]/page.tsx    → /users/123
app/items/[category]/page.tsx → /items/skins
```

### Catch-All Routes
Use `[[...slug]]` for catch-all routes:

```
app/docs/[[...slug]]/page.tsx → /docs, /docs/guide, /docs/guide/installation
```

### Example Implementation
```tsx
// app/users/[id]/page.tsx
import { useParams } from 'next/navigation';

export default function UserProfile() {
  const { id } = useParams();

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => api.get(`/users/${id}`).then(res => res.data),
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{user.username}'s Profile</h1>
      {/* Profile content */}
    </div>
  );
}
```

## Best Practices

### File Organization
```
app/
├── [route]/
│   ├── page.tsx          # Main page component
│   ├── layout.tsx        # Route-specific layout (optional)
│   ├── loading.tsx       # Loading state (optional)
│   ├── error.tsx         # Error boundary (optional)
│   └── not-found.tsx     # 404 page (optional)
├── globals.css
└── layout.tsx
```

### Client vs Server Components
- **Server Components**: Data fetching, SEO content, heavy computations
- **Client Components**: Interactive elements, hooks, browser APIs

```tsx
// Server Component (default)
export default async function ServerPage() {
  const data = await fetch('/api/data').then(res => res.json());

  return <div>{data.content}</div>;
}

// Client Component
'use client';

export default function ClientPage() {
  const [state, setState] = useState();

  return <button onClick={() => setState(!state)}>Toggle</button>;
}
```

### Metadata
Define metadata in layout files:

```tsx
// app/layout.tsx
export const metadata = {
  title: 'Steam Marketplace',
  description: 'Buy, sell, and trade Steam items',
  keywords: 'Steam, marketplace, trading, gaming',
};
```

## Troubleshooting

### 404 on All Pages
- Check `.env.local` exists with `NEXT_PUBLIC_API_URL`
- Run `npm run build` to verify no errors
- Clear `.next` cache: `rm -rf .next`

### API Calls Fail
- Verify backend running: `curl http://localhost:3001/api/health`
- Check proxy config in `next.config.js`
- Inspect Network tab for actual request URL

### Protected Routes Not Working
- Check `useAuth` hook returns `isAuthenticated: true`
- Verify JWT token in localStorage/cookies
- Check middleware not blocking requests

### Admin Routes 403
- Verify user has `role: 'admin'` or `'moderator'`
- Check `AdminGuard` in backend
- Inspect user object in `authStore`

### Build Errors
- Run `npm run clean && npm install`
- Check TypeScript errors: `npm run type-check`
- Verify all required env vars are set

This routing guide provides complete reference for the Next.js 14 App Router implementation in the Steam Marketplace frontend.