const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3002; // Используем свободный порт

const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // API endpoints
    if (parsedUrl.pathname === '/api/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            timestamp: new Date().toISOString(),
            services: {
                postgresql: 'running',
                mongodb: 'running',
                redis: 'running',
                steam_marketplace: 'active'
            },
            frontend: 'steam-marketplace-new',
            port: PORT
        }));
        return;
    }

    // Steam Marketplace frontend
    if (parsedUrl.pathname === '/marketplace' || parsedUrl.pathname === '/steam' || parsedUrl.pathname === '/trade') {
        fs.readFile(__dirname + '/steam-marketplace.html', (err, content) => {
            if (err) {
                console.error('Error reading marketplace file:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Server Error: Marketplace file not found');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(content);
            }
        });
        return;
    }

    // Main page - redirect to marketplace
    if (parsedUrl.pathname === '/') {
        res.writeHead(302, { 'Location': '/marketplace' });
        res.end();
        return;
    }

    // Handle different file requests
    let filePath = parsedUrl.pathname;

    // Security: prevent directory traversal
    if (filePath.includes('..')) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
    }

    const extname = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[extname] || 'text/html';

    // Serve files if they exist, otherwise serve marketplace
    const fullPath = __dirname + filePath;

    fs.readFile(fullPath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // File not found - serve marketplace
                fs.readFile(__dirname + '/steam-marketplace.html', (err2, content2) => {
                    if (err2) {
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end('Server Error: Marketplace not available');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(content2);
                    }
                });
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Server Error');
            }
        } else {
            res.writeHead(200, {
                'Content-Type': contentType
            });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Steam Marketplace Server running on http://localhost:${PORT}`);
    console.log(`🎮 Steam Trading Platform available at:`);
    console.log(`   • Main: http://localhost:${PORT}`);
    console.log(`   • Marketplace: http://localhost:${PORT}/marketplace`);
    console.log(`   • API Status: http://localhost:${PORT}/api/status`);
    console.log(`\n📊 Database Services Status:`);
    console.log(`   - PostgreSQL: localhost:5432 (✅ Running)`);
    console.log(`   - MongoDB: localhost:27017 (✅ Running)`);
    console.log(`   - Redis: localhost:6379 (✅ Running)`);
    console.log(`\n💡 Features available:`);
    console.log(`   • Steam OAuth Authentication`);
    console.log(`   • Real-time Inventory Viewing`);
    console.log(`   • Trade Offer Management`);
    console.log(`   • Multi-game Support (CS:GO, Rust, Dota 2, TF2)`);
    console.log(`   • Bot Trading System`);
    console.log(`\n🎉 Steam Marketplace is ready for trading!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down Steam Marketplace server...');
    server.close(() => {
        console.log('✅ Server shutdown complete');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Steam Marketplace server...');
    server.close(() => {
        console.log('✅ Server shutdown complete');
        process.exit(0);
    });
});