const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3007;

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

    // API endpoints for testing
    if (parsedUrl.pathname === '/api/test') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'success',
            message: 'Working test interface API is functional!',
            timestamp: new Date().toISOString(),
            available_services: [
                'Backend API testing',
                'Simple API testing',
                'System status checking',
                'Steam API availability testing'
            ],
            note: 'This is a working test interface without Steam OAuth dependencies'
        }));
        return;
    }

    // Serve working test interface
    if (parsedUrl.pathname === '/' || parsedUrl.pathname === '/test') {
        fs.readFile(__dirname + '/working-test-interface.html', (err, content) => {
            if (err) {
                console.error('Error reading working test interface:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Server Error: Working test interface not found');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(content);
            }
        });
        return;
    }

    // Handle static files
    let filePath = parsedUrl.pathname;
    const extname = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[extname] || 'text/html';

    // Security: prevent directory traversal
    if (filePath.includes('..')) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
    }

    const fullPath = __dirname + filePath;

    fs.readFile(fullPath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // File not found - serve working test interface
                fs.readFile(__dirname + '/working-test-interface.html', (err2, content2) => {
                    if (err2) {
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end('Server Error: Working test interface not available');
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
    console.log(`🧪 Working Steam Marketplace Test Interface running on http://localhost:${PORT}`);
    console.log(`🎮 Working Test Interface available at:`);
    console.log(`   • Main: http://localhost:${PORT}`);
    console.log(`   • API: http://localhost:${PORT}/api/test`);
    console.log('');
    console.log('✅ РАБОЧИЙ ТЕСТОВЫЙ ИНТЕРФЕЙС ГОТОВ!');
    console.log('Open http://localhost:3007 in your browser to test Steam Marketplace functionality!');
    console.log('');
    console.log('🎯 ДОСТУПНЫЕ ТЕСТЫ:');
    console.log('   • Backend API Health Check');
    console.log('   • Simple API Functionality');
    console.log('   • System Status Verification');
    console.log('   • Steam API Availability');
    console.log('   • Full System Test');
    console.log('');
    console.log('💡 ОСОБЕННОСТИ:');
    console.log('   • Без зависимостей от Steam OAuth');
    console.log('   • Работает со всеми доступными сервисами');
    console.log('   • Показывает реальное состояние системы');
    console.log('   • Предоставляет полную информацию о тестировании');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down working test interface server...');
    server.close(() => {
        console.log('✅ Working test interface server shutdown complete');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down working test interface server...');
    server.close(() => {
        console.log('✅ Working test interface server shutdown complete');
        process.exit(0);
    });
});