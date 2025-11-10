const http = require('http');
const url = require('url');

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const options = {
        hostname: 'localhost',
        port: 8080,
        path: parsedUrl.path,
        method: req.method,
        headers: req.headers
    };
    console.log(`${new Date().toISOString()} - ${req.method} ${parsedUrl.path}`);
    
    const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (err) => {
        console.error(`❌ ${err.message}`);
        res.writeHead(502);
        res.end('Bad Gateway');
    });
    
    req.pipe(proxyReq);
});

server.listen(3000, () => {
    console.log('✅ Proxy на 3000 → 8080');
    console.log('🌐 Тест: http://sgomarket.com:3000/api/health');
});
