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
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);
const backendPort = parseInt(process.env.BACKEND_PORT || '3001', 10);

// Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Backend proxy configuration
const apiProxy = createProxyMiddleware({
    target: `http://localhost:${backendPort}`,
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
    logLevel: dev ? 'debug' : 'warn',
});

// WebSocket proxy for real-time features
const wsProxy = createProxyMiddleware({
    target: `ws://localhost:${backendPort}`,
    ws: true,
    changeOrigin: true,
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

    // Handle WebSocket upgrade for /ws path
    server.on('upgrade', (req, socket, head) => {
        const { pathname } = parse(req.url, true);

        if (pathname === '/ws' || pathname.startsWith('/socket.io')) {
            wsProxy.upgrade(req, socket, head);
        }
    });

    server.listen(port, () => {
        console.log(`
🚀 Steam Marketplace Frontend
   ├─ URL: http://${hostname}:${port}
   ├─ Mode: ${dev ? 'development' : 'production'}
   ├─ Backend proxy: http://localhost:${backendPort}
   └─ WebSocket proxy: ws://localhost:${backendPort}
   
✅ All requests go through port ${port} - cookies will work!
    `);
    });
});
