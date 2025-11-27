// Проверка через Steam Web API
const https = require('https');

console.log('🔍 ПРОВЕРКА ЧЕРЕЗ STEAM WEB API');
console.log('===============================');

const steamId = '76561199257487454';
const STEAM_API_KEY = 'YOUR_STEAM_API_KEY_HERE'; // Наш реальный Steam API ключ

// Проверим профиль через Steam Web API
function testSteamWebAPI(steamId) {
  return new Promise((resolve) => {
    const apiUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId}`;

    console.log(`🧪 Проверяем профиль через Steam Web API...`);
    console.log(`🔗 URL: ${apiUrl}`);

    https.get(apiUrl, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`📡 Статус: ${res.statusCode}`);
        console.log(`📏 Размер ответа: ${data.length} байт`);

        if (data.length > 0) {
          try {
            const response = JSON.parse(data);
            console.log('📄 Ответ Steam Web API:');
            console.log(JSON.stringify(response, null, 2));

            if (response.response && response.response.players && response.response.players.length > 0) {
              const player = response.response.players[0];
              console.log('\n👤 Информация о профиле:');
              console.log(`  Имя: ${player.personaname}`);
              console.log(`  Статус: ${player.personastate}`);
              console.log(`  Приватность профиля: ${player.communityvisibilitystate}`);
              console.log(`  Приватность инвентаря: ${player.profilestate ? 'Public' : 'Private'}`);

              // Проверим приватность
              if (player.communityvisibilitystate === 3) {
                console.log('✅ Профиль публичный');
                resolve({ success: true, profile: player });
              } else {
                console.log('🔒 Профиль приватный');
                resolve({ success: false, reason: 'profile_private', profile: player });
              }
            } else {
              console.log('❌ Профиль не найден');
              resolve({ success: false, reason: 'profile_not_found' });
            }
          } catch (error) {
            console.log(`❌ Ошибка парсинга: ${error.message}`);
            console.log(`📄 Сырые данные: ${data}`);
            resolve({ success: false, reason: 'parse_error', raw: data });
          }
        }
      });
    }).on('error', (error) => {
      console.log(`❌ Ошибка запроса: ${error.message}`);
      resolve({ success: false, reason: 'network_error', error: error.message });
    });
  });
}

// Проверим доступность инвентаря через другой метод
function testInventoryAccess(steamId, appId) {
  return new Promise((resolve) => {
    // Попробуем альтернативный метод проверки
    const testUrl = `https://steamcommunity.com/profiles/${steamId}/inventory`;

    console.log(`\n🧪 Проверяем доступ к инвентарю...`);
    console.log(`🔗 URL: ${testUrl}`);

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    };

    https.get(testUrl, options, (res) => {
      let data = '';
      let stream = res;

      // Обработка gzip
      const contentEncoding = res.headers['content-encoding'];
      if (contentEncoding && contentEncoding.includes('gzip')) {
        const zlib = require('zlib');
        stream = res.pipe(zlib.createGunzip());
      }

      stream.on('data', (chunk) => {
        data += chunk;
      });

      stream.on('end', () => {
        console.log(`📡 Статус: ${res.statusCode}`);
        console.log(`📏 Размер ответа: ${data.length} байт`);

        // Проверим наличие признаков приватности
        if (data.includes('private') || data.includes('Private') || res.statusCode === 401) {
          console.log('🔒 Инвентарь приватный');
          resolve({ success: false, reason: 'inventory_private' });
        } else if (data.includes('inventory') || data.includes('Inventory')) {
          console.log('✅ Инвентарь доступен');
          resolve({ success: true, reason: 'inventory_accessible' });
        } else {
          console.log('❓ Неопределенное состояние');
          resolve({ success: false, reason: 'unknown', statusCode: res.statusCode });
        }
      });
    }).on('error', (error) => {
      console.log(`❌ Ошибка: ${error.message}`);
      resolve({ success: false, reason: 'network_error', error: error.message });
    });
  });
}

async function runWebAPITest() {
  console.log('🚀 ЗАПУСКАЕМ ПРОВЕРКУ ЧЕРЕЗ STEAM WEB API');
  console.log('==========================================');

  // Проверим профиль
  const profileResult = await testSteamWebAPI(steamId);
  console.log('');

  // Проверим доступ к инвентарю
  const inventoryResult = await testInventoryAccess(steamId, '570');

  console.log('\n📊 ФИНАЛЬНЫЙ АНАЛИЗ');
  console.log('====================');

  if (profileResult.success) {
    console.log('✅ Steam Web API работает');
    console.log('✅ Профиль доступен');
  } else {
    console.log('❌ Steam Web API не работает или профиль приватный');
  }

  if (inventoryResult.success) {
    console.log('✅ Инвентарь доступен');
  } else {
    console.log('❌ Инвентарь недоступен');
  }

  console.log('\n💡 ВОЗМОЖНЫЕ ПРИЧИНЫ ПРОБЛЕМЫ:');
  console.log('================================');

  console.log('1. Steam изменил политику доступа к Community API');
  console.log('2. Твой регион/IP заблокирован Steam');
  console.log('3. Steam Community API временно не работает');
  console.log('4. Требуется авторизация для доступа к инвентарю');

  console.log('\n🔧 РЕКОМЕНДАЦИИ:');
  console.log('=================');
  console.log('1. Проверь настройки приватности вручную на Steam');
  console.log('2. Попробуй с другого IP/региона');
  console.log('3. Используй официальный Steam API с токеном');
  console.log('4. Проверь статус Steam Community: https://steamcommunity.com/dev');
}

runWebAPITest()
  .then(() => {
    console.log('\n🏁 ПРОВЕРКА ЗАВЕРШЕНА');
  })
  .catch(error => {
    console.error('❌ Проверка провалилась:', error);
  });