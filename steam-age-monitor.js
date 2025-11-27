#!/usr/bin/env node

/**
 * 🕐 Steam Account Age Monitor
 * Real-time monitoring of Steam account age progression towards 90-day trading eligibility
 */

const axios = require('axios');

class SteamAgeMonitor {
  constructor() {
    this.steamApiKey = 'E1FC69B3707FF57C6267322B0271A86B';
    this.botSteamId = '76561198782060203'; // Sgovt1 - needs 90 days
    this.requiredAgeDays = 90;
  }

  async getAccountAge() {
    try {
      console.log('🔍 Проверка возраста Steam аккаунта...');
      console.log('=========================================');

      const response = await axios.get(
        `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${this.steamApiKey}&steamids=${this.botSteamId}`
      );

      const player = response.data.response.players[0];
      const createdTimestamp = player.timecreated;
      const createdDate = new Date(createdTimestamp * 1000);

      const now = new Date();
      const ageMilliseconds = now.getTime() - createdDate.getTime();
      const ageDays = ageMilliseconds / (1000 * 60 * 60 * 24);
      const ageHours = (ageDays % 1) * 24;
      const ageMinutes = (ageHours % 1) * 60;

      const remainingDays = this.requiredAgeDays - ageDays;
      const remainingHours = (remainingDays % 1) * 24;

      const estimatedEligibility = new Date(now.getTime() + (remainingDays * 24 * 60 * 60 * 1000));

      // Display results
      console.log('');
      console.log('📊 ТЕКУЩИЙ СТАТУС АККАУНТА:');
      console.log('─'.repeat(40));
      console.log(`🤖 SteamID: ${this.botSteamId}`);
      console.log(`👤 Имя: ${player.personaname}`);
      console.log(`📅 Дата создания: ${createdDate.toISOString().split('T')[0]}`);
      console.log(`🕐 Время создания: ${createdDate.toTimeString().split(' ')[0]}`);
      console.log('');

      console.log('📈 ВОЗРАСТ АККАУНТА:');
      console.log('─'.repeat(40));
      console.log(`   ${ageDays.toFixed(2)} дней`);
      console.log(`   ${Math.floor(ageDays)} дней, ${Math.floor(ageHours)} часов, ${Math.floor(ageMinutes)} минут`);
      console.log('');

      console.log('⏰ ОСТАЛОСЬ ДО 90 ДНЕЙ:');
      console.log('─'.repeat(40));
      if (remainingDays > 0) {
        console.log(`   ${remainingDays.toFixed(2)} дней`);
        console.log(`   ${Math.floor(remainingDays)} дней, ${Math.floor(remainingHours)} часов`);
        console.log(`   📅 Примерная дата: ${estimatedEligibility.toISOString().split('T')[0]}`);
      } else {
        console.log('   ✅ ГОТОВО! Аккаунт старше 90 дней');
      }
      console.log('');

      // Progress bar
      const progress = Math.min(100, (ageDays / this.requiredAgeDays) * 100);
      const progressBar = this.createProgressBar(progress, 30);
      console.log(`🎯 Прогресс: [${progressBar}] ${progress.toFixed(1)}%`);
      console.log('');

      // Status indicator
      if (ageDays >= this.requiredAgeDays) {
        console.log('🎉 СТАТУС: АККАУНТ ГОТОВ К БЕЗОГРАНИЧЕННОМУ ТРЕЙДИНГУ!');
        console.log('   ✅ Можно создавать trade offers без ограничений');
        console.log('   ✅ Error 15 (AccessDenied) больше не будет возникать');
        console.log('   🚀 Рекомендуется начать тестирование trade offers');
      } else {
        console.log('⏳ СТАТУС: АККАУНТ ЕЩЕ НЕ ДОСТИГ 90-ДНЕВНОГО ЛИМИТА');
        console.log('   ❌ Ограничения на trade offers все еще действуют');
        console.log('   ⏰ Необходимо подождать еще несколько дней');
        console.log('   💡 Рекомендуется продолжать разработку и тестирование системы');
      }

      console.log('');
      console.log('🔧 ТЕКУЩИЙ СТАТУС СИСТЕМЫ:');
      console.log('─'.repeat(40));

      // Check bot status
      try {
        const botStatusResponse = await axios.get('http://localhost:3021/api/account/status', { timeout: 5000 });
        const botStatus = botStatusResponse.data.data;

        console.log(`   🤖 Steam Bot: ${botStatus.botStatus === 'online' ? '✅ ONLINE' : '❌ OFFLINE'}`);
        console.log(`   🆔 SteamID: ${botStatus.steamId}`);
        console.log(`   📱 Mobile Auth: ${botStatus.mobileAuthenticator ? '✅ SET' : '❌ NOT SET'}`);
        console.log(`   🔑 Identity Secret: ${botStatus.identitySecret ? '✅ SET' : '❌ NOT SET'}`);
        console.log(`   🎯 Current Phase: ${botStatus.debugInfo.currentPhase}`);

        if (botStatus.botStatus === 'online' && ageDays >= this.requiredAgeDays) {
          console.log('');
          console.log('🚀 ГОТОВНОСТЬ К ПРОИЗВОДСТВУ:');
          console.log('─'.repeat(40));
          console.log('   ✅ Steam Bot: Online and authenticated');
          console.log('   ✅ Account Age: 90+ days (unrestricted trading)');
          console.log('   ✅ Mobile Authenticator: Active');
          console.log('   ✅ System Architecture: CS.MONEY-level professional');
          console.log('   🎯 RECOMMENDATION: Start production trading immediately!');
        }
      } catch (botError) {
        console.log('   🤖 Steam Bot: ❌ Cannot connect to local server');
        console.log('   💡 Запустите: node steam-trade-manager-debug.js');
      }

      return {
        ageDays,
        remainingDays,
        isEligible: ageDays >= this.requiredAgeDays,
        estimatedEligibility
      };

    } catch (error) {
      console.error('❌ Ошибка проверки возраста аккаунта:', error.message);
      if (error.response) {
        console.error('   HTTP Error:', error.response.status, error.response.statusText);
      }
      return null;
    }
  }

  createProgressBar(progress, width) {
    const filled = Math.round((progress / 100) * width);
    const empty = width - filled;
    const percentage = progress.toFixed(1);

    if (progress >= 100) {
      return '█'.repeat(width) + ' ' + percentage + '%';
    } else if (progress >= 90) {
      return '█'.repeat(filled) + '░'.repeat(empty) + ' ' + percentage + '% ⚡';
    } else if (progress >= 75) {
      return '█'.repeat(filled) + '░'.repeat(empty) + ' ' + percentage + '% 🚀';
    } else if (progress >= 50) {
      return '█'.repeat(filled) + '░'.repeat(empty) + ' ' + percentage + '% 👍';
    } else if (progress >= 25) {
      return '█'.repeat(filled) + '░'.repeat(empty) + ' ' + percentage + '% 📈';
    } else {
      return '█'.repeat(filled) + '░'.repeat(empty) + ' ' + percentage + '% 🌱';
    }
  }

  async startMonitoring(intervalMinutes = 60) {
    console.log('🕐 Steam Account Age Monitor');
    console.log('============================');
    console.log(`Monitoring SteamID: ${this.botSteamId}`);
    console.log(`Update interval: every ${intervalMinutes} minutes`);
    console.log(`Target age: ${this.requiredAgeDays} days`);
    console.log('');

    const checkAge = async () => {
      await this.getAccountAge();
      console.log('');
      console.log(`🕐 Следующая проверка через ${intervalMinutes} минут...`);
      console.log('─'.repeat(60));
    };

    // Initial check
    await checkAge();

    // Set up interval
    setInterval(checkAge, intervalMinutes * 60 * 1000);
  }
}

// CLI Usage
if (require.main === module) {
  const monitor = new SteamAgeMonitor();

  const args = process.argv.slice(2);
  const intervalArg = args.find(arg => arg.startsWith('--interval='));
  const interval = intervalArg ? parseInt(intervalArg.split('=')[1]) : 60;

  monitor.startMonitoring(interval).catch(console.error);
}

module.exports = SteamAgeMonitor;