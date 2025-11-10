# 🎯 Полное руководство: Развертывание на ps.kz

## 🎬 Введение

Добро пожаловать в руководство по развертыванию Steam Marketplace на хостинге ps.kz!

**Что мы будем делать:**
1. Подготовим VPS на ps.kz
2. Настроим Docker и Docker Compose
3. Загрузим и настроим приложение
4. Настроим домен и SSL
5. Протестируем работоспособность

---

## 📊 Варианты хостинга на ps.kz

### VPS (Виртуальный сервер) - РЕКОМЕНДУЕТСЯ ⭐
**Цена:** от 2500 тенге/месяц
**Характеристики:**
- CPU: 2-4 ядра
- RAM: 4-8 GB
- SSD: 50-100 GB
- OS: Ubuntu 20.04/22.04
- Полный root доступ
- Возможность установки любого ПО

**Преимущества:**
- ✅ Полный контроль
- ✅ Можно установить Node.js, MongoDB, Redis
- ✅ Docker поддерживается
- ✅ Можно настроить Nginx, SSL
- ✅ Подходит для production

### Shared Hosting - НЕ ПОДХОДИТ ❌
**Цена:** от 500 тенге/месяц
**Ограничения:**
- ❌ Нет Node.js
- ❌ Нет SSH
- ❌ Только PHP/MySQL
- ❌ Ограниченные настройки

**Вывод:** Только VPS!

---

## 🚀 Пошаговая инструкция

### ШАГ 1: Заказ VPS на ps.kz

1. **Зайти на сайт:** https://ps.kz
2. **Выбрать:** "VPS хостинг"
3. **Выбрать тариф** (минимум):
   - CPU: 2 ядра
   - RAM: 4 GB
   - SSD: 50 GB
   - OS: Ubuntu 22.04 LTS
4. **Оплатить** заказ
5. **Получить данные:**
   - IP адрес сервера
   - Логин (обычно root)
   - Пароль (или ключ)

### ШАГ 2: Подключение к серверу

```bash
# Подключение по SSH
ssh root@IP_СЕРВЕРА

# При первом входе система попросит сменить пароль
# Обязательно установите надежный пароль!
```

### ШАГ 3: Установка Docker

```bash
# Обновление пакетов
sudo apt update && sudo apt upgrade -y

# Установка необходимых пакетов
sudo apt install curl wget git -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Добавление пользователя в группу docker
sudo usermod -aG docker $USER
newgrp docker

# Проверка установки
docker --version
docker-compose --version
```

### ШАГ 4: Загрузка проекта на сервер

**Вариант A: Git clone (если проект в Git)**
```bash
cd /var/www
git clone https://github.com/yourusername/steam-marketplace.git
cd steam-marketplace
```

**Вариант B: Ручная загрузка (рекомендуется)**
```bash
# Создать папку
sudo mkdir -p /var/www/steam-marketplace
cd /var/www/steam-marketplace

# Сжать проект в архив на локальном компьютере
# Загрузить через SFTP/SCP на сервер
# Или использовать FileZilla, WinSCP
```

### ШАГ 5: Настройка Production файлов

1. **Скопировать .env.production:**
```bash
cp .env.example .env.production
nano .env.production
```

2. **Заполнить переменные:**

```env
NODE_ENV=production
PORT=3001
BASE_URL=https://yourdomain.ps.kz
CLIENT_URL=https://yourdomain.ps.kz

# MongoDB (локально в Docker)
MONGODB_URI=mongodb://mongodb:27017/steam-marketplace

# Redis (локально в Docker)
REDIS_URL=redis://redis:6379

# Безопасность - СГЕНЕРИРУЙТЕ СВОИ!
JWT_SECRET=your_super_secret_jwt_key_64_chars_minimum
SESSION_SECRET=your_super_secret_session_key_32_chars

# Steam API - СОЗДАЙТЕ НОВЫЙ ДЛЯ ДОМЕНА!
STEAM_API_KEY=NEW_API_KEY_FOR_YOUR_DOMAIN
STEAM_CLIENT_ID=NEW_API_KEY_FOR_YOUR_DOMAIN
STEAM_CLIENT_SECRET=NEW_API_KEY_FOR_YOUR_DOMAIN

# Steam Bot
STEAM_BOT_1_USERNAME=your_bot_username
STEAM_BOT_1_PASSWORD=your_bot_password
STEAM_BOT_1_SHARED_SECRET=your_shared_secret
STEAM_BOT_1_IDENTITY_SECRET=your_identity_secret
```

3. **Генерация секретов:**
```bash
# Генерация JWT_SECRET (64+ символов)
openssl rand -base64 64

# Генерация SESSION_SECRET (32+ символов)
openssl rand -base64 32
```

### ШАГ 6: Создание Steam API Key для домена

1. **Зайти на:** https://steamcommunity.com/dev/apikey
2. **Заполнить форму:**
   - **Domain:** yourdomain.ps.kz (без http/https)
   - **Notes:** Steam Marketplace Production
3. **Получить API Key**
4. **Вставить в .env.production**

### ШАГ 7: Первый запуск

```bash
# Перейти в папку проекта
cd /var/www/steam-marketplace

# Сборка и запуск
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Проверка статуса
docker-compose -f docker-compose.prod.yml ps

# Просмотр логов
docker-compose -f docker-compose.prod.yml logs -f
```

### ШАГ 8: Проверка работы

```bash
# Локальная проверка
curl http://localhost:3001/api/health

# Должно вернуть JSON с status: "healthy"
```

### ШАГ 9: Настройка домена в ps.kz

1. **В панели ps.kz:**
   - Зайти в "Домены" → "Мои домены"
   - Выбрать ваш домен
   - Нажать "DNS записи"

2. **Добавить A-записи:**
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

3. **Сохранить и подождать** (до 24 часов, обычно 5-10 минут)

### ШАГ 10: Настройка SSL (HTTPS)

**Автоматически с Let's Encrypt:**

```bash
# Установить Certbot
sudo apt install certbot python3-certbot-nginx -y

# Получить сертификат (замените домен!)
sudo certbot --nginx -d yourdomain.ps.kz -d www.yourdomain.ps.kz

# Проверить автообновление
sudo systemctl status certbot.timer
```

**Вручную с готовыми сертификатами:**

```bash
# Создать папку для сертификатов
mkdir -p /var/www/steam-marketplace/nginx/ssl

# Загрузить файлы сертификатов:
# - cert.pem (сертификат)
# - key.pem (приватный ключ)

# Отредактировать nginx/nginx.prod.conf
nano nginx/nginx.prod.conf
# В строке 59 заменить yourdomain.ps.kz на ваш домен
```

### ШАГ 11: Перезапуск с SSL

```bash
# Пересобрать nginx с новым конфигом
docker-compose -f docker-compose.prod.yml restart nginx

# Проверить HTTPS
curl https://yourdomain.ps.kz/api/health
```

---

## 🎯 Финальная проверка

### Проверить все endpoints:

```bash
# Health check
curl https://yourdomain.ps.kz/api/health

# Metrics
curl https://yourdomain.ps.kz/api/metrics/summary

# Swagger API docs
curl https://yourdomain.ps.kz/api-docs

# MVP stats
curl https://yourdomain.ps.kz/api/mvp/stats
```

### Ожидаемый результат:
- ✅ Все запросы возвращают 200 OK
- ✅ HTTPS работает
- ✅ SSL сертификат валидный
- ✅ API отвечает
- ✅ Бот активен

---

## 🔧 Управление после деплоя

### Просмотр логов:
```bash
# Все сервисы
docker-compose -f docker-compose.prod.yml logs -f

# Только приложение
docker-compose -f docker-compose.prod.yml logs -f app

# Только MongoDB
docker-compose -f docker-compose.prod.yml logs -f mongodb
```

### Перезапуск сервисов:
```bash
# Перезапуск всего
docker-compose -f docker-compose.prod.yml restart

# Перезапуск только приложения
docker-compose -f docker-compose.prod.yml restart app
```

### Остановка:
```bash
docker-compose -f docker-compose.prod.yml down
```

### Обновление приложения:
```bash
# Остановить
docker-compose -f docker-compose.prod.yml down

# Обновить код
git pull origin main

# Запустить заново
./scripts/deploy.sh
```

### Мониторинг ресурсов:
```bash
# Использование CPU/RAM
docker stats

# Дисковое пространство
df -h

# Память
free -m
```

---

## 🛡️ Безопасность

### Настроить файрвол:
```bash
# Установка UFW
sudo apt install ufw -y

# Настройка правил
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443

# Включение
sudo ufw enable

# Проверка статуса
sudo ufw status
```

### Отключить root вход (опционально):
```bash
# Создать нового пользователя
sudo adduser deploy
sudo usermod -aG sudo deploy
sudo usermod -aG docker deploy

# Настроить SSH ключи
sudo mkdir /home/deploy/.ssh
sudo cp ~/.ssh/authorized_keys /home/deploy/.ssh/
sudo chown -R deploy:deploy /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys

# Отключить root вход
sudo nano /etc/ssh/sshd_config
# Изменить: PermitRootLogin yes → PermitRootLogin no
sudo systemctl restart sshd
```

---

## 📊 Мониторинг

### Настроить Logrotate:
```bash
sudo nano /etc/logrotate.d/steam-marketplace
```

Вставить:
```
/var/www/steam-marketplace/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 deploy deploy
    postrotate
        docker-compose -f /var/www/steam-marketplace/docker-compose.prod.yml restart app
    endscript
}
```

### Создать backup скрипт:
```bash
cat > /home/deploy/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/deploy/backups"

mkdir -p $BACKUP_DIR

# Backup MongoDB
docker exec steam-marketplace-mongodb mongodump --out /backup/$DATE

# Создать архив
tar -czf $BACKUP_DIR/mongodb_$DATE.tar.gz -C /var/lib/docker/volumes/steam-marketplace_mongodb_data/_data .

# Удалить старые бэкапы (старше 7 дней)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup created: $BACKUP_DIR/mongodb_$DATE.tar.gz"
