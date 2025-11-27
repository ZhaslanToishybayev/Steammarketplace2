const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const axios = require('axios');

const PORT = 3009;

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

    // Proxy endpoints for CORS-free testing
    if (parsedUrl.pathname === '/api/proxy/backend') {
        axios.get('http://localhost:3001/health', { timeout: 5000 })
            .then(response => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: 'success',
                    message: response.data || 'Backend API is working!',
                    service: 'Backend API',
                    url: 'http://localhost:3001/health'
                }));
            })
            .catch(error => {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: 'error',
                    message: 'Backend API is not accessible',
                    error: error.message,
                    service: 'Backend API',
                    url: 'http://localhost:3001/health'
                }));
            });
        return;
    }

    if (parsedUrl.pathname === '/api/proxy/simple') {
        axios.get('http://localhost:3004/api/health', { timeout: 5000 })
            .then(response => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: 'success',
                    message: 'Simple API is working!',
                    data: response.data,
                    service: 'Simple API',
                    url: 'http://localhost:3004/api/health'
                }));
            })
            .catch(error => {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: 'error',
                    message: 'Simple API is not accessible',
                    error: error.message,
                    service: 'Simple API',
                    url: 'http://localhost:3004/api/health'
                }));
            });
        return;
    }

    if (parsedUrl.pathname === '/api/proxy/interface') {
        axios.get('http://localhost:3007/api/test', { timeout: 5000 })
            .then(response => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: 'success',
                    message: 'Test Interface is working!',
                    data: response.data,
                    service: 'Test Interface',
                    url: 'http://localhost:3007/api/test'
                }));
            })
            .catch(error => {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: 'error',
                    message: 'Test Interface is not accessible',
                    error: error.message,
                    service: 'Test Interface',
                    url: 'http://localhost:3007/api/test'
                }));
            });
        return;
    }

    if (parsedUrl.pathname === '/api/proxy/status') {
        const results = {
            timestamp: new Date().toISOString(),
            services: []
        };

        // Test Backend API
        axios.get('http://localhost:3001/health', { timeout: 3000 })
            .then(backendResponse => {
                results.services.push({
                    name: 'Backend API',
                    status: 'success',
                    url: 'http://localhost:3001/health',
                    response: backendResponse.data
                });
            })
            .catch(backendError => {
                results.services.push({
                    name: 'Backend API',
                    status: 'error',
                    url: 'http://localhost:3001/health',
                    error: backendError.message
                });
            })
            .finally(() => {
                // Test Simple API
                axios.get('http://localhost:3004/api/health', { timeout: 3000 })
                    .then(simpleResponse => {
                        results.services.push({
                            name: 'Simple API',
                            status: 'success',
                            url: 'http://localhost:3004/api/health',
                            response: simpleResponse.data
                        });
                    })
                    .catch(simpleError => {
                        results.services.push({
                            name: 'Simple API',
                            status: 'error',
                            url: 'http://localhost:3004/api/health',
                            error: simpleError.message
                        });
                    })
                    .finally(() => {
                        // Test Interface
                        axios.get('http://localhost:3007/api/test', { timeout: 3000 })
                            .then(interfaceResponse => {
                                results.services.push({
                                    name: 'Test Interface',
                                    status: 'success',
                                    url: 'http://localhost:3007/api/test',
                                    response: interfaceResponse.data
                                });
                            })
                            .catch(interfaceError => {
                                results.services.push({
                                    name: 'Test Interface',
                                    status: 'error',
                                    url: 'http://localhost:3007/api/test',
                                    error: interfaceError.message
                                });
                            })
                            .finally(() => {
                                // All tests completed
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify(results));
                            });
                    });
            });
        return;
    }

    // Serve CORS-free test interface
    if (parsedUrl.pathname === '/' || parsedUrl.pathname === '/test') {
        fs.readFile(__dirname + '/cors-free-test-interface.html', (err, content) => {
            if (err) {
                console.error('Error reading CORS-free test interface:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Server Error: CORS-free test interface not found');
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
                // File not found - serve CORS-free test interface
                fs.readFile(__dirname + '/cors-free-test-interface.html', (err2, content2) => {
                    if (err2) {
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end('Server Error: CORS-free test interface not available');
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
    console.log(`🌐 CORS-Free Steam Marketplace Test Interface running on http://localhost:${PORT}`);
    console.log(`🎯 CORS-Free Test Interface available at:`);
    console.log(`   • Main: http://localhost:${PORT}`);
    console.log(`   • API: http://localhost:${PORT}/api/proxy/*`);
    console.log('');
    console.log('✅ CORS-FREE ТЕСТОВЫЙ ИНТЕРФЕЙС ГОТОВ!');
    console.log('Open http://localhost:3009 in your browser for CORS-free testing!');
    console.log('');
    console.log('🎯 ОСОБЕННОСТИ:');
    console.log('   • Работает без CORS проблем');
    console.log('   • Реальные тесты API через сервер');
    console.log('   • Мгновенные результаты');
    console.log('   • Проверка всех сервисов');
    console.log('   • Информация о системе');
    console.log('');
    console.log('🚀 ИДЕАЛЬНО ДЛЯ ТЕСТИРОВАНИЯ!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down CORS-free test interface server...');
    server.close(() => {
        console.log('✅ CORS-free test interface server shutdown complete');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down CORS-free test interface server...');
    server.close(() => {
        console.log('✅ CORS-free test interface server shutdown complete');
        process.exit(0);
    });
});