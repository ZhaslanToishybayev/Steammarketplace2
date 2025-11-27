#!/usr/bin/env node

/**
 * Запуск тестового интерфейса
 */

const axios = require('axios');

async function startTestInterface() {
    console.log('🧪 ЗАПУСК ТЕСТОВОГО ИНТЕРФЕЙСА STEAM MARKETPLACE\n');

    // Проверка серверов
    console.log('🔍 Проверка доступности сервисов...');

    const services = [
        { name: 'Backend API', url: 'http://localhost:3001/health' },
        { name: 'Simple API', url: 'http://localhost:3004/api/health' },
        { name: 'Test Interface', url: 'http://localhost:3005/api/test' }
    ];

    for (const service of services) {
        try {
            const response = await axios.get(service.url, { timeout: 3000 });
            console.log(`   ✅ ${service.name}: РАБОТАЕТ`);
        } catch (error) {
            console.log(`   ❌ ${service.name}: НЕДОСТУПЕН`);
        }
    }

    console.log('\n🎉 ТЕСТОВЫЙ ИНТЕРФЕЙС ГОТОВ!');
    console.log('');
    console.log('🎮 ДОСТУПНЫЕ ТЕСТЫ:');
    console.log('   • 🔧 Backend Health Check');
    console.log('   • 🔌 Simple API Test');
    console.log('   • 🔑 Steam OAuth Authentication');
    console.log('   • 📦 Inventory Testing');
    console.log('   • 🔄 Trade Creation');
    console.log('   • 👤 User Authentication');
    console.log('');
    console.log('🚀 КАК ТЕСТИРОВАТЬ:');
    console.log('   1. Откройте в браузере: http://localhost:3005');
    console.log('   2. Нажмите на кнопки для тестирования функций');
    console.log('   3. Проверьте Steam OAuth аутентификацию');
    console.log('   4. Протестируйте торговую систему');
    console.log('');
    console.log('💡 ФУНКЦИИ ДЛЯ ТЕСТИРОВАНИЯ:');
    console.log('   ✅ Вход в Steam аккаунт');
    console.log('   ✅ Просмотр инвентаря');
    console.log('   ✅ Создание торговых предложений');
    console.log('   ✅ Работа с разными играми');
    console.log('   ✅ API эндпоинты');
    console.log('');
    console.log('🎊 Приятного тестирования! 🎊');
}

startTestInterface().catch(console.error);