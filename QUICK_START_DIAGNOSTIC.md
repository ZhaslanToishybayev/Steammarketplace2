# 🚀 Быстрый старт - Диагностика проблем

## Созданные инструменты

### 1. 📊 Диагностические Endpoints

**Общая диагностика:**
```bash
curl http://localhost:3001/api/steam/diagnostic
```

**Тест фильтров:**
```bash
# Требует JWT токен
curl -H "Authorization: Bearer <JWT>" \
  http://localhost:3001/api/steam/test-filter/cs2

curl -H "Authorization: Bearer <JWT>" \
  http://localhost:3001/api/steam/test-filter/dota2
```

**Проверка инвентаря с логами:**
```bash
# Требует JWT токен
curl -H "Authorization: Bearer <JWT>" \
  http://localhost:3001/api/steam/inventory?game=cs2

curl -H "Authorization: Bearer <JWT>" \
  http://localhost:3001/api/steam/inventory?game=dota2
```

### 2. 🔧 Скрипты диагностики

**Быстрая диагностика (все в одном):**
```bash
node quick-diagnostic.js
```

**Проверка Steam бота:**
```bash
node check-bot-status.js
```

**Проверка фильтрации инвентаря:**
```bash
node test-filtering.js
```

### 3. 📝 Логи и отладка

**Просмотр диагностических логов:**
```bash
tail -f logs/app.log | grep DIAGNOSTIC
```

**Просмотр ошибок:**
```bash
tail -f logs/app.log | grep ERROR
```

## 🚨 Типичные проблемы

### Проблема: "Steam authentication required"

**Диагностика:**
```bash
node quick-diagnostic.js
```

**Решение:**
- Пользователю нужно пройти Steam OAuth аутентификацию
- Без OAuth токена инвентарь не загружается

### Проблема: В Dota 2 не показываются предметы

**Диагностика:**
```bash
# 1. Проверить фильтр
curl -H "Authorization: Bearer <JWT>" \
  http://localhost:3001/api/steam/test-filter/dota2

# 2. Посмотреть логи фильтрации
tail -f logs/app.log | grep "Dota 2 Filter Statistics"

# 3. Проверить appId предметов
# Должны быть только с appId === 570
```

**Возможные причины:**
1. У пользователя нет Dota 2 предметов
2. Предметы не tradeable
3. Предметы не marketable

### Проблема: CS2 предметы в Dota 2

**Диагностика:**
```bash
node test-filtering.js
```

**Лог покажет:**
- Какие предметы попали в неправильную категорию
- appId каждого предмета

**Решение:** Фильтр должен проверять `appId === 570` для Dota 2

### Проблема: API возвращает 404

**Диагностика:**
```bash
# Проверить, что сервер запущен
ps aux | grep "node app.js"

# Проверить порт
netstat -tuln | grep 3001
```

**Решение:**
```bash
cd /path/to/project
npm start
```

## 📊 Чтение логов

### Цветовая маркировка:
- 🔍 DIAGNOSTIC - подробная информация
- ✅ Успех
- ⚠️ Предупреждение
- ❌ Ошибка
- 👤 Действия пользователя
- 🔑 Проверка токенов
- 🔍 Применение фильтров

### Пример лога загрузки инвентаря:
```
👤 User ENTER (76561199257487454) requesting Dota 2 inventory

🔍 DIAGNOSTIC: User Authentication
   Data: {
     "userId": "...",
     "steamId": "76561199257487454",
     "hasSteamAccessToken": false,
     "tokenLength": 0
   }

🔑 OAuth token from DB: NULL
⚠️ No Steam OAuth token found. User must authenticate with Steam.
💡 Solution: User needs to complete Steam OAuth flow
```

## 🛠️ Полная диагностика (пошагово)

1. **Запустить быструю диагностику:**
   ```bash
   node quick-diagnostic.js
   ```

2. **Проверить сервер:**
   ```bash
   curl http://localhost:3001/api/steam/diagnostic
   ```

3. **Проверить бота:**
   ```bash
   node check-bot-status.js
   ```

4. **Протестировать фильтры:**
   ```bash
   node test-filtering.js
   ```

5. **Посмотреть логи в реальном времени:**
   ```bash
   tail -f logs/app.log | grep DIAGNOSTIC
   ```

6. **Проверить инвентарь пользователя:**
   ```bash
   # Сначала получить JWT токен
   node get-user-token.js
   
   # Затем проверить инвентарь
   curl -H "Authorization: Bearer <JWT>" \
     http://localhost:3001/api/steam/inventory?game=dota2
   ```

## 📞 При сообщении о баге

Всегда прикладывайте:

1. **Результат диагностики:**
   ```bash
   node quick-diagnostic.js > diagnostic.log
   ```

2. **API диагностика:**
   ```bash
   curl http://localhost:3001/api/steam/diagnostic > api-status.json
   ```

3. **Логи (последние 50 строк):**
   ```bash
   tail -50 logs/app.log
   ```

4. **Описание проблемы:**
   - Что делали
   - Что ожидали
   - Что получили

5. **Endpoint, который использовали**
