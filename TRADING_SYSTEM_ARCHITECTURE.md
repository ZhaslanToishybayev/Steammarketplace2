# 💱 СИСТЕМА ТРЕЙДИНГА - АРХИТЕКТУРА И РЕАЛИЗАЦИЯ

## 🎯 КОНЦЕПЦИЯ ТРЕЙДИНГА В STEAM:

### **Как работает трейдинг в Steam:**
1. Пользователь создает Trade Offer (предложение обмена)
2. Указывает что отдает и что хочет получить
3. Отправляет пользователю или боту
4. Получатель принимает/отклоняет
5. Steam проводит обмен предметами

### **В нашей системе:**
- **User ↔ Bot Trading** - основной сценарий
- **User → User** - будущая возможность
- **Automated Trading** - бот автоматически принимает

---

## 🏗️ АРХИТЕКТУРА ТРЕЙДИНГА:

### **1. Основные компоненты:**

```
┌─────────────────────────────────────────────┐
│                 FRONTEND                    │
│  ┌──────────────┐   ┌──────────────────┐   │
│  │ Trade Offer  │   │  Inventory       │   │
│  │   Creator    │   │   Viewer         │   │
│  └──────────────┘   └──────────────────┘   │
└──────────────────┬─────────────────────────┘
                   │ HTTP/WebSocket
┌──────────────────┴─────────────────────────┐
│                 BACKEND                     │
│  ┌──────────────────────────────────────┐  │
│  │        Trade Offer Manager           │  │
│  │  - Create Offers                     │  │
│  │  - Track Status                      │  │
│  │  - Auto-accept Logic                 │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │         Steam Bot Manager            │  │
│  │  - Login/Logout                      │  │
│  │  - Inventory Sync                    │  │
│  │  - Offer Handling                    │  │
│  └──────────────────────────────────────┘  │
└──────────────────┬─────────────────────────┘
                   │ Steam API
┌──────────────────┴─────────────────────────┐
│              STEAM PLATFORM                 │
│  ┌──────────────┐   ┌──────────────────┐   │
│  │   Steam      │   │   User Accounts  │   │
│  │     API      │   │   (Inventory)    │   │
│  └──────────────┘   └──────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## 💻 РЕАЛИЗАЦИЯ ПО КОМПОНЕНТАМ:

### **1. TradeOffer Service (services/tradeOfferService.js)**

```javascript
const SteamUser = require('steam-user');
const TradeOfferManager = require('steam-tradeoffer-manager');

class TradeOfferService {
  constructor(botManager) {
    this.botManager = botManager;
  }

  // Создание Trade Offer от пользователя к боту
  async createOfferToBot(userSteamId, itemsToGive, itemsToReceive) {
    const bot = await this.botManager.getAvailableBot();

    return new Promise((resolve, reject) => {
      bot.manager.createOffer(userSteamId, (err, offer) => {
        if (err) {
          return reject(err);
        }

        // Добавляем предметы от пользователя
        itemsToGive.forEach(item => {
          offer.addMyItem(item);
        });

        // Добавляем предметы от бота
        itemsToReceive.forEach(item => {
          offer.addPartnerItem(item);
        });

        // Отправляем предложение
        offer.send((err) => {
          if (err) {
            return reject(err);
          }

          // Сохраняем в БД
          this.saveTradeOffer({
            offerId: offer.id,
            steamId: userSteamId,
            botId: bot.id,
            itemsGiven: itemsToGive,
            itemsReceived: itemsToReceive,
            status: 'sent',
            timestamp: new Date()
          });

          resolve(offer);
        });
      });
    });
  }

  // Автоматическое принятие предложения
  async acceptOffer(offerId) {
    const bot = this.botManager.getBotByOfferId(offerId);

    return new Promise((resolve, reject) => {
      bot.manager.getOffer(offerId, (err, offer) => {
        if (err) {
          return reject(err);
        }

        offer.accept((err) => {
          if (err) {
            return reject(err);
          }

          // Обновляем статус в БД
          this.updateTradeStatus(offerId, 'accepted');

          // Обновляем инвентарь бота
          this.botManager.reloadBotInventory(bot.id);

          resolve(offer);
        });
      });
    });
  }

  // Отклонение предложения
  async declineOffer(offerId) {
    const bot = this.botManager.getBotByOfferId(offerId);

    return new Promise((resolve, reject) => {
      bot.manager.getOffer(offerId, (err, offer) => {
        if (err) {
          return reject(err);
        }

        offer.decline((err) => {
          if (err) {
            return reject(err);
          }

          this.updateTradeStatus(offerId, 'declined');
          resolve(offer);
        });
      });
    });
  }
}
```

### **2. Bot Event Handlers (services/steamBotManager.js)**

```javascript
class SteamBotManager {
  setupTradeHandlers(bot) {
    // Новый trade offer
    bot.manager.on('newOffer', (offer) => {
      console.log(`📦 New trade offer from ${offer.partner.getSteamID64()}`);

      // Логика принятия
      this.handleNewOffer(bot, offer);
    });

    // Изменение статуса trade offer
    bot.manager.on('offerChanged', (offer) => {
      if (offer.state === TradeOfferManager.EOfferState.Accepted) {
        console.log(`✅ Trade offer ${offer.id} accepted`);
        this.handleOfferAccepted(bot, offer);
      } else if (offer.state === TradeOfferManager.EOfferState.Declined) {
        console.log(`❌ Trade offer ${offer.id} declined`);
        this.handleOfferDeclined(bot, offer);
      }
    });

    // Обработка отправленных offer'ов
    bot.manager.on('sendOfferTimeout', (offer) => {
      console.log(`⏰ Trade offer ${offer.id} timed out`);
      this.handleOfferTimeout(bot, offer);
    });
  }

  async handleNewOffer(bot, offer) {
    // Проверяем, что предложение от авторизованного пользователя
    const user = await User.findOne({ steamId: offer.partner.getSteamID64() });
    if (!user) {
      return offer.decline('User not authorized');
    }

    // Проверяем предметы в предложении
    const items = offer.itemsToReceive;
    const validItems = await this.validateItems(items, bot);

    if (!validItems) {
      return offer.decline('Invalid items in offer');
    }

    // Проверяем баланс/ценность
    const balance = await this.calculateBalance(offer);
    if (balance < 0) {
      return offer.decline('Insufficient balance');
    }

    // Автоматически принимаем (если настроено)
    if (user.settings?.autoAcceptTrades) {
      offer.accept((err) => {
        if (err) {
          console.error('Failed to accept offer:', err);
        } else {
          console.log(`✅ Auto-accepted trade offer ${offer.id}`);
        }
      });
    } else {
      // Уведомляем администратора
      this.notifyAdmin(`New trade offer from ${user.username}`, offer);
    }
  }
}
```

### **3. Trade Offer API Routes (routes/trade.js)**

```javascript
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const tradeOfferService = require('../services/tradeOfferService');
const logger = require('../utils/logger');

// Создание trade offer
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { itemsToGive, itemsToReceive, partnerSteamId } = req.body;
    const user = req.user;

    // Валидация
    if (!itemsToGive || !itemsToReceive) {
      return res.status(400).json({ error: 'Missing items' });
    }

    // Создаем offer
    const offer = await tradeOfferService.createOfferToBot(
      partnerSteamId || user.steamId,
      itemsToGive,
      itemsToReceive
    );

    logger.info(`Trade offer created: ${offer.id}`);

    res.json({
      success: true,
      offerId: offer.id,
      status: offer.state,
      message: 'Trade offer created successfully'
    });

  } catch (error) {
    logger.error('Trade offer creation failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Принятие trade offer (для получателя)
router.post('/accept/:offerId', authenticateToken, async (req, res) => {
  try {
    const { offerId } = req.params;
    const user = req.user;

    // Проверяем права
    const offer = await tradeOfferService.getOffer(offerId);
    if (offer.partner.getSteamID64() !== user.steamId) {
      return res.status(403).json({ error: 'Not authorized to accept this offer' });
    }

    // Принимаем
    const result = await tradeOfferService.acceptOffer(offerId);

    res.json({
      success: true,
      offerId: offerId,
      status: 'accepted',
      message: 'Trade offer accepted successfully'
    });

  } catch (error) {
    logger.error('Trade offer acceptance failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Отклонение trade offer
router.post('/decline/:offerId', authenticateToken, async (req, res) => {
  try {
    const { offerId } = req.params;

    const result = await tradeOfferService.declineOffer(offerId);

    res.json({
      success: true,
      offerId: offerId,
      status: 'declined',
      message: 'Trade offer declined'
    });

  } catch (error) {
    logger.error('Trade offer decline failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получение списка trade offers пользователя
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { status } = req.query; // 'active', 'completed', 'all'

    const offers = await tradeOfferService.getUserOffers(user.steamId, status);

    res.json({
      success: true,
      count: offers.length,
      offers: offers
    });

  } catch (error) {
    logger.error('Failed to get trade offers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получение деталей trade offer
router.get('/:offerId', authenticateToken, async (req, res) => {
  try {
    const { offerId } = req.params;

    const offer = await tradeOfferService.getOfferDetails(offerId);

    res.json({
      success: true,
      offer: offer
    });

  } catch (error) {
    logger.error('Failed to get trade offer details:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### **4. Frontend Trade Components (frontend/src/components/)**

```jsx
// TradeOfferCreator.jsx
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

export function TradeOfferCreator() {
  const [selectedItems, setSelectedItems] = useState([]);
  const [desiredItems, setDesiredItems] = useState([]);

  const createOfferMutation = useMutation({
    mutationFn: async (offerData) => {
      const response = await fetch('/api/trade/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(offerData)
      });
      return response.json();
    },
    onSuccess: (data) => {
      alert(`Trade offer created! ID: ${data.offerId}`);
    }
  });

  const handleCreateOffer = () => {
    if (selectedItems.length === 0) {
      alert('Please select items to trade');
      return;
    }

    createOfferMutation.mutate({
      itemsToGive: selectedItems,
      itemsToReceive: desiredItems
    });
  };

  return (
    <div className="trade-creator">
      <h2>Create Trade Offer</h2>

      <div className="trade-section">
        <h3>Your Items</h3>
        <div className="items-grid">
          {/* Список предметов пользователя */}
        </div>
      </div>

      <div className="trade-section">
        <h3>Desired Items</h3>
        <div className="items-grid">
          {/* Список доступных предметов бота */}
        </div>
      </div>

      <button onClick={handleCreateOffer} disabled={createOfferMutation.isLoading}>
        {createOfferMutation.isLoading ? 'Creating...' : 'Create Trade Offer'}
      </button>
    </div>
  );
}
```

### **5. Trade History (models/TradeOffer.js)**

```javascript
const mongoose = require('mongoose');

const tradeOfferSchema = new mongoose.Schema({
  offerId: { type: String, required: true, unique: true },
  steamId: { type: String, required: true },
  botId: { type: String, required: true },

  // Предметы
  itemsGiven: [{
    assetId: String,
    classId: String,
    instanceId: String,
    name: String,
    marketName: String,
    iconUrl: String
  }],

  itemsReceived: [{
    assetId: String,
    classId: String,
    instanceId: String,
    name: String,
    marketName: String,
    iconUrl: String
  }],

  // Статус
  status: {
    type: String,
    enum: ['sent', 'active', 'accepted', 'declined', 'cancelled', 'timeout', 'escrow'],
    default: 'sent'
  },

  // Ценность
  valueGiven: { type: Number, default: 0 },
  valueReceived: { type: Number, default: 0 },
  profit: { type: Number, default: 0 },

  // Временные метки
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },

  // Сообщение
  message: { type: String },

  // Steam специфика
  escrowEndTime: { type: Date },
  confirmationRequired: { type: Boolean, default: false }

}, {
  timestamps: true
});

// Индексы
tradeOfferSchema.index({ steamId: 1, createdAt: -1 });
tradeOfferSchema.index({ botId: 1, createdAt: -1 });
tradeOfferSchema.index({ status: 1 });

module.exports = mongoose.model('TradeOffer', tradeOfferSchema);
```

---

## 🔄 ТОРГОВЫЕ СЦЕНАРИИ:

### **Сценарий 1: Пользователь хочет купить предмет у бота**

```
1. Пользователь выбирает предмет из Bot Inventory
2. Указывает предмет для обмена (или деньги)
3. Создает Trade Offer к боту
4. Бот автоматически принимает (если настроено)
5. Steam проводит обмен
6. Бот теряет предмет, получает взамен
7. Система обновляет инвентари
```

### **Сценарий 2: Пользователь продает предмет боту**

```
1. Пользователь выбирает предмет из User Inventory
2. Указывает желаемый предмет бота (или деньги)
3. Создает Trade Offer к боту
4. Бот автоматически принимает
5. Обмен проходит
6. Пользователь получает предмет бота
```

### **Сценарий 3: Сложный обмен (swap)**

```
1. Пользователь: AUG | Sweeper
2. Бот: AK-47 | Redline
3. Пользователь создает swap предложение
4. Бот принимает
5. Обмен: AUG ↔ AK-47
```

---

## 🛡️ БЕЗОПАСНОСТЬ ТРЕЙДИНГА:

### **1. Валидация предметов:**
```javascript
// Проверяем, что предмет действительно есть в инвентаре
async function validateItems(items, bot) {
  const botInventory = await bot.getInventory();
  const validItemIds = botInventory.map(item => item.assetid);

  return items.every(item => validItemIds.includes(item.assetid));
}
```

### **2. Проверка баланса:**
```javascript
// Проверяем, что пользователь не обманывает
async function calculateBalance(offer) {
  const valueGiven = await getItemsValue(offer.itemsToGive);
  const valueReceived = await getItemsValue(offer.itemsToReceive);

  return valueGiven - valueReceived;
}
```

### **3. Лимиты:**
```javascript
// Ограничения на трейдинг
const TRADE_LIMITS = {
  maxOffersPerHour: 10,
  maxItemsPerOffer: 10,
  minItemValue: 0.01,
  maxItemValue: 1000
};
```

---

## 📊 СОСТОЯНИЯ TRADE OFFER:

| Состояние | Описание | Действие |
|-----------|----------|----------|
| `sent` | Отправлен | Ожидает просмотра |
| `active` | Активный | Получатель может принять/отклонить |
| `accepted` | Принят | Обмен будет проведен |
| `declined` | Отклонен | Обмен отменен |
| `cancelled` | Отменен | Отправитель отменил |
| `timeout` | Истек | Предложение устарело |
| `escrow` | В ожидании | Steam удерживает на проверке |

---

## 🎯 ПРИОРИТЕТЫ ВНЕДРЕНИЯ:

### **Phase 1: Basic Trading (Неделя 1)**
- ✅ Создание Trade Offer
- ✅ Принятие/отклонение
- ✅ Статусы в БД
- ✅ Простая валидация

### **Phase 2: Auto-Trading (Неделя 2)**
- ✅ Автоматическое принятие
- ✅ Проверка баланса
- ✅ Уведомления
- ✅ WebSocket обновления

### **Phase 3: Advanced Features (Неделя 3)**
- ✅ Trade history
- ✅ Аналитика
- ✅ Лимиты и защита
- ✅ Мониторинг

---

## ✅ ИТОГ:

**Система трейдинга включает:**
- ✅ Создание предложений
- ✅ Управление статусами
- ✅ Автоматическая обработка
- ✅ Безопасность и валидация
- ✅ История транзакций
- ✅ Real-time уведомления

**Использует:**
- Steam TradeOfferManager
- WebSocket для real-time
- MongoDB для хранения
- React Query для обновлений

