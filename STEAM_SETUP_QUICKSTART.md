# 🚀 Steam Integration - Quick Start Guide

## ✅ ЧТО СДЕЛАНО:

### 1. **Обновлен app.js**
- ✅ Подключены enhanced версии Steam routes
- ✅ Подключен steamBotManager.new.js (production-ready)
- ✅ Асинхронная инициализация Steam ботов

### 2. **Установлены зависимости**
- ✅ `steam-totp` - для авто-генерации Steam Guard кодов
- ✅ `axios` - для HTTP запросов (уже был)
- ✅ `steam-user` - для работы с Steam API (уже был)
- ✅ `steam-tradeoffer-manager` - для trade offers (уже был)

### 3. **Созданы файлы конфигурации**
- ✅ `.env` - базовые настройки для разработки
- ✅ `.env.example` - полная документация по настройке

---

## 🎯 ЧТО НУЖНО СДЕЛАТЬ:

### **Шаг 1: Настроить Steam Bot (30 минут)**

1. **Создать Steam аккаунт:**
   ```bash
   # Перейти на: https://store.steampowered.com/join/
   # Создать НОВЫЙ аккаунт (не основной!)
   ```

2. **Установить Steam Mobile Authenticator:**
   - Скачать приложение Steam Mobile
   - Включить Steam Guard
   - Привязать к номеру телефона

3. **Получить Secrets:**
   - Shared Secret: Steam Guard → Recovery Codes → скопировать
   - Identity Secret: Steam Guard → Authenticator Settings → скопировать

4. **Настроить Trade URL:**
   - В профиле бота: Profile → Trade Offers
   - Create Trade URL
   - Скопировать URL

### **Шаг 2: Получить Steam API Key (5 минут)**

```bash
# Перейти на: https://steamcommunity.com/dev/apikey
# Ввести любое имя приложения
# Скопировать API Key
```

### **Шаг 3: Заполнить .env файл**

```env
# Открыть .env и заполнить:
STEAM_API_KEY=ваш_api_key
STEAM_BOT_1_USERNAME=имя_бота
STEAM_BOT_1_PASSWORD=пароль_бота
STEAM_BOT_1_SHARED_SECRET=ваш_shared_secret
STEAM_BOT_1_IDENTITY_SECRET=ваш_identity_secret
```

### **Шаг 4: Запустить сервер**

```bash
# Установить зависимости (если не установлены)
npm install

# Запустить в режиме разработки
npm run dev

# Или продакшн
npm start
```

---

## 🔍 ПРОВЕРКА РАБОТЫ:

### **1. Проверить подключение к MongoDB**
```bash
curl http://localhost:3001/health
# Ожидаемый ответ: {"status":"OK","timestamp":"..."}
```

### **2. Проверить Steam ботов**
```bash
# Нужно сначала авторизоваться и получить токен
# Затем:
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/marketplace/bots/status

# Ожидаемый ответ:
# {
#   "system": {
#     "bots": {"total": 1, "online": 1, "available": 1},
#     "queue": {"queueSize": 0, "isProcessing": false}
#   }
# }
```

### **3. Проверить Steam инвентарь**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/steam/inventory

# Ожидаемый ответ:
# {
#   "items": [
#     {
#       "assetId": "1234567890",
#       "name": "AK-47 | Redline",
#       "marketName": "AK-47 | Redline (Field-Tested)",
#       "tradable": true,
#       "marketable": true
#     }
#   ],
#   "cached": false
# }
```

### **4. Проверить trade URL**
```bash
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tradeUrl":"https://steamcommunity.com/tradeoffer/new/?partner=123456&token=ABC"}' \
  http://localhost:3001/api/steam/trade-url
```

### **5. Создать тестовый листинг**
```bash
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assetId":"1234567890",
    "classId":"12345",
    "instanceId":"67890",
    "name":"AK-47 | Redline",
    "marketName":"AK-47 | Redline (Field-Tested)",
    "price":45.99,
    "exterior":"Field-Tested",
    "rarity":"Classified"
  }' \
  http://localhost:3001/api/marketplace/listings
```

---

## 🔧 ДОСТУПНЫЕ API ENDPOINTS:

### **Steam Routes:**
- `GET /api/steam/inventory` - получить инвентарь Steam
- `GET /api/steam/verify-item/:assetId` - проверить ownership
- `GET /api/steam/float/:inspectUrl` - получить float value
- `GET /api/steam/price/:marketName` - цена на Steam Market
- `POST /api/steam/trade-url` - установить trade URL
- `GET /api/steam/trade-url` - получить trade URL
- `POST /api/steam/validate-trade-url` - валидация trade URL
- `GET /api/steam/cache/stats` - статистика кэша
- `POST /api/steam/cache/clear` - очистить кэш

### **Marketplace Routes (Enhanced):**
- `POST /api/marketplace/listings` - создать листинг с Steam проверкой
- `POST /api/marketplace/listings/:id/purchase` - покупка с trade automation
- `GET /api/marketplace/trades/:offerId/status` - статус trade offer
- `GET /api/marketplace/bots/status` - статус Steam ботов
- `GET /api/marketplace/my-listings` - мои листинги с market prices
- `GET /api/marketplace/listings` - все листинги с фильтрами
- `GET /api/marketplace/listings/:id` - получить листинг
- `PUT /api/marketplace/listings/:id` - обновить листинг
- `DELETE /api/marketplace/listings/:id` - отменить листинг

---

## 🚨 TROUBLESHOOTING:

### **Ошибка: "No Steam bot configurations found"**
**Решение:** Заполнить STEAM_BOT_* переменные в .env

### **Ошибка: "MongoDB connection error"**
**Решение:** Запустить MongoDB или изменить MONGODB_URI

### **Ошибка: "Steam API temporarily unavailable"**
**Решение:** Это нормально, кэшированные данные будут использованы

### **Ошибка: "steam-bot login failed"**
**Решение:**
1. Проверить логин/пароль бота
2. Убедиться что Steam Guard настроен
3. Shared Secret должен быть корректным

### **Ошибка: "Item not found in your Steam inventory"**
**Решение:**
1. Проверить assetId
2. Убедиться что профиль публичный
3. Проверить что предмет tradable

---

## 📊 МОНИТОРИНГ:

### **Логи Steam ботов:**
```bash
# Посмотреть логи в реальном времени
tail -f logs/app.log | grep "Steam Bot"
```

### **Статус ботов:**
- `/api/marketplace/bots/status` - покажет количество онлайн ботов
- Проверьте queue: "isProcessing": true означает что боты работают

### **Кэш Steam API:**
- Кэш TTL: 5 минут
- Очистить: `POST /api/steam/cache/clear`
- Статистика: `GET /api/steam/cache/stats`

---

## ✅ CHECKLIST:

- [ ] MongoDB запущен
- [ ] .env заполнен
- [ ] Steam API Key получен
- [ ] Steam Bot создан и настроен
- [ ] Shared Secret и Identity Secret получены
- [ ] Trade URL настроен в боте
- [ ] `npm install` выполнен
- [ ] `npm run dev` запущен
- [ ] `/health` возвращает OK
- [ ] `/api/marketplace/bots/status` показывает ботов онлайн

---

## 🎉 ГОТОВО!

Если все пункты выполнены, ваш Steam Marketplace готов к работе!

**Следующие шаги:**
1. Протестировать полный цикл: листинг → покупка → trade
2. Настроить уведомления
3. Добавить второй бот для балансировки нагрузки
