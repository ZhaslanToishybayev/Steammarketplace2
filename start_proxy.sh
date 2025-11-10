#!/bin/bash

echo "=== 🚀 ЗАПУСК ПРОКСИ-СЕРВЕРА ==="
echo ""

# Проверяем, что приложение на 8080 работает
echo "1. Проверяю приложение на 8080..."
if curl -s http://localhost:8080/api/health > /dev/null; then
    echo "   ✅ Приложение на 8080 работает"
else
    echo "   ❌ Приложение на 8080 не отвечает"
    echo "   💡 Сначала запустите: bash run_on_8080.sh"
    exit 1
fi
echo ""

# Проверяем права
if [ "$EUID" -ne 0 ]; then
    echo "⚠️  Для порта 80 нужны права sudo"
    echo "   Попробую альтернативный способ..."
    echo ""
    echo "2. Создаю sudo-less прокси на порту 3000..."
    cat > proxy-3000.js <<'PROXY'
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
PROXY

    node proxy-3000.js &
    PROXY_PID=$!
    sleep 2
    echo "   ✅ Запущен (PID: $PROXY_PID)"
    echo ""
    echo "⚠️  НО: порт 3000 не открыт наружу"
    echo "   Домен не сможет достучаться"
    echo ""
    echo "💡 НУЖНО: sudo для порта 80"
    echo "   Команда: sudo node proxy-server.js"
    exit 0
fi

# Если есть sudo - запускаем на 80
echo "2. Запускаю прокси на порту 80..."
node proxy-server.js
