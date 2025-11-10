#!/bin/bash

echo "=== 🔧 НАСТРОЙКА APACHE КАК REVERSE PROXY ==="
echo ""

if [ "$EUID" -ne 0 ]; then 
    echo "❌ Нужны права sudo"
    echo "💡 Запустите: sudo bash fix_apache_proxy.sh"
    exit 1
fi

# Включаем модули
echo "1. Включаю Apache модули..."
a2enmod proxy proxy_http proxy_connect 2>/dev/null
echo "   ✅ Модули включены"
echo ""

# Создаем конфиг
echo "2. Создаю конфигурацию для sgomarket.com..."
cat > /etc/apache2/sites-available/sgomarket.conf <<'APACHECONF'
<VirtualHost *:80>
    ServerName sgomarket.com
    ServerAlias www.sgomarket.com
    
    # Proxy на Node.js приложение
    ProxyPreserveHost On
    ProxyPass / http://localhost:3001/
    ProxyPassReverse / http://localhost:3001/
    
    # Логи
    ErrorLog ${APACHE_LOG_DIR}/sgomarket_error.log
    CustomLog ${APACHE_LOG_DIR}/sgomarket_access.log combined
</VirtualHost>
APACHECONF
echo "   ✅ Конфигурация создана: /etc/apache2/sites-available/sgomarket.conf"
echo ""

# Включаем сайт
echo "3. Включаю сайт sgomarket.com..."
a2ensite sgomarket 2>/dev/null
echo "   ✅ Сайт включен"
echo ""

# Перезагружаем Apache
echo "4. Перезагружаю Apache..."
systemctl reload apache2
echo "   ✅ Apache перезагружен"
echo ""

# Проверяем
echo "5. Проверяю работоспособность..."
sleep 2
echo ""
echo "   http://localhost/api/health:"
curl -s http://localhost/api/health | jq .status 2>/dev/null || echo "   Ошибка"
echo ""
echo "   http://sgomarket.com/api/health:"
curl -s http://sgomarket.com/api/health | jq .status 2>/dev/null || echo "   Ошибка"
echo ""

echo "=== ✅ ГОТОВО! ==="
echo ""
echo "📁 Конфиг: /etc/apache2/sites-available/sgomarket.conf"
echo "📁 Логи:   /var/log/apache2/sgomarket_*.log"
echo ""
echo "🌐 Тест:   http://sgomarket.com/api/auth/steam"
