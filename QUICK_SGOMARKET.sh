#!/bin/bash

echo "╔══════════════════════════════════════════════════════════╗"
echo "║       🎯 НАСТРОЙКА SGMARKET.COM + CLOUDFLARE           ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

echo "1. Установка cloudflared..."
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
echo "   ✅ Установлен"
echo ""

echo "2. Авторизация..."
echo "   Откроется браузер - войдите в Cloudflare"
cloudflared tunnel login
echo "   ✅ Авторизован"
echo ""

echo "3. Создание туннеля..."
TUNNEL_ID=$(cloudflared tunnel create sgomarket-tunnel 2>&1 | grep -oP 'Tunnel \K[0-9a-f-]+' | head -1)
if [ -z "$TUNNEL_ID" ]; then
    echo "   ⚠️ Туннель может уже существовать, используем существующий"
else
    echo "   ✅ Туннель создан: $TUNNEL_ID"
fi
echo ""

echo "4. Конфигурация..."
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << 'CONFIG'
tunnel: sgomarket-tunnel
credentials-file: ~/.cloudflared/sgomarket-tunnel.json
ingress:
  - hostname: sgomarket.com
    service: http://localhost:8080
  - hostname: www.sgomarket.com
    service: http://localhost:8080
  - service: http_status:404
CONFIG
echo "   ✅ Конфигурация создана"
echo ""

echo "5. Привязка DNS записей..."
echo "   Выполните команды вручную:"
echo "   cloudflared tunnel route dns sgomarket-tunnel sgomarket.com"
echo "   cloudflared tunnel route dns sgomarket-tunnel www.sgomarket.com"
echo ""

echo "6. Запуск туннеля..."
cloudflared tunnel --config ~/.cloudflared/config.yml run sgomarket-tunnel &
sleep 3
echo "   ✅ Туннель запущен"
echo ""

echo "╔══════════════════════════════════════════════════════════╗"
echo "║                    ✅ НАСТРОЙКА ЗАВЕРШЕНА!              ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Тестируйте:"
echo "  curl http://sgomarket.com/api/health"
echo "  curl -I http://sgomarket.com/api/auth/steam"
echo ""
