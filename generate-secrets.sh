#!/bin/bash

echo "╔══════════════════════════════════════════════════════════╗"
echo "║             🔐 ГЕНЕРАЦИЯ СЕКРЕТОВ                       ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Проверьте openssl
if ! command -v openssl &> /dev/null; then
    echo "❌ openssl не найден. Устанавливаю..."
    apt update && apt install -y openssl
fi

# Генерация JWT_SECRET (64 символа)
echo "1. Генерирую JWT_SECRET..."
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
echo "   ✅ JWT_SECRET: ${JWT_SECRET:0:20}..."

# Генерация SESSION_SECRET (32 символа)
echo "2. Генерирую SESSION_SECRET..."
SESSION_SECRET=$(openssl rand -base64 32 | tr -d '\n')
echo "   ✅ SESSION_SECRET: ${SESSION_SECRET:0:20}..."

# Генерация MONGO_PASSWORD
echo "3. Генерирую MONGO_ROOT_PASSWORD..."
MONGO_PASSWORD=$(openssl rand -base32 16)
echo "   ✅ MONGO_ROOT_PASSWORD: $MONGO_PASSWORD"

# Генерация REDIS_PASSWORD
echo "4. Генерирую REDIS_PASSWORD..."
REDIS_PASSWORD=$(openssl rand -base32 16)
echo "   ✅ REDIS_PASSWORD: $REDIS_PASSWORD"

# Сохранение в файл
echo ""
echo "5. Сохраняю в .env.secrets..."
cat > .env.secrets << SECRETS
# Сгенерированные секреты
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$SESSION_SECRET
MONGO_ROOT_PASSWORD=$MONGO_PASSWORD
REDIS_PASSWORD=$REDIS_PASSWORD
SECRETS

# Добавление в .env.production
if [ -f ".env.production" ]; then
    echo ""
    echo "6. Обновляю .env.production..."
    # Создайте резервную копию
    cp .env.production .env.production.backup

    # Замените секреты в .env.production
    sed -i "s/GENERATE_STRONG_SECRET_HERE_MIN_64_CHARS/$JWT_SECRET/" .env.production
    sed -i "s/GENERATE_STRONG_SESSION_SECRET_MIN_32_CHARS/$SESSION_SECRET/" .env.production
    sed -i "s/GENERATE_STRONG_PASSWORD_HERE/$MONGO_PASSWORD/" .env.production
    sed -i "s/GENERATE_STRONG_REDIS_PASSWORD_HERE/$REDIS_PASSWORD/" .env.production

    echo "   ✅ .env.production обновлен"
    echo "   📋 Резервная копия: .env.production.backup"
else
    echo "   ⚠️ .env.production не найден, создаю из шаблона..."
    if [ -f ".env.production.fixed" ]; then
        cp .env.production.fixed .env.production
        # Замените секреты
        sed -i "s/GENERATE_STRONG_SECRET_HERE_MIN_64_CHARS/$JWT_SECRET/" .env.production
        sed -i "s/GENERATE_STRONG_SESSION_SECRET_MIN_32_CHARS/$SESSION_SECRET/" .env.production
        sed -i "s/GENERATE_STRONG_PASSWORD_HERE/$MONGO_PASSWORD/" .env.production
        sed -i "s/GENERATE_STRONG_REDIS_PASSWORD_HERE/$REDIS_PASSWORD/" .env.production
        echo "   ✅ .env.production создан и настроен"
    else
        echo "   ❌ .env.production.fixed не найден"
        exit 1
    fi
fi

# Итог
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                  ✅ ГОТОВО!                              ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "📄 Файлы:"
echo "   - .env.production (обновлен с секретами)"
echo "   - .env.secrets (только секреты)"
echo "   - .env.production.backup (резервная копия)"
echo ""
echo "⚠️  ВАЖНО:"
echo "   - Сохраните .env.secrets в безопасном месте!"
echo "   - НЕ коммитьте секреты в Git!"
echo "   - Используйте .env.production для деплоя"
echo ""
echo "🚀 Готов к запуску: docker-compose -f docker-compose.prod.yml up -d"
echo ""
