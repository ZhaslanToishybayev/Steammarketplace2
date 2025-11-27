#!/usr/bin/env node

// Альтернативный тест создания trade offer с упрощенным подходом

const SteamUser = require('steam-user');
const SteamCommunity = require('steamcommunity');
const TradeOfferManager = require('steam-tradeoffer-manager');
const SteamTotp = require('steam-totp');

console.log('🎮 АЛЬТЕРНАТИВНЫЙ ТЕСТ СОЗДАНИЯ TRADE OFFER');
console.log('==============================================');
console.log('');

async function alternativeTradeTest() {
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
              // Ждем немного для стабилизации сессии
              setTimeout(async () => {
                console.log('🔄 Создание trade offer...');
                console.log('');

                const partnerSteamId = '76561199257487454'; // Целевой SteamID
                const assetid = '47116182310'; // AUG | Dvornik

                console.log(`📝 Партнер SteamID: ${partnerSteamId}`);
                console.log(`🎁 Предмет от бота: AUG | Dvornik (AssetID: ${assetid})`);
                console.log('');

                // Создаем предложение с правильными параметрами
                const offer = manager.createOffer(partnerSteamId);

                // Правильно устанавливаем предметы
                offer.itemsToGive = [{
                  appid: 730,
                  contextid: '2',
                  assetid: assetid,
                  amount: 1
                }];

                console.log('📦 Предметы добавлены в offer.itemsToGive');
                console.log('   Items:', JSON.stringify(offer.itemsToGive, null, 2));

                // Проверяем, что предметы действительно добавлены
                if (!offer.itemsToGive || offer.itemsToGive.length === 0) {
                  console.error('❌ Предметы не добавлены в предложение');
                  reject(new Error('Items not added to offer'));
                  return;
                }

                // Отправляем предложение с правильным синтаксисом
                console.log('📤 Отправка trade offer...');

                // Используем промис вместо колбэка для лучшей обработки
                try {
                  const result = await new Promise((resolve, reject) => {
                    offer.send('Trade offer from Steam bot - ваш AUG предмет готов!', (err, status) => {
                      if (err) {
                        reject(err);
                      } else {
                        resolve({ status, tradeId: offer.id });
                      }
                    });
                  });

                  console.log('✅ TRADE OFFER УСПЕШНО ОТПРАВЛЕН!');
                  console.log('─'.repeat(50));
                  console.log(`   Trade ID: ${result.tradeId}`);
                  console.log(`   Статус: ${result.status}`);
                  console.log(`   Партнер SteamID: ${partnerSteamId}`);
                  console.log('');
                  console.log('🎉 ТОРГОВОЕ ПРЕДЛОЖЕНИЕ УСПЕШНО ОТПРАВЛЕНО!');
                  console.log('   Теперь нужно подтвердить трейд через Steam Mobile Authenticator');
                  console.log('   Проверьте мобильное приложение Steam для подтверждения');
                  resolve(result);

                } catch (error) {
                  console.error('❌ Ошибка отправки trade offer:', error.message);
                  console.error('   Stack:', error.stack);
                  reject(error);
                }

              }, 2000); // Ждем 2 секунды для стабилизации

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
alternativeTradeTest()
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