// Прямой тест Steam API с твоим Steam ID
const https = require('https');

console.log('🔍 ПРЯМОЙ ТЕСТ STEAM API С ТВОИМ STEAM ID');
console.log('=========================================');
console.log(`Steam ID: 76561199257487454`);
console.log('');

// Тестируем Dota 2 напрямую
function testDirectSteamAPI(steamId, appId, gameName) {
  return new Promise((resolve) => {
    const apiUrl = `https://steamcommunity.com/inventory/${steamId}/${appId}/2?l=english&count=5000`;

    console.log(`🧪 Тестируем ${gameName} (${appId})...`);
    console.log(`🔗 URL: ${apiUrl}`);

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive'
      },
      timeout: 15000
    };

    https.get(apiUrl, options, (res) => {
      let data = '';
      let stream = res;

      // Обработка gzip сжатия
      const contentEncoding = res.headers['content-encoding'];
      if (contentEncoding && contentEncoding.includes('gzip')) {
        const zlib = require('zlib');
        stream = res.pipe(zlib.createGunzip());
        console.log('📦 Данные сжаты gzip, распаковываем...');
      }

      stream.on('data', (chunk) => {
        data += chunk;
      });

      stream.on('end', () => {
        console.log(`📡 Статус: ${res.statusCode}`);
        console.log(`📏 Размер ответа: ${data.length} байт`);

        if (data.length > 0) {
          console.log(`📄 Первые 200 символов: ${data.substring(0, 200)}...`);
        }

        if (res.statusCode === 200) {
          if (data.trim() === 'null') {
            console.log('🔒 Инвентарь приватный или пустой');
            resolve({ success: false, reason: 'private_or_empty', statusCode: res.statusCode });
          } else {
            try {
              const inventory = JSON.parse(data);
              if (inventory.success && inventory.assets && inventory.assets.length > 0) {
                console.log(`✅ Найдено ${inventory.assets.length} предметов!`);
                // Покажем первые 3 предмета
                console.log('📋 Первые 3 предмета:');
                inventory.assets.slice(0, 3).forEach((asset, i) => {
                  const description = inventory.descriptions?.find(desc =>
                    desc.classid === asset.classid && desc.instanceid === asset.instanceid
                  );
                  console.log(`  ${i + 1}. ${description?.name || 'Unknown'} (${asset.assetid})`);
                });
                resolve({ success: true, items: inventory.assets.length, data: inventory });
              } else {
                console.log('📭 Инвентарь пустой');
                resolve({ success: false, reason: 'empty', statusCode: res.statusCode });
              }
            } catch (parseError) {
              console.log(`❌ Ошибка парсинга JSON: ${parseError.message}`);
              resolve({ success: false, reason: 'parse_error', statusCode: res.statusCode, raw: data });
            }
          }
        } else if (res.statusCode === 400) {
          console.log('❌ Bad Request - Неверный Steam ID или AppID');
          resolve({ success: false, reason: 'bad_request', statusCode: res.statusCode });
        } else if (res.statusCode === 403) {
          console.log('🚫 Forbidden - Профиль приватный');
          resolve({ success: false, reason: 'forbidden', statusCode: res.statusCode });
        } else if (res.statusCode === 429) {
          console.log('⏳ Rate limited - Слишком много запросов');
          resolve({ success: false, reason: 'rate_limited', statusCode: res.statusCode });
        } else {
          console.log(`❌ Неожиданный статус: ${res.statusCode}`);
          resolve({ success: false, reason: `status_${res.statusCode}`, statusCode: res.statusCode });
        }
      });
    }).on('error', (error) => {
      console.log(`❌ Ошибка запроса: ${error.message}`);
      resolve({ success: false, reason: 'network_error', error: error.message });
    });
  });
}

async function runDirectTest() {
  const steamId = '76561199257487454';

  console.log('🚀 ЗАПУСКАЕМ ПРЯМЫЕ ЗАПРОСЫ В STEAM API');
  console.log('==========================================');

  // Тестируем Dota 2
  const dotaResult = await testDirectSteamAPI(steamId, '570', 'Dota 2');
  console.log('');

  // Тестируем CS2
  const cs2Result = await testDirectSteamAPI(steamId, '730', 'Counter-Strike 2');
  console.log('');

  // Тестируем TF2
  const tf2Result = await testDirectSteamAPI(steamId, '440', 'Team Fortress 2');
  console.log('');

  console.log('📊 ФИНАЛЬНЫЙ АНАЛИЗ');
  console.log('====================');

  const games = [
    { name: 'Dota 2', result: dotaResult },
    { name: 'CS2', result: cs2Result },
    { name: 'TF2', result: tf2Result }
  ];

  const workingGames = games.filter(g => g.result.success);
  const failedGames = games.filter(g => !g.result.success);

  console.log(`🎮 Всего протестировано: ${games.length}`);
  console.log(`✅ Игры с доступным инвентарем: ${workingGames.length}`);
  console.log(`❌ Игры с приватным инвентарем: ${failedGames.length}`);

  if (workingGames.length > 0) {
    console.log('\n🎮 ТВОИ ПРЕДМЕТЫ:');
    workingGames.forEach(game => {
      console.log(`  ${game.name}: ${game.result.items} предметов`);
    });
  }

  if (failedGames.length > 0) {
    console.log('\n❌ ПРИВАТНЫЕ ИГРЫ:');
    failedGames.forEach(game => {
      console.log(`  ${game.name}: ${game.result.reason} (HTTP ${game.result.statusCode})`);
    });
  }

  if (workingGames.length === 0 && failedGames.length === games.length) {
    console.log('\n🔴 ВСЕ ИГРЫ ПРИВАТНЫЕ');
    console.log('💡 Это означает что твой Steam профиль действительно установлен в приватный режим');
    console.log('🔧 Чтобы увидеть предметы, нужно:');
    console.log('   1. Перейти на https://steamcommunity.com/my/edit/settings/');
    console.log('   2. Поставить "Privacy Settings" -> "Profile Privacy" на "Public"');
    console.log('   3. Поставить "Privacy Settings" -> "Inventory Privacy" на "Public"');
    console.log('   4. Подождать 5-10 минут и проверить снова');
  }
}

runDirectTest()
  .then(() => {
    console.log('\n🏁 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО');
  })
  .catch(error => {
    console.error('❌ Тестирование провалилось:', error);
  });