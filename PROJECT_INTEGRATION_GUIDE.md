# 🚀 РУКОВОДСТВО ПО ИНТЕГРАЦИИ RATE LIMITER В ПРОЕКТ

## 📁 СОЗДАННЫЕ ФАЙЛЫ

1. **utils/rateLimit.js** - Центральный rate limiter для всего проекта
2. **middleware/rateLimitMiddleware.js** - Middleware для Express маршрутов
3. **services/steamIntegrationService.js** - Обновлён для использования централизованного rate limiter

---

## 🛠️ КАК ИСПОЛЬЗОВАТЬ

### 1. В СЕРВИСАХ (Services)

```javascript
// services/steamBotManager.js
const rateLimiter = require('../utils/rateLimit');

class SteamBotManager {
  async getBotStatus() {
    // Оберните любой API вызов в rateLimiter
    return rateLimiter.addRequest(async () => {
      // Ваш код здесь
      const status = await this.fetchSteamAPI();
      return status;
    });
  }

  async createTradeOffer() {
    // Trade Offer с защитой от 429
    return rateLimiter.addRequest(() => {
      return new Promise((resolve, reject) => {
        // Steam API вызов
      });
    });
  }
}
```

### 2. В МАРШРУТАХ (Routes)

#### a) С Middleware (простой способ):
```javascript
// routes/steam.js
const { rateLimitMiddleware } = require('../middleware/rateLimitMiddleware');

// Применить ко всем запросам
router.get('/inventory', authenticateToken, rateLimitMiddleware, async (req, res) => {
  // Ваш код
});

router.post('/trade', authenticateToken, rateLimitMiddleware, async (req, res) => {
  // Ваш код
});
```

#### b) С withRateLimit (для сложных операций):
```javascript
// routes/marketplace.js
const { withRateLimit } = require('../middleware/rateLimitMiddleware');

router.get('/items', async (req, res) => {
  try {
    const items = await withRateLimit(async () => {
      // Ваш код получения данных
      return await marketplaceService.getItems();
    });

    res.json(items);
  } catch (error) {
    res.status(429).json({ error: error.message });
  }
});
```

### 3. В КОНТРОЛЛЕРАХ (Controllers)

```javascript
// controllers/marketplaceController.js
const rateLimiter = require('../utils/rateLimit');

class MarketplaceController {
  async getPriceHistory(req, res) {
    try {
      const result = await rateLimiter.addRequest(async () => {
        // Получение цены с защитой от 429
        const price = await steamService.getMarketPrice(itemName);
        return price;
      });

      res.json(result);
    } catch (error) {
      logger.error('Error getting price:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async searchItems(req, res) {
    // Поиск с rate limiting
    const result = await rateLimiter.addRequest(async () => {
      const items = await searchAPI.search(req.query);
      return items;
    });

    res.json(result);
  }
}
```

### 4. В УТИЛИТАХ (Utils)

```javascript
// utils/steamApi.js
const rateLimiter = require('../utils/rateLimit');

async function fetchUserInventory(steamId) {
  return rateLimiter.addRequest(async () => {
    const response = await axios.get(`https://steamcommunity.com/inventory/${steamId}/730/2`);
    return response.data;
  });
}

async function getMarketPrice(itemName) {
  return rateLimiter.addRequest(async () => {
    const response = await axios.get(`https://steamcommunity.com/market/priceoverview/`, {
      params: { appid: 730, market_hash_name: itemName }
    });
    return response.data;
  });
}

module.exports = {
  fetchUserInventory,
  getMarketPrice
};
```

---

## 📋 ПРИМЕРЫ ИНТЕГРАЦИИ ПО ФАЙЛАМ

### routes/steam.js ✅ УЖЕ ОБНОВЛЁН
```javascript
const { withRateLimit, rateLimitMiddleware } = require('../middleware/rateLimitMiddleware');

// Применён middleware
router.get('/inventory', authenticateToken, rateLimitMiddleware, async (req, res) => {
  // ...
});
```

### routes/marketplace.js - ДОБАВИТЬ:
```javascript
const { rateLimitMiddleware } = require('../middleware/rateLimitMiddleware');

router.get('/items', rateLimitMiddleware, async (req, res) => {
  // ...
});

router.get('/price/:itemId', rateLimitMiddleware, async (req, res) => {
  // ...
});
```

### routes/trade.js - ДОБАВИТЬ:
```javascript
const { withRateLimit } = require('../middleware/rateLimitMiddleware');

router.post('/offer', async (req, res) => {
  try {
    const offer = await withRateLimit(async () => {
      // Создание trade offer
      return await tradeService.createOffer(req.body);
    });

    res.json(offer);
  } catch (error) {
    res.status(429).json({ error: error.message });
  }
});
```

### services/steamBotManager.js - ДОБАВИТЬ:
```javascript
const rateLimiter = require('../utils/rateLimit');

class SteamBotManager {
  async initializeBot() {
    return rateLimiter.addRequest(() => {
      return new Promise((resolve, reject) => {
        // Инициализация бота
      });
    });
  }

  async getInventory() {
    return rateLimiter.addRequest(async () => {
      // Получение инвентаря бота
    });
  }
}
```

---

## 🔍 МОНИТОРИНГ

### Проверка статистики:
```javascript
// В любом месте приложения
const rateLimiter = require('../utils/rateLimit');
const stats = rateLimiter.getStats();

console.log('Rate Limit Stats:', stats);
// { queueSize: 0, activeRequests: 1, cacheSize: 5, maxConcurrent: 3 }
```

### Логи:
```
[RateLimit] Ошибка 429, повтор через 1.07s (попытка 1/5)
[RateLimit] Ошибка 429, повтор через 2.23s (попытка 2/5)
[RateLimitMiddleware] Задержка 500ms для предотвращения 429
```

---

## 📊 КОНФИГУРАЦИЯ

### utils/rateLimit.js - Настройка:
```javascript
const rateLimiter = new RateLimitHandler({
  maxRetries: 5,        // Количество попыток
  baseDelay: 1000,      // Базовая задержка (1 сек)
  maxDelay: 30000,      // Максимальная задержка (30 сек)
  enableBackoff: true,  // Экспоненциальный backoff
  enableQueue: true,    // Очередь запросов
  enableCache: true,    // Кэширование
  cacheTTL: 60000       // Время жизни кэша (60 сек)
});
```

### middleware/rateLimitMiddleware.js - Настройка:
```javascript
const minDelay = 500; // 500ms между запросами (в res.locals)
```

---

## ✅ ЧЕКЛИСТ ВНЕДРЕНИЯ

- [x] Создать `utils/rateLimit.js`
- [x] Создать `middleware/rateLimitMiddleware.js`
- [x] Обновить `services/steamIntegrationService.js`
- [x] Обновить `routes/steam.js`
- [ ] Добавить в `routes/marketplace.js`
- [ ] Добавить в `routes/trade.js`
- [ ] Добавить в `services/steamBotManager.js`
- [ ] Добавить в `services/tradeOfferService.js`
- [ ] Добавить в `routes/auth.js` (если есть API вызовы)

---

## 🎯 РЕЗУЛЬТАТ

После полного внедрения:
- ✅ Все API вызовы защищены от 429
- ✅ Автоматические повторные попытки
- ✅ Централизованное управление
- ✅ Мониторинг и логирование
- ✅ Кэширование для оптимизации

**Всё готово к использованию!** 🚀
