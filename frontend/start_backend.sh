#!/bin/bash
echo "🚀 Запуск Steam Marketplace Backend..."
echo "================================"

# Проверяем .env
if [ ! -f .env ]; then
    echo "❌ Файл .env не найден!"
    exit 1
fi

echo "✅ Файл .env найден"

# Запускаем backend в фоне
npm run dev &
BACKEND_PID=$!

echo "✅ Backend запущен (PID: $BACKEND_PID)"
echo "📍 Логи будут показаны ниже..."
echo ""

# Показываем логи
tail -f logs/combined.log 2>/dev/null || echo "ℹ️ Логи будут записаны в logs/combined.log"
