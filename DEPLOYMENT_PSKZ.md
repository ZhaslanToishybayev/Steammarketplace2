# 🚀 Развертывание Steam Marketplace на ps.kz

## 📋 Варианты развертывания:

### ✅ Вариант 1: VPS на ps.kz (РЕКОМЕНДУЕТСЯ)
**Подходит для:** Полного контроля над приложением

**Шаги:**
1. Заказать VPS на ps.kz (Ubuntu 20.04/22.04)
2. Подключиться по SSH
3. Установить Node.js 18+, MongoDB, Redis
4. Скачать проект
5. Настроить .env для production
6. Запустить через PM2
7. Настроить Nginx как reverse proxy
8. Привязать домен

**Команды:**
```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установка MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-4.4.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/4.4 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.4.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Установка Redis
sudo apt install redis-server -y

# Клонирование проекта
git clone <your-repo-url> /var/www/steam-marketplace
cd /var/www/steam-marketplace

# Установка зависимостей
npm ci --production

# Настройка .env
sudo nano .env

# Запуск через PM2
npm install -g pm2
pm2 start app.js --name steam-marketplace
pm2 startup
pm2 save
```

---

### ✅ Вариант 2: Облачный деплой + домен ps.kz
**Подходит для:** Быстрого запуска

**Платформы:** Vercel, Render, Railway, Heroku
**Домен:** Указать ps.kz в настройках домена

**Шаги:**
1. Задеплоить на Vercel/Render
2. В панели ps.kz: Указать DNS записи
3. Привязать домен

---

### ✅ Вариант 3: Shared Hosting (ограниченно)
**Подходит для:** Только статического сайта

**Ограничения:**
- Нет Node.js
- Нет MongoDB
- Только frontend

---

## 🔧 Подготовка проекта к деплою:

### 1. Создать .env.production
```env
NODE_ENV=production
PORT=3001
BASE_URL=https://yourdomain.ps.kz
CLIENT_URL=https://yourdomain.ps.kz

MONGODB_URI=mongodb://localhost:27017/steam-marketplace
REDIS_URL=redis://localhost:6379

JWT_SECRET=YOUR_SUPER_SECRET_JWT_KEY
SESSION_SECRET=YOUR_SUPER_SECRET_SESSION_KEY

STEAM_API_KEY=YOUR_PRODUCTION_STEAM_KEY
STEAM_CLIENT_ID=YOUR_PRODUCTION_STEAM_KEY
STEAM_CLIENT_SECRET=YOUR_PRODUCTION_STEAM_KEY

STEAM_BOT_1_USERNAME=your_bot_username
STEAM_BOT_1_PASSWORD=your_bot_password
STEAM_BOT_1_SHARED_SECRET=your_shared_secret
STEAM_BOT_1_IDENTITY_SECRET=your_identity_secret
```

### 2. Создать Dockerfile (для Docker деплоя)
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD ["node", "app.js"]
```

### 3. Создать docker-compose.prod.yml
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - mongodb
      - redis
  mongodb:
    image: mongo:4.4
    volumes:
      - mongodb_data:/data/db
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  mongodb_data:
  redis_data:
```

---

## 🌐 Настройка домена на ps.kz:

### Шаг 1: В панели ps.kz
- Зайти в "Управление доменами"
- Выбрать ваш домен
- Перейти в "DNS записи"

### Шаг 2: Добавить записи
```
Тип: A
Имя: @
Значение: IP_VPS_СЕРВЕРА
TTL: 3600

Тип: A
Имя: www
Значение: IP_VPS_СЕРВЕРА
TTL: 3600
```

### Шаг 3: Настроить SSL (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.ps.kz -d www.yourdomain.ps.kz
```

---

## 📊 Мониторинг:

### Health Check
```bash
curl https://yourdomain.ps.kz/api/health
```

### Мониторинг PM2
```bash
pm2 status
pm2 logs steam-marketplace
pm2 monit
```

### Мониторинг системы
```bash
htop
df -h
free -m
```

---

## 🔄 Обновление приложения:

```bash
cd /var/www/steam-marketplace
git pull origin main
npm ci --production
pm2 restart steam-marketplace
```

---

## 🚨 Важные замечания:

1. **Steam API Key:** Создать новый для production домена
2. **Безопасность:** 
   - Настроить файрвол (ufw)
   - Отключить root вход
   - Использовать SSH ключи
3. **Backup:** Настроить регулярные бэкапы БД
4. **Мониторинг:** Настроить alerts
5. **Logs:** Настроить logrotate

---

## 🎯 Следующие шаги:

1. Выберите вариант развертывания
2. Сообщите, какой домен на ps.kz
3. Я подготовлю детальные инструкции
4. Помогу с настройкой

**Готовы начать? Какой вариант предпочитаете?**
