#!/bin/bash

echo "=== 🎯 ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ SGMARKET.COM ==="
echo ""
echo "Это займет 1 минуту"
echo ""

# Проверяем sudo
if [ "$EUID" -ne 0 ]; then
    echo "❌ Нужны права sudo"
    echo ""
    echo "💡 ВЫПОЛНИТЕ ЭТИ КОМАНДЫ:"
    echo ""
    echo "1. Остановите Apache:"
    echo "   sudo systemctl stop apache2"
    echo ""
    echo "2. Запустите прокси:"
    echo "   sudo node proxy-server.js"
    echo ""
    echo "3. Проверьте:"
    echo "   curl http://sgomarket.com/api/health"
    echo ""
    exit 1
fi

echo "✅ Права sudo подтверждены"
echo ""

echo "1. Останавливаю Apache..."
systemctl stop apache2
systemctl disable apache2
echo "   ✅ Apache остановлен"
echo ""

echo "2. Запускаю прокси-сервер на порту 80..."
node proxy-server.js &
PROXY_PID=$!
sleep 3
echo "   ✅ Прокси запущен (PID: $PROXY_PID)"
echo ""

echo "3. Проверяю работу..."
if curl -s http://localhost/api/health > /dev/null; then
    echo "   ✅ Локально работает"
else
    echo "   ❌ Ошибка локально"
    exit 1
fi

if curl -s http://sgomarket.com/api/health > /dev/null; then
    echo "   ✅ По домену работает!"
else
    echo "   ⚠️ Домен пока не отвечает (возможно, нужно подождать)"
fi
echo ""

echo "=== ✅ ГОТОВО! ==="
echo ""
echo "🌐 Откройте в браузере:"
echo "   http://sgomarket.com"
echo "   http://sgomarket.com/api/health"
echo "   http://sgomarket.com/api/auth/steam"
echo ""
echo "🧪 Тест Steam OAuth:"
echo "   curl -I http://sgomarket.com/api/auth/steam"
echo "   (Ожидается: HTTP/1.1 302 Found)"
