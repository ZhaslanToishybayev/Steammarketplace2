require('dotenv').config();
const https = require('https');

const steamId = '76561198782060203';
const apiKey = process.env.STEAM_API_KEY;

console.log('\n=== ПРОВЕРКА STEAM ПРОФИЛЯ ===\n');
console.log('SteamID:', steamId);
console.log('API Key:', apiKey ? apiKey.substring(0, 10) + '...' : 'Не найден');

// Получаем базовую информацию
const url1 = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`;

https.get(url1, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      const player = result.response.players[0];
      
      if (player) {
        console.log('\n✅ ИНФОРМАЦИЯ О ПРОФИЛЕ:');
        console.log('   Имя:', player.personaname);
        console.log('   Статус:', player.personastate === 1 ? 'Онлайн' : 'Оффлайн');
        console.log('   Видимость:', player.communityvisibilitystate === 3 ? 'Публичный' : 'Приватный');
        console.log('   Профиль:', player.profileurl);
        
        if (player.communityvisibilitystate === 3) {
          console.log('\n🔓 Профиль публичный - инвентарь должен быть доступен');
        } else {
          console.log('\n🔒 Профиль приватный - инвентарь скрыт');
        }
      }
    } catch (e) {
      console.log('❌ Ошибка парсинга:', e.message);
    }
  });
}).on('error', (e) => {
  console.log('❌ Ошибка API:', e.message);
});
