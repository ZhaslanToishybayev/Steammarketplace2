# 🚀 НАСТРОЙКА STEAM OAUTH 2.0

## 🎯 ВАШИ ДАННЫЕ:
- **Домен:** sgomarket.com
- **Development:** localhost
- **Production:** https://sgomarket.com

---

## 📋 ИНСТРУКЦИЯ ПОШАГОВО:

### **Шаг 1: Создайте OAuth приложение**

1. **Зайдите на:** https://steamcommunity.com/dev/apikey

2. **Заполните форму:**
   ```
   Application name: Steam Marketplace v2
   Application homepage: https://sgomarket.com
   Application description: Steam marketplace for CS2 and Dota 2 items
   ```

3. **Redirect URIs (ВАЖНО! Добавьте оба):**
   ```
   http://localhost:3001/api/auth/steam/callback
   https://sgomarket.com/api/auth/steam/callback
   ```

4. **Сохраните и получите:**
   - **Client ID** (Application ID)
   - **Client Secret** (API Key)

### **Шаг 2: Обновите .env**

```bash
STEAM_API_KEY=469C2F57C1329C32C524BA99E29FD553
STEAM_CLIENT_ID=YOUR_CLIENT_ID_HERE          # ← Вставьте сюда
STEAM_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE  # ← Вставьте сюда

# URLs (для продакшна)
BASE_URL=https://sgomarket.com
CLIENT_URL=https://sgomarket.com
PORT=3001
```

### **Шаг 3: Обновите CORS настройки**

В продакшне нужно обновить CORS в app.js:
```javascript
// app.js
app.use(cors({
  origin: [
    'http://localhost:5173',      // Development
    'https://sgomarket.com',      // Production
    'https://www.sgomarket.com'   // WWW alias
  ],
  credentials: true
}));
```

---

## 🔄 РАБОЧИЕ СЦЕНАРИИ:

### **Development (localhost)**
1. Пользователь заходит на http://localhost:5173
2. Нажимает "Connect Steam"
3. Redirect на Steam: `https://steamcommunity.com/oauth/authorize?...`
4. Steam возвращает на: `http://localhost:3001/api/auth/steam/callback`
5. ✅ Работает!

### **Production (sgomarket.com)**
1. Пользователь заходит на https://sgomarket.com
2. Нажимает "Connect Steam"
3. Redirect на Steam
4. Steam возвращает на: `https://sgomarket.com/api/auth/steam/callback`
5. ✅ Работает!

---

## ⚠️ ВАЖНО:

**Steam OAuth приложение создается ОДИН РАЗ!**
- Потом можно добавлять redirect URIs, но нельзя менять Client ID/Secret
- Если потеряете Client Secret - создавайте новое приложение

**ПОЭТОМУ ЛУЧШЕ СРАЗУ УКАЗАТЬ ВСЕ ДОМЕНЫ!**

---

## 🎯 ВАШИ ДЕЙСТВИЯ:

1. **Создайте OAuth app** с redirect URIs:
   ```
   http://localhost:3001/api/auth/steam/callback
   https://sgomarket.com/api/auth/steam/callback
   ```

2. **Получите Client ID + Secret**

3. **Вставьте в .env**

4. **Скажите "ГОТОВО!" - и я начну интеграцию!**
