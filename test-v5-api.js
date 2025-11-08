// Тест нового API steam-user v5
require('dotenv').config();
const SteamUser = require('steam-user');

const config = {
  accountName: process.env.STEAM_BOT_1_USERNAME,
  password: process.env.STEAM_BOT_1_PASSWORD,
  sharedSecret: process.env.STEAM_BOT_1_SHARED_SECRET
};

console.log('\n=== ТЕСТ STEAM-USER v5 API ===\n');

const client = new SteamUser({
  promptSteamGuardCode: false,
  enableChainrhinos: false
});

let guardCodeGenerated = false;

client.on('steamGuard', (domain, callback, lastCodeWrong) => {
  console.log('🔑 Steam Guard требуется (domain: ' + domain + ')');
  
  if (!guardCodeGenerated) {
    try {
      const steamTOTP = require('steam-totp');
      const code = steamTOTP.generateAuthCode(config.sharedSecret);
      console.log('🔑 Автогенерированный код: ' + code);
      guardCodeGenerated = true;
      callback(code);
    } catch (error) {
      console.log('❌ Ошибка генерации кода: ' + error.message);
      callback(null);
    }
  }
});

client.on('loggedOn', () => {
  console.log('\n✅ УСПЕШНО ПОДКЛЮЧЕН!\n');
  console.log('SteamID: ' + client.steamID.getSteamID64());
  console.log('Account name: ' + client.accountName);
  
  // Получаем web session
  console.log('\n🔄 Получаем web session...\n');
});

client.on('webSession', (sessionID, cookies) => {
  console.log('✅ WEB SESSION ПОЛУЧЕН!');
  console.log('SessionID: ' + sessionID);
  console.log('Cookies: ' + cookies.length + ' штук\n');
  
  // Теперь можно работать с TradeOfferManager
  const TradeOfferManager = require('steam-tradeoffer-manager');
  const manager = new TradeOfferManager({
    steam: client,
    domain: 'localhost',
    language: 'en'
  });
  
  manager.setCookies(cookies, (err) => {
    if (err) {
      console.log('❌ Ошибка установки cookies: ' + err.message);
      process.exit(1);
    }
    
    console.log('✅ Cookies установлены успешно!\n');
    console.log('📦 Загружаем инвентарь...\n');
    
    manager.getInventoryContents(730, 2, true, (err, inventory) => {
      if (err) {
        console.log('❌ Ошибка получения инвентаря: ' + err.message);
        process.exit(1);
      }
      
      console.log('✅ ИНВЕНТАРЬ ПОЛУЧЕН!');
      console.log('📦 Всего предметов: ' + inventory.length + '\n');
      
      if (inventory.length > 0) {
        console.log('🎯 Первые 5 предметов:\n');
        inventory.slice(0, 5).forEach((item, i) => {
          console.log((i + 1) + '. ' + item.name);
          console.log('   AssetID: ' + item.assetid);
          console.log('   Tradable: ' + (item.isTradable() ? 'Да' : 'Нет') + '\n');
        });
      } else {
        console.log('⚠️  Инвентарь пуст (но это нормально!)\n');
      }
      
      console.log('✅ ТЕСТ ПРОЙДЕН УСПЕШНО!');
      process.exit(0);
    });
  });
});

client.on('error', (error) => {
  console.log('\n❌ ОШИБКА: ' + error.message);
  if (error.eresult) {
    console.log('Код ошибки: ' + error.eresult + '\n');
  }
  process.exit(1);
});

console.log('🔌 Подключение к Steam...');
client.logOn({
  accountName: config.accountName,
  password: config.password
});
