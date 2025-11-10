# 🚀 ДЕПЛОЙ НА VPS PS.KZ

## ✅ ЧТО У НАС ЕСТЬ

- ✅ Dockerfile (готов)
- ✅ docker-compose.prod.yml (полная конфигурация)
- ✅ Nginx конфигурация
- ✅ .env.production (настроен для sgomarket.com)
- ✅ Steam API Key: E1FC69B3707FF57C6267322B0271A86B

---

## 📋 ЭТАПЫ ДЕПЛОЯ

### ШАГ 1: Подключение к VPS

```bash
# SSH подключение
ssh root@YOUR_VPS_IP

# Или с ключом
ssh -i your-key.pem root@YOUR_VPS_IP
```

---

### ШАГ 2: Установка Docker

```bash
# Ubuntu/Debian
apt update
apt install -y docker.io docker-compose

# Или официальный скрипт
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

---

### ШАГ 3: Загрузка проекта на VPS

**ВАРИАНТ А: Git (рекомендуется)**
```bash
# Клонируйте репозиторий
git clone https://github.com/YOUR_USERNAME/SteamMarketplace2.git
cd SteamMarketplace2

# Или обновите существующий
cd SteamMarketplace2
git pull origin main
```

**ВАРИАНТ Б: SCP**
```bash
# Загрузите архив
scp -r ./Steammarketplace2-main root@YOUR_VPS_IP:/root/
```

**ВАРИАНТ В: rsync**
```bash
rsync -avz --progress ./Steammarketplace2-main/ root@YOUR_VPS_IP:/root/SteamMarketplace2/
```

---

### ШАГ 4: Настройка .env.production

На VPS отредактируйте файл:
```bash
cd SteamMarketplace2
nano .env.production
```

**Измените:**
- MONGODB_URI=mongodb://mongodb:27017/steam-marketplace
- REDIS_URL=redis://redis:6379

```bash
# ===========================================
# 🚀 STEAM MARKETPLACE - PRODUCTION
# ===========================================

NODE_ENV=production
PORT=3001
LOG_LEVEL=info

# Domain: sgomarket.com
BASE_URL=https://sgomarket.com
CLIENT_URL=https://sgomarket.com

# Database
MONGODB_URI=mongodb://mongodb:27017/steam-marketplace
REDIS_URL=redis://redis:6379

# Security (ГЕНЕРИРУЙТЕ НОВЫЕ!)
JWT_SECRET=GENERATE_STRONG_SECRET_HERE_MIN_64_CHARS
SESSION_SECRET=GENERATE_STRONG_SESSION_SECRET_MIN_32_CHARS

# Steam Integration
STEAM_API_KEY=E1FC69B3707FF57C6267322B0271A86B
STEAM_CLIENT_ID=E1FC69B3707FF57C6267322B0271A86B
STEAM_CLIENT_SECRET=E1FC69B3707FF57C6267322B0271A86B

# Steam Bot
STEAM_BOT_1_USERNAME=Sgovt1
STEAM_BOT_1_PASSWORD=Szxc123!
STEAM_BOT_1_SHARED_SECRET=LVke3WPKHWzT8pCNSemh2FMuJ90=
STEAM_BOT_1_IDENTITY_SECRET=fzCjA+NZa0b3yOeEMhln81qgNM4=
```

**Сгенерируйте секреты:**
```bash
# Сгенерируйте JWT_SECRET (64 символа)
openssl rand -base64 64

# Сгенерируйте SESSION_SECRET (32 символа)
openssl rand -base64 32
```

---

### ШАГ 5: Запуск через Docker

```bash
# Остановите все контейнеры
docker-compose -f docker-compose.prod.yml down

# Запустите в продакшене
docker-compose -f docker-compose.prod.yml up -d

# Проверьте логи
docker-compose -f docker-compose.prod.yml logs -f
```

---

### ШАГ 6: Проверка

```bash
# Проверьте контейнеры
docker ps

# Проверьте health
curl http://localhost/api/health

# Проверьте Steam OAuth
curl -I http://localhost/api/auth/steam
```

---

## 🌐 НАСТРОЙКА NGINX

### Если домен указывает на ваш VPS:

```bash
# Убедитесь что A-запись домена указывает на ваш VPS IP
# sgomarket.com -> YOUR_VPS_IP
```

### Проверьте nginx конфигурацию:
```bash
# Файл: nginx/nginx.prod.conf
```

---

## 🔄 АВТООБНОВЛЕНИЕ

### Создайте скрипт обновления:
```bash
cat > update.sh << 'EOF'
#!/bin/bash
echo "=== ОБНОВЛЕНИЕ САЙТА ==="

cd /root/SteamMarketplace2

# Обновление кода
git pull origin main

# Пересборка и запуск
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

echo "✅ Обновление завершено!"
EOF

chmod +x update.sh
```

---

## 🔧 ПОЛЕЗНЫЕ КОМАНДЫ

### Просмотр логов:
```bash
# Все сервисы
docker-compose -f docker-compose.prod.yml logs

# Только приложение
docker-compose -f docker-compose.prod.yml logs app

# Логи в реальном времени
docker-compose -f docker-compose.prod.yml logs -f
```

### Перезапуск:
```bash
docker-compose -f docker-compose.prod.yml restart
```

### Остановка:
```bash
docker-compose -f docker-compose.prod.yml down
```

### Обновление без простоев:
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 🧪 ПРОВЕРКА РАБОТЫ

```bash
# 1. Проверьте что контейнеры запущены
docker ps

# 2. Проверьте health
curl http://localhost/api/health

# 3. Проверьте Steam OAuth
curl -I http://localhost/api/auth/steam

# 4. Откройте в браузере
https://sgomarket.com
```

**Ожидаемый результат:**
- ✅ HTTP 200 для /api/health
- ✅ HTTP 302 для /api/auth/steam (redirect на Steam)
- ✅ Сайт открывается по адресу https://sgomarket.com

---

## 🛠️ УСТРАНЕНИЕ ПРОБЛЕМ

### Если не запускается:
```bash
# Проверьте логи
docker-compose -f docker-compose.prod.yml logs

# Проверьте порты
netstat -tulpn | grep -E '(80|443|3001|27017|6379)'

# Пересоздайте контейнеры
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d
```

### Если база не подключается:
```bash
# Проверьте MongoDB
docker exec -it steam-marketplace-mongodb mongosh

# Проверьте Redis
docker exec -it steam-marketplace-redis redis-cli
```

---

## 📦 СТРУКТУРА ПРОЕКТА НА VPS

```
/root/SteamMarketplace2/
├── app.js
├── package.json
├── Dockerfile
├── docker-compose.prod.yml
├── .env.production
├── nginx/
│   ├── nginx.prod.conf
│   └── ssl/
├── frontend/
├── routes/
├── models/
├── services/
├── utils/
└── ... (остальные файлы)
```

---

## 🎯 ИТОГ

После деплоя:
- ✅ **sgomarket.com** доступен из интернета
- ✅ **Steam OAuth** работает
- ✅ **HTTPS** (если настроен SSL)
- ✅ **Стабильная работа** 24/7
- ✅ **Масштабируемость** через Docker

---

## ⚠️ ВАЖНЫЕ МОМЕНТЫ

1. **Домен** - A-запись sgomarket.com должен указывать на IP вашего VPS
2. **Порты** - откройте порты 80 и 443 в firewall
3. **SSL** - настройте Let's Encrypt для HTTPS
4. **Бэкапы** - настройте регулярные бэкапы базы данных
5. **Мониторинг** - настройте логирование и мониторинг

---

## 📞 ПОДДЕРЖКА

**Документация:**
- DEPLOYMENT.md - полная документация
- PHASE*_COMPLETE.md - фазы разработки
- Проверьте логи: `docker-compose -f docker-compose.prod.yml logs`
