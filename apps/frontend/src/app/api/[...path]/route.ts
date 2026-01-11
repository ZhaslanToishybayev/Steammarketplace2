import { NextRequest, NextResponse } from 'next/server';

// Backend URL - uses Docker service name for container-to-container communication
const BACKEND_URL = process.env.INTERNAL_API_URL || 'http://backend:3001';

export async function GET(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    return proxyRequest(request, params.path);
}

export async function POST(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    return proxyRequest(request, params.path);
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    return proxyRequest(request, params.path);
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    return proxyRequest(request, params.path);
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    return proxyRequest(request, params.path);
}

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
    const path = pathSegments.join('/');
    const url = new URL(request.url);
    const targetUrl = `${BACKEND_URL}/api/${path}${url.search}`;

    console.log(`[API Proxy] ${request.method} ${path} -> ${targetUrl}`);

    try {
        const headers = new Headers();

        // Forward relevant headers
        const headersToForward = [
            'content-type',
            'authorization',
            'cookie',
            'x-requested-with',
        ];

        headersToForward.forEach((header) => {
            const value = request.headers.get(header);
            if (value) {
                headers.set(header, value);
            }
        });

        const fetchOptions: RequestInit = {
            method: request.method,
            headers,
            redirect: 'manual', // Don't follow redirects, let the browser handle them
        };

        // Forward body for methods that support it
        if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
            const contentType = request.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                fetchOptions.body = await request.text();
            }
        }

        const response = await fetch(targetUrl, fetchOptions);

        // Create response headers
        const responseHeaders = new Headers();

        // Forward response headers
        const responseHeadersToForward = [
            'content-type',
            'set-cookie',
            'cache-control',
            'location', // Critical for redirects
        ];

        responseHeadersToForward.forEach((header) => {
            const value = response.headers.get(header);
            if (value) {
                responseHeaders.set(header, value);
            }
        });

        // For redirects, we don't need the body
        if (response.status >= 300 && response.status < 400) {
            return new NextResponse(null, {
                status: response.status,
                headers: responseHeaders,
            });
        }

        // Get response body for non-redirects
        const responseBody = await response.text();

        return new NextResponse(responseBody, {
            status: response.status,
            headers: responseHeaders,
        });
    } catch (error) {
        console.error(`[API Proxy] Error proxying ${path}:`, error);
        return NextResponse.json(
            { success: false, error: 'Backend service unavailable' },
            { status: 503 }
        );
    }
}
