#!/usr/bin/env node

// Прямой тест создания trade offer без HTTP сервера

const SteamUser = require('steam-user');
const SteamCommunity = require('steamcommunity');
const TradeOfferManager = require('steam-tradeoffer-manager');
const SteamTotp = require('steam-totp');

console.log('🎮 ПРЯМОЙ ТЕСТ СОЗДАНИЯ TRADE OFFER (БЕЗ HTTP)');
console.log('================================================');
console.log('');

async function directTradeTest() {
  try {
    // Ваши реальные учетные данные
    const botCredentials = {
      username: 'Sgovt1',
      password: 'Szxc123!',
      sharedSecret: 'LVke3WPKHWzT8pCNSemh2FMuJ90=',
      identitySecret: 'fzCjA+NZa0b3yOeEMhln81qgNM4=',
      steamId: '76561198012345678'
    };

    console.log('🔧 Создание экземпляров...');
    const bot = new SteamUser();
    const community = new SteamCommunity();
    const manager = new TradeOfferManager({
      steam: bot,
      community: community,
      language: 'ru',
      pollInterval: 10000,
      cancelTime: 300000,
    });

    console.log('🔐 Авторизация в Steam...');

    // Генерация 2FA кода
    const logOnOptions = {
      accountName: botCredentials.username,
      password: botCredentials.password,
      twoFactorCode: SteamTotp.generateAuthCode(botCredentials.sharedSecret)
    };

    console.log(`   Account: ${logOnOptions.accountName}`);
    console.log(`   2FA Code: ${logOnOptions.twoFactorCode}`);

    // Авторизация
    bot.logOn(logOnOptions);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Таймаут входа в Steam'));
      }, 30000);

      bot.on('loggedOn', async (details) => {
        clearTimeout(timeout);
        console.log('✅ Бот успешно вошел в Steam!');
        console.log(`   Player Name: ${details.player_name || 'Unknown'}`);
        console.log(`   SteamID: ${bot.steamID.getSteamID64()}`);
        console.log('');

        try {
          // Устанавливаем куки
          bot.setPersona(1); // Online
          bot.gamesPlayed([730]); // CS:GO

          bot.on('webSession', async (sessionID, cookies) => {
            console.log('🌐 Бот получил веб-сессию');
            community.setCookies(cookies);
            manager.setCookies(cookies);
            console.log('✅ Cookies установлены');
            console.log('');

            try {
              // Создаем trade offer
              console.log('🔄 Создание trade offer...');
              console.log('');

              const partnerSteamId = '76561199257487454'; // Целевой SteamID
              const assetid = '47116182310'; // AUG | Dvornik

              console.log(`📝 Партнер SteamID: ${partnerSteamId}`);
              console.log(`🎁 Предмет от бота: AUG | Dvornik (AssetID: ${assetid})`);
              console.log(`💬 Сообщение: Trade offer from Steam bot - ваш AUG предмет готов!`);
              console.log('');

              // Создаем предложение
              const offer = manager.createOffer(partnerSteamId);
              console.log('✅ Создан объект предложения:', offer.id);

              // Добавляем предметы от бота (используем правильный формат)
              offer.itemsToGive = [{
                appid: 730,
                contextid: '2',
                assetid: assetid,
                amount: 1
              }];

              console.log('📦 Предметы добавлены в offer.itemsToGive:', offer.itemsToGive);

              // Отправляем предложение
              console.log('📤 Отправка trade offer...');

              offer.send('Trade offer from Steam bot - ваш AUG предмет готов!', (err, status) => {
                if (err) {
                  console.error('❌ Ошибка отправки trade offer:', err.message);
                  console.error('   Stack:', err.stack);
                  reject(err);
                } else {
                  console.log('✅ TRADE OFFER УСПЕШНО ОТПРАВЛЕН!');
                  console.log('─'.repeat(50));
                  console.log(`   Trade ID: ${offer.id}`);
                  console.log(`   Статус: ${status}`);
                  console.log(`   Партнер SteamID: ${partnerSteamId}`);
                  console.log('');
                  console.log('🎉 ТОРГОВОЕ ПРЕДЛОЖЕНИЕ УСПЕШНО ОТПРАВЛЕНО!');
                  console.log('   Теперь нужно подтвердить трейд через Steam Mobile Authenticator');
                  console.log('   Проверьте мобильное приложение Steam для подтверждения');
                  resolve({ success: true, tradeId: offer.id, status });
                }
              });

            } catch (error) {
              console.error('❌ Ошибка создания trade offer:', error.message);
              reject(error);
            }
          });

        } catch (error) {
          console.error('❌ Ошибка авторизации:', error.message);
          reject(error);
        }
      });

      bot.on('error', (error) => {
        console.error('❌ Steam Bot Error:', error.message);
        reject(error);
      });

      bot.on('disconnected', (eresult) => {
        console.error(`❌ Бот отключен от Steam (eresult: ${eresult})`);
        reject(new Error(`Disconnected: ${eresult}`));
      });
    });

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    throw error;
  }
}

// Запускаем тест
directTradeTest()
  .then(result => {
    console.log('');
    console.log('🎊 ЗАДАЧА ВЫПОЛНЕНА!');
    process.exit(0);
  })
  .catch(error => {
    console.error('');
    console.error('💥 ОШИБКА:', error.message);
    process.exit(1);
  });