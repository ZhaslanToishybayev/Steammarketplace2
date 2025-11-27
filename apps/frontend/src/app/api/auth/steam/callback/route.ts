import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get the URL parameters from the callback
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      console.error('Steam OAuth error:', error);
      return NextResponse.redirect(new URL('/auth/login?error=' + encodeURIComponent(error), new URL(request.url).origin));
    }

    if (!code) {
      return NextResponse.redirect(new URL('/auth/login?error=no_code', new URL(request.url).origin));
    }

    // Exchange code for user data
    const response = await fetch('http://localhost:3002/auth/steam/callback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        state,
        origin: new URL(request.url).origin
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.redirect(new URL('/auth/login?error=' + encodeURIComponent(errorData.message || 'auth_failed'), new URL(request.url).origin));
    }

    const data = await response.json();

    // Create response with redirect
    const redirectUrl = new URL('/auth?authenticated=true', new URL(request.url).origin);

    // Set authentication cookies if provided
    const responseObj = NextResponse.redirect(redirectUrl);

    if (data.accessToken) {
      responseObj.cookies.set('authToken', data.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
      });
    }

    return responseObj;
  } catch (error) {
    console.error('Steam OAuth callback error:', error);
    return NextResponse.redirect(new URL('/auth/login?error=auth_failed', new URL(request.url).origin));
  }
}