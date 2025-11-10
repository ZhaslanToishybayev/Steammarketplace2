#!/bin/bash

echo "=== 🚀 БЫСТРЫЙ ТЕСТ НА ПОРТУ 8080 ==="
echo ""

# Убиваем старые процессы
echo "1. Останавливаю старые процессы..."
pkill -f "PORT=8080" 2>/dev/null || true
pkill -f "proxy" 2>/dev/null || true
echo "   ✅ Готово"
echo ""

# Проверяем приложение
echo "2. Проверяю приложение на 8080..."
if curl -s http://localhost:8080/api/health > /dev/null; then
    echo "   ✅ Приложение работает!"
    curl -s http://localhost:8080/api/health | jq -r '"   Статус: " + .status + ", Uptime: " + (.uptime | tostring) + "s"'
    echo ""
    echo "🌐 Публичный тест:"
    echo "   curl http://$(curl -s ifconfig.me):8080/api/health"
    echo ""
    echo "💡 Для публичного доступа используйте:"
    echo "   cloudflared tunnel --url http://localhost:8080"
else
    echo "   ❌ Приложение не запущено на 8080"
    echo "   💡 Запустите: PORT=8080 node app.js"
fi
echo ""

# Создаем готовую команду cloudflare
echo "=== КОМАНДА CLOUDFLARE TUNNEL ==="
echo ""
echo "Скопируйте и выполните:"
echo ""
echo "wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"
echo "chmod +x cloudflared-linux-amd64"
echo "sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared"
echo "cloudflared tunnel --url http://localhost:8080"
echo ""
echo "Получите URL вида: https://xxx.trycloudflare.com"
echo "И тестируйте: curl https://xxx.trycloudflare.com/api/auth/steam"
