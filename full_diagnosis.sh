#!/bin/bash

echo "╔══════════════════════════════════════════════════════════╗"
echo "║        🔍 ДЕТАЛЬНАЯ ДИАГНОСТИКА SGMARKET.COM            ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# 1. Проверка процессов
echo "=== 1. ПРОЦЕССЫ ==="
echo "Node.js процессы:"
ps aux | grep -E "node|proxy" | grep -v grep | awk '{print "  PID: "$2" - "$11" "$12" "$13" "$14}'
echo ""
echo "Процессы на порту 80:"
sudo lsof -i :80 2>/dev/null || echo "  ❌ lsof не найден"
echo ""
sudo ss -tlnp | grep ":80" 2>/dev/null || echo "  ❌ Ничего не слушает на 80"
echo ""

# 2. Проверка DNS
echo "=== 2. DNS ==="
echo "nslookup sgomarket.com:"
nslookup sgomarket.com 2>/dev/null | grep -A5 "Name:" || echo "  ❌ DNS ошибка"
echo ""
echo "dig sgomarket.com:"
dig sgomarket.com +short 2>/dev/null || echo "  ❌ dig ошибка"
echo ""
echo "Текущий IP:"
curl -s ifconfig.me 2>/dev/null || echo "  ❌ Не удалось получить IP"
echo ""

# 3. Проверка сетевой доступности
echo "=== 3. СЕТЕВАЯ ДОСТУПНОСТЬ ==="
echo "Локальный тест порта 80:"
curl -s -m 2 http://localhost:80/api/health > /dev/null && echo "  ✅ Локально работает" || echo "  ❌ Локально не работает"
echo ""

echo "Прямой IP тест:"
IP=$(curl -s ifconfig.me 2>/dev/null)
if [ -n "$IP" ]; then
    echo "  Ваш IP: $IP"
    timeout 5 bash -c "echo >/dev/tcp/$IP/80" 2>&1 && echo "  ✅ Порт 80 доступен извне" || echo "  ❌ Порт 80 закрыт (NAT/провайдер)"
else
    echo "  ❌ Не удалось определить IP"
fi
echo ""

echo "Сайт на порту 80:"
curl -I -m 5 http://sgomarket.com:80 2>&1 | head -5 || echo "  ❌ Недоступен"
echo ""

# 4. Проверка фаервола
echo "=== 4. ФАЕРВОЛ ==="
echo "UFW статус:"
sudo ufw status 2>/dev/null | head -5 || echo "  UFW не установлен"
echo ""
echo "iptables правила:"
sudo iptables -L -n 2>/dev/null | head -10 || echo "  ❌ iptables недоступен"
echo ""

# 5. Проверка роутера
echo "=== 5. РОУТЕР/NAT ==="
echo "default gateway:"
ip route | grep default | awk '{print "  Gateway: "$3" Interface: "$5}'
echo ""
echo "Есть ли публичный IP:"
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null)
LOCAL_IP=$(hostname -I | awk '{print $1}')
if [ "$PUBLIC_IP" = "$LOCAL_IP" ]; then
    echo "  ✅ Публичный IP ($PUBLIC_IP)"
else
    echo "  ❌ Серый IP (NAT)"
    echo "     Публичный: $PUBLIC_IP"
    echo "     Локальный: $LOCAL_IP"
    echo "     Проблема: Роутер не пробросил порты"
fi
echo ""

# 6. Проверка портов
echo "=== 6. ПОРТЫ ==="
echo "Открытые порты:"
sudo ss -tlnp | awk '{print $4}' | grep -E ":(80|443|8080|3001)" | sort
echo ""

# 7. Тест с альтернативного хоста
echo "=== 7. СВЕРКА ХОСТОВ ==="
echo "Проверяем через разные домены:"
for domain in "sgomarket.com" "www.sgomarket.com"; do
    IP=$(dig +short $domain 2>/dev/null | tail -1)
    if [ -n "$IP" ]; then
        echo "  $domain → $IP"
        timeout 3 bash -c "echo >/dev/tcp/$IP/80" 2>&1 && echo "    ✅ Порт 80 открыт" || echo "    ❌ Порт 80 закрыт"
    else
        echo "  $domain → DNS ошибка"
    fi
done
echo ""

# ИТОГ
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                      ИТОГ ДИАГНОСТИКИ                    ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Возможные проблемы:"
echo ""
echo "1. 🔴 Роутер блокирует порт 80"
echo "   Решение: Настроить Port Forwarding 80 → $LOCAL_IP:80"
echo ""
echo "2. 🔴 Провайдер блокирует порт 80"
echo "   Решение: Использовать порт 8080, 3000, 8888"
echo ""
echo "3. 🔴 Серый IP (NAT) - самый вероятный"
echo "   Признаки: Публичный IP ≠ Локальный IP"
echo "   Решение: VPS или настройка роутера"
echo ""
echo "4. 🔴 Фаервол блокирует"
echo "   Решение: sudo ufw allow 80"
echo ""
echo "5. 🔴 Прокси не слушает на 80"
echo "   Решение: Убить все node процессы и перезапустить"
echo ""
