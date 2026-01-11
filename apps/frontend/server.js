/**
 * Custom Next.js server with integrated backend proxy
 * This ensures all requests go through a single origin (port 3000),
 * solving the cross-origin cookie problem.
 */
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { createProxyMiddleware } = require('http-proxy-middleware');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0'; // Listen on all interfaces
const port = parseInt(process.env.PORT || '3000', 10);
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Backend proxy configuration
const apiProxy = createProxyMiddleware({
    target: backendUrl,
    changeOrigin: true,
    ws: true, // Enable WebSocket proxying
    cookieDomainRewrite: {
        '*': '' // Rewrite all cookie domains to current domain
    },
    onProxyReq: (proxyReq, req) => {
        // Forward cookies from client to backend
        if (req.headers.cookie) {
            proxyReq.setHeader('Cookie', req.headers.cookie);
        }
    },
    onProxyRes: (proxyRes, req, res) => {
        // Ensure cookies from backend are properly set on client
        const setCookie = proxyRes.headers['set-cookie'];
        if (setCookie) {
            // Remove domain restrictions from cookies
            const modifiedCookies = setCookie.map(cookie => {
                return cookie
                    .replace(/Domain=[^;]+;?\s*/gi, '')
                    .replace(/Secure;?\s*/gi, dev ? '' : 'Secure; ')
                    .replace(/SameSite=\w+;?\s*/gi, 'SameSite=Lax; ');
            });
            proxyRes.headers['set-cookie'] = modifiedCookies;
        }
    },
    logLevel: 'warn', // Reduce noise
});

// WebSocket proxy for real-time features
const wsProxy = createProxyMiddleware({
    target: backendUrl.replace('http', 'ws'),
    ws: true,
    changeOrigin: true,
    logLevel: 'warn',
});

app.prepare().then(() => {
    const server = createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        const { pathname } = parsedUrl;

        // Proxy API requests to backend
        if (pathname.startsWith('/api/') || pathname.startsWith('/auth/')) {
            apiProxy(req, res);
            return;
        }

        // Handle all other requests with Next.js
        handle(req, res, parsedUrl);
    });

    // Handle WebSocket upgrade
    server.on('upgrade', (req, socket, head) => {
        const { pathname } = parse(req.url, true);

        if (pathname === '/ws' || pathname.startsWith('/socket.io')) {
            wsProxy.upgrade(req, socket, head);
        }
    });

    server.listen(port, () => {
        console.log(`
🚀 Steam Marketplace Frontend
   ├─ URL: http://localhost:${port}
   ├─ Mode: ${dev ? 'development' : 'production'}
   ├─ Backend proxy: ${backendUrl}
   └─ WebSocket proxy: ${backendUrl.replace('http', 'ws')}
   
✅ All requests go through port ${port} - cookies will work!
    `);
    });
});
