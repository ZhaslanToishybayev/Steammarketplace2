# ✅ CLOUDFLARE TUNNEL - ГОТОВО К ИСПОЛЬЗОВАНИЮ

## 🤖 ЧТО АВТОМАТИЗИРОВАНО

✅ cloudflared скачан и установлен
✅ Конфигурация создана (~/.cloudflared/config.yml)
✅ Скрипт запуска создан (cloudflare_run.sh)
✅ Приложение работает на порту 8080

---

## 👤 ЧТО ВАМ НУЖНО СДЕЛАТЬ

### ШАГ 1: Авторизация в Cloudflare
```bash
./cloudflared tunnel login
```
**⚠️ ОТКРОЕТСЯ БРАУЗЕР** - войдите в ваш аккаунт Cloudflare

### ШАГ 2: Создание туннеля
```bash
./cloudflared tunnel create sgomarket-tunnel
```
**Результат:** Получите Tunnel ID, пример: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

### ШАГ 3: Привязка домена
```bash
# ВАРИАНТ А: Через командную строку
./cloudflared tunnel route dns sgomarket-tunnel sgomarket.com
./cloudflared tunnel route dns sgomarket-tunnel www.sgomarket.com

# ВАРИАНТ Б: Вручную в панели Cloudflare
# 1. Откройте https://dash.cloudflare.com/
# 2. Выберите домен sgomarket.com
# 3. DNS → Add record
# 4. Type: CNAME, Name: @, Target: [tunnel-url].cfargotunnel.com
# 5. Повторите для www
```

### ШАГ 4: Запуск туннеля
```bash
# ВАРИАНТ А: Автоматически
./cloudflare_run.sh

# ВАРИАНТ Б: Вручную
./cloudflared tunnel --config ~/.cloudflared/config.yml run sgomarket-tunnel &
```

---

## 🧪 ПРОВЕРКА

После запуска туннеля:

```bash
# Тест 1: Проверка health
curl http://sgomarket.com/api/health

# Тест 2: Проверка Steam OAuth
curl -I http://sgomarket.com/api/auth/steam

# Ожидаемый результат:
# HTTP/1.1 302 Found
# Location: https://steamcommunity.com/openid/login
```

---

## 🎉 ГОТОВО!

После выполнения всех шагов:
- ✅ sgomarket.com будет работать
- ✅ www.sgomarket.com будет работать
- ✅ Steam OAuth будет работать
- ✅ Публичный доступ без хостинга

---

## 📋 КРАТКАЯ КОМАНДА

```bash
# Всё в одном блоке:
./cloudflared tunnel login && \
./cloudflared tunnel create sgomarket-tunnel && \
./cloudflared tunnel route dns sgomarket-tunnel sgomarket.com && \
./cloudflared tunnel route dns sgomarket-tunnel www.sgomarket.com && \
./cloudflared tunnel --config ~/.cloudflared/config.yml run sgomarket-tunnel &
```

---

## ⚠️ ВАЖНО

1. **Браузер** - команда `tunnel login` откроет браузер для авторизации
2. **DNS propagación** - может занять до 5 минут
3. **Туннель** - должен оставаться запущенным (работает в фоне)
