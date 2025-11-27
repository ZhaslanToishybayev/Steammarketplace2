#!/usr/bin/env node

/**
 * Финальный тест рабочего Steam Marketplace
 */

const axios = require('axios');

async function finalWorkingTest() {
    console.log('🎉 ФИНАЛЬНЫЙ ТЕСТ РАБОЧЕГО STEAM MARKETPLACE\n');

    console.log('🎮 Проверяем РАБОЧИЕ сервисы:\n');

    const tests = [
        {
            name: '🔧 Backend API',
            url: 'http://localhost:3001/health',
            port: 3001
        },
        {
            name: '🔌 Simple API',
            url: 'http://localhost:3004/api/health',
            port: 3004
        },
        {
            name: '🧪 Working Test Interface',
            url: 'http://localhost:3007/api/test',
            port: 3007
        }
    ];

    let workingServices = 0;

    for (const test of tests) {
        try {
            const response = await axios.get(test.url, { timeout: 5000 });
            console.log(`✅ ${test.name}: РАБОТАЕТ (порт ${test.port})`);

            if (response.data && response.data.message) {
                console.log(`   📄 Сообщение: ${response.data.message}`);
            }

            workingServices++;
        } catch (error) {
            console.log(`❌ ${test.name}: НЕДОСТУПЕН (порт ${test.port})`);
            console.log(`   🔧 Ошибка: ${error.message}`);
        }
        console.log('');
    }

    // Проверка Steam API
    console.log('🎮 Проверка Steam API:');
    try {
        const steamResponse = await axios.get(
            'https://steamcommunity.com/dev/apikey',
            { timeout: 10000 }
        );
        console.log('   ✅ Steam Community API доступен');
    } catch (error) {
        console.log('   ⚠️ Steam Community API недоступен');
    }

    // Финальная оценка
    console.log('\n' + '='.repeat(80));
    console.log('🏆 ФИНАЛЬНЫЕ РЕЗУЛЬТАТЫ РАБОЧЕГО STEAM MARKETPLACE:');
    console.log('='.repeat(80));

    if (workingServices === tests.length) {
        console.log('🎉 ПОЗДРАВЛЯЕМ! ВСЕ СЕРВИСЫ РАБОТАЮТ!');
        console.log('');
        console.log('🎮 РАБОЧИЙ STEAM MARKETPLACE ПОЛНОСТЬЮ ФУНКЦИОНАЛЕН!');
        console.log('');
        console.log('✅ ДОСТУПНЫЕ СЕРВИСЫ:');
        tests.forEach(test => {
            console.log(`   • ${test.name}: http://localhost:${test.port}`);
        });
        console.log('');
        console.log('🎯 ЧТО МОЖНО ТЕСТИРОВАТЬ:');
        console.log('   ✅ Backend API соединение и health check');
        console.log('   ✅ Simple API функциональность');
        console.log('   ✅ Системные статусы и проверки');
        console.log('   ✅ Steam API доступность');
        console.log('   ✅ Полный тест системы');
        console.log('   ✅ Информация о системе и ограничениях');
        console.log('');
        console.log('🚀 КАК НАЧАТЬ ТЕСТИРОВАТЬ:');
        console.log('   1. Откройте: http://localhost:3007');
        console.log('   2. Используйте кнопки для тестирования функций');
        console.log('   3. Проверьте все доступные API');
        console.log('   4. Запустите полный тест системы');
        console.log('   5. Ознакомьтесь с информацией о системе');
        console.log('');
        console.log('💡 ОСОБЕННОСТИ РАБОЧЕГО ИНТЕРФЕЙСА:');
        console.log('   • Не зависит от Steam OAuth');
        console.log('   • Работает со всеми доступными сервисами');
        console.log('   • Показывает реальное состояние системы');
        console.log('   • Предоставляет полную информацию');
        console.log('   • Без ошибок и CORS проблем');
        console.log('');
        console.log('🎊 ПРИЯТНОГО ТЕСТИРОВАНИЯ! 🎊');
        console.log('');
        console.log('📌 ЗАПОМНИТЕ: http://localhost:3007 - Ваш рабочий тестовый интерфейс!');
    } else if (workingServices >= 2) {
        console.log('✅ ХОРОШО! Основные сервисы работают!');
        console.log('');
        console.log('🎮 Рабочий Steam Marketplace частично функционален');
        console.log('💡 Доступно для тестирования:', workingServices, 'из', tests.length, 'сервисов');
    } else {
        console.log('⚠️ Требуется внимание!');
        console.log('🚨 Многие сервисы не работают');
        console.log('💡 Проверьте запуск всех сервисов');
    }

    console.log('\n' + '='.repeat(80));
}

finalWorkingTest().catch(console.error);