# 🚀 БЫСТРЫЙ ДЕПЛОЙ НА VPS

## ✅ ГОТОВЫЕ ФАЙЛЫ

- **deploy-to-vps.sh** - автоматический деплой
- **docker-compose.prod.yml** - конфигурация
- **.env.production** - настройки (измените MONGODB_URI и REDIS_URL)
- **nginx/nginx.prod.conf** - веб-сервер

---

## 📋 ЧЕК-ЛИСТ

### 1. Подготовка VPS
```bash
# ✅ Ubuntu 20.04+ / Debian 11+
# ✅ Минимум 2GB RAM
# ✅ 20GB+ диск
# ✅ Открытые порты: 80, 443
```

### 2. Домен
```bash
# ✅ A-запись: sgomarket.com -> VPS_IP
# ✅ A-запись: www.sgomarket.com -> VPS_IP
```

### 3. Деплой (3 команды)
```bash
# 1. Загрузите проект на VPS
git clone https://github.com/YOUR_USERNAME/SteamMarketplace2.git
cd SteamMarketplace2

# 2. Настройте .env
nano .env.production
# Измените:
# MONGODB_URI=mongodb://mongodb:27017/steam-marketplace
# REDIS_URL=redis://redis:6379

# 3. Запустите
bash deploy-to-vps.sh
```

---

## ⚡ АВТОМАТИЧЕСКИЙ ДЕПЛОЙ

```bash
# Одна команда
curl -sSL https://raw.githubusercontent.com/YOUR_USERNAME/SteamMarketplace2/main/deploy-to-vps.sh | bash
```

---

## 🧪 ПРОВЕРКА РАБОТЫ

```bash
# 1. Статус контейнеров
docker ps

# 2. Health check
curl http://localhost/api/health

# 3. Steam OAuth
curl -I http://localhost/api/auth/steam

# 4. Откройте в браузере
https://sgomarket.com
```

**Ожидаемый результат:**
- ✅ HTTP 200 для /api/health
- ✅ HTTP 302 для /api/auth/steam
- ✅ Сайт открывается

---

## 🔧 ПОЛЕЗНЫЕ КОМАНДЫ

```bash
# Логи
docker-compose -f docker-compose.prod.yml logs -f

# Перезапуск
docker-compose -f docker-compose.prod.yml restart

# Обновление
git pull && bash deploy-to-vps.sh

# Остановка
docker-compose -f docker-compose.prod.yml down
```

---

## 📊 МОНИТОРИНГ

```bash
# Статус всех сервисов
docker-compose -f docker-compose.prod.yml ps

# Использование ресурсов
docker stats

# Диск
df -h

# Память
free -h
```

---

## 🛠️ УСТРАНЕНИЕ ПРОБЛЕМ

### Ошибка: порт занят
```bash
# Найдите процесс
lsof -i :80
lsof -i :443

# Остановите его
kill -9 PID
```

### Ошибка: не подключается к базе
```bash
# Проверьте контейнеры
docker ps

# Перезапустите
docker-compose -f docker-compose.prod.yml restart mongodb redis
```

### Ошибка: не работает Steam OAuth
```bash
# Проверьте .env.production
# BASE_URL должен быть https://sgomarket.com
# STEAM_API_KEY должен быть E1FC69B3707FF57C6267322B0271A86B
```

---

## 🔄 АВТООБНОВЛЕНИЕ

```bash
# Создайте update.sh
cat > update.sh << 'EOF'
#!/bin/bash
cd /root/SteamMarketplace2
git pull origin main
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
echo "✅ Обновлено!"
EOF

chmod +x update.sh

# Используйте
./update.sh
```

---

## 💾 БЭКАП

```bash
# База данных
docker exec steam-marketplace-mongodb mongodump --out /backup/$(date +%Y%m%d)

# Файлы
tar -czf /backup/files-$(date +%Y%m%d).tar.gz /root/SteamMarketplace2
```

---

## 🎯 ИТОГ

После деплоя у вас будет:
- ✅ Полноценный сайт на sgomarket.com
- ✅ Steam OAuth работает
- ✅ Стабильная работа 24/7
- ✅ Автомасштабирование через Docker
- ✅ Легкое обновление командой `git pull`

---

## 📞 ДОКУМЕНТАЦИЯ

- **VPS_DEPLOY_GUIDE.md** - подробный гайд
- **DEPLOYMENT.md** - техническая документация
- **PHASE*_COMPLETE.md** - фазы разработки

**Готово к деплою! 🚀**
