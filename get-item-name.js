require('dotenv').config();
const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const TradeOfferManager = require('steam-tradeoffer-manager');

const config = {
  accountName: process.env.STEAM_BOT_1_USERNAME,
  password: process.env.STEAM_BOT_1_PASSWORD,
  sharedSecret: process.env.STEAM_BOT_1_SHARED_SECRET
};

const client = new SteamUser({
  promptSteamGuardCode: false,
  enableChainrhinos: false
});

const manager = new TradeOfferManager({
  steam: client,
  domain: 'localhost',
  language: 'en'
});

client.on('logOnSuccess', () => {
  console.log('✅ Подключен к Steam');

  manager.setCookies(null, (err) => {
    if (err) {
      console.log('❌ Ошибка cookies:', err.message);
      process.exit(1);
    }

    console.log('📡 Cookies установлены, получаем инвентарь...');

    // Быстро получаем инвентарь
    manager.getInventoryContents(730, 2, true, (err, inventory) => {
      if (err) {
        console.log('❌ Ошибка:', err.message);
        process.exit(1);
      }

      console.log(`📦 Найдено предметов: ${inventory.length}`);

      if (inventory.length > 0) {
        const item = inventory[0];
        console.log('\n🎯 ПРЕДМЕТ БОТА:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Название: ${item.name}`);
        console.log(`AssetID: ${item.assetid}`);
        console.log(`Торговый: ${item.tradable ? 'Да' : 'Нет'}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━');
      } else {
        console.log('⚠️  Инвентарь пуст');
      }

      process.exit(0);
    });
  });
});

client.on('steamGuard', (domain, callback) => {
  const code = SteamTotp.generateAuthCode(config.sharedSecret);
  console.log('🔐 Код Steam Guard:', code);
  callback(code);
});

console.log('🔄 Подключение...');
client.logOn({
  accountName: config.accountName,
  password: config.password
});
