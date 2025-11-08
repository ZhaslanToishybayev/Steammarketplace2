#!/bin/bash

# 🚀 Steam Marketplace - Автоматический запуск
# Одно-командное развертывание всей системы

echo "🚀 Запуск Steam Marketplace..."
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Функция проверки наличия команды
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ Ошибка: '$1' не найден${NC}"
        echo -e "${YELLOW}💡 Установите: $2${NC}"
        exit 1
    fi
}

# Проверка зависимостей
echo -e "${YELLOW}🔍 Проверка зависимостей...${NC}"
check_command "node" "Node.js: https://nodejs.org"
check_command "npm" "Node.js: https://nodejs.org"
check_command "docker" "Docker: https://docker.com"
check_command "docker-compose" "Docker Compose: https://docs.docker.com/compose/install/"
echo -e "${GREEN}✅ Все зависимости установлены${NC}"
echo ""

# Проверка .env файла
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚙️ Создание .env файла...${NC}"
    cat > .env << EOL
# Steam Marketplace Configuration
MONGODB_URI='mongodb://localhost:27017/steam-marketplace'

# JWT Secrets
JWT_SECRET=dev_jwt_secret_\$(openssl rand -hex 32)
SESSION_SECRET=dev_session_secret_\$(openssl rand -hex 32)

# Application URLs
BASE_URL=http://localhost:3001
CLIENT_URL=http://localhost:5173
PORT=3001
NODE_ENV=development
LOG_LEVEL=info

# Steam Integration
STEAM_API_KEY=YOUR_STEAM_API_KEY
STEAM_BOT_1_USERNAME=YOUR_BOT_USERNAME
STEAM_BOT_1_PASSWORD=YOUR_BOT_PASSWORD
STEAM_BOT_1_SHARED_SECRET=YOUR_SHARED_SECRET
STEAM_BOT_1_IDENTITY_SECRET=YOUR_IDENTITY_SECRET
EOL
    echo -e "${GREEN}✅ Файл .env создан${NC}"
    echo -e "${YELLOW}⚠️ ВНИМАНИЕ: Обновите Steam API ключи в .env файле!${NC}"
    echo ""
fi

# Установка зависимостей backend
echo -e "${YELLOW}📦 Установка зависимостей backend...${NC}"
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✅ Зависимости backend установлены${NC}"
else
    echo -e "${GREEN}✅ Зависимости уже установлены${NC}"
fi

# Установка зависимостей frontend
echo -e "${YELLOW}📦 Установка зависимостей frontend...${NC}"
if [ ! -d "frontend/node_modules" ]; then
    cd frontend && npm install && cd ..
    echo -e "${GREEN}✅ Зависимости frontend установлены${NC}"
else
    echo -e "${GREEN}✅ Зависимости frontend уже установлены${NC}"
fi

echo ""

# Запуск MongoDB
echo -e "${YELLOW}🗄️ Запуск MongoDB...${NC}"
docker-compose up -d mongodb

# Ожидание готовности MongoDB
echo -e "${YELLOW}⏳ Ожидание готовности MongoDB...${NC}"
for i in {1..30}; do
    if docker exec steam-marketplace-mongodb mongo --eval "db.adminCommand('ismaster')" &> /dev/null; then
        echo -e "${GREEN}✅ MongoDB готова!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Ошибка: MongoDB не запустилась${NC}"
        exit 1
    fi
    sleep 1
done

echo ""

# Запуск Backend
echo -e "${YELLOW}🔧 Запуск Backend...${NC}"
gnome-terminal -- bash -c "node app.js; exec bash" &
sleep 2

# Запуск Frontend
echo -e "${YELLOW}💻 Запуск Frontend...${NC}"
gnome-terminal -- bash -c "cd frontend && npm run dev; exec bash" &
sleep 3

echo ""
echo -e "${GREEN}🎉 ВСЕ ЗАПУЩЕНО!${NC}"
echo ""
echo "📍 URLs:"
echo -e "  ${GREEN}Frontend:${NC} http://localhost:5173"
echo -e "  ${GREEN}Backend:${NC} http://localhost:3001"
echo -e "  ${GREEN}Health Check:${NC} http://localhost:3001/health"
echo ""
echo -e "${YELLOW}📝 Следующие шаги:${NC}"
echo "1. Откройте http://localhost:5173 в браузере"
echo "2. Обновите Steam API ключи в .env файле"
echo "3. Перезапустите backend для применения изменений"
echo ""
echo -e "${YELLOW}🔧 Для остановки:${NC}"
echo "docker-compose down"
echo "pkill -f 'node app.js'"
echo "pkill -f 'npm run dev'"
echo ""
