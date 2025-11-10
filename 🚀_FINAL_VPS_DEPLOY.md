# 🚀 ФИНАЛЬНЫЙ ДЕПЛОЙ НА VPS PS.KZ

## ✅ ИСПРАВЛЕНО

- ✅ .env.production - MONGODB_URI и REDIS_URL исправлены для Docker
- ✅ nginx/nginx.prod.conf - домен изменен на sgomarket.com
- ✅ Docker-compose готов к запуску
- ✅ Steam API Key: E1FC69B3707FF57C6267322B0271A86B

---

## 📋 БЫСТРЫЙ ДЕПЛОЙ (5 ШАГОВ)

### ШАГ 1: Подключение к VPS
```bash
ssh root@YOUR_VPS_IP
```

### ШАГ 2: Установка Docker
```bash
apt update
apt install -y docker.io docker-compose git
systemctl start docker
systemctl enable docker
```

### ШАГ 3: Загрузка проекта
```bash
git clone https://github.com/YOUR_USERNAME/SteamMarketplace2.git
cd SteamMarketplace2
```

### ШАГ 4: Настройка .env.production
```bash
# Отредактируйте файл
nano .env.production

# Или скопируйте готовый
cp .env.production.fixed .env.production

# Сгенерируйте секреты
./generate-secrets.sh
```

### ШАГ 5: Деплой
```bash
# Остановите старые контейнеры (если есть)
docker-compose -f docker-compose.prod.yml down

# Запустите
docker-compose -f docker-compose.prod.yml up -d --build

# Проверьте
docker ps
curl http://localhost/api/health
```

---

## 🔐 ГЕНЕРАЦИЯ СЕКРЕТОВ

```bash
# Создайте файл generate-secrets.sh
cat > generate-secrets.sh << 'EOF'
#!/bin/bash
echo "Генерирую секреты..."

# JWT_SECRET (64 символа)
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
echo "JWT_SECRET=$JWT_SECRET" > .env.secrets

# SESSION_SECRET (32 символа)
SESSION_SECRET=$(openssl rand -base64 32 | tr -d '\n')
echo "SESSION_SECRET=$SESSION_SECRET" >> .env.secrets

# MONGO_ROOT_PASSWORD
MONGO_PASSWORD=$(openssl rand -base32 16)
echo "MONGO_ROOT_PASSWORD=$MONGO_PASSWORD" >> .env.secrets

# REDIS_PASSWORD
REDIS_PASSWORD=$(openssl rand -base32 16)
echo "REDIS_PASSWORD=$REDIS_PASSWORD" >> .env.secrets

# Добавьте в .env.production
cat .env.secrets >> .env.production

echo "✅ Секреты сгенерированы и добавлены в .env.production"
echo "⚠️  Сохраните .env.secrets в безопасном месте!"
EOF

chmod +x generate-secrets.sh
./generate-secrets.sh
```

---

## 🌐 НАСТРОЙКА ДОМЕНА

### В панели управления доменом sgomarket.com:

```bash
# Удалите старые записи Cloudflare Tunnel
# Добавьте A-записи:
Type: A
Name: @
Value: YOUR_VPS_IP

Type: A
Name: www
Value: YOUR_VPS_IP
```

---

## 🧪 ПРОВЕРКА РАБОТЫ

```bash
# 1. Статус контейнеров
docker ps

# Ожидаемый вывод:
# steam-marketplace-app      ... Up
# steam-marketplace-mongodb  ... Up
# steam-marketplace-redis    ... Up
# steam-marketplace-nginx    ... Up

# 2. Health check
curl http://localhost/api/health

# Ожидаемый результат:
# {"status":"healthy",...}

# 3. Steam OAuth
curl -I http://localhost/api/auth/steam

# Ожидаемый результат:
# HTTP/1.1 302 Found
# Location: https://steamcommunity.com/openid/login

# 4. Откройте в браузере
# http://sgomarket.com
# https://sgomarket.com
```

---

## 📊 МОНИТОРИНГ

```bash
# Логи в реальном времени
docker-compose -f docker-compose.prod.yml logs -f

# Статистика контейнеров
docker stats

# Использование диска
df -h

# Использование памяти
free -h

# Процессы на портах
netstat -tulpn | grep -E '(80|443|3001|27017|6379)'
```

---

## 🔄 ОБНОВЛЕНИЕ ПРОЕКТА

```bash
# Создайте update.sh
cat > update.sh << 'EOF'
#!/bin/bash
echo "=== ОБНОВЛЕНИЕ САЙТА ==="

cd /root/SteamMarketplace2

# Остановите
docker-compose -f docker-compose.prod.yml down

# Обновите код
git pull origin main

# Запустите
docker-compose -f docker-compose.prod.yml up -d --build

# Проверьте
docker ps | grep Up

echo "✅ Обновление завершено!"
EOF

chmod +x update.sh

# Используйте
./update.sh
```

---

## 💾 БЭКАП

```bash
# Создайте backup.sh
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/backups"

mkdir -p $BACKUP_DIR

# База данных
docker exec steam-marketplace-mongodb mongodump --out /tmp/mongo_$DATE
tar -czf $BACKUP_DIR/mongodb_$DATE.tar.gz -C /tmp mongo_$DATE
rm -rf /tmp/mongo_$DATE

# Файлы
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /root/SteamMarketplace2

echo "✅ Бэкап сохранен в $BACKUP_DIR/"
EOF

chmod +x backup.sh

# Настройте cron для автоматического бэкапа
# (добавить в crontab: 0 2 * * * /root/SteamMarketplace2/backup.sh)
```

---

## 🔧 УСТРАНЕНИЕ ПРОБЛЕМ

### Проблема: Контейнер не запускается
```bash
# Проверьте логи
docker-compose -f docker-compose.prod.yml logs app

# Проверьте конфигурацию
docker-compose -f docker-compose.prod.yml config
```

### Проблема: База не подключается
```bash
# Проверьте MongoDB
docker exec -it steam-marketplace-mongodb mongosh
# Выполните: db.adminCommand({ping: 1})

# Проверьте Redis
docker exec -it steam-marketplace-redis redis-cli
# Выполните: ping
```

### Проблема: Порт занят
```bash
# Найдите процесс
lsof -i :80
lsof -i :443

# Остановите его
kill -9 PID
```

### Проблема: Не работает Steam OAuth
```bash
# Проверьте .env.production
grep -E "(BASE_URL|STEAM)" .env.production

# BASE_URL должен быть: https://sgomarket.com
# STEAM_API_KEY должен быть: E1FC69B3707FF57C6267322B0271A86B
```

---

## 🎯 ИТОГ

После успешного деплоя:

- ✅ **sgomarket.com** работает
- ✅ **Steam OAuth** перенаправляет на Steam
- ✅ **HTTPS** доступен (после настройки SSL)
- ✅ **Стабильная работа** 24/7
- ✅ **Автоматическое обновление** через git pull
- ✅ **Бэкапы** настроены
- ✅ **Мониторинг** работает

---

## 📞 ДОКУМЕНТАЦИЯ

- **🚀_VPS_QUICK_DEPLOY.md** - краткая инструкция
- **VPS_DEPLOY_GUIDE.md** - полный гайд
- **CHOOSE_DEPLOYMENT.md** - сравнение вариантов

---

## ⚡ ГОТОВО К ДЕПЛОЮ!

**Ваш проект готов к запуску на VPS PS.kz! 🚀**
