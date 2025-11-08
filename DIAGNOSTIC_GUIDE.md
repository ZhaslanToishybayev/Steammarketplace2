# 🐛 Система диагностики и отладки

## 🔍 Диагностические Endpoints

### 1. Общая диагностика системы
```
GET /api/steam/diagnostic
```

Возвращает:
- Статус системы (uptime, память, версия Node.js)
- Состояние базы данных (подключение, количество пользователей)
- Состояние Steam интеграции (сервисы, кеш)
- Информация о ботах
- Список пользователей с токенами

**Пример ответа:**
```json
{
  "timestamp": "2025-11-08T01:15:00.000Z",
  "system": {
    "status": "running",
    "uptime": 3600,
    "nodeVersion": "v18.17.0",
    "memory": { "rss": 123456, "heapTotal": 98765 }
  },
  "database": {
    "connected": true,
    "userCount": 2
  },
  "steam": {
    "integrationService": "available",
    "botManager": {
      "active": true,
      "botCount": 1,
      "bots": [...]
    }
  },
  "users": [
    {
      "username": "ENTER",
      "steamId": "76561199257487454",
      "hasToken": false,
      "tokenLength": 0,
      "inventoryCount": 0
    }
  ]
}
```

### 2. Тест фильтров (CS2/Dota 2)
```
GET /api/steam/test-filter/cs2
GET /api/steam/test-filter/dota2
```

Тестирует логику фильтрации с мок-данными.

**CS2 фильтр исключает:**
- Base Grade Container
- Graffiti
- Music
- Необходим тип и marketable

**Dota 2 фильтр требует:**
- appId === 570
- tradable === true
- marketable === true

### 3. Логи инвентаря (требует аутентификации)
```
GET /api/steam/inventory?game=cs2
GET /api/steam/inventory?game=dota2
```

В ответе содержит поле `diagnostic` с подробной информацией:
- Сколько предметов было до фильтра
- Сколько после
- Почему были отфильтрованы

## 🔧 Скрипты диагностики

### 1. Проверка системы
```bash
node diagnostic-check.js
```

Проверяет:
- Подключение к MongoDB
- Состояние Steam ботов
- Фильтрацию инвентаря
- Логи ошибок

### 2. Тест фильтрации
```bash
node test-filtering.js
```

Запускает тесты фильтрации и показывает:
- Какие предметы попадают в CS2
- Какие в Dota 2
- Есть ли смешивание игр

## 📊 Как читать логи

### Диагностические сообщения
- 🔍 DIAGNOSTIC - подробная информация о процессе
- ✅ Успешная операция
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
   End Diagnostic

🔑 OAuth token from DB: NULL
⚠️ No Steam OAuth token found. User must authenticate with Steam.
💡 Solution: User needs to complete Steam OAuth flow
```

## 🚨 Частые проблемы

### 1. "Steam authentication required"
**Проблема:** Нет OAuth токена в базе

**Диагностика:**
```bash
curl http://localhost:3001/api/steam/diagnostic | jq '.users'
```

**Решение:** Пользователю нужно пройти OAuth аутентификацию Steam

### 2. Dota 2 показывает 0 предметов
**Возможные причины:**
1. У пользователя нет Dota 2 предметов
2. Предметы не tradeable
3. Фильтр слишком строгий

**Диагностика:**
```bash
# Проверить фильтр
curl -H "Authorization: Bearer <JWT>" \
  http://localhost:3001/api/steam/test-filter/dota2

# Проверить реальный инвентарь
curl -H "Authorization: Bearer <JWT>" \
  http://localhost:3001/api/steam/inventory?game=dota2
```

### 3. CS2 предметы в Dota 2
**Проблема:** Нарушена фильтрация по appId

**Диагностика:**
```bash
node test-filtering.js
```

**Лог покажет:**
- Какие предметы попали в неправильную категорию
- appId предметов

### 4. Бот офлайн (rate limited)
**Проблема:** Steam заблокировал бота

**Диагностика:**
```bash
node check-bot-status.js
```

**Решение:** Ждать 15-30 минут

## 🛠️ Инструменты отладки

### 1. Просмотр логов
```bash
# Все логи
tail -f logs/app.log

# Только ошибки
tail -f logs/app.log | grep ERROR

# Диагностика
tail -f logs/app.log | grep DIAGNOSTIC
```

### 2. Проверка базы
```bash
# Подключиться к MongoDB
mongosh $MONGODB_URI

# Найти пользователя
db.users.findOne({steamId: "76561199257487454"})

# Проверить токен
db.users.findOne({steamId: "76561199257487454"}, {steamAccessToken: 1})
```

### 3. Тест Steam API
```bash
# Прямой тест Steam API
curl "https://steamcommunity.com/inventory/76561199257487454/570/2?l=english&count=5000"
```

## 📝 Шаблон сообщения об ошибке

При сообщении о баге указывайте:
1. Что делали (какой endpoint вызывали)
2. Что ожидали увидеть
3. Что увидели на самом деле
4. Логи (с ключевыми словами DIAGNOSTIC, ERROR)
5. Результат диагностики: `curl /api/steam/diagnostic`

## ✅ Чек-лист диагностики

- [ ] Проверить `/api/steam/diagnostic`
- [ ] Проверить наличие OAuth токена
- [ ] Запустить тест фильтра `/api/steam/test-filter/{game}`
- [ ] Проверить реальный лог: `/api/steam/inventory?game={game}`
- [ ] Посмотреть логи: `tail -f logs/app.log | grep DIAGNOSTIC`
- [ ] Проверить состояние бота: `node check-bot-status.js`
- [ ] Если проблема с Dota 2 - проверить appId предметов
