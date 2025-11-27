// COMPREHENSIVE STEAM API INVESTIGATION
// =====================================
// Analyzing why Steam Community API returns HTTP 400 with "null" response
// While Steam Web API confirms profile is public

const https = require('https');
const http = require('http');

console.log('🔍 COMPREHENSIVE STEAM API INVESTIGATION');
console.log('=========================================');
console.log('Testing multiple approaches to access Steam inventory...\n');

const steamId = '76561199257487454'; // User's real Steam ID
const testUrls = [
  // Steam Community API (currently failing)
  {
    name: 'Steam Community API - CS2',
    url: `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=5000`,
    type: 'community'
  },
  {
    name: 'Steam Community API - Dota 2',
    url: `https://steamcommunity.com/inventory/${steamId}/570/2?l=english&count=5000`,
    type: 'community'
  },
  // Steam Web API (alternative)
  {
    name: 'Steam Web API - Player Summaries',
    url: `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=YOUR_STEAM_API_KEY_HERE&steamids=${steamId}`,
    type: 'webapi'
  },
  // Alternative community endpoints
  {
    name: 'Community Profile Page',
    url: `https://steamcommunity.com/profiles/${steamId}`,
    type: 'profile'
  },
  {
    name: 'Community Inventory Page',
    url: `https://steamcommunity.com/profiles/${steamId}/inventory`,
    type: 'inventory-page'
  }
];

// Enhanced headers for better success rate
const enhancedHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Encoding': 'gzip, deflate, br',
  'Accept-Language': 'en-US,en;q=0.9',
  'Connection': 'keep-alive',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'cross-site'
};

function testUrl(testCase, index) {
  return new Promise((resolve) => {
    console.log(`\n🧪 Test ${index + 1}: ${testCase.name}`);
    console.log(`🔗 URL: ${testCase.url}`);
    console.log(`📊 Type: ${testCase.type}`);

    const startTime = Date.now();
    const url = new URL(testCase.url);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: enhancedHeaders,
      timeout: 10000
    };

    const req = client.request(options, (res) => {
      let data = '';
      let stream = res;

      // Handle compression
      const contentEncoding = res.headers['content-encoding'];
      if (contentEncoding && contentEncoding.includes('gzip')) {
        const zlib = require('zlib');
        stream = res.pipe(zlib.createGunzip());
      } else if (contentEncoding && contentEncoding.includes('deflate')) {
        const zlib = require('zlib');
        stream = res.pipe(zlib.createInflate());
      }

      stream.on('data', (chunk) => {
        data += chunk;
      });

      stream.on('end', () => {
        const responseTime = Date.now() - startTime;

        console.log(`📡 Status: ${res.statusCode}`);
        console.log(`⏱️ Response Time: ${responseTime}ms`);
        console.log(`📏 Data Length: ${data.length} bytes`);

        // Analyze response
        if (data.length > 0) {
          const first500 = data.substring(0, 500);
          console.log(`📄 First 500 chars: ${JSON.stringify(first500)}`);

          // Try to parse as JSON if it looks like JSON
          if (data.trim().startsWith('{') || data.trim().startsWith('[')) {
            try {
              const parsed = JSON.parse(data);
              console.log(`✅ JSON parsed successfully`);
              if (testCase.type === 'webapi' && parsed.response) {
                console.log(`👤 Player name: ${parsed.response.players?.[0]?.personaname || 'Unknown'}`);
                console.log(`🔒 Profile state: ${parsed.response.players?.[0]?.communityvisibilitystate || 'Unknown'}`);
              }
            } catch (e) {
              console.log(`❌ JSON parse error: ${e.message}`);
            }
          } else if (data.trim() === 'null') {
            console.log(`❌ Response is 'null' - inventory likely private or API restricted`);
          } else {
            console.log(`📄 Response appears to be HTML or other format`);
          }
        } else {
          console.log(`❌ Empty response received`);
        }

        // Check headers
        console.log(`📋 Response Headers:`, {
          'content-type': res.headers['content-type'],
          'content-encoding': res.headers['content-encoding'],
          'set-cookie': res.headers['set-cookie'] ? `${res.headers['set-cookie'].length} cookies` : 'none',
          'x-frame-options': res.headers['x-frame-options'],
          'x-content-type-options': res.headers['x-content-type-options']
        });

        resolve({
          test: testCase.name,
          status: res.statusCode,
          responseTime,
          dataLength: data.length,
          success: res.statusCode === 200 && data.length > 0,
          data: data.length < 1000 ? data : data.substring(0, 1000) + '...'
        });
      });
    });

    req.on('error', (error) => {
      console.log(`❌ Request error: ${error.message}`);
      resolve({
        test: testCase.name,
        status: 'error',
        error: error.message,
        success: false
      });
    });

    req.on('timeout', () => {
      console.log(`⏰ Request timeout`);
      req.destroy();
      resolve({
        test: testCase.name,
        status: 'timeout',
        success: false
      });
    });

    req.setTimeout(10000);
    req.end();
  });
}

async function runInvestigation() {
  console.log('🚀 Starting comprehensive Steam API investigation...\n');

  const results = [];

  for (let i = 0; i < testUrls.length; i++) {
    const result = await testUrl(testUrls[i], i);
    results.push(result);

    // Add delay between requests to avoid rate limiting
    if (i < testUrls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Summary analysis
  console.log('\n📊 INVESTIGATION RESULTS SUMMARY');
  console.log('==================================');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n🎯 Total Tests: ${results.length}`);
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);

  if (successful.length > 0) {
    console.log('\n✅ SUCCESSFUL ENDPOINTS:');
    successful.forEach(result => {
      console.log(`  • ${result.test} (${result.status}, ${result.responseTime}ms, ${result.dataLength} bytes)`);
    });
  }

  if (failed.length > 0) {
    console.log('\n❌ FAILED ENDPOINTS:');
    failed.forEach(result => {
      console.log(`  • ${result.test} (${result.status}${result.error ? ': ' + result.error : ''})`);
    });
  }

  // Specific analysis for inventory access
  console.log('\n🔍 INVENTORY ACCESS ANALYSIS');
  console.log('==============================');

  const communityApiTests = results.filter(r => r.test.includes('Steam Community API'));
  const webApiTests = results.filter(r => r.test.includes('Steam Web API'));

  if (communityApiTests.length > 0) {
    console.log('\n🎮 Steam Community API Results:');
    communityApiTests.forEach(test => {
      if (test.success && test.data.includes('null')) {
        console.log(`  ❌ ${test.test}: Returns 'null' - API restriction detected`);
      } else if (test.success) {
        console.log(`  ✅ ${test.test}: Working (but may need authentication)`);
      } else {
        console.log(`  ❌ ${test.test}: Failed (${test.status})`);
      }
    });
  }

  if (webApiTests.length > 0) {
    console.log('\n🌐 Steam Web API Results:');
    webApiTests.forEach(test => {
      if (test.success) {
        console.log(`  ✅ ${test.test}: Working - can access profile data`);
      } else {
        console.log(`  ❌ ${test.test}: Failed (${test.status})`);
      }
    });
  }

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS');
  console.log('==================');

  const hasWorkingCommunity = communityApiTests.some(t => t.success && !t.data.includes('null'));
  const hasWorkingWebApi = webApiTests.some(t => t.success);

  if (!hasWorkingCommunity && hasWorkingWebApi) {
    console.log('🚨 CRITICAL FINDING: Steam Community API is blocked/restricted');
    console.log('   • Steam Web API still works for profile data');
    console.log('   • Community API returns HTTP 400 with "null" response');
    console.log('   • This suggests Steam changed API access policies');
    console.log('\n🔧 SOLUTIONS:');
    console.log('   1. Implement authenticated requests with session cookies');
    console.log('   2. Use alternative inventory access methods');
    console.log('   3. Consider using Steam Web API with trade offer endpoints');
    console.log('   4. Implement fallback to manual inventory upload');
  } else if (hasWorkingCommunity) {
    console.log('✅ Steam Community API is working');
    console.log('   • Need to investigate user-specific restrictions');
    console.log('   • Check if inventory privacy settings are the issue');
  } else {
    console.log('❌ All APIs are failing');
    console.log('   • Network connectivity issues');
    console.log('   • Steam service outage');
    console.log('   • IP blocking');
  }

  console.log('\n🏁 INVESTIGATION COMPLETED');
  console.log('============================');
  console.log('Results saved to investigation_results.json');

  // Save results for further analysis
  const fs = require('fs');
  fs.writeFileSync('investigation_results.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    steamId,
    results,
    summary: {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
      hasWorkingCommunity,
      hasWorkingWebApi
    }
  }, null, 2));

  return results;
}

// Run the investigation
runInvestigation()
  .then(() => {
    console.log('\n🔍 For next steps, check investigation_results.json');
    console.log('💡 Consider implementing authenticated Steam session approach');
  })
  .catch(error => {
    console.error('❌ Investigation failed:', error);
  });