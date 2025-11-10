# ⚡ Быстрый старт - Развертывание за 30 минут

## 🎯 Что нужно подготовить ДО начала:

1. **VPS на ps.kz** (заказан и оплачен)
2. **Домен** (привязан к аккаунту ps.kz)
3. **Steam API Key** для production домена
4. **SSH доступ** к серверу

---

## 📋 Чек-лист на 30 минут:

### ⏱️ Минуты 1-5: Подготовка
- [ ] Подключиться к серверу по SSH
- [ ] Обновить систему: `sudo apt update && sudo apt upgrade -y`

### ⏱️ Минуты 6-10: Docker
- [ ] Установить Docker: `curl -fsSL https://get.docker.com | sh`
- [ ] Установить Docker Compose: `sudo apt install docker-compose -y`

### ⏱️ Минуты 11-15: Проект
- [ ] Загрузить проект на сервер (SFTP/Git)
- [ ] Перейти в папку проекта
- [ ] Скопировать: `cp .env.example .env.production`

### ⏱️ Минуты 16-20: Настройка
- [ ] Отредактировать `.env.production`
- [ ] Заменить `yourdomain.ps.kz` на ваш домен
- [ ] Вставить Steam API Key
- [ ] Сгенерировать JWT_SECRET и SESSION_SECRET

### ⏱️ Минуты 21-25: Деплой
- [ ] Запустить: `docker-compose -f docker-compose.prod.yml up -d --build`
- [ ] Проверить: `docker-compose ps`
- [ ] Проверить: `curl http://localhost:3001/api/health`

### ⏱️ Минуты 26-30: Домен
- [ ] В панели ps.kz: добавить A-записи
- [ ] Дождаться DNS (5-10 минут)
- [ ] Проверить: `https://yourdomain.ps.kz/api/health`

---

## 📝 Быстрые команды:

```bash
# 1. Подключение
ssh root@IP_СЕРВЕРА

# 2. Обновление
sudo apt update && sudo apt upgrade -y && sudo apt install curl git -y

# 3. Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
sudo apt install docker-compose -y

# 4. Проект
cd /var/www
# Загрузить файлы проекта

# 5. Настройка
cd steam-marketplace
cp .env.example .env.production
nano .env.production
# Заполнить все поля!

# 6. Деплой
docker-compose -f docker-compose.prod.yml up -d --build
curl http://localhost:3001/api/health

# 7. Проверка
docker-compose -f docker-compose.prod.yml ps
```

---

## 🔗 Полезные ссылки:

- **Создание Steam API Key:** https://steamcommunity.com/dev/apikey
- **Панель ps.kz:** https://ps.kz
- **Документация Docker:** https://docs.docker.com
- **Let's Encrypt:** https://letsencrypt.org

---

## ❓ Частые вопросы:

**Q: Не могу подключиться по SSH?**
A: Проверьте IP адрес, логин и пароль в письме от ps.kz

**Q: Docker не найден?**
A: Перезайдите в систему: `newgrp docker`

**Q: Порт 3001 занят?**
A: Остановите локальный Node.js: `pkill -f node`

**Q: Ошибка "permission denied"?**
A: Добавьте `sudo` перед командами Docker

**Q: Домен не работает?**
A: Проверьте DNS: `nslookup yourdomain.ps.kz`

---

**Готовы? Начинаем!** 🚀
