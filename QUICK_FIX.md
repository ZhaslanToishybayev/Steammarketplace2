# 🔧 Быстрое исправление: Доступ к sgomarket.com

## Текущая проблема
- Домен sgomarket.com → 45.140.25.16 ✅
- На порту 80 работает Apache (не наше приложение) ❌
- Приложение работает на порту 3001 ✅

## Решения (выберите ОДНО):

### ✅ Решение 1: Остановить Apache (РЕКОМЕНДУЕТСЯ)
```bash
# Остановить Apache
sudo systemctl stop apache2
sudo systemctl disable apache2

# Запустить приложение на порту 80
PORT=80 npm start
```

### ✅ Решение 2: Использовать порт 8080
```bash
# Запустить на 8080
PORT=8080 npm start

# Тест
curl http://localhost:8080/api/health
```

### ✅ Решение 3: Настроить Apache как reverse proxy
```bash
# Создать конфигурацию
sudo tee /etc/apache2/sites-available/sgomarket.conf <<'APACHE_CONF'
<VirtualHost *:80>
    ServerName sgomarket.com
    ServerAlias www.sgomarket.com
    
    ProxyPreserveHost On
    ProxyPass / http://localhost:3001/
    ProxyPassReverse / http://localhost:3001/
</VirtualHost>
APACHE_CONF

# Включить модули и сайт
sudo a2enmod proxy proxy_http
sudo a2ensite sgomarket
sudo systemctl reload apache2
```

### ✅ Решение 4: Настроить роутер (порт-форвардинг)
```
Роутер → Перенаправление портов:
- Внешний порт 80 → Внутренний IP:3001
- Внешний порт 443 → Внутренний IP:3001
```

## После настройки протестируйте:
```bash
curl http://sgomarket.com/api/health
curl http://sgomarket.com/api/auth/steam
```

## Проверьте в браузере:
- http://sgomarket.com (главная)
- http://sgomarket.com/api/health (статус)
- http://sgomarket.com/api/auth/steam (Steam OAuth)
