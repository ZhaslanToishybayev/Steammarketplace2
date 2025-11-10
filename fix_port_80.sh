#!/bin/bash

echo "=== 🔧 ИСПРАВЛЕНИЕ ПОРТА 80 ДЛЯ SGMARKET.COM ==="
echo ""

# Проверяем права
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Нужны права sudo для этой операции"
    echo "💡 Запустите: sudo bash fix_port_80.sh"
    exit 1
fi

echo "✅ Права sudo подтверждены"
echo ""

# 1. Останавливаем Apache
echo "1. Останавливаю Apache..."
systemctl stop apache2 2>/dev/null
systemctl disable apache2 2>/dev/null
echo "   ✅ Apache остановлен"
echo ""

# 2. Проверяем порты
echo "2. Проверяю занятость портов..."
ss -tlnp | grep -E ":(80|3001)" || netstat -tlnp 2>/dev/null | grep -E ":(80|3001)"
echo ""

# 3. Запускаем приложение на порту 80
echo "3. Запускаю приложение на порту 80..."
cd /home/zhaslan/Downloads/Telegram\ Desktop/Steammarketplace2-05.11/Steammarketplace2-main
PORT=80 nohup npm start > /tmp/app_80.log 2>&1 &
APP_PID=$!
echo "   ✅ Приложение запущено (PID: $APP_PID)"
echo "   📝 Логи: tail -f /tmp/app_80.log"
echo ""

# 4. Ждем запуска
echo "4. Жду запуска приложения..."
sleep 5

# 5. Проверяем
echo "5. Проверяю работоспособность..."
echo ""
echo "   Локально:"
curl -s http://localhost:80/api/health | jq .status 2>/dev/null || echo "   Ошибка подключения"
echo ""
echo "   По домену:"
curl -s http://sgomarket.com:80/api/health | jq .status 2>/dev/null || echo "   Ошибка подключения"
echo ""
echo "   По IP:"
curl -s http://45.140.25.16:80/api/health | jq .status 2>/dev/null || echo "   Ошибка подключения"
echo ""

echo "=== ✅ ГОТОВО! ==="
echo ""
echo "📊 Команды для проверки:"
echo "   tail -f /tmp/app_80.log        - Логи приложения"
echo "   curl http://sgomarket.com/api/health    - Проверка через домен"
echo "   curl http://localhost:80/api/health     - Локальная проверка"
echo ""
echo "🌐 Откройте в браузере:"
echo "   http://sgomarket.com           - Главная"
echo "   http://sgomarket.com/api/health - Статус"
echo "   http://sgomarket.com/api/auth/steam - Steam OAuth"
echo ""
