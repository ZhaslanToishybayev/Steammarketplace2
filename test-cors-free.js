#!/usr/bin/env node

/**
 * Тест CORS-free интерфейса
 */

const axios = require('axios');

async function testCORSFreeInterface() {
    console.log('🌐 ТЕСТ CORS-FREE ИНТЕРФЕЙСА\n');

    const corsFreePort = 3009;
    const corsFreeUrl = `http://localhost:${corsFreePort}`;

    console.log('🎯 Проверяем CORS-free тестовый интерфейс:\n');

    try {
        // Проверим доступность CORS-free сервера
        const interfaceResponse = await axios.get(`${corsFreeUrl}/api/proxy/status`, { timeout: 10000 });

        console.log('✅ CORS-free интерфейс доступен');
        console.log('');
        console.log('📊 Результаты тестирования всех сервисов:');
        console.log('');

        let workingServices = 0;

        interfaceResponse.data.services.forEach(service => {
            if (service.status === 'success') {
                console.log(`✅ ${service.name}: РАБОТАЕТ`);
                workingServices++;
            } else {
                console.log(`❌ ${service.name}: НЕДОСТУПЕН`);
                console.log(`   Ошибка: ${service.error}`);
            }
        });

        console.log('');
        console.log('🎉 РЕЗУЛЬТАТЫ CORS-FREE ТЕСТА:');
        console.log('=====================================');

        if (workingServices === interfaceResponse.data.services.length) {
            console.log('🎊 ПОЗДРАВЛЯЕМ! ВСЕ СЕРВИСЫ РАБОТАЮТ!');
            console.log('');
            console.log('🌐 CORS-free интерфейс полностью функционален!');
            console.log('');
            console.log('🚀 КАК ИСПОЛЬЗОВАТЬ:');
            console.log(`   1. Откройте: http://localhost:${corsFreePort}`);
            console.log('   2. Нажмите на кнопки для тестирования сервисов');
            console.log('   3. Смотрите результаты в реальном времени');
            console.log('   4. Все тесты проходят без CORS проблем!');
            console.log('');
            console.log('💡 ПРЕИМУЩЕСТВА CORS-free ИНТЕРФЕЙСА:');
            console.log('   • Работает во всех браузерах');
            console.log('   • Нет CORS ограничений');
            console.log('   • Реальные тесты API');
            console.log('   • Мгновенные результаты');
            console.log('   • Полная функциональность');
        } else {
            console.log(`⚠️ Работает только ${workingServices} из ${interfaceResponse.data.services.length} сервисов`);
        }

        console.log('');
        console.log('=====================================');

    } catch (error) {
        console.log('❌ CORS-free интерфейс недоступен');
        console.log(`Ошибка: ${error.message}`);
        console.log('');
        console.log('💡 Убедитесь, что CORS-free сервер запущен:');
        console.log(`   node cors-free-test-server.js`);
        console.log(`   Затем откройте: http://localhost:${corsFreePort}`);
    }
}

testCORSFreeInterface().catch(console.error);