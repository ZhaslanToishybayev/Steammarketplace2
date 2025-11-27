import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect admin routes
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Temporarily relax middleware authentication until cookie-based auth is implemented
  // For now, let the client-side AdminLayout handle authentication and role checking
  // This prevents unwanted redirects when the accessToken cookie is not set

  // In the future, when implementing proper cookie-based authentication:
  // 1. Set HTTP-only accessToken cookie on login
  // 2. Verify JWT token in this middleware
  // 3. Check user roles before allowing access
  // 4. Refresh tokens as needed

  // For now, just allow the request to proceed and let the frontend handle auth
  return NextResponse.next();

  // Original implementation (commented out for now):
  /*
  // Check if user is authenticated
  const authToken = request.cookies.get('accessToken')?.value ||
                   request.headers.get('authorization')?.replace('Bearer ', '');

  if (!authToken) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // For now, we'll do a basic check - in a real implementation,
  // you'd want to verify the JWT token and check user roles
  // This is a simplified version for demonstration

  try {
    // In a real implementation, you would:
    // 1. Verify the JWT token
    // 2. Decode the user information
    // 3. Check if user has admin role
    // 4. Make API call to verify user permissions if needed

    // For now, we'll assume the token is valid and let the frontend handle role checking
    // The frontend admin layout will do the actual role verification

    return NextResponse.next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  */
}

// Configure which paths this middleware should run on
export const config = {
  matcher: ['/admin/:path*'],
};