require('dotenv').config();
const https = require('https');

const steamId = '76561198782060203';
const appId = '730';
const apiKey = process.env.STEAM_API_KEY;

console.log('\n=== ПОЛУЧЕНИЕ ИНВЕНТАРЯ ЧЕРЕЗ STEAM API ===\n');
console.log('SteamID:', steamId);
console.log('AppID:', appId, '(CS2)');

const url = `https://api.steampowered.com/IEconItems_${appId}/GetPlayerItems/v1/?key=${apiKey}&steamid=${steamId}&format=json`;

https.get(url, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);

      if (result.result && result.result.status === 1) {
        const items = result.result.items || [];

        console.log('\n✅ ИНВЕНТАРЬ ПОЛУЧЕН!');
        console.log('📦 Всего предметов:', items.length);

        if (items.length > 0) {
          console.log('\n🎯 ПРИМЕРЫ ПРЕДМЕТОВ:\n');

          items.slice(0, 10).forEach((item, i) => {
            console.log((i + 1) + '. AssetID: ' + item.assetid);
            console.log('   InstanceID: ' + item.instanceid);
            console.log('   ContextID: ' + item.contextid);
            console.log('   Tradable: ' + (item.tradable ? 'Да' : 'Нет') + '\n');
          });

          console.log('✅ ВСЕГО НАЙДЕНО: ' + items.length + ' РЕАЛЬНЫХ ПРЕДМЕТОВ В ИНВЕНТАРЕ!');
        } else {
          console.log('\n⚠️  Инвентарь пуст (но это РЕАЛЬНЫЙ бот!)');
          console.log('   Возможные причины:');
          console.log('   - Нет предметов в CS2');
          console.log('   - Все предметы не торговые');
          console.log('   - Приватный инвентарь');
        }
      } else {
        console.log('\n❌ Ошибка получения инвентаря');
        console.log('Status:', result.result ? result.result.status : 'unknown');
        console.log('Error:', result.result ? result.result.statusDetail : 'unknown');
      }
    } catch (e) {
      console.log('❌ Ошибка парсинга:', e.message);
      console.log('Data:', data.substring(0, 200));
    }
  });
}).on('error', (e) => {
  console.log('❌ Ошибка запроса:', e.message);
});
