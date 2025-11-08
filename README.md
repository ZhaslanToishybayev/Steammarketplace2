# 🔥 Steam Marketplace

> Современная платформа для торговли CS2 скинами с интеграцией Steam

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-16%2B-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4.4-brightgreen.svg)](https://www.mongodb.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

---

## 🚀 Быстрый старт

### Одно-командное развертывание:

```bash
git clone <repository-url>
cd steam-marketplace
./start.sh
```

**Готово!** Откройте http://localhost:5173 в браузере

---

## ✨ Возможности

- 🔐 **Авторизация через Steam** - быстрый вход через Steam OAuth
- 🤖 **Автоматические Steam боты** - боты для торговли скинами
- 💾 **Локальная MongoDB** - полный контроль над данными
- ⚡ **React + Vite** - быстрый современный frontend
- 🔒 **JWT авторизация** - безопасная аутентификация
- 💳 **Stripe интеграция** - платежная система (опционально)
- 📡 **Real-time** - Socket.io для мгновенных обновлений
- 🛡️ **Security** - Helmet, Rate Limiting, CORS

---

## 📋 Системные требования

| Компонент | Минимальная версия |
|-----------|--------------------|
| Node.js   | 16.x               |
| npm       | 8.x                |
| Docker    | 20.x               |
| Docker Compose | 2.x           |
| RAM       | 4GB                |
| Диск      | 2GB                |

**Поддерживаемые ОС:** Ubuntu 20.04+, macOS 10.15+, Windows 10+

---

## 🛠️ Установка вручную

### 1. Клонирование
```bash
git clone <repository-url>
cd steam-marketplace
```

### 2. Зависимости
```bash
# Backend
npm install

# Frontend
cd frontend && npm install && cd ..
```

### 3. Настройка
```bash
cp .env.example .env
# Обновите Steam API ключи в .env
```

### 4. Запуск
```bash
# MongoDB
docker-compose up -d mongodb

# Backend (новый терминал)
node app.js

# Frontend (новый терминал)
cd frontend && npm run dev
```

---

## 🔑 Получение Steam API ключа

1. Зайдите на https://steamcommunity.com/dev/apikey
2. Войдите в Steam аккаунт
3. Введите домен: `localhost`
4. Скопируйте ключ в `.env` как `STEAM_API_KEY`

---

## 🌍 URL после запуска

| Сервис | URL |
|--------|-----|
| **Frontend** | http://localhost:5173 |
| **Backend** | http://localhost:3001 |
| **Health Check** | http://localhost:3001/health |

---

## 📁 Структура проекта

```
steam-marketplace/
├── 📄 start.sh                 # Автозапуск
├── 📄 docker-compose.yml       # MongoDB
├── 📄 .env.example             # Пример конфига
├── 📄 README.md                # Этот файл
├── 📄 DEPLOYMENT_GUIDE.md      # Подробное руководство
├── 📁 frontend/                # React + Vite
│   ├── package.json
│   ├── src/
│   └── vite.config.js
├── 📁 backend/                 # Node.js + Express
│   ├── app.js
│   ├── routes/
│   ├── models/
│   └── services/
└── 📁 documentation/           # Документация
```

---

## 🔧 Управление

### Запуск
```bash
./start.sh
```

### Остановка
```bash
docker-compose down
pkill -f 'node app.js'
```

### Перезапуск
```bash
docker-compose restart mongodb
```

---

## 📊 Мониторинг

```bash
# Статус сервисов
curl http://localhost:3001/health

# Docker контейнеры
docker ps | grep mongo

# Логи MongoDB
docker logs -f steam-marketplace-mongodb
```

---

## 🐳 Docker команды

```bash
# Управление MongoDB
docker start steam-marketplace-mongodb
docker stop steam-marketplace-mongodb
docker logs steam-marketplace-mongodb

# Очистка
docker system prune -a
```

---

## 🆘 Устранение проблем

### MongoDB не запускается
```bash
netstat -tlnp | grep 27017
docker-compose down && docker-compose up -d
```

### Порт занят
```bash
# Проверить что использует порт
lsof -i :3001
lsof -i :5173
lsof -i :27017

# Убить процесс
kill -9 <PID>
```

### Зависимости не устанавливаются
```bash
npm cache clean --force
rm -rf node_modules frontend/node_modules
npm install && cd frontend && npm install
```

---

## 📚 Документация

- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Подробное руководство
- **[SYSTEM_WORKING_REPORT.md](SYSTEM_WORKING_REPORT.md)** - Отчет о состоянии системы

---

## 🎯 Стек технологий

### Backend
- Node.js 16+
- Express.js
- MongoDB 4.4
- Mongoose
- Passport.js (Steam OAuth)
- Steam API
- Socket.io
- JWT
- Winston (логи)

### Frontend
- React 18+
- Vite
- React Router
- Axios
- Socket.io Client
- Tailwind CSS

### DevOps
- Docker & Docker Compose
- MongoDB Docker
- Git

---

## 🔒 Безопасность

⚠️ **ВАЖНО для продакшена:**
- Изменить пароли по умолчанию
- Использовать HTTPS
- Настроить Firewall
- Отключить авторизацию MongoDB только в dev!
- Создать пользователей БД с правами
- НИКОГДА не коммитить `.env` в git!

---

## 📄 Лицензия

MIT License - подробности в файле [LICENSE](LICENSE)

---

## 🤝 Вклад

1. Fork проект
2. Создайте feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit изменения (`git commit -m 'Add AmazingFeature'`)
4. Push в branch (`git push origin feature/AmazingFeature`)
5. Откройте Pull Request

---

## 📞 Поддержка

При возникновении проблем:
1. Проверьте [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
2. Убедитесь что все зависимости установлены
3. Проверьте логи: `docker logs steam-marketplace-mongodb`

---

## 🎉 Спасибо!

**Приятного использования Steam Marketplace!** 🚀

⭐ Ставьте звездочку если проект полезен!

---

[![Made with ❤️](https://img.shields.io/badge/Made%20with-%E2%9D%A4%EF%B8%8F-red?style=for-the-badge)](https://github.com)
