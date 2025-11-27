const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3008;

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

    // Serve simple working test interface
    if (parsedUrl.pathname === '/' || parsedUrl.pathname === '/test') {
        fs.readFile(__dirname + '/simple-working-test.html', (err, content) => {
            if (err) {
                console.error('Error reading simple working test interface:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Server Error: Simple working test interface not found');
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
                // File not found - serve simple working test interface
                fs.readFile(__dirname + '/simple-working-test.html', (err2, content2) => {
                    if (err2) {
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end('Server Error: Simple working test interface not available');
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
    console.log(`🧪 Simple Working Steam Marketplace Test running on http://localhost:${PORT}`);
    console.log(`🎮 Simple Test Interface available at:`);
    console.log(`   • Main: http://localhost:${PORT}`);
    console.log('');
    console.log('✅ ПРОСТОЙ РАБОЧИЙ ТЕСТОВЫЙ ИНТЕРФЕЙС ГОТОВ!');
    console.log('Open http://localhost:3008 in your browser for simple testing!');
    console.log('');
    console.log('🎯 ОСОБЕННОСТИ:');
    console.log('   • Работает без CORS проблем');
    console.log('   • Простые curl команды для тестирования');
    console.log('   • Кнопки для копирования команд');
    console.log('   • Информация о системе');
    console.log('   • Ссылки на все сервисы');
    console.log('');
    console.log('🚀 ИДЕАЛЬНО ДЛЯ ТЕСТИРОВАНИЯ!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down simple working test server...');
    server.close(() => {
        console.log('✅ Simple working test server shutdown complete');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down simple working test server...');
    server.close(() => {
        console.log('✅ Simple working test server shutdown complete');
        process.exit(0);
    });
});