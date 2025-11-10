# 🔧 Решения проблемы OAuth

## ✅ Вариант 1: Новый API Key для localhost (разработка)

### Шаги:
1. Идёте на: https://steamcommunity.com/dev/apikey
2. Заполняете форму:
   - **Domain**: `localhost`
   - **Notes**: `Development key for Steam Marketplace`
3. Получаете новый API Key (например: `ABCD1234...`)
4. Обновляете .env:
```env
# Заменяете на новый ключ для localhost
STEAM_API_KEY=НОВЫЙ_КЛЮЧ_ДЛЯ_LOCALHOST
STEAM_CLIENT_ID=НОВЫЙ_КЛЮЧ_ДЛЯ_LOCALHOST
STEAM_CLIENT_SECRET=НОВЫЙ_КЛЮЧ_ДЛЯ_LOCALHOST
```
5. Перезапускаете приложение: `node app.js`

### Результат:
✅ OAuth работает на localhost
✅ Можно разрабатывать локально
✅ Старый ключ (sgomarket.com) остаётся для production

---

## ✅ Вариант 2: Вернуться к production (sgomarket.com)

Если хотите сразу тестировать на production:

### В .env раскомментировать:
```env
# Production URLs
BASE_URL=https://sgomarket.com
CLIENT_URL=https://sgomarket.com
NODE_ENV=production

# Закомментировать localhost
# BASE_URL=http://localhost:3001
# CLIENT_URL=http://localhost:5173
```

### Результат:
✅ Используем старый API Key (sgomarket.com)
✅ OAuth работает сразу
❌ Нельзя локально разрабатывать

---

## 🎯 Рекомендация:
Используйте **Вариант 1** - создайте отдельный ключ для localhost
Таким образом:
- Для разработки: localhost + новый ключ
- Для продакшна: sgomarket.com + старый ключ
