# ⚡ Быстрое тестирование Steam интеграции

## 🎯 Проверим что у нас уже работает:

### 1. Backend (порт 3001)
```bash
# Проверим статус
curl http://localhost:3001/api/health

# Должно вернуть:
# {"status":"healthy",...}
```

### 2. Frontend (порт 5173)
```bash
# Открыть в браузере:
http://localhost:5173
```

---

## 🔑 Тестирование Steam OAuth:

### Вариант 1: Через API
```bash
# 1. Перейти в браузере:
http://localhost:5173

# 2. Нажать "Войти через Steam"
# или перейти напрямую:
http://localhost:3001/api/auth/steam
```

### Вариант 2: Через Swagger
```bash
# Открыть:
http://localhost:5173/api-docs

# Или:
http://localhost:3001/api-docs
```

---

## 📊 Проверить Steam бота:

```bash
# Статус бота
curl http://localhost:3001/api/steam/bot/status

# Инвентарь бота
curl http://localhost:3001/api/steam/bot/inventory
```

---

## 🌐 Если домен уже привязан:

### Привязка домашнего IP к домену:

1. **Узнать свой IP:**
```bash
curl ifconfig.me
# Или зайти на https://whatismyipaddress.com/
```

2. **В панели ps.kz:**
   - Зайти в "Домены" → "DNS записи"
   - Добавить A-запись:
     ```
     Тип: A
     Имя: @
     Значение: ВАШ_IP_ДОМАШНИЙ
     TTL: 3600
     ```

3. **Проверить через 5-10 минут:**
```bash
# Должно работать:
https://yourdomain.ps.kz/api/health
https://yourdomain.ps.kz/api/auth/steam
```

---

## 🔧 Если что-то не работает:

### MongoDB не запущен:
```bash
# Ubuntu/Debian
sudo systemctl start mongod

# macOS
brew services start mongodb-community

# Windows
net start MongoDB
```

### Redis не запущен:
```bash
# Ubuntu/Debian
sudo systemctl start redis

# macOS
brew services start redis

# Windows
redis-server
```

### Порт 3001 занят:
```bash
# Найти процесс
lsof -i :3001

# Убить процесс
kill -9 PID
```

---

## ✅ Ожидаемый результат:

1. ✅ http://localhost:3001/api/health → {"status":"healthy"}
2. ✅ http://localhost:3001/api/auth/steam → редирект на Steam
3. ✅ https://yourdomain.ps.kz/api/health → работает (если домен привязан)
4. ✅ Steam OAuth → успешная авторизация

---

## 🚀 Следующие шаги:

После тестирования:
1. **"Всё работает!"** → Готовим миграцию на VPS
2. **"Есть проблемы"** → Диагностируем и исправляем
3. **"Хочу на VPS"** → Начинаем развертывание на сервере

**Что показать первым делом?** 🤔
