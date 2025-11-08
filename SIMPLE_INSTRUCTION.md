# 🔥 ПРОСТАЯ ИНСТРУКЦИЯ

## 📍 ДИРЕКТОРИЯ
Перейдите в папку с проектом:
```bash
cd /home/zhaslan/Downloads/Telegram\ Desktop/Steammarketplace2-05.11/Steammarketplace2-main
```

## 🚀 РУЧНОЙ ЗАПУСК (РЕКОМЕНДУЕТСЯ)

### Каждые 10-15 минут запускайте:
```bash
node check-bot-status.js
```

### Если увидите "ClientLogOnResponse (OK)" - бот работает!

## 📊 АВТОМАТИЧЕСКИЙ МОНИТОРИНГ

### Создайте файл `watch-bot.sh`:
```bash
#!/bin/bash
while true; do
  echo "[$(date)] Проверяю бота..."
  timeout 30 node check-bot-status.js > /tmp/bot_log.txt 2>&1
  
  if grep -q "ClientLogOnResponse (OK)" /tmp/bot_log.txt; then
    echo "🎉 БОТ РАБОТАЕТ!"
    exit 0
  else
    echo "⏱️  Ждём 10 минут..."
    sleep 600
  fi
done
```

### Запустите:
```bash
chmod +x watch-bot.sh
nohup ./watch-bot.sh > watch.log 2>&1 &
```

## 📱 ДРУГИЕ КОМАНДЫ

```bash
# Следить за логами
tail -f watch.log

# Проверить процесс
ps aux | grep "watch-bot"

# Остановить
pkill -f "watch-bot"
```

## ⏰ КОГДА ЗАРАБОТАЕТ

Через 1-3 часа в логах появится:
```
🎉 БОТ РАБОТАЕТ!
```

---

**ГЛАВНОЕ: Проверяйте каждые 10 минут!**
