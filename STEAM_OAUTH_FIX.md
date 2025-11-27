# 🚀 Steam OAuth Настройка

## ⚠️ **Проблема с Steam OAuth**

Steam OAuth не работает из-за неправильной настройки. Вот что нужно сделать:

### 🔧 **Требуемые действия:**

1. **Получите Steam API Key**
   - Перейдите на https://steamcommunity.com/dev/apikey
   - Зарегистрируйте свое приложение
   - Получите API Key

2. **Настройте Backend**
   - Убедитесь что в `.env` файле backend указаны:
     ```
     STEAM_API_KEY=ваш_ключ
     STEAM_RETURN_URL=http://localhost:3000/api/auth/steam/callback
     ```

3. **Проверьте URL**
   - Backend Steam OAuth: http://localhost:3002/auth/steam
   - Frontend прокси: http://localhost:3000/api/auth/steam

### 🧪 **Тестирование:**

1. **Проверьте Backend:**
   ```bash
   curl http://localhost:3002/auth/steam
   ```

2. **Проверьте Frontend прокси:**
   - Перейдите на: http://localhost:3000/api/auth/steam

3. **Проверьте систему:**
   - Перейдите на: http://localhost:3000/system

### 📋 **Альтернативные решения:**

1. **Используйте HTML тестовую страницу:**
   - Файл: `/home/zhaslan/Downloads/testsite/steam-oauth-test.html`
   - Откройте в браузере и нажмите "Войти через Steam"

2. **Проверьте систему мониторинга:**
   - Страница: http://localhost:3000/system
   - Показывает статус всех сервисов

### 🔗 **Полезные ссылки:**

- **Steam API Documentation:** https://steamcommunity.com/dev
- **API Key Registration:** https://steamcommunity.com/dev/apikey
- **OAuth Setup Guide:** https://partner.steamgames.com/doc/webapi_overview/oauth

### 🛠️ **Технические требования:**

- ✅ Backend сервер (порт 3002) должен быть запущен
- ✅ Steam API Key должен быть указан в .env
- ✅ Return URL должен быть правильно настроен
- ✅ CORS должен быть разрешен между frontend и backend

**Пока Steam OAuth не настроен, вы можете использовать HTML тестовые интерфейсы для проверки функциональности!**