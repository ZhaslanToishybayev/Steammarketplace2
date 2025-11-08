# 🎯 ПЛАН: Dual-система User + Bot Inventory

## 🔍 ДИАГНОСТИКА ПРОБЛЕМЫ

### Что работает:
✅ Steam Web API - получает данные пользователей
✅ Bot Inventory (TradeOfferManager) - 1 предмет
✅ OpenID 2.0 - аутентификация

### Что не работает:
❌ User Inventory через Community API - нет OAuth токена
❌ Публичный инвентарь - Steam требует токен

---

## 🛠️ КОМПЛЕКСНОЕ РЕШЕНИЕ

### 📋 ЭТАП 1: Создание Steam Web API Service
**Файл**: `services/steamWebApiService.js`

**Функции**:
- `getUserProfile(steamId)` - получить профиль пользователя
- `getOwnedGames(steamId)` - получить список игр
- `getUserLevel(steamId)` - получить уровень пользователя
- `isGameOwner(steamId, appId)` - проверить владение игрой

**Источник данных**: Steam Web API (работает с STEAM_API_KEY)

### 📋 ЭТАП 2: Умная система inventory
**Файл**: `services/inventoryManager.js`

**Алгоритм**:
1. Попытаться загрузить User inventory через Community API
2. Если не получилось - показать сообщение об OAuth
3. Всегда показывать Bot inventory (работает)
4. Создать гибридный просмотрщик

### 📋 ЭТАП 3: Обновление routes
**Файл**: `routes/steam.js`

**Новые endpoints**:
- `GET /api/steam/user-profile/:steamId` - профиль пользователя
- `GET /api/steam/owned-games/:steamId` - список игр
- `GET /api/steam/inventory-status/:steamId` - статус инвентаря

### 📋 ЭТАП 4: Frontend улучшения
**Файл**: `frontend/src/components/Inventory/`

**Компоненты**:
- `InventoryTabs.jsx` - вкладки User/Bot
- `InventoryStatus.jsx` - статус загрузки
- `OAuthRequired.jsx` - сообщение о необходимости OAuth
- `BotInventory.jsx` - отображение инвентаря бота

### 📋 ЭТАП 5: UI/UX улучшения
**В Inventory странице**:
1. **User Inventory Tab**:
   - Проверка профиля через Web API
   - Показ информации об аккаунте
   - Сообщение если нужен OAuth
   - Ссылка на настройки Steam

2. **Bot Inventory Tab**:
   - Отображение всех предметов бота
   - Информация о предметах
   - Возможность тестирования trade

---

## 🎨 ИНТЕРФЕЙС ПОЛЬЗОВАТЕЛЯ

### Вкладка "My Inventory" (User):
```
┌─────────────────────────────────────┐
│ 🔐 Ваш профиль Steam                │
│                                     │
│ SteamID: 76561198...                │
│ Username: testuser                  │
│ Level: 15                           │
│ Games: CS2 ✓, Dota 2 ✗              │
│                                     │
│ ⚠️ Для загрузки инвентаря нужно:     │
│ 1. Получить OAuth токен             │
│ 2. Или сделать инвентарь публичным  │
│                                     │
│ 📖 Инструкция по настройке          │
└─────────────────────────────────────┘
```

### Вкладка "Bot Inventory":
```
┌─────────────────────────────────────┐
│ 🤖 Инвентарь бота (Sgovt1)         │
│                                     │
│ [AUG | Sweeper]                     │
│ • Состояние: Factory New            │
│ • Цена: ~$2.50                      │
│ • Торгуемый: ✓                      │
│ • На рынке: ✓                       │
│                                     │
│ [🔄 Test Trade] [ℹ️ Details]        │
└─────────────────────────────────────┘
```

---

## 📊 ТЕХНИЧЕСКИЕ ДЕТАЛИ

### Метод 1: Web API (РАБОТАЕТ)
```javascript
GET https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/
Params: key=STEAM_API_KEY&steamids=STEAMID
```

### Метод 2: Community API (НЕ РАБОТАЕТ без токена)
```javascript
GET https://steamcommunity.com/inventory/STEAMID/730/2
Headers: Authorization: Bearer OAUTH_TOKEN
```

### Метод 3: Bot API (РАБОТАЕТ)
```javascript
bot.inventory[730] // TradeOfferManager
```

---

## 🎯 ИТОГОВЫЙ РЕЗУЛЬТАТ

### Что пользователь увидит:
1. ✅ **User Profile** - информация о аккаунте (Web API)
2. ⚠️ **User Inventory** - объяснение проблемы + инструкция
3. ✅ **Bot Inventory** - полностью функциональный инвентарь

### Преимущества:
- ✅ Прозрачность - пользователь видит реальную проблему
- ✅ Образовательность - объясняем как получить OAuth
- ✅ Функциональность - Bot inventory работает на 100%
- ✅ Развитие - готовность к OAuth интеграции

---

## 🚀 ПЛАН ВЫПОЛНЕНИЯ

1. ✅ Анализ проблемы
2. 🔄 Создание Steam Web API Service
3. ⏳ Обновление routes
4. ⏳ Улучшение frontend
5. ⏳ Тестирование
6. ⏳ Документирование

---

*Статус: В процессе разработки*
*Время выполнения: ~2 часа*
