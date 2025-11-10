# 🎯 Настройка sgomarket.com с Cloudflare Tunnel

## ✅ Что нужно

**У вас есть:**
- ✅ sudo права
- ✅ Домен sgomarket.com
- ✅ Steam API привязан к sgomarket.com
- ✅ Приложение на порту 8080

**Проблема:** Серый IP (NAT) - порт 80 недоступен

---

## 🚀 РЕШЕНИЕ: Cloudflare Tunnel + привязка домена

### Шаг 1: Установите cloudflared

```bash
# Скачайте
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64

# Установите
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
```

### Шаг 2: Авторизуйтесь в Cloudflare

```bash
cloudflared tunnel login
```

Откроется браузер - войдите в ваш аккаунт Cloudflare

### Шаг 3: Создайте туннель

```bash
# Создайте конфигурацию туннеля
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: sgomarket-tunnel
credentials-file: ~/.cloudflared/sgomarket-tunnel.json

ingress:
  - hostname: sgomarket.com
    service: http://localhost:8080
  - hostname: www.sgomarket.com
    service: http://localhost:8080
  - service: http_status:404
EOF
```

### Шаг 4: Создайте DNS записи

```bash
# Создайте туннель
cloudflared tunnel create sgomarket-tunnel

# Создайте DNS записи (выполните команды, которые выдаст cloudflared)
cloudflared tunnel route dns sgomarket-tunnel sgomarket.com
cloudflared tunnel route dns sgomarket-tunnel www.sgomarket.com
```

### Шаг 5: Запустите туннель

```bash
# Запустите в фоне
cloudflared tunnel --config ~/.cloudflared/config.yml run sgomarket-tunnel &
```

### Шаг 6: Проверьте

```bash
# Проверьте туннель
curl -I http://sgomarket.com/api/health

# Проверьте Steam OAuth
curl -I http://sgomarket.com/api/auth/steam
```

**Ожидаемый результат:**
```
HTTP/1.1 302 Found
Location: https://steamcommunity.com/openid/login
```

---

## 🎉 РЕЗУЛЬТАТ

После настройки:
- ✅ **sgomarket.com** будет работать
- ✅ **www.sgomarket.com** будет работать
- ✅ **Steam OAuth** будет работать с правильным доменом
- ✅ **HTTPS** автоматически
- ✅ **Публичный доступ** без роутера

---

## 🧪 ТЕСТ STEAM OAUTH

```bash
# Откройте в браузере:
http://sgomarket.com

# Или тест через curl:
curl -I http://sgomarket.com/api/auth/steam
```

Должен быть redirect на Steam!

---

## 📋 КРАТКАЯ КОМАНДА

Все в одном блоке:

```bash
# 1. Установить
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared

# 2. Авторизоваться (откроется браузер)
cloudflared tunnel login

# 3. Создать туннель
cloudflared tunnel create sgomarket-tunnel

# 4. Настроить конфиг
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: sgomarket-tunnel
credentials-file: ~/.cloudflared/sgomarket-tunnel.json
ingress:
  - hostname: sgomarket.com
    service: http://localhost:8080
  - hostname: www.sgomarket.com
    service: http://localhost:8080
  - service: http_status:404
EOF

# 5. Привязать домен
cloudflared tunnel route dns sgomarket-tunnel sgomarket.com
cloudflared tunnel route dns sgomarket-tunnel www.sgomarket.com

# 6. Запустить
cloudflared tunnel --config ~/.cloudflared/config.yml run sgomarket-tunnel &
```

---

## ✅ ПРОВЕРКА

После запуска проверьте:

```bash
curl http://sgomarket.com/api/health
curl -I http://sgomarket.com/api/auth/steam
```

**Работает!** 🎉
