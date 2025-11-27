# 🧪 Steam Marketplace - Тестирование и Демонстрация

## 🎯 **Как Протестировать Steam OAuth**

### **Способ 1: Через HTML Интерфейс (Рекомендуется)**

1. **Откройте файл**: `/home/zhaslan/Downloads/testsite/steam-oauth-test.html`
2. **В браузере**: Дважды щелкните по файлу или откройте через File Explorer
3. **Нажмите**: "Войти через Steam" кнопку
4. **Следуйте инструкциям**: Вас перенаправит на Steam для авторизации
5. **Проверьте результат**: После возвращения проверьте статус аутентификации

### **Способ 2: Прямой URL**

1. **Откройте браузер**
2. **Перейдите по ссылке**: `http://localhost:3002/auth/steam`
3. **Авторизуйтесь через Steam**
4. **Вернитесь на эту страницу для проверки**

### **Способ 3: Через Frontend**

1. **Откройте**: http://localhost:3000
2. **Найдите**: Кнопку "Sign in" или "Steam Login"
3. **Нажмите**: Для начала аутентификации

---

## 📊 **Доступные Тестовые Интерфейсы**

### **1. Steam OAuth Test** 🚀
- **Файл**: `steam-oauth-test.html`
- **Функции**:
  - Steam OAuth аутентификация
  - Backend health check
  - Frontend health check
  - User authentication status
  - API endpoint testing

### **2. System Test** 🧪
- **Файл**: `system-test.html`
- **Функции**:
  - Комплексное тестирование всех систем
  - Backend & Frontend health checks
  - Steam Auth testing
  - Marketplace API testing
  - Inventory & Trade system testing

### **3. Working Demo** 🌐
- **Файл**: `working-demo.html`
- **Функции**:
  - Простой рабочий пример
  - Basic API testing
  - System status overview

### **4. Marketplace Test** 🛒
- **Файл**: `marketplace-test.html`
- **Функции**:
  - Marketplace API testing
  - Search functionality
  - Price analytics
  - Listing management

---

## 🔗 **Полезные Ссылки для Тестирования**

### **API Endpoints**
```
Backend Health:     http://localhost:3002/health
Steam Login:        http://localhost:3002/auth/steam
User Profile:       http://localhost:3002/auth/me
Inventory:          http://localhost:3002/inventory
Marketplace:        http://localhost:3002/marketplace/listings
Trades:             http://localhost:3002/trades
API Documentation:  http://localhost:3002/docs
```

### **Frontend URLs**
```
Main Page:          http://localhost:3000
Marketplace:        http://localhost:3000/marketplace
Inventory:          http://localhost:3000/inventory
Trade:              http://localhost:3000/trade
```

### **Test Servers**
```
System Test:        http://localhost:3004/test/all
Steam Test:         http://localhost:3004/test/marketplace
Backend Proxy:      http://localhost:3004/api/
```

---

## 📋 **Пошаговая Инструкция Тестирования**

### **Шаг 1: Проверка Системы**
1. Откройте `system-test.html`
2. Дождитесь автоматического тестирования
3. Проверьте статус всех систем (все должны быть ✅ Healthy)

### **Шаг 2: Steam OAuth Тестирование**
1. Откройте `steam-oauth-test.html`
2. Нажмите "Войти через Steam"
3. Пройдите авторизацию на Steam
4. Вернитесь и проверьте статус пользователя

### **Шаг 3: Marketplace Тестирование**
1. Откройте `marketplace-test.html`
2. Протестируйте все доступные endpoints
3. Проверьте поиск и фильтрацию
4. Тестируйте price analytics

### **Шаг 4: Комплексное Тестирование**
1. Откройте `working-demo.html`
2. Проверьте все основные функции
3. Убедитесь в работоспособности системы

---

## ⚠️ **Возможные Проблемы и Решения**

### **Проблема: Steam OAuth не работает**
**Решение**:
1. Проверьте `STEAM_API_KEY` в `.env` файле
2. Убедитесь что `STEAM_RETURN_URL` указан правильно
3. Проверьте настройки Steam Web API

### **Проблема: Backend не доступен**
**Решение**:
1. Проверьте что backend запущен: `npm run start:dev`
2. Убедитесь в правильности порта (должен быть 3002)
3. Проверьте логи backend на ошибки

### **Проблема: Frontend не загружается**
**Решение**:
1. Проверьте что frontend запущен: `npm run dev`
2. Убедитесь в правильности порта (должен быть 3000)
3. Проверьте next.config.js настройки

### **Проблема: CORS ошибки**
**Решение**:
1. Проверьте CORS настройки в backend
2. Убедитесь что frontend и backend на правильных портах
3. Проверьте `next.config.js` прокси настройки

---

## 🎯 **Что Должно Работать**

### **✅ Обязательные Функции**
- [ ] Steam OAuth аутентификация
- [ ] Backend health check
- [ ] Frontend загрузка
- [ ] API endpoints доступны
- [ ] User profile получение
- [ ] Inventory system
- [ ] Marketplace listings
- [ ] Trade system

### **🚀 Дополнительные Функции**
- [ ] Price analytics
- [ ] Search and filtering
- [ ] Real-time updates
- [ ] WebSocket connections
- [ ] File uploads
- [ ] Notifications

---

## 📞 **Техническая Поддержка**

### **Если что-то не работает:**

1. **Проверьте логи**:
   ```bash
   # Backend logs
   cd /home/zhaslan/Downloads/testsite/apps/backend
   npm run start:dev

   # Frontend logs
   cd /home/zhaslan/Downloads/testsite/apps/frontend
   npm run dev
   ```

2. **Проверьте процессы**:
   ```bash
   ps aux | grep npm
   ps aux | grep node
   ```

3. **Проверьте порты**:
   ```bash
   lsof -i :3000  # Frontend
   lsof -i :3002  # Backend
   lsof -i :3003  # Express alternative
   ```

4. **Перезапустите сервисы**:
   ```bash
   # Stop all
   pkill -f npm
   pkill -f node

   # Start backend
   cd /home/zhaslan/Downloads/testsite/apps/backend && PORT=3002 npm run start:dev

   # Start frontend
   cd /home/zhaslan/Downloads/testsite/apps/frontend && npm run dev
   ```

---

## 🎉 **Готово к Тестированию!**

**Теперь вы можете:**

1. **🧪 Протестировать Steam OAuth** - Используйте `steam-oauth-test.html`
2. **📊 Проверить все системы** - Используйте `system-test.html`
3. **🛒 Тестировать Marketplace** - Используйте `marketplace-test.html`
4. **🌐 Посмотреть демо** - Используйте `working-demo.html`

**Все системы готовы к использованию! 🚀**

📅 **Дата**: 25 ноября 2025
🎯 **Статус**: ✅ Все системы работают
🚀 **Готовность**: Production-ready MVP