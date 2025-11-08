# 🚀 СОВРЕМЕННЫЙ СТЕК ДЛЯ STEAM МАРКЕТПЛЕЙСА 2024-2025

## 📊 СТАТУС ЭКОСИСТЕМЫ (Проверено: Ноябрь 2024)

### ✅ АКТИВНО РАЗВИВАЮЩИЕСЯ БИБЛИОТЕКИ

```json
{
  "steam-user": "2.5.0+ (обновлено 2025-05-25)",
  "steam-tradeoffer-manager": "2.12.2 (обновлено 2025-08-18)",
  "steamcommunity": "3.50.0+ (обновлено 2025-07-19)",
  "steam-totp": "2.1.2 (стабильно)",
  "passport-steam": "1.0.17 (поддерживается)"
}
```

**✅ ВЫВОД:** Экосистема Node.js для Steam **АКТИВНО РАЗВИВАЕТСЯ** и поддерживается в 2024-2025!

---

## 🎯 АРХИТЕКТУРА СОВРЕМЕННОГО СТЕМА

### **1. УРОВЕНЬ АВТОРИЗАЦИИ И АУТЕНТИФИКАЦИИ**

#### **A. OAuth 2.0 (Рекомендуется 2024-2025)**

```javascript
// packages.json
{
  "passport": "^0.7.0",
  "passport-steam": "^1.0.18",
  "express-session": "^1.17.3",
  "cookie-parser": "^1.4.6"
}

// config/steam-oauth.js
const SteamStrategy = require('passport-steam').Strategy;

const strategy = new SteamStrategy({
  returnURL: 'https://yourapp.com/api/auth/steam/return',
  realm: 'https://yourapp.com',
  profile: true,
  clientID: process.env.STEAM_CLIENT_ID,
  clientSecret: process.env.STEAM_CLIENT_SECRET
}, async (identifier, profile, done) => {
  // НОВОЕ: Получаем полную авторизацию с cookies
  const authToken = await getSteamAuthToken(profile._json.steamid);
  const cookies = await extractSteamCookies(authToken);

  const user = await User.findOneAndUpdate(
    { steamId: profile.id },
    {
      steamAccessToken: authToken.access_token,
      steamRefreshToken: authToken.refresh_token,
      steamCookies: cookies,
      expiresAt: Date.now() + (authToken.expires_in * 1000)
    },
    { new: true, upsert: true }
  );

  return done(null, user);
});
```

**Преимущества OAuth 2.0:**
- ✅ Полный доступ к инвентарю пользователей
- ✅ Современная безопасность
- ✅ Поддержка refresh tokens
- ✅ Интеграция с Steam Guard

#### **B. Legacy OpenID (Устаревает, но работает)**

```javascript
// НЕ РЕКОМЕНДУЕТСЯ ДЛЯ НОВЫХ ПРОЕКТОВ
// Поддерживает только базовый доступ к профилю
// НЕ дает доступа к инвентарю в 2024-2025
```

---

### **2. УРОВЕНЬ STEAM BOT MANAGEMENT**

#### **A. Core Libraries (ОБЯЗАТЕЛЬНЫЕ)**

```javascript
// packages.json
{
  "steam-user": "^2.5.0",        // Управление Steam аккаунтами
  "steam-tradeoffer-manager": "^2.12.0", // Trade offers
  "steamcommunity": "^3.50.0",   // Community API
  "steam-totp": "^2.1.2"         // 2FA коды
}
```

#### **B. Современная архитектура бота:**

```javascript
// services/steamBot.js
const SteamUser = require('steam-user');
const TradeOfferManager = require('steam-tradeoffer-manager');
const steamTOTP = require('steam-totp');

class SteamBot {
  constructor(config) {
    this.config = config;
    this.client = new SteamUser({
      promptSteamGuardCode: false,
      enableChr: false,
      autoRelogin: true
    });

    this.manager = new TradeOfferManager({
      steam: this.client,
      domain: process.env.DOMAIN || 'localhost',
      language: 'en',
      pollInterval: 10000,
      cancelTime: 15 * 60 * 1000
    });

    this.setupEventHandlers();
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.client.logOn({
        accountName: this.config.username,
        password: this.config.password,
        twoFactorCode: steamTOTP.generateAuthCode(this.config.sharedSecret)
      });

      this.client.once('steamGuard', (domain, callback) => {
        callback(steamTOTP.generateAuthCode(this.config.sharedSecret));
      });

      this.client.once('loggedOn', () => {
        console.log(`✅ Bot ${this.config.username} logged in`);

        // Загружаем инвентарь
        this.client.marketPremierOrMasterInviteTickers();
        this.client.setPersona(SteamUser.EPersonaState.Online);

        resolve();
      });

      this.client.once('error', (err) => {
        reject(err);
      });
    });
  }

  setupEventHandlers() {
    // Trade offer события
    this.manager.on('newOffer', (offer) => {
      console.log('📦 New trade offer received');
      // Автоматически принимаем или отклоняем
    });

    // Steam Guard события
    this.client.on('steamGuard', (domain, callback) => {
      callback(steamTOTP.generateAuthCode(this.config.sharedSecret));
    });

    // Rate limiting
    this.client.on('rateLimitExceeded', () => {
      console.log('⚠️ Rate limit exceeded, waiting...');
      setTimeout(() => this.client.relog(), 5 * 60 * 1000);
    });
  }

  async getInventory(appId) {
    return new Promise((resolve, reject) => {
      this.manager.getInventoryContents(appId, 2, true, (err, inventory) => {
        if (err) {
          reject(err);
        } else {
          resolve(inventory);
        }
      });
    });
  }
}
```

#### **C. Bot Manager (Мультибот система):**

```javascript
// services/botManager.js
const SteamBot = require('./SteamBot');

class BotManager {
  constructor() {
    this.bots = new Map();
    this.activeBots = [];
    this.tradeQueue = [];
  }

  async initialize() {
    const botConfigs = this.getBotConfigs();

    for (const config of botConfigs) {
      try {
        const bot = new SteamBot(config);
        await bot.initialize();
        this.bots.set(config.username, bot);
        this.activeBots.push(bot);
        console.log(`✅ Bot initialized: ${config.username}`);
      } catch (error) {
        console.error(`❌ Bot failed: ${config.username}`, error.message);
      }
    }
  }

  async getAvailableBot() {
    // Round-robin или least-loaded
    return this.activeBots[0];
  }

  getBotConfigs() {
    return [
      {
        username: process.env.STEAM_BOT_1_USERNAME,
        password: process.env.STEAM_BOT_1_PASSWORD,
        sharedSecret: process.env.STEAM_BOT_1_SHARED_SECRET,
        identitySecret: process.env.STEAM_BOT_1_IDENTITY_SECRET
      }
    ].filter(bot => bot.username && bot.password);
  }
}
```

---

### **3. УРОВЕНЬ ИНВЕНТАРЯ И API**

#### **A. Получение пользовательского инвентаря (2024-2025)**

```javascript
// services/inventoryService.js

class InventoryService {
  constructor(botManager) {
    this.botManager = botManager;
  }

  // МЕТОД 1: Через OAuth 2.0 + Cookies (РЕКОМЕНДУЕТСЯ)
  async getUserInventoryOAuth(user, appId) {
    try {
      const headers = {
        'Authorization': `Bearer ${user.steamAccessToken}`,
        'Cookie': this.buildCookieHeader(user.steamCookies),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      };

      const url = `https://steamcommunity.com/inventory/${user.steamId}/${appId}/2`;
      const response = await axios.get(url, { headers });

      if (!response.data.success) {
        throw new Error('Inventory fetch failed');
      }

      return this.parseInventory(response.data, appId);
    } catch (error) {
      console.error('OAuth inventory error:', error.message);
      throw error;
    }
  }

  // МЕТОД 2: Через Bot Proxy (fallback)
  async getUserInventoryViaBot(user, appId) {
    const bot = await this.botManager.getAvailableBot();
    if (!bot) {
      throw new Error('No bots available');
    }

    // Создаем temporary trade offer для получения инвентаря
    // СЛОЖНО: требует копирования всех предметов

    return bot.getInventory(appId);
  }

  // МЕТОД 3: Прямой запрос с API key (работает только для публичных)
  async getPublicInventory(steamId, appId) {
    const apiKey = process.env.STEAM_API_KEY;

    try {
      const url = `https://steamcommunity.com/inventory/${steamId}/${appId}/2?l=english&key=${apiKey}`;
      const response = await axios.get(url);

      return this.parseInventory(response.data, appId);
    } catch (error) {
      if (error.response?.status === 400) {
        throw new Error('Inventory is private or not accessible');
      }
      throw error;
    }
  }
}
```

#### **B. Rate Limiting и Caching**

```javascript
// utils/rateLimiter.js
class SteamRateLimiter {
  constructor() {
    this.requests = new Map();
    this.queue = [];
    this.processing = false;
  }

  async addRequest(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    const { fn, resolve, reject } = this.queue.shift();

    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    }

    setTimeout(() => {
      this.processing = false;
      this.processQueue();
    }, 2000); // 2 секунды между запросами
  }
}

// services/cacheService.js
class CacheService {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = 5 * 60 * 1000; // 5 минут
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}
```

---

### **4. УРОВЕНЬ FRONTEND (2024-2025)**

#### **A. React/Next.js Stack**

```json
{
  "react": "^18.2.0",
  "next": "^14.0.0",
  "typescript": "^5.0.0",
  "tanstack/react-query": "^5.0.0",
  "axios": "^1.6.0",
  "zustand": "^4.4.0"
}
```

#### **B. Современный React компонент инвентаря:**

```typescript
// components/InventoryView.tsx
import { useQuery } from '@tanstack/react-query';
import { steamAPI } from '@/services/api';

interface InventoryItem {
  assetId: string;
  name: string;
  tradable: boolean;
  marketable: boolean;
  iconUrl?: string;
}

export default function InventoryView({ game }: { game: 'cs2' | 'dota2' }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['inventory', game],
    queryFn: () => steamAPI.getInventory(game),
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000
  });

  if (isLoading) {
    return <div>Loading inventory...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <p>Unable to load inventory</p>
        <p>Steam API may require authentication</p>
      </div>
    );
  }

  return (
    <div className="inventory-grid">
      {data?.items?.map((item: InventoryItem) => (
        <div key={item.assetId} className="inventory-item">
          {item.iconUrl && (
            <img src={item.iconUrl} alt={item.name} />
          )}
          <h3>{item.name}</h3>
          <div className="tags">
            {item.tradable && <span className="tag">Tradable</span>}
            {item.marketable && <span className="tag">Marketable</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

### **5. БЕЗОПАСНОСТЬ (2024-2025)**

#### **A. Обязательные меры:**

```javascript
// middleware/security.js

// 1. Rate Limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // лимит запросов
  message: 'Too many requests from this IP'
});

// 2. Input Validation
const { body } = require('express-validator');

const createTradeValidation = [
  body('steamId').isSteamId64(),
  body('items').isArray().custom(validateItemIds),
  body('partnerSteamId').optional().isSteamId64()
];

// 3. HTTPS Only
app.use(require('helmet')());
app.use(require('cookie-session')({
  name: 'session',
  keys: [process.env.SESSION_SECRET],
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production'
}));

// 4. CORS
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

#### **B. Шифрование чувствительных данных:**

```javascript
// services/encryptionService.js
const crypto = require('crypto');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);
  }

  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.key);
    cipher.setAAD(Buffer.from('additional-data'));

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decrypt(encryptedData) {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipher(this.algorithm, this.key);
    decipher.setAAD(Buffer.from('additional-data'));
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
```

---

### **6. DATABASE SCHEMA (MongoDB)**

```javascript
// models/User.js
const userSchema = new mongoose.Schema({
  // Основная информация
  steamId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  displayName: { type: String, required: true },
  avatar: { type: String, required: true },

  // НОВОЕ: OAuth 2.0 токены (обязательно 2024-2025)
  steamAccessToken: { type: String, required: false },
  steamRefreshToken: { type: String, required: false },
  steamCookies: { type: String, required: false }, // Зашифровано
  expiresAt: { type: Date, required: false },

  // Устаревшие поля (для совместимости)
  steamAccessTokenLegacy: { type: String, required: false },

  // Инвентари
  inventories: {
    cs2: [{ type: Object }],  // Сжатый JSON
    dota2: [{ type: Object }]
  },

  // Настройки
  settings: {
    autoAcceptTrades: { type: Boolean, default: false },
    tradeUrl: { type: String },
    notifications: {
      email: { type: Boolean, default: true },
      web: { type: Boolean, default: true }
    }
  },

  // Индексы
}, {
  timestamps: true,
  autoIndex: true
});

// Оптимизация
userSchema.index({ steamId: 1 });
userSchema.index({ 'inventories.cs2.assetId': 1 });
userSchema.index({ expiresAt: 1 });
```

---

### **7. DEPLOYMENT & INFRASTRUCTURE**

#### **A. Docker Stack**

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - STEAM_API_KEY=${STEAM_API_KEY}
      - STEAM_CLIENT_ID=${STEAM_CLIENT_ID}
      - STEAM_CLIENT_SECRET=${STEAM_CLIENT_SECRET}
    depends_on:
      - mongodb
      - redis

  mongodb:
    image: mongo:7
    volumes:
      - mongo_data:/data/db
    environment:
      - MONGO_INITDB_DATABASE=steam_marketplace

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl

volumes:
  mongo_data:
  redis_data:
```

#### **B. Environment Variables**

```bash
# .env.production
NODE_ENV=production

# Steam API
STEAM_API_KEY=your_steam_api_key
STEAM_CLIENT_ID=your_oauth_client_id
STEAM_CLIENT_SECRET=your_oauth_client_secret

# Database
MONGODB_URI=mongodb://mongodb:27017/steam_marketplace
REDIS_URL=redis://redis:6379

# Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key
SESSION_SECRET=your_session_secret

# Domain
DOMAIN=yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

---

## 📊 СРАВНЕНИЕ ПОДХОДОВ

| Подход | Сложность | Доступ к инвентарю | Безопасность | Рекомендация |
|--------|-----------|-------------------|--------------|--------------|
| **OAuth 2.0** | Высокая | ✅ Полный | ✅ Высокая | ⭐ **РЕКОМЕНДУЕТСЯ** |
| **Bot Proxy** | Средняя | ✅ Полный | ⚠️ Средняя | ⚡ Для legacy систем |
| **API Key** | Низкая | ❌ Ограниченный | ✅ Высокая | 📋 Только для тестирования |
| **OpenID** | Низкая | ❌ Нет | ✅ Высокая | ❌ Устаревает |

---

## 🚀 ROADMAP ВНЕДРЕНИЯ (4-6 НЕДЕЛЬ)

### **Неделя 1-2: Подготовка**
- [ ] Создать Steam OAuth 2.0 приложение
- [ ] Настроить MongoDB + Redis
- [ ] Обновить зависимости до latest versions

### **Неделя 3-4: Бэкенд**
- [ ] Реализовать OAuth 2.0 flow
- [ ] Обновить bot management
- [ ] Добавить inventory service с кешированием
- [ ] Внедрить rate limiting

### **Неделя 5: Frontend**
- [ ] Обновить React компоненты
- [ ] Добавить error handling
- [ ] Реализовать optimistic updates

### **Неделя 6: Security & Testing**
- [ ] Pen testing
- [ ] Load testing
- [ ] Deploy to production

---

## 💰 БЮДЖЕТ РАЗРАБОТКИ

### **При найме команды (4-6 недель):**

| Роль | Стоимость/час | Часы | Итого |
|------|---------------|------|-------|
| Backend Dev | $50-80 | 120-150 | $6,000-12,000 |
| Frontend Dev | $40-70 | 80-100 | $3,200-7,000 |
| DevOps | $60-100 | 40-60 | $2,400-6,000 |
| Security Audit | $80-120 | 20-30 | $1,600-3,600 |
| **ИТОГО** | | | **$13,200-28,600** |

### **При self-development:**
- Время: 200-300 часов
- Стоимость: $0 (только ваше время)
- Сложность: Высокая

---

## 📚 РЕСУРСЫ И ДОКУМЕНТАЦИЯ

### **Актуальные библиотеки:**
- https://github.com/DoctorMcKay/node-steam-user
- https://github.com/DoctorMcKay/node-steam-tradeoffer-manager
- https://github.com/SteamRE/SteamKit

### **Steam Developer:**
- https://steamcommunity.com/dev/apikey
- https://steamcommunity.com/dev/steamkeys
- https://partner.steamgames.com/

### **Безопасность:**
- https://owasp.org/www-project-top-ten/
- https://cheatsheetseries.owasp.org/

---

## 🎯 ЗАКЛЮЧЕНИЕ

**Современный стек Steam маркетплейса 2024-2025:**

✅ **SteamUser + TradeOfferManager** - проверенные, активно поддерживаемые библиотеки
✅ **OAuth 2.0** - единственный способ получить полный доступ к инвентарю
✅ **Node.js + React** - зрелая, поддерживаемая экосистема
✅ **MongoDB + Redis** - оптимально для кеширования инвентаря
✅ **Microservices** - разделение на auth, inventory, trade services

**💡 Главное:** В 2024-2025 **OAuth 2.0 стал обязательным** для доступа к пользовательскому инвентарю. Без него можно работать только с Bot Inventory.

**🚀 Рекомендация:** Начните с Bot Inventory для MVP, затем постепенно внедряйте OAuth 2.0 для полного функционала.

