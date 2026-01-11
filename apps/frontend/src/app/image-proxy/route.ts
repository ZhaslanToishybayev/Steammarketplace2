import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Simple in-memory rate limiter
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100; // 100 images per minute per IP
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

interface RateLimitData {
    count: number;
    startTime: number;
}

const rateLimitMap = new Map<string, RateLimitData>();

// Periodic cleanup to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of rateLimitMap.entries()) {
        if (now - data.startTime > RATE_LIMIT_WINDOW) {
            rateLimitMap.delete(ip);
        }
    }
}, CLEANUP_INTERVAL);

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const data = rateLimitMap.get(ip);

    if (!data) {
        rateLimitMap.set(ip, { count: 1, startTime: now });
        return true;
    }

    if (now - data.startTime > RATE_LIMIT_WINDOW) {
        // Reset window
        rateLimitMap.set(ip, { count: 1, startTime: now });
        return true;
    }

    if (data.count >= MAX_REQUESTS_PER_WINDOW) {
        return false;
    }

    data.count++;
    return true;
}

export async function GET(request: NextRequest) {
    // Get IP for rate limiting
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';

    if (!checkRateLimit(ip)) {
        return new NextResponse('Rate limit exceeded', { status: 429 });
    }

    const urlParam = request.nextUrl.searchParams.get('url');

    if (!urlParam || urlParam === 'undefined' || urlParam === 'null') {
        return new NextResponse('Invalid url parameter', { status: 400 });
    }

    // Validate hostname strictly
    try {
        const targetUrl = new URL(urlParam);
        const allowedHosts = [
            'steamcdn-a.akamaihd.net',
            'community.cloudflare.steamstatic.com',
            'community.steamstatic.com',
            'steamcommunity-a.akamaihd.net',
            'avatars.steamstatic.com',
            'steamcommunity.com',
            'community.akamai.steamstatic.com'
        ];

        const isAllowed = allowedHosts.some(host => targetUrl.hostname.endsWith(host));
        if (!isAllowed) {
            return new NextResponse('Forbidden hostname', { status: 403 });
        }

        console.log('[ImageProxy] Processing URL:', urlParam);

        const response = await fetch(targetUrl.toString(), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            }
        });

        if (!response.ok) {
            return new NextResponse(`Failed to fetch image: ${response.status} ${response.statusText}`, { status: response.status });
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const buffer = await response.arrayBuffer();

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('Image proxy error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
