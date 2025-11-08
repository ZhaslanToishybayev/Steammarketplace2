# 🚀 БЫСТРЫЙ СТАРТ - Steam Marketplace

## ⚡ Запуск на НОВОМ компьютере за 1 минуту!

### Шаг 1: Скопируй файлы проекта
Перенесите папку `steam-marketplace` на новый компьютер (GitHub, флешка, архив)

### Шаг 2: Установи зависимости
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nodejs npm docker.io docker-compose

# macOS (через Homebrew)
brew install node docker docker-compose

# Windows
# Установите: Node.js, Docker Desktop, Git
```

### Шаг 3: Запуск (ОДНА КОМАНДА!)
```bash
cd steam-marketplace
./start.sh
```

**Готово!** Откройте http://localhost:5173 🎉

---

## 📦 Что делает start.sh автоматически:

1. ✅ Проверяет Node.js, npm, Docker
2. ✅ Создает .env файл если его нет
3. ✅ Устанавливает зависимости Backend
4. ✅ Устанавливает зависимости Frontend
5. ✅ Запускает MongoDB (Docker)
6. ✅ Запускает Backend
7. ✅ Запускает Frontend

---

## 🔧 Ручная установка (если нужно)

### 1. Клонирование/копирование
```bash
git clone <репозиторий>
# ИЛИ просто скопируйте папку
```

### 2. Установка зависимостей
```bash
npm install
cd frontend && npm install && cd ..
```

### 3. Конфигурация
```bash
cp .env.example .env
# Обновите Steam API ключи в .env
nano .env
```

### 4. Запуск сервисов
```bash
# MongoDB
docker-compose up -d mongodb

# Backend (новый терминал)
node app.js

# Frontend (новый терминал)
cd frontend && npm run dev
```

---

## 🌍 URLs после запуска

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001
- **Health Check:** http://localhost:3001/health

---

## ⚙️ Настройка Steam (обязательно!)

1. Получите API ключ: https://steamcommunity.com/dev/apikey
2. Обновите файл `.env`:
```bash
STEAM_API_KEY=ваш_ключ
STEAM_BOT_1_USERNAME=логин_бота
STEAM_BOT_1_PASSWORD=пароль_бота
STEAM_BOT_1_SHARED_SECRET=секрет
STEAM_BOT_1_IDENTITY_SECRET=секрет
```

3. Перезапустите: `./start.sh`

---

## 🛠️ Управление

### Остановка
```bash
docker-compose down
pkill -f 'node app.js'
```

### Перезапуск
```bash
./start.sh
```

### Проверка статуса
```bash
curl http://localhost:3001/health
docker ps | grep mongo
```

---

## 📚 Подробная документация

- `README.md` - Полное описание
- `DEPLOYMENT_GUIDE.md` - Детальное руководство
- `SYSTEM_WORKING_REPORT.md` - Отчет о системе

---

## 🎯 Система готова!

Все работает из коробки:
- ✅ MongoDB (Docker)
- ✅ Node.js Backend
- ✅ React Frontend
- ✅ Steam интеграция
- ✅ Автоматический запуск

**Просто запустите `./start.sh` и используйте!** 🚀
