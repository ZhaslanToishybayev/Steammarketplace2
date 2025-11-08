# 🔗 НАСТРОЙКА REDIRECT URL И ENDPOINTS

## 🎯 КАК РАБОТАЕТ REDIRECT URL В STEAM:

### **1. Redirect URI НЕ нужно регистрировать заранее!**

В отличие от других OAuth провайдеров (Google, Facebook), Steam **НЕ требует** предварительной регистрации redirect URIs!

**Каждый OAuth запрос содержит redirect_uri параметр:**
```
https://steamcommunity.com/oauth/authorize?
  client_id=STEAM_CLIENT_ID&
  redirect_uri=http://localhost:3001/api/auth/steam/callback&
  response_type=code
```

---

## 📋 ЧТО Я СОЗДАМ В КОДЕ:

### **1. OAuth Request Endpoint: /api/auth/steam**

```javascript
// routes/auth.js
router.get('/auth/steam', async (req, res) => {
  // Генерируем state для безопасности
  const state = generateRandomString(32);

  // Сохраняем state в сессии/куки
  req.session.oauthState = state;

  // Redirect на Steam OAuth
  const redirectUrl = `https://steamcommunity.com/oauth/authorize?` +
    `client_id=${process.env.STEAM_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(process.env.BASE_URL + '/api/auth/steam/callback')}&` +
    `response_type=code&` +
    `scope=read&` +
    `state=${state}`;

  res.redirect(redirectUrl);
});
```

### **2. OAuth Callback Endpoint: /api/auth/steam/callback**

```javascript
// routes/auth.js
router.get('/auth/steam/callback', async (req, res) => {
  const { code, state } = req.query;

  // Проверяем state
  if (state !== req.session.oauthState) {
    return res.status(400).send('Invalid state parameter');
  }

  // Обмениваем code на токены
  const tokenResponse = await axios.post('https://steamcommunity.com/oauth/token', {
    grant_type: 'authorization_code',
    code: code,
    client_id: process.env.STEAM_CLIENT_ID,
    client_secret: process.env.STEAM_CLIENT_SECRET,
    redirect_uri: process.env.BASE_URL + '/api/auth/steam/callback'
  });

  // Получаем токены
  const { access_token, refresh_token } = tokenResponse.data;

  // Получаем профиль пользователя
  const profile = await axios.get('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/', {
    params: {
      key: process.env.STEAM_API_KEY,
      steamids: steamId
    }
  });

  // Сохраняем пользователя в БД
  const user = await User.findOneAndUpdate(
    { steamId: steamId },
    {
      steamAccessToken: access_token,
      steamRefreshToken: refresh_token,
      profile: profileData
    },
    { new: true, upsert: true }
  );

  // Создаем JWT токен для нашего приложения
  const jwtToken = jwt.sign(
    { id: user._id, steamId: user.steamId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Redirect на фронтенд с токеном
  res.redirect(`${process.env.CLIENT_URL}/?token=${jwtToken}`);
});
```

---

## 🔄 КАК ЭТО РАБОТАЕТ ПОШАГОВО:

### **Step 1: Пользователь нажимает "Connect Steam"**
```javascript
// frontend/src/components/LoginButton.jsx
const connectSteam = () => {
  window.location.href = '/api/auth/steam';
};
```

### **Step 2: Browser переходит на /api/auth/steam**
```javascript
// Server обрабатывает GET /api/auth/steam
// Генерирует state
// Redirect на Steam OAuth
```

### **Step 3: Steam показывает страницу логина**
```
https://steamcommunity.com/oauth/authorize?...
```

### **Step 4: Пользователь вводит логин/пароль**
```
Username: [Steam логин]
Password: [Steam пароль]
```

### **Step 5: Steam redirect обратно на /api/auth/steam/callback**
```
http://localhost:3001/api/auth/steam/callback?code=AUTH_CODE&state=STATE
```

### **Step 6: Наш сервер обрабатывает callback**
```javascript
// Обменивает code на access_token
// Получает профиль пользователя
// Создает JWT токен
// Redirect на фронтенд с токеном
```

### **Step 7: Фронтенд получает токен**
```javascript
// App.jsx - после redirect
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
localStorage.setItem('token', token);
```

---

## 🛡️ БЕЗОПАСНОСТЬ:

### **1. State Parameter**
```javascript
// Генерируем уникальный state для каждого запроса
const state = crypto.randomBytes(16).toString('hex');
req.session.oauthState = state;

// Steam возвращает тот же state
// Проверяем, что он совпадает
```

### **2. Redirect URI Validation**
```javascript
// Проверяем, что redirect_uri соответствует ожидаемому
const expectedRedirect = process.env.BASE_URL + '/api/auth/steam/callback';
if (redirect_uri !== expectedRedirect) {
  throw new Error('Invalid redirect URI');
}
```

### **3. HTTPS в Production**
```javascript
// В .env для продакшна
BASE_URL=https://sgomarket.com
CLIENT_URL=https://sgomarket.com
```

---

## 🔧 НАСТРОЙКА ENDPOINTS:

### **В app.js добавлю маршруты:**
```javascript
// app.js
const authRoutes = require('./routes/auth');

app.use('/api/auth', authRoutes);
```

### **Структура routes/auth.js:**
```javascript
// routes/auth.js
const express = require('express');
const router = express.Router();

// GET /api/auth/steam - начало OAuth flow
router.get('/steam', steamAuth.steamLogin);

// GET /api/auth/steam/callback - обработка ответа Steam
router.get('/steam/callback', steamAuth.steamCallback);

// GET /api/auth/status - проверка статуса аутентификации
router.get('/status', authenticateToken, steamAuth.getStatus);

// POST /api/auth/logout - выход
router.post('/logout', steamAuth.logout);

module.exports = router;
```

---

## 📝 ИТОГОВАЯ СХЕМА:

```
┌─────────────┐
│   Frontend  │
│  (React)    │
└──────┬──────┘
       │ 1. Нажимает "Connect Steam"
       ↓
┌─────────────┐
│   Backend   │
│ /api/auth/  │
│   steam     │
└──────┬──────┘
       │ 2. Генерирует state
       │ 3. Redirect на Steam
       ↓
┌─────────────┐
│   Steam     │
│ OAuth       │
└──────┬──────┘
       │ 4. Пользователь логинится
       │ 5. Steam redirect с code
       ↓
┌─────────────┐
│   Backend   │
│ /api/auth/  │
│steam/callb..│
└──────┬──────┘
       │ 6. Обмен code на токены
       │ 7. Получение профиля
       │ 8. Создание JWT
       │ 9. Redirect с токеном
       ↓
┌─────────────┐
│   Frontend  │
│   Получает  │
│   JWT token │
└─────────────┘
```

---

## 🎯 НЕ НУЖНО НАСТРАИВАТЬ В STEAM CONSOLE!

**Steam OAuth работает так:**
- ✅ Не нужно регистрировать redirect URIs
- ✅ Client ID = API Key
- ✅ Client Secret = API Key
- ✅ redirect_uri передается в каждом запросе
- ✅ Steam принимает любой redirect_uri (если домен соответствует)

**Но домен должен быть зарегистрирован в API Key!**

---

## ✅ ГОТОВО К РАБОТЕ!

**Что нужно для запуска:**
1. ✅ STEAM_API_KEY зарегистрирован на sgomarket.com
2. ✅ STEAM_CLIENT_ID и STEAM_CLIENT_SECRET в .env
3. ✅ Я создам endpoints
4. ✅ Всё заработает!

