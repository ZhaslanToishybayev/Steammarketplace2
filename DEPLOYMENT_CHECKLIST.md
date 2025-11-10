# ✅ Чек-лист развертывания на ps.kz

## 📋 Перед деплоем:

### 1. Подготовить VPS
- [ ] Заказать VPS на ps.kz (минимум 2 CPU, 4GB RAM, 50GB SSD)
- [ ] Выбрать Ubuntu 22.04 LTS
- [ ] Получить IP адрес сервера
- [ ] Сохранить данные для SSH доступа

### 2. Настроить Steam API Key
- [ ] Создать новый Steam API Key для вашего домена:
  - Идти на: https://steamcommunity.com/dev/apikey
  - Domain: yourdomain.ps.kz
  - Сохранить API Key

### 3. Настроить .env.production
- [ ] Открыть .env.production
- [ ] Заменить BASE_URL и CLIENT_URL на ваш домен
- [ ] Вставить STEAM_API_KEY
- [ ] Генерировать JWT_SECRET (64+ символов)
- [ ] Генерировать SESSION_SECRET (32+ символов)
- [ ] Заполнить данные Steam бота

### 4. Подготовить SSL сертификаты
- [ ] Создать папку: nginx/ssl/
- [ ] Поместить cert.pem и key.pem
- [ ] Или настроить Let's Encrypt после деплоя

## 🚀 Процесс деплоя:

### На VPS сервере:

#### Шаг 1: Обновление системы
```bash
sudo apt update && sudo apt upgrade -y
```

#### Шаг 2: Установка Docker
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker
```

#### Шаг 3: Установка Docker Compose
```bash
sudo apt install docker-compose-plugin -y
```

#### Шаг 4: Загрузка проекта
```bash
# Вариант A: Git clone
git clone <your-repo-url> /var/www/steam-marketplace
cd /var/www/steam-marketplace

# Вариант B: SFTP загрузка
# Загрузить все файлы проекта на сервер
```

#### Шаг 5: Настройка .env
```bash
nano .env.production
# Заполнить все переменные
```

#### Шаг 6: SSL сертификаты (если есть)
```bash
mkdir -p nginx/ssl
# Скопировать cert.pem и key.pem
```

#### Шаг 7: Деплой
```bash
./scripts/deploy.sh
```

## 🌐 Настройка домена на ps.kz:

### В панели управления ps.kz:

1. Зайти в "Домены" → "Мои домены"
2. Выбрать ваш домен
3. Перейти в "DNS записи"
4. Добавить:
   ```
   Тип: A
   Имя: @
   Значение: IP_VPS_СЕРВЕРА
   TTL: 3600

   Тип: A
   Имя: www
   Значение: IP_VPS_СЕРВЕРА
   TTL: 3600
   ```

## 🔒 Настройка SSL (Let's Encrypt):

```bash
# Установить Certbot
sudo apt install certbot python3-certbot-nginx -y

# Получить сертификат
sudo certbot --nginx -d yourdomain.ps.kz -d www.yourdomain.ps.kz

# Настроить автообновление
sudo crontab -e
# Добавить: 0 12 * * * /usr/bin/certbot renew --quiet
```

## ✅ После деплоя:

- [ ] Проверить: https://yourdomain.ps.kz/api/health
- [ ] Проверить: https://yourdomain.ps.kz/api-docs
- [ ] Проверить авторизацию Steam
- [ ] Проверить работу бота
- [ ] Настроить мониторинг
- [ ] Настроить бэкапы

## 🔧 Полезные команды:

```bash
# Просмотр логов
docker-compose -f docker-compose.prod.yml logs -f

# Перезапуск
docker-compose -f docker-compose.prod.yml restart

# Остановка
docker-compose -f docker-compose.prod.yml down

# Статус
docker-compose -f docker-compose.prod.yml ps

# Вход в контейнер
docker exec -it steam-marketplace-app sh
```

## 🚨 Troubleshooting:

### Проблема: Контейнеры не запускаются
```bash
# Проверить логи
docker-compose -f docker-compose.prod.yml logs app
```

### Проблема: Не подключается к БД
```bash
# Проверить статус MongoDB
docker-compose -f docker-compose.prod.yml logs mongodb
```

### Проблема: 502 Bad Gateway
```bash
# Проверить, что app запущен
docker-compose -f docker-compose.prod.yml ps
```

---

**Готово к развертыванию!** 🎉
