#!/bin/bash

echo "=== 🔍 ДИАГНОСТИКА ПОРТА 80 ==="
echo ""

echo "1. Проверяю, что занимает порт 80:"
sudo ss -tlnp | grep ":80" || sudo netstat -tlnp | grep ":80"
echo ""

echo "2. Статус Apache:"
systemctl status apache2 --no-pager -l | head -10
echo ""

echo "3. Проверяю процессы на порту 80:"
sudo lsof -i :80 2>/dev/null || echo "lsof не найден, пробую ss..."
sudo ss -tlnp | grep ":80"
echo ""

echo "=== РЕШЕНИЕ ==="
echo ""
echo "1. Принудительно останавливаю Apache:"
sudo systemctl stop apache2
sudo systemctl kill -s KILL apache2 2>/dev/null || true
echo "   ✅ Apache остановлен"
echo ""

echo "2. Проверяю, что порт 80 свободен:"
sudo ss -tlnp | grep ":80" && echo "   ⚠️ Порт все еще занят" || echo "   ✅ Порт свободен"
echo ""

echo "3. Запускаю прокси:"
node proxy-server.js &
PROXY_PID=$!
sleep 3

echo "4. Проверяю работу:"
if curl -s http://localhost:80/api/health > /dev/null; then
    echo "   ✅ Локально работает!"
    
    if curl -s http://sgomarket.com:80/api/health > /dev/null; then
        echo "   ✅ По домену работает!"
        echo ""
        echo "🎉 УСПЕХ! sgomarket.com доступен"
    else
        echo "   ⚠️ Домен пока не отвечает"
    fi
else
    echo "   ❌ Ошибка"
fi

