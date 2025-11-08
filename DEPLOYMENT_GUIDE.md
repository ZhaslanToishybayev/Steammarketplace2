# 🚀 Steam Marketplace - Руководство по развертыванию

## ✅ БЫСТРЫЙ СТАРТ (1 команда!)

### Для Linux/macOS:
```bash
./start.sh
```

### Для Windows:
```bash
bash start.sh
```

---

## 📋 СИСТЕМНЫЕ ТРЕБОВАНИЯ

### Обязательно:
- **Node.js** 16+ → https://nodejs.org
- **npm** 8+ (входит в Node.js)
- **Docker** 20+ → https://docker.com
- **Docker Compose** 2+ → https://docs.docker.com/compose/install/
- **Git** (для клонирования)

### Рекомендуется:
- **RAM:** 4GB+
- **Диск:** 2GB+ свободного места
- **OS:** Ubuntu 20.04+, macOS 10.15+, Windows 10+

---

## 🔧 РУЧНАЯ УСТАНОВКА

### 1. Клонирование репозитория
```bash
git clone <repository-url>
cd steam-marketplace
```

### 2. Установка зависимостей Backend
```bash
npm install
```

### 3. Установка зависимостей Frontend
```bash
cd frontend
npm install
cd ..
```

### 4. Настройка переменных окружения
```bash
# Копирование примера
cp .env.example .env

# Редактирование (обязательно обновить Steam API ключи!)
nano .env
```

### 5. Запуск MongoDB
```bash
# Автоматически (рекомендуется)
docker-compose up -d mongodb

# Или вручную
docker run -d \
  --name steam-marketplace-mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  mongo:4.4 \
  --bind_ip_all
```

### 6. Запуск Backend
```bash
node app.js
```

### 7. Запуск Frontend
```bash
cd frontend
npm run dev
cd ..
```

---

## ⚙️ КОНФИГУРАЦИЯ

### Файл .env (обязательно настроить)

```bash
# MongoDB
MONGODB_URI='mongodb://localhost:27017/steam-marketplace'

# JWT Secrets (автогенерируются)
JWT_SECRET=dev_jwt_secret_[...]
SESSION_SECRET=dev_session_secret_[...]

# URLs
BASE_URL=http://localhost:3001
CLIENT_URL=http://localhost:5173
PORT=3001

# Steam Integration (ЗАМЕНИТЕ НА СВОИ!)
STEAM_API_KEY=YOUR_STEAM_API_KEY
STEAM_BOT_1_USERNAME=your_bot_username
STEAM_BOT_1_PASSWORD=your_bot_password
STEAM_BOT_1_SHARED_SECRET=your_shared_secret
STEAM_BOT_1_IDENTITY_SECRET=your_identity_secret
```

---

## 🔑 ПОЛУЧЕНИЕ STEAM API КЛЮЧЕЙ

### Steam API Key:
1. Зайдите на: https://steamcommunity.com/dev/apikey
2. Войдите в Steam аккаунт
3. Введите домен: `localhost`
4. Скопируйте ключ в `.env` как `STEAM_API_KEY`

### Steam Bot Secrets:
Для торговых операций нужны:
- **Shared Secret** (6-значный код из Steam Mobile Authenticator)
- **Identity Secret** (из файлов Steam)

---

## 🌍 URLS ПОСЛЕ ЗАПУСКА

| Сервис | URL |
|--------|-----|
| **Frontend** | http://localhost:5173 |
| **Backend API** | http://localhost:3001 |
| **Health Check** | http://localhost:3001/health |
| **MongoDB** | mongodb://localhost:27017 |

---

## 🔍 ПРОВЕРКА РАБОТОСПОСОБНОСТИ

### 1. Проверить все сервисы
```bash
curl http://localhost:3001/health
curl -I http://localhost:5173
docker ps | grep mongo
```

### 2. Проверить MongoDB
```bash
docker exec steam-marketplace-mongodb mongo --eval "db.adminCommand('ismaster')"
```

### 3. Логи
```bash
# Backend
curl http://localhost:3001/health

# MongoDB
docker logs steam-marketplace-mongodb

# Frontend - открыть в браузере http://localhost:5173
```

---

## 🛠️ УПРАВЛЕНИЕ

### Остановка всех сервисов
```bash
# Остановить MongoDB
docker-compose down

# Остановить процессы Node.js
pkill -f 'node app.js'
pkill -f 'npm run dev'
```

### Перезапуск
```bash
# Полный перезапуск
./start.sh

# Или по отдельности
docker-compose restart mongodb
node app.js  # в одном терминале
cd frontend && npm run dev  # в другом терминале
```

### Очистка данных
```bash
# Удалить MongoDB с данными
docker-compose down -v

# Удалить образы
docker rmi mongo:4.4
```

---

## 📊 МОНИТОРИНГ

### Статус сервисов
```bash
# Docker контейнеры
docker ps -a | grep steam

# Порты
netstat -tlnp | grep -E "27017|3001|5173"

# Процессы Node.js
ps aux | grep -E "node|npm"
```

### Логи в реальном времени
```bash
# MongoDB
docker logs -f steam-marketplace-mongodb

# Все сервисы
docker-compose logs -f
```

---

## 🆘 УСТРАНЕНИЕ ПРОБЛЕМ

### MongoDB не запускается
```bash
# Проверить порт 27017
netstat -tlnp | grep 27017

# Удалить конфликтующий контейнер
docker ps -a | grep 27017
docker rm [container-id]

# Пересоздать
docker-compose down
docker-compose up -d
```

### Node.js процессы не запускаются
```bash
# Проверить порты
netstat -tlnp | grep -E "3001|5173"

# Убить процессы
pkill -9 node
pkill -9 npm

# Перезапустить
./start.sh
```

### Зависимости не устанавливаются
```bash
# Очистить npm кеш
npm cache clean --force

# Удалить node_modules
rm -rf node_modules frontend/node_modules package-lock.json frontend/package-lock.json

# Переустановить
npm install
cd frontend && npm install && cd ..
```

### Проблемы с Steam API
1. Проверить правильность API ключа в `.env`
2. Убедиться, что бот аккаунт настроен
3. Проверить логи backend на ошибки Steam

---

## 🔒 БЕЗОПАСНОСТЬ

### В продакшене:
1. **Изменить** все пароли по умолчанию
2. **Использовать** HTTPS
3. **Настроить** Firewall
4. **Отключить** авторизацию MongoDB только в dev!
5. **Создать** пользователей БД с правами

### Переменные окружения:
```bash
# НИКОГДА не коммитить .env в git!
echo ".env" >> .gitignore
```

---

## 📚 ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ

### Docker команды:
```bash
# Управление MongoDB
docker start steam-marketplace-mongodb
docker stop steam-marketplace-mongodb
docker restart steam-marketplace-mongodb
docker logs steam-marketplace-mongodb

# Очистка
docker system prune -a
```

### Node.js команды:
```bash
# Development
npm run dev        # с nodemon
npm start          # production
npm test           # тесты

# Frontend
cd frontend
npm run dev        # development
npm run build      # production build
npm run preview    # preview build
```

---

## 💡 СОВЕТЫ

1. **Используйте tmux/screen** для управления терминалами
2. **Настройте автозапуск** через systemd (Linux)
3. **Делайте бекапы** MongoDB регулярно
4. **Мониторьте логи** на предмет ошибок
5. **Обновляйте зависимости** регулярно

---

## 🎯 ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ

### Автоматический запуск при загрузке системы (Linux):
```bash
# Создать systemd сервис
sudo nano /etc/systemd/system/steam-marketplace.service

[Unit]
Description=Steam Marketplace
After=network.target

[Service]
Type=simple
User=your_username
WorkingDirectory=/path/to/steam-marketplace
ExecStart=/path/to/start.sh
Restart=always

[Install]
WantedBy=multi-user.target

# Включить сервис
sudo systemctl enable steam-marketplace
sudo systemctl start steam-marketplace
```

---

## 📞 ПОДДЕРЖКА

При возникновении проблем:
1. Проверьте логи: `docker logs steam-marketplace-mongodb`
2. Проверьте статус: `curl http://localhost:3001/health`
3. Убедитесь, что все порты свободны: `netstat -tlnp`
4. Перезапустите систему: `./start.sh`

---

**🎉 Готово! Система настроена и готова к использованию!**
