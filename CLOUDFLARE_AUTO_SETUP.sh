#!/bin/bash

echo "╔══════════════════════════════════════════════════════════╗"
echo "║     🤖 АВТОМАТИЧЕСКАЯ УСТАНОВКА CLOUDFLARE TUNNEL     ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Проверяем, запущено ли приложение на 8080
echo "1. Проверяю приложение на 8080..."
if curl -s http://localhost:8080/api/health > /dev/null; then
    echo "   ✅ Приложение работает"
else
    echo "   ❌ Приложение не запущено на 8080"
    echo "   💡 Запустите: PORT=8080 node app.js"
    exit 1
fi
echo ""

# Скачиваем cloudflared
echo "2. Скачиваю cloudflared..."
if [ ! -f cloudflared-linux-amd64 ]; then
    wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
    if [ $? -ne 0 ]; then
        echo "   ❌ Ошибка скачивания"
        exit 1
    fi
    echo "   ✅ Скачан"
else
    echo "   ✅ Уже скачан"
fi
echo ""

# Устанавливаем
echo "3. Устанавливаю cloudflared..."
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
if [ $? -eq 0 ]; then
    echo "   ✅ Установлен в /usr/local/bin/cloudflared"
else
    echo "   ⚠️  Возможно нужны sudo права, попробую вручную..."
    mv cloudflared-linux-amd64 ./cloudflared
    echo "   ✅ Установлен локально: ./cloudflared"
    CLOUDFLARED="./cloudflared"
fi

# Определяем путь к cloudflared
CLOUDFLARED=$(which cloudflared 2>/dev/null || echo "./cloudflared")
echo ""

# Проверяем авторизацию
echo "4. Проверяю авторизацию..."
$CLOUDFLARED tunnel login 2>&1 | head -5
echo ""

# Создаем конфигурацию
echo "5. Создаю конфигурацию..."
mkdir -p ~/.cloudflared

# Проверяем, есть ли уже туннель
if [ -f ~/.cloudflared/sgomarket-tunnel.json ]; then
    echo "   ✅ Туннель sgomarket-tunnel уже существует"
    TUNNEL_NAME="sgomarket-tunnel"
else
    echo "   📝 Создаю новый туннель..."
    TUNNEL_ID=$($CLOUDFLARED tunnel create sgomarket-tunnel 2>&1 | grep -oP 'Created tunnel \K[0-9a-f-]+' | head -1)
    if [ -z "$TUNNEL_ID" ]; then
        echo "   ⚠️  Возможно туннель уже существует или нужна авторизация"
        TUNNEL_NAME="sgomarket-tunnel"
    else
        echo "   ✅ Туннель создан: $TUNNEL_ID"
        TUNNEL_NAME="sgomarket-tunnel"
    fi
fi
echo ""

# Создаем config.yml
echo "6. Создаю config.yml..."
cat > ~/.cloudflared/config.yml << CONFIG
tunnel: $TUNNEL_NAME
credentials-file: ~/.cloudflared/$TUNNEL_NAME.json

ingress:
  - hostname: sgomarket.com
    service: http://localhost:8080
  - hostname: www.sgomarket.com
    service: http://localhost:8080
  - service: http_status:404
CONFIG

echo "   ✅ Конфигурация создана"
echo ""

# Показываем команды для DNS
echo "╔══════════════════════════════════════════════════════════╗"
echo "║               👤 ВЫПОЛНИТЕ ВРУЧНУЮ:                      ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "7. Привяжите DNS записи:"
echo ""
echo "   Выполните по очереди:"
echo "   cloudflared tunnel route dns $TUNNEL_NAME sgomarket.com"
echo "   cloudflared tunnel route dns $TUNNEL_NAME www.sgomarket.com"
echo ""
echo "   Или вручную в панели Cloudflare:"
echo "   - Создайте CNAME записи:"
echo "   - sgomarket.com → [tunnel-url].cfargotunnel.com"
echo "   - www.sgomarket.com → [tunnel-url].cfargotunnel.com"
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║              🚀 ЗАПУСК ТУННЕЛЯ:                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "8. Запустите туннель:"
echo ""
echo "   cloudflared tunnel --config ~/.cloudflared/config.yml run $TUNNEL_NAME &"
echo ""
echo "   Или автоматически:"
echo "   ./cloudflare_run.sh"
echo ""

# Создаем скрипт запуска
cat > cloudflare_run.sh << 'RUNSCRIPT'
#!/bin/bash
CLOUDFLARED=$(which cloudflared 2>/dev/null || echo "./cloudflared")
$CLOUDFLARED tunnel --config ~/.cloudflared/config.yml run sgomarket-tunnel &
echo "Туннель запущен в фоне (PID: $!)"
sleep 2
echo ""
echo "Проверяем..."
curl -I http://sgomarket.com/api/health 2>/dev/null | head -3
RUNSCRIPT

chmod +x cloudflare_run.sh
echo "   ✅ Создан скрипт cloudflare_run.sh"
echo ""

echo "╔══════════════════════════════════════════════════════════╗"
echo "║              🧪 ТЕСТИРОВАНИЕ:                            ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "После запуска туннеля выполните:"
echo "  curl http://sgomarket.com/api/health"
echo "  curl -I http://sgomarket.com/api/auth/steam"
echo ""
echo "Ожидаемый результат:"
echo "  HTTP/1.1 200 OK (для /api/health)"
echo "  HTTP/1.1 302 Found (для /api/auth/steam)"
echo ""
