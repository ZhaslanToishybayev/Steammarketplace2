#!/bin/bash

echo "=== STEAM BOT WATCHDOG ==="
echo "Проверяет каждые 10 минут"
echo "Для остановки: Ctrl+C"
echo ""

count=0
while true; do
  count=$((count + 1))
  echo "[$(date)] Попытка #$count"
  
  timeout 30 node check-bot-status.js > /tmp/bot_check.txt 2>&1
  
  if grep -q "ClientLogOnResponse (OK)" /tmp/bot_check.txt; then
    echo ""
    echo "🎉 🎉 🎉 БОТ РАБОТАЕТ! 🎉 🎉 🎉"
    echo ""
    cat /tmp/bot_check.txt | grep -E "SteamID|ClientLogOnResponse" | head -2
    echo ""
    echo "✅ Мониторинг завершён!"
    exit 0
  else
    echo "❌ Rate limit или ошибка"
    echo "⏱️  Следующая проверка через 10 минут..."
    sleep 600
  fi
done
