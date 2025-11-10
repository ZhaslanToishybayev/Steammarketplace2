#!/bin/bash

echo "╔══════════════════════════════════════════════════════════╗"
echo "║           🚀 АВТОМАТИЧЕСКИЙ ДЕПЛОЙ НА VPS               ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Проверка Docker
echo "1. Проверяю Docker..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker не установлен${NC}"
    echo "Устанавливаю Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl start docker
    systemctl enable docker
    echo -e "${GREEN}✅ Docker установлен${NC}"
else
    echo -e "${GREEN}✅ Docker установлен${NC}"
fi
echo ""

# Проверка docker-compose
echo "2. Проверяю docker-compose..."
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}⚠️ docker-compose не найден, устанавливаю...${NC}"
    apt update
    apt install -y docker-compose
else
    echo -e "${GREEN}✅ docker-compose готов${NC}"
fi
echo ""

# Проверка портов
echo "3. Проверяю порты 80, 443, 3001, 27017, 6379..."
PORTS=(80 443 3001 27017 6379)
for port in "${PORTS[@]}"; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️ Порт $port занят${NC}"
    else
        echo -e "${GREEN}✅ Порт $port свободен${NC}"
    fi
done
echo ""

# Проверка .env.production
echo "4. Проверяю .env.production..."
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ .env.production не найден${NC}"
    echo "Создаю из примера..."
    if [ -f ".env.production" ]; then
        cp .env.production .env.production.bak
        echo -e "${GREEN}✅ .env.production создан${NC}"
    else
        echo -e "${RED}❌ Создайте .env.production вручную${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ .env.production найден${NC}"
fi
echo ""

# Остановка старых контейнеров
echo "5. Останавливаю старые контейнеры..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
echo -e "${GREEN}✅ Готово${NC}"
echo ""

# Запуск новых контейнеров
echo "6. Запускаю контейнеры..."
docker-compose -f docker-compose.prod.yml up -d --build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Контейнеры запущены${NC}"
else
    echo -e "${RED}❌ Ошибка запуска${NC}"
    echo "Проверяю логи:"
    docker-compose -f docker-compose.prod.yml logs
    exit 1
fi
echo ""

# Ожидание запуска
echo "7. Ожидаю запуска сервисов (30 сек)..."
sleep 30
echo ""

# Проверка health
echo "8. Проверяю health..."
if curl -s http://localhost/api/health > /dev/null; then
    echo -e "${GREEN}✅ Health check OK${NC}"
else
    echo -e "${YELLOW}⚠️ Health check не прошел, возможно еще запускается${NC}"
fi
echo ""

# Проверка Steam OAuth
echo "9. Проверяю Steam OAuth..."
OAUTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/auth/steam)
if [ "$OAUTH_CODE" = "302" ]; then
    echo -e "${GREEN}✅ Steam OAuth работает (HTTP 302)${NC}"
else
    echo -e "${YELLOW}⚠️ Steam OAuth вернул код $OAUTH_CODE${NC}"
fi
echo ""

# Статус контейнеров
echo "10. Статус контейнеров:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# Итог
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                    🎉 ДЕПЛОЙ ЗАВЕРШЕН                   ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Полезные команды:"
echo "  📊 Логи: docker-compose -f docker-compose.prod.yml logs -f"
echo "  🔄 Перезапуск: docker-compose -f docker-compose.prod.yml restart"
echo "  ⏹️  Остановка: docker-compose -f docker-compose.prod.yml down"
echo ""
echo "Проверьте в браузере: http://YOUR_VPS_IP"
echo ""
