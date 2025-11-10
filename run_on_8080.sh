#!/bin/bash

echo "=== 🔧 ЗАПУСК НА ПОРТУ 8080 (БЕЗ SUDO) ==="
echo ""

# Проверяем, что приложение не запущено на 3001
echo "1. Проверяю текущие процессы Node.js..."
pkill -f "PORT=8080" 2>/dev/null
echo "   ✅ Готов к запуску"
echo ""

# Запускаем на 8080
echo "2. Запускаю приложение на порту 8080..."
cd /home/zhaslan/Downloads/Telegram\ Desktop/Steammarketplace2-05.11/Steammarketplace2-main
PORT=8080 nohup npm start > /tmp/app_8080.log 2>&1 &
APP_PID=$!
echo "   ✅ Запущено (PID: $APP_PID)"
echo "   📝 Логи: tail -f /tmp/app_8080.log"
echo ""

# Ждем
echo "3. Жду запуска..."
sleep 5
echo ""

# Проверяем
echo "4. Проверяю:"
echo ""
echo "   http://localhost:8080/api/health:"
curl -s http://localhost:8080/api/health | jq .status 2>/dev/null || echo "   ❌ Не работает"
echo ""
echo "   http://sgomarket.com:8080/api/health:"
curl -s http://sgomarket.com:8080/api/health | jq .status 2>/dev/null || echo "   ❌ Не работает (нужен порт-форвардинг)"
echo ""

echo "=== ⚠️ ВНИМАНИЕ! ==="
echo "Порт 8080 работает только локально."
echo "Для доступа по домену sgomarket.com настройте порт-форвардинг в роутере:"
echo "   80 → 8080 (или 443 → 8080)"
echo ""
echo "Или используйте другой способ (fix_port_80.sh)"
