const http = require('http');
const url = require('url');

console.log('=== 🚀 Proxy Server для sgomarket.com ===');
console.log('Слушаю порт 80 → перенаправляю на 8080\n');

// Создаем proxy сервер
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);

    // Добавляем заголовки для проксирования
    const options = {
        hostname: 'localhost',
        port: 8080,
        path: parsedUrl.path,
        method: req.method,
        headers: req.headers
    };

    console.log(`${new Date().toISOString()} - ${req.method} ${parsedUrl.path}`);

    // Делаем запрос к приложению на 8080
    const proxyReq = http.request(options, (proxyRes) => {
        // Перенаправляем ответ обратно клиенту
        res.writeHead(proxyRes.statusCode, proxyRes.headers);

        // Логируем статус
        if (proxyRes.statusCode >= 400) {
            console.log(`❌ ${proxyRes.statusCode} - ${parsedUrl.path}`);
        } else {
            console.log(`✅ ${proxyRes.statusCode} - ${parsedUrl.path}`);
        }

        proxyRes.pipe(res);
    });

    // Обработка ошибок
    proxyReq.on('error', (err) => {
        console.error(`❌ Ошибка прокси: ${err.message}`);
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Bad Gateway: Не удалось подключиться к приложению');
    });

    // Отправляем тело запроса
    req.pipe(proxyReq);
});

// Запускаем на порту 80
server.listen(80, () => {
    console.log('✅ Proxy запущен на порту 80');
    console.log('🌐 Перенаправляет все запросы на http://localhost:8080');
    console.log('');
    console.log('🧪 Тестируйте:');
    console.log('   http://sgomarket.com/api/health');
    console.log('   http://sgomarket.com/api/auth/steam');
});

// Обработка ошибок сервера
server.on('error', (err) => {
    if (err.code === 'EACCES') {
        console.error('❌ Ошибка: Нужны права для порта 80');
        console.error('💡 Решение: Запустите с sudo или используйте способ с Apache');
        process.exit(1);
    } else {
        console.error(`❌ Ошибка сервера: ${err.message}`);
    }
});
