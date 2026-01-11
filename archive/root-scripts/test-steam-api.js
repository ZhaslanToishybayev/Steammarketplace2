// Simple Steam API test
const axios = require('axios');

async function testSteamAPI() {
  const steamId = '76561199257487454'; // Test Steam ID
  const apiKey = 'E1FC69B3707FF57C6267322B0271A86B';

  try {
    console.log('Testing Steam API...');
    const response = await axios.get('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/', {
      params: {
        key: apiKey,
        steamids: steamId
      },
      timeout: 10000
    });

    console.log('✅ Steam API Response:', response.data);
    if (response.data.response.players && response.data.response.players.length > 0) {
      console.log('✅ Steam API is working correctly');
      console.log('Player:', response.data.response.players[0].personaname);
    } else {
      console.log('❌ No player data returned');
    }
  } catch (error) {
    console.error('❌ Steam API Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testSteamAPI();