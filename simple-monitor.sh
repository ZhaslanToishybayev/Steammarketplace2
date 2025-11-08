#!/bin/bash

echo "=== ПРОСТОЙ МОНИТОРИНГ STEAM БОТА ==="
echo ""

# Счётчик попыток
count=0

while [ $count -lt 100 ]; do
  count=$((count + 1))
  
  echo "[$(date)] === Попытка #$count ==="
  
  # Проверяем Steam бота
  timeout 30 node check-bot-status.js > /tmp/bot_result.txt 2>&1
  
  if grep -q "ClientLogOnResponse (OK)" /tmp/bot_result.txt; then
    echo "[$(date)] ✅ БОТ ПОДКЛЮЧИЛСЯ!"
    
    if grep -q "inventory\|предметов" /tmp/bot_result.txt; then
      echo "[$(date)] ✅ ИНВЕНТАРЬ ЗАГРУЖЕН!"
      echo "[$(date)] 🎉 STEAM BOT ГОТОВ К РАБОТЕ!"
      exit 0
    fi
  else
    echo "[$(date)] ❌ Rate limit или ошибка"
    cat /tmp/bot_result.txt | grep -E "ERROR|Error|ошибка" | head -1
  fi
  
  echo "[$(date)] ⏱️  Ждём 10 минут..."
  sleep 600
done

echo "[$(date)] ❌ Достигнуто максимум попыток (100)"
exit 1
