#!/bin/bash

echo "=== 🔍 ДИАГНОСТИКА ПРОБЛЕМЫ ==="
echo ""

echo "1. Проверяю процессы Node.js на порту 80:"
ps aux | grep -E "node.*proxy|80" | grep -v grep
echo ""

echo "2. Проверяю, на каких портах что слушает:"
sudo ss -tlnp | grep -E ":(80|8080|3000|3001)"
echo ""

echo "3. Проверяю DNS:"
nslookup sgomarket.com | grep -A2 "Name:"
echo ""

echo "4. Проверяю прямое подключение к IP:"
curl -I http://45.140.25.16:80 2>&1 | head -5
echo ""

echo "5. Проверяю, доступен ли порт 80 снаружи:"
timeout 5 bash -c 'echo >/dev/tcp/45.140.25.16/80' 2>&1 && echo "✅ Порт 80 открыт" || echo "❌ Порт 80 закрыт"
echo ""

echo "6. Проверяю фаервол:"
sudo ufw status 2>/dev/null || iptables -L | head -10
echo ""

echo "=== РЕЗУЛЬТАТ ==="
echo ""
echo "Если порт 80 закрыт - проблема в роутере/провайдере"
echo "Если прокси не слушает на 80 - нужно перезапустить"
echo "Если все ОК - проблема в сети"

