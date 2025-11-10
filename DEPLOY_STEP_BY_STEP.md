# 🚀 ПОШАГОВЫЙ ДЕПЛОЙ НА VPS

## ✅ ШАГ 1: Проверьте Docker

```bash
docker --version
docker-compose --version
```

**Если не установлен → переходите к ШАГ 2**
**Если установлен → переходите к ШАГ 3**

---

## ✅ ШАГ 2: Установите Docker

```bash
# Обновите пакеты
apt update

# Установите Docker
apt install -y docker.io docker-compose git

# Запустите Docker
systemctl start docker
systemctl enable docker

# Проверьте
docker --version
systemctl is-active docker
```

**Результат:** Docker установлен и запущен ✅

---

## ✅ ШАГ 3: Загрузите проект

**Вариант A: Git (если проект уже на GitHub)**
```bash
# Замените YOUR_USERNAME на ваш GitHub username
git clone https://github.com/YOUR_USERNAME/SteamMarketplace2.git
cd SteamMarketplace2
```

**Вариант B: С вашего компьютера через SCP**
```bash
# На ВАШЕМ КОМПЬЮТЕРЕ (не на VPS) выполните:
# Замените YOUR_VPS_IP на IP вашего VPS
scp -r ./Steammarketplace2-main/* root@YOUR_VPS_IP:/root/SteamMarketplace2/
```

```bash
# Затем на VPS:
mkdir -p /root/SteamMarketplace2
# (загрузите файлы через SCP, FileZilla или WinSCP)
```

**Результат:** Проект загружен на VPS ✅

---

## ✅ ШАГ 4: Подготовьте конфигурацию

```bash
cd /root/SteamMarketplace2

# Проверьте, что файл существует
ls -la .env.production

# Если файла нет, скопируйте шаблон
if [ ! -f .env.production ]; then
    cp .env.production.fixed .env.production 2>/dev/null || echo "Создайте .env.production вручную"
fi
```

**Отредактируйте .env.production:**
```bash
nano .env.production
```

**В файле измените:**

```bash
# Найдите строки:
MONGODB_URI=mongodb://localhost:27017/steam-marketplace
REDIS_URL=redis://localhost:6379

# Замените на:
MONGODB_URI=mongodb://mongodb:27017/steam-marketplace
REDIS_URL=redis://redis:6379
```

**Сохраните:** Ctrl+X → Y → Enter

**Результат:** Конфигурация настроена ✅

---

## ✅ ШАГ 5: Сгенерируйте секреты

```bash
# Сделайте скрипт исполняемым
chmod +x generate-secrets.sh

# Запустите генерацию
./generate-secrets.sh
```

**Результат:** Секреты сгенерированы ✅

---

## ✅ ШАГ 6: Запустите контейнеры

```bash
# Остановите старые контейнеры (если есть)
docker-compose -f docker-compose.prod.yml down

# Запустите новые
docker-compose -f docker-compose.prod.yml up -d --build
```

**Это займет 5-10 минут (первый запуск)**

**Результат:** Контейнеры запущены ✅

---

## ✅ ШАГ 7: Проверьте работу

```bash
# Статус контейнеров
docker ps
```

**Ожидаемый вывод:**
```
CONTAINER ID   IMAGE                           COMMAND                  CREATED         STATUS         PORTS
xxxxxxxxxxxx   steam-marketplace-app           "docker-entrypoint.s…"   2 minutes ago   Up 1 second    3001/tcp
xxxxxxxxxxxx   mongo:4.4                       "docker-entrypoint.s…"   2 minutes ago   Up 2 minutes   0.0.0.0:27017->27017/tcp
xxxxxxxxxxxx   redis:7-alpine                  "docker-entrypoint.s…"   2 minutes ago   Up 2 minutes   0.0.0.0:6379->6379/tcp
xxxxxxxxxxxx   nginx:alpine                    "/docker-entrypoint.…"   2 minutes ago   Up 1 second    0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

```bash
# Health check
curl http://localhost/api/health
```

**Ожидаемый результат:**
```json
{"status":"healthy","timestamp":"2025-11-10T...","uptime":...}
```

```bash
# Steam OAuth
curl -I http://localhost/api/auth/steam
```

**Ожидаемый результат:**
```
HTTP/1.1 302 Found
Location: https://steamcommunity.com/openid/login
```

---

## ✅ ШАГ 8: Настройте домен

В панели управления доменом sgomarket.com:

```bash
# Удалите старые записи
# (записи Cloudflare Tunnel если есть)

# Добавьте A-записи:
Type: A
Name: @
Value: YOUR_VPS_IP (например: 123.456.789.123)

Type: A
Name: www
Value: YOUR_VPS_IP
```

**Подождите 5-15 минут для обновления DNS**

---

## ✅ ШАГ 9: Проверьте сайт

```bash
# По IP (сразу)
curl http://YOUR_VPS_IP/api/health

# По домену (через 5-15 минут)
curl http://sgomarket.com/api/health
curl -I http://sgomarket.com/api/auth/steam
```

**Откройте в браузере:**
- http://YOUR_VPS_IP
- http://sgomarket.com
- https://sgomarket.com

---

## 🔧 ПОЛЕЗНЫЕ КОМАНДЫ

**Логи:**
```bash
# Все сервисы
docker-compose -f docker-compose.prod.yml logs

# Только приложение
docker-compose -f docker-compose.prod.yml logs app

# В реальном времени
docker-compose -f docker-compose.prod.yml logs -f
```

**Управление:**
```bash
# Перезапуск
docker-compose -f docker-compose.prod.yml restart

# Остановка
docker-compose -f docker-compose.prod.yml down

# Запуск
docker-compose -f docker-compose.prod.yml up -d
```

**Статус:**
```bash
# Контейнеры
docker ps

# Статистика
docker stats

# Диск
df -h
```

**Обновление проекта:**
```bash
git pull origin main
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## ❌ ЕСЛИ НЕ РАБОТАЕТ

**Проблема: "docker: command not found"**
```bash
# Установите Docker
apt update
apt install -y docker.io
systemctl start docker
```

**Проблема: "Port 80 already in use"**
```bash
# Найдите процесс
lsof -i :80
# Остановите его
kill -9 PID
```

**Проблема: "Container keeps restarting"**
```bash
# Проверьте логи
docker-compose -f docker-compose.prod.yml logs app

# Проверьте .env.production
cat .env.production
```

**Проблема: "Cannot connect to database"**
```bash
# Перезапустите только базы
docker-compose -f docker-compose.prod.yml restart mongodb redis
```

**Проблема: "Site not accessible"**
```bash
# Проверьте nginx
docker-compose -f docker-compose.prod.yml logs nginx

# Проверьте порты
netstat -tulpn | grep -E '(80|443)'
```

---

## 📞 НУЖНА ПОМОЩЬ?

**Отправьте вывод команды:**
```bash
docker-compose -f docker-compose.prod.yml ps
```

**И покажите логи:**
```bash
docker-compose -f docker-compose.prod.yml logs --tail=50
```

---

## 🎉 ГОТОВО!

После выполнения всех шагов:
- ✅ sgomarket.com работает
- ✅ Steam OAuth перенаправляет на Steam
- ✅ Стабильная работа 24/7

**Поздравляем! Ваш сайт задеплоен! 🚀**
